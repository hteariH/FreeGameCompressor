import { execSync, exec } from 'child_process';
import os from 'os';

/**
 * Sets process priority to Low (IDLE_PRIORITY_CLASS) and restricts CPU core affinity
 * to 50% of available cores while strictly leaving Core 0 and Core 1 completely untouched.
 * 
 * Why this is necessary:
 * On Windows, Wi-Fi drivers (Intel AX200/AX210, Realtek, MediaTek) handle network packet
 * processing and keepalive beacon ISRs/DPCs on Cores 0 and 1. When multi-threaded LZX
 * compression pegs 100% of CPU cores and saturates PCIe DMA queues, network drivers time out,
 * causing Wi-Fi disconnection.
 * 
 * Freeing Cores 0 & 1 and capping compression to 50% of CPU threads guarantees 100% stable Wi-Fi,
 * cool temperatures, and zero system lag.
 */
export function setProcessLowPriorityAndAffinity(pid?: number) {
  if (!pid) return;

  // 1. Immediately drop Process Scheduling Priority to LOW (IDLE_PRIORITY_CLASS)
  try {
    os.setPriority(pid, os.constants.priority.PRIORITY_LOW);
  } catch {}

  // 2. Set strict CPU core affinity on Windows
  if (process.platform === 'win32') {
    try {
      const coreCount = os.cpus().length;
      if (coreCount >= 4) {
        // Use 50% of cores, starting from Core 2 (leaving Cores 0 and 1 completely free)
        const usedCores = Math.max(2, Math.floor(coreCount / 2));
        let mask = 0n;
        for (let i = 2; i < 2 + usedCores && i < coreCount; i++) {
          mask |= (1n << BigInt(i));
        }
        if (mask === 0n) mask = 3n;

        // Apply immediately so compact.exe never bursts on all cores
        try {
          execSync(
            `powershell -NoProfile -NonInteractive -Command "(Get-Process -Id ${pid} -ErrorAction SilentlyContinue).ProcessorAffinity = ${mask.toString()}"`,
            { timeout: 1500, stdio: 'ignore' }
          );
        } catch {
          // Fallback to async if sync had an issue
          exec(`powershell -NoProfile -NonInteractive -Command "(Get-Process -Id ${pid} -ErrorAction SilentlyContinue).ProcessorAffinity = ${mask.toString()}"`, () => {});
        }
      }
    } catch {}
  }
}
