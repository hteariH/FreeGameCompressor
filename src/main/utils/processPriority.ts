import { exec } from 'child_process';
import os from 'os';

/**
 * Sets process priority to Low/Below-Normal and pins process affinity to exclude Core 0.
 * Leaving Core 0 free is essential on Windows to prevent network card (Wi-Fi/Ethernet)
 * Interrupt Service Routines (ISRs) and Deferred Procedure Calls (DPCs) from being starved,
 * which prevents Wi-Fi adapter latency spikes and connection drops during heavy LZX compression.
 */
export function setProcessLowPriorityAndAffinity(pid?: number) {
  if (!pid) return;

  // 1. Lower OS Process Scheduling Priority
  try {
    os.setPriority(pid, os.constants.priority.PRIORITY_BELOW_NORMAL);
  } catch {}

  // 2. Adjust Processor Affinity on Windows (leave Core 0 free for OS & Network DPC/ISR)
  if (process.platform === 'win32') {
    try {
      const coreCount = os.cpus().length;
      if (coreCount >= 4) {
        // Turn off bit 0 (Core 0), enable all other cores
        const fullMask = (1n << BigInt(coreCount)) - 1n;
        const safeMask = fullMask & ~1n;

        exec(`powershell -NoProfile -Command "(Get-Process -Id ${pid} -ErrorAction SilentlyContinue).ProcessorAffinity = ${safeMask}"`, () => {});
      }
    } catch {}
  }
}
