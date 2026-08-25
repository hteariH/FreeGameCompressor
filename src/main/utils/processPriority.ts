import { execSync } from 'child_process';
import os from 'os';

/**
 * Calculates the CPU affinity mask for a given cpuLimitPercentage.
 * Always skips Cores 0 and 1 (reserved for Wi-Fi NDIS drivers and OS interrupts).
 * Returns the mask as a hex string (e.g. "0x3C") suitable for cmd.exe `start /affinity`.
 */
export function calculateAffinityHex(cpuLimitPercentage: number = 30): string {
  const coreCount = os.cpus().length;

  if (coreCount < 4) {
    // On 2-core machines, we can't skip cores — use all but set low priority
    return ((1 << coreCount) - 1).toString(16).toUpperCase();
  }

  // Calculate how many cores to use based on percentage (min 1 core)
  const usableCores = coreCount - 2; // exclude cores 0 & 1
  const targetCores = Math.max(1, Math.round((cpuLimitPercentage / 100) * coreCount));
  const coresToUse = Math.min(targetCores, usableCores);

  // Build bitmask starting from core 2
  let mask = 0n;
  for (let i = 2; i < 2 + coresToUse && i < coreCount; i++) {
    mask |= (1n << BigInt(i));
  }

  // Fallback: at least use core 2
  if (mask === 0n) mask = 4n; // core 2 only

  return mask.toString(16).toUpperCase();
}

/**
 * Enables Windows PROCESS_MODE_BACKGROUND_BEGIN on a process.
 * This drops I/O priority to VERY_LOW and memory priority to VERY_LOW,
 * preventing disk I/O storms from saturating the PCIe bus and killing Wi-Fi.
 * 
 * This is the key fix: CPU affinity alone doesn't help because the I/O bandwidth
 * from NVMe SSD read/write saturates the shared PCIe root complex that the 
 * Wi-Fi adapter also uses (Intel CNVi, USB-attached adapters, etc).
 */
export function enableBackgroundMode(pid: number): void {
  if (process.platform !== 'win32' || !pid) return;

  try {
    // Use .NET interop to call SetPriorityClass with PROCESS_MODE_BACKGROUND_BEGIN (0x00100000)
    // This sets: CPU=Idle, I/O=VeryLow, Memory=VeryLow — the trifecta for Wi-Fi safety
    execSync(
      `powershell -NoProfile -NonInteractive -Command "` +
      `$p = [System.Diagnostics.Process]::GetProcessById(${pid}); ` +
      `$p.PriorityClass = [System.Diagnostics.ProcessPriorityClass]::Idle; ` +
      `$handle = $p.Handle; ` +
      `$code = Add-Type -MemberDefinition '` +
        `[DllImport(\\\"kernel32.dll\\\")] public static extern bool SetPriorityClass(IntPtr h, uint c);` +
      `' -Name W -Namespace K -PassThru; ` +
      `$code::SetPriorityClass($handle, 0x00100000)` +
      `"`,
      { timeout: 3000, stdio: 'ignore' }
    );
  } catch {
    // Fallback: at least set Idle priority via Node.js API
    try { os.setPriority(pid, os.constants.priority.PRIORITY_LOW); } catch {}
  }
}
