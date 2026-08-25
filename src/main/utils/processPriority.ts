import { spawn, execSync, ChildProcess } from 'child_process';
import os from 'os';

/**
 * Pre-warmed PowerShell process for instant (<5ms) process throttling.
 * 
 * WHY THIS EXISTS:
 * Spawning a new PowerShell process takes 300-600ms. During that window, compact.exe
 * runs at full power on all cores with normal I/O priority — enough to crash Wi-Fi.
 * 
 * By keeping a PowerShell process alive and ready, we can apply affinity + Background
 * I/O Mode within ~5ms of compact.exe spawning — before it can generate enough I/O
 * to saturate the PCIe bus.
 */
let throttlerProc: ChildProcess | null = null;
let throttlerReady = false;

/**
 * Pre-warms the PowerShell throttler process. Call this at module load time
 * so it's ready before any compression starts.
 */
export function warmUpThrottler(): void {
  if (process.platform !== 'win32') return;
  if (throttlerProc && !throttlerProc.killed) return;

  // PowerShell script that reads "PID,AFFINITY_MASK" lines from stdin
  // and applies Idle priority + affinity + PROCESS_MODE_BACKGROUND_BEGIN
  const script = [
    // Add the P/Invoke for SetPriorityClass once at startup
    'Add-Type -MemberDefinition \'[DllImport("kernel32.dll")] public static extern bool SetPriorityClass(IntPtr h, uint c);\' -Name BG -Namespace K -EA SilentlyContinue',
    '',
    'while ($true) {',
    '  $line = [Console]::In.ReadLine()',
    '  if ($line -eq $null -or $line -eq "exit") { break }',
    '  try {',
    '    $parts = $line -split ","',
    '    $targetPid = [int]$parts[0]',
    '    $affinityMask = [long]$parts[1]',
    '    $p = Get-Process -Id $targetPid -EA Stop',
    '    $p.PriorityClass = [System.Diagnostics.ProcessPriorityClass]::Idle',
    '    if ($affinityMask -gt 0) { $p.ProcessorAffinity = [IntPtr]$affinityMask }',
    '    [K.BG]::SetPriorityClass($p.Handle, 0x00100000)',  // PROCESS_MODE_BACKGROUND_BEGIN
    '    [Console]::Out.WriteLine("OK")',
    '  } catch {',
    '    [Console]::Out.WriteLine("ERR")',
    '  }',
    '  [Console]::Out.Flush()',
    '}',
  ].join('\n');

  const encoded = Buffer.from(script, 'utf16le').toString('base64');

  throttlerProc = spawn('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-EncodedCommand', encoded,
  ], {
    stdio: ['pipe', 'pipe', 'ignore'],
    windowsHide: true,
  });

  // Mark ready after PowerShell finishes startup (Add-Type completes)
  // We detect this by waiting for the process to be alive for 1s
  setTimeout(() => { throttlerReady = true; }, 1000);

  throttlerProc.on('exit', () => {
    throttlerProc = null;
    throttlerReady = false;
  });

  throttlerProc.on('error', () => {
    throttlerProc = null;
    throttlerReady = false;
  });

  // Prevent the throttler from keeping the app alive
  throttlerProc.unref();
  if (throttlerProc.stdout) throttlerProc.stdout.unref();
  if (throttlerProc.stdin) throttlerProc.stdin.unref();
}

/**
 * Shuts down the pre-warmed PowerShell throttler.
 */
export function shutdownThrottler(): void {
  if (throttlerProc && !throttlerProc.killed) {
    try {
      throttlerProc.stdin?.write('exit\n');
      setTimeout(() => {
        if (throttlerProc && !throttlerProc.killed) {
          throttlerProc.kill();
        }
      }, 500);
    } catch {}
  }
}

/**
 * Calculates the CPU affinity mask for a given CPU limit percentage.
 * Always skips Cores 0 and 1 (reserved for Wi-Fi NDIS drivers and OS interrupts).
 */
function calculateAffinityMask(cpuLimitPercentage: number): bigint {
  const coreCount = os.cpus().length;

  if (coreCount < 4) {
    // On 2-core machines, can't skip cores — use all
    return (1n << BigInt(coreCount)) - 1n;
  }

  // Calculate how many cores to use based on percentage (min 1 core)
  const targetCores = Math.max(1, Math.round((cpuLimitPercentage / 100) * coreCount));
  const usableCores = coreCount - 2; // exclude cores 0 & 1
  const coresToUse = Math.min(targetCores, usableCores);

  // Build bitmask starting from core 2
  let mask = 0n;
  for (let i = 2; i < 2 + coresToUse && i < coreCount; i++) {
    mask |= (1n << BigInt(i));
  }

  return mask > 0n ? mask : 4n; // fallback: core 2 only
}

/**
 * Throttles a process for Wi-Fi-safe compression. Three-phase approach:
 * 
 * Phase 1 (instant, ~1μs): os.setPriority → IDLE_PRIORITY_CLASS
 * Phase 2 (fast, ~5ms): Pre-warmed PowerShell → affinity + PROCESS_MODE_BACKGROUND_BEGIN
 * Phase 3 (fallback, ~500ms): If pre-warmed PS unavailable, spawn new PowerShell
 * 
 * PROCESS_MODE_BACKGROUND_BEGIN is THE critical fix. It sets:
 * - I/O Priority → Very Low (prevents NVMe SSD from saturating shared PCIe bus)
 * - Memory Priority → Very Low (prevents evicting Wi-Fi driver pages from cache)
 * - CPU Priority → Idle (redundant with Phase 1, but belt-and-suspenders)
 */
export function throttleProcess(pid: number | undefined, cpuLimitPercentage: number = 30): void {
  if (!pid) return;

  // Phase 1: INSTANT CPU priority drop (~1μs, synchronous libuv syscall)
  try {
    os.setPriority(pid, os.constants.priority.PRIORITY_LOW);
  } catch {}

  if (process.platform !== 'win32') return;

  const mask = calculateAffinityMask(cpuLimitPercentage);

  // Phase 2: Send to pre-warmed PowerShell (~5ms response time)
  if (throttlerReady && throttlerProc && !throttlerProc.killed && throttlerProc.stdin) {
    try {
      throttlerProc.stdin.write(`${pid},${mask.toString()}\n`);
      return; // Done! Throttling applied in ~5ms
    } catch {
      // Pre-warmed PS died, fall through to Phase 3
    }
  }

  // Phase 3: Fallback — spawn new PowerShell (slow, ~500ms, but better than nothing)
  const script = [
    `$p = Get-Process -Id ${pid} -EA SilentlyContinue`,
    `if ($p) {`,
    `  $p.PriorityClass = [System.Diagnostics.ProcessPriorityClass]::Idle`,
    `  $p.ProcessorAffinity = [IntPtr]${mask.toString()}`,
    `  Add-Type -MemberDefinition '[DllImport("kernel32.dll")] public static extern bool SetPriorityClass(IntPtr h, uint c);' -Name BG -Namespace K -EA SilentlyContinue`,
    `  [K.BG]::SetPriorityClass($p.Handle, 0x00100000)`,
    `}`,
  ].join('\n');

  const encoded = Buffer.from(script, 'utf16le').toString('base64');

  try {
    execSync(`powershell -NoProfile -NonInteractive -EncodedCommand ${encoded}`, {
      timeout: 3000,
      stdio: 'ignore',
    });
  } catch {}
}
