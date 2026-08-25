import { spawn, execSync, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

// =============================================================================
// C# source for the throttled process launcher.
//
// This tiny native .exe uses Win32 CreateProcess with CREATE_SUSPENDED flag
// to start compact.exe in a frozen state. Before resuming, it sets:
//   1. IDLE_PRIORITY_CLASS (lowest CPU scheduling)
//   2. CPU affinity mask (skip Cores 0 & 1)
//   3. PROCESS_MODE_BACKGROUND_BEGIN (I/O priority → VeryLow, Memory priority → VeryLow)
//
// Only THEN does it call ResumeThread — compact.exe starts FULLY throttled
// from its very first instruction. Zero race condition. Zero Wi-Fi drops.
//
// stdout/stderr are inherited via STARTF_USESTDHANDLES so output flows
// through to the parent Node.js process for progress parsing.
// =============================================================================
const THROTTLE_CS_SOURCE = `
using System;
using System.Runtime.InteropServices;

class ThrottledLauncher {
    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    static extern bool CreateProcessW(
        string lpApplicationName, string lpCommandLine,
        IntPtr lpProcessAttributes, IntPtr lpThreadAttributes,
        bool bInheritHandles, uint dwCreationFlags,
        IntPtr lpEnvironment, string lpCurrentDirectory,
        ref STARTUPINFOW lpStartupInfo, out PROCESS_INFORMATION lpProcessInformation);

    [DllImport("kernel32.dll")] static extern uint ResumeThread(IntPtr hThread);
    [DllImport("kernel32.dll")] static extern bool SetPriorityClass(IntPtr h, uint c);
    [DllImport("kernel32.dll")] static extern bool SetProcessAffinityMask(IntPtr h, UIntPtr mask);
    [DllImport("kernel32.dll")] static extern uint WaitForSingleObject(IntPtr h, uint ms);
    [DllImport("kernel32.dll")] static extern bool GetExitCodeProcess(IntPtr h, out uint code);
    [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr h);
    [DllImport("kernel32.dll")] static extern IntPtr GetStdHandle(int n);

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    struct STARTUPINFOW {
        public int cb; public string lpReserved, lpDesktop, lpTitle;
        public int dwX, dwY, dwXSize, dwYSize, dwXCountChars, dwYCountChars, dwFillAttribute;
        public uint dwFlags; public short wShowWindow, cbReserved2;
        public IntPtr lpReserved2, hStdInput, hStdOutput, hStdError;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct PROCESS_INFORMATION {
        public IntPtr hProcess, hThread; public int dwProcessId, dwThreadId;
    }

    static int Main(string[] args) {
        if (args.Length < 2) { Console.Error.WriteLine("Usage: throttle.exe <mask> <cmd> [args]"); return 1; }

        ulong mask = ulong.Parse(args[0]);
        string[] cmdParts = new string[args.Length - 1];
        Array.Copy(args, 1, cmdParts, 0, args.Length - 1);
        string cmdLine = string.Join(" ", cmdParts);

        var si = new STARTUPINFOW();
        si.cb = Marshal.SizeOf<STARTUPINFOW>();
        si.dwFlags = 0x00000100; // STARTF_USESTDHANDLES
        si.hStdInput = GetStdHandle(-10);
        si.hStdOutput = GetStdHandle(-11);
        si.hStdError = GetStdHandle(-12);

        PROCESS_INFORMATION pi;
        // CREATE_SUSPENDED (0x4) | IDLE_PRIORITY_CLASS (0x40)
        if (!CreateProcessW(null, cmdLine, IntPtr.Zero, IntPtr.Zero, true,
            0x00000004 | 0x00000040, IntPtr.Zero, null, ref si, out pi)) {
            Console.Error.WriteLine("CreateProcess failed: " + Marshal.GetLastWin32Error());
            return 1;
        }

        // Process is FROZEN here — hasn't executed a single instruction

        // 1. Set CPU affinity (skip cores 0 & 1)
        if (mask > 0) SetProcessAffinityMask(pi.hProcess, (UIntPtr)mask);

        // 2. Set Background I/O Mode: I/O=VeryLow, Memory=VeryLow
        SetPriorityClass(pi.hProcess, 0x00100000);

        // 3. NOW resume — compact.exe starts fully throttled
        ResumeThread(pi.hThread);
        CloseHandle(pi.hThread);

        // Wait and return exit code
        WaitForSingleObject(pi.hProcess, 0xFFFFFFFF);
        uint exitCode; GetExitCodeProcess(pi.hProcess, out exitCode);
        CloseHandle(pi.hProcess);
        return (int)exitCode;
    }
}
`;

// Path to the compiled throttle launcher
let cachedLauncherPath: string | null = null;

/**
 * Finds the .NET Framework C# compiler (csc.exe).
 * Present on every Windows 10/11 installation.
 */
function findCsc(): string | null {
  const candidates = [
    path.join(process.env.WINDIR || 'C:\\Windows', 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe'),
    path.join(process.env.WINDIR || 'C:\\Windows', 'Microsoft.NET', 'Framework', 'v4.0.30319', 'csc.exe'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

/**
 * Compiles the C# throttle launcher if needed. Returns path to .exe or null.
 * The .exe is cached in the user's temp directory and reused across sessions.
 */
function ensureLauncher(): string | null {
  if (cachedLauncherPath && fs.existsSync(cachedLauncherPath)) return cachedLauncherPath;

  const cacheDir = path.join(os.tmpdir(), 'fgc-throttle');
  const exePath = path.join(cacheDir, 'throttle_launcher.exe');
  const srcPath = path.join(cacheDir, 'throttle_launcher.cs');

  // Check if already compiled
  if (fs.existsSync(exePath)) {
    cachedLauncherPath = exePath;
    return exePath;
  }

  const csc = findCsc();
  if (!csc) return null;

  try {
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(srcPath, THROTTLE_CS_SOURCE, 'utf-8');
    execSync(`"${csc}" /nologo /optimize /platform:anycpu /out:"${exePath}" "${srcPath}"`, {
      timeout: 15000,
      stdio: 'ignore',
    });
    cachedLauncherPath = exePath;
    return exePath;
  } catch {
    return null;
  }
}

/**
 * Calculates the CPU affinity mask.
 * Skips Cores 0 & 1 (reserved for Wi-Fi/OS), caps to cpuLimitPercentage of cores.
 */
function calculateAffinityMask(cpuLimitPercentage: number): bigint {
  const coreCount = os.cpus().length;
  if (coreCount < 4) return (1n << BigInt(coreCount)) - 1n;

  const targetCores = Math.max(1, Math.round((cpuLimitPercentage / 100) * coreCount));
  const usableCores = coreCount - 2;
  const coresToUse = Math.min(targetCores, usableCores);

  let mask = 0n;
  for (let i = 2; i < 2 + coresToUse && i < coreCount; i++) {
    mask |= (1n << BigInt(i));
  }
  return mask > 0n ? mask : 4n;
}

// Pre-compile on module load (async, doesn't block startup)
let launcherReady = false;
if (process.platform === 'win32') {
  setTimeout(() => {
    ensureLauncher();
    launcherReady = true;
  }, 0);
}

/**
 * Spawns compact.exe through the native throttle launcher.
 * compact.exe is created in SUSPENDED state, throttled, then resumed.
 * Falls back to direct spawn + os.setPriority if launcher unavailable.
 */
export function spawnThrottledCompact(
  args: string[],
  cwd: string,
  cpuLimitPercentage: number = 30
): ChildProcess {
  const mask = calculateAffinityMask(cpuLimitPercentage);
  const launcher = ensureLauncher();

  if (launcher) {
    // Use the native launcher: compact.exe is created SUSPENDED and throttled
    // before executing its first instruction
    const proc = spawn(launcher, [mask.toString(), 'compact.exe', ...args], {
      cwd,
      windowsHide: true,
    });
    return proc;
  }

  // Fallback: direct spawn + immediate priority (best effort)
  const proc = spawn('compact.exe', args, {
    cwd,
    windowsHide: true,
  });
  try { os.setPriority(proc.pid!, os.constants.priority.PRIORITY_LOW); } catch {}
  return proc;
}

// Cleanup export (no-op now since we don't have pre-warmed processes)
export function shutdownThrottler(): void {}
