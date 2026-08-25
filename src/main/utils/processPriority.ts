import { execSync } from 'child_process';
import os from 'os';

/**
 * Immediately throttles a process for Wi-Fi-safe compression:
 * 
 * 1. Sets CPU scheduling priority to IDLE (instant, ~1μs via libuv/uv_os_setpriority)
 * 2. Sets CPU core affinity (skips Cores 0 & 1, caps to cpuLimitPercentage of cores)
 * 3. Enables PROCESS_MODE_BACKGROUND_BEGIN which sets:
 *    - I/O Priority → VERY_LOW (prevents NVMe SSD from saturating shared PCIe bus)
 *    - Memory Priority → VERY_LOW (prevents cache eviction of Wi-Fi driver pages)
 *    - CPU Priority → Idle
 * 
 * Step 3 is THE critical fix for Wi-Fi drops. On laptops, the NVMe SSD and Wi-Fi
 * adapter share the same PCIe root complex (Intel CNVi, USB-attached adapters).
 * Without Background I/O Mode, compact.exe generates 3-7 GB/s of disk I/O that
 * saturates the bus and starves the Wi-Fi driver of DMA bandwidth, causing
 * beacon timeouts and adapter disconnection.
 */
export function throttleProcess(pid: number | undefined, cpuLimitPercentage: number = 30): void {
  if (!pid) return;

  // Step 1: Instant CPU priority drop (synchronous, ~1μs, no PowerShell overhead)
  try {
    os.setPriority(pid, os.constants.priority.PRIORITY_LOW);
  } catch {}

  if (process.platform !== 'win32') return;

  // Step 2 + 3: Set affinity AND enable Background I/O Mode in a single PowerShell call
  // This minimizes the throttling delay to one PowerShell invocation (~200ms)
  try {
    const coreCount = os.cpus().length;
    let affinityCmd = '';

    if (coreCount >= 4) {
      // Calculate how many cores to use based on percentage (min 1 core)
      const usableCores = coreCount - 2; // exclude cores 0 & 1
      const targetCores = Math.max(1, Math.round((cpuLimitPercentage / 100) * coreCount));
      const coresToUse = Math.min(targetCores, usableCores);

      // Build bitmask starting from core 2
      let mask = 0n;
      for (let i = 2; i < 2 + coresToUse && i < coreCount; i++) {
        mask |= (1n << BigInt(i));
      }
      if (mask === 0n) mask = 4n; // fallback: core 2 only

      affinityCmd = `$p.ProcessorAffinity = ${mask.toString()}; `;
    }

    // Combined: set affinity + enable PROCESS_MODE_BACKGROUND_BEGIN (0x00100000)
    // Background mode sets I/O priority to VeryLow AND memory priority to VeryLow
    execSync(
      `powershell -NoProfile -NonInteractive -Command "` +
      `$p = Get-Process -Id ${pid} -EA SilentlyContinue; ` +
      `if($p) { ` +
        `$p.PriorityClass = 'Idle'; ` +
        affinityCmd +
        `Add-Type -MemberDefinition '[DllImport(\\\"kernel32.dll\\\")] public static extern bool SetPriorityClass(IntPtr h, uint c);' -Name BG -Namespace K -EA SilentlyContinue; ` +
        `[K.BG]::SetPriorityClass($p.Handle, 0x00100000) ` +
      `}"`,
      { timeout: 3000, stdio: 'ignore' }
    );
  } catch {
    // Fallback: at least try affinity alone
    try {
      const coreCount = os.cpus().length;
      if (coreCount >= 4) {
        const usableCores = coreCount - 2;
        const targetCores = Math.max(1, Math.round((cpuLimitPercentage / 100) * coreCount));
        const coresToUse = Math.min(targetCores, usableCores);
        let mask = 0n;
        for (let i = 2; i < 2 + coresToUse && i < coreCount; i++) {
          mask |= (1n << BigInt(i));
        }
        if (mask === 0n) mask = 4n;
        execSync(
          `powershell -NoProfile -NonInteractive -Command "(Get-Process -Id ${pid} -EA SilentlyContinue).ProcessorAffinity = ${mask.toString()}"`,
          { timeout: 1500, stdio: 'ignore' }
        );
      }
    } catch {}
  }
}
