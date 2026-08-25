import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import os from 'os';
import type { Game, CompressionOptions, CompressionProgress, CompressionAlgorithm } from '../../renderer/src/types';
import { calculateDirectorySize, getCompressionStats } from './size';
import { captureDirectoryTimestamps, restoreDirectoryTimestamps } from '../utils/timestamps';
import { ensureSteamManifestInstalled } from '../utils/steamManifest';
import { calculateAffinityHex, enableBackgroundMode } from '../utils/processPriority';

const activeJobs = new Map<string, ChildProcess>();

/**
 * Spawns compact.exe via `cmd /c start /low /affinity <mask> /b /wait compact.exe <args>`.
 * 
 * This is the ONLY correct way to prevent Wi-Fi drops:
 * - /low: Sets IDLE_PRIORITY_CLASS *before* compact.exe executes its first instruction.
 * - /affinity <mask>: Sets CPU core mask *before* first instruction (zero race condition).
 * - /b: No new window (stays in background).
 * - /wait: cmd.exe waits for compact.exe to exit (proper exit code propagation).
 * 
 * After spawning, enableBackgroundMode() sets PROCESS_MODE_BACKGROUND_BEGIN which
 * drops I/O priority to VERY_LOW — this is crucial because on laptops the NVMe SSD
 * and Wi-Fi adapter share the same PCIe root complex, and heavy disk I/O saturates
 * the bus causing Wi-Fi driver DPC timeouts.
 */
function spawnThrottledCompact(
  args: string[],
  cwd: string,
  cpuLimitPercentage: number
): ChildProcess {
  const affinityHex = calculateAffinityHex(cpuLimitPercentage);
  
  // Build the command: cmd /c start /low /affinity <hex> /b /wait compact.exe <args>
  // The compact.exe arguments are joined and passed as a single string after the exe name
  const compactArgStr = args.map(a => a.includes(' ') ? `"${a}"` : a).join(' ');
  
  const proc = spawn('cmd.exe', [
    '/c',
    `start /low /affinity 0x${affinityHex} /b /wait compact.exe ${compactArgStr}`
  ], {
    cwd,
    windowsHide: true,
    shell: false,
  });

  // After spawn, also enable Background I/O Mode on all child compact.exe processes
  // This throttles I/O priority to VERY_LOW, preventing PCIe bus saturation
  setTimeout(() => {
    try {
      // Find the actual compact.exe PID spawned by cmd.exe and apply background mode
      const { execSync } = require('child_process');
      const output = execSync(
        `wmic process where "name='compact.exe' and ParentProcessId=${proc.pid}" get ProcessId /format:value`,
        { timeout: 2000, encoding: 'utf-8' }
      );
      const pidMatch = output.match(/ProcessId=(\d+)/);
      if (pidMatch) {
        enableBackgroundMode(parseInt(pidMatch[1], 10));
      }
    } catch {
      // If we can't find compact.exe child, apply to cmd.exe parent instead
      if (proc.pid) enableBackgroundMode(proc.pid);
    }
  }, 300);

  return proc;
}

export class WindowsCompressionEngine {
  /**
   * Compresses a game folder using Windows Overlay Filter / compact.exe
   */
  public async compress(
    game: Game,
    options: CompressionOptions,
    onProgress: (progress: CompressionProgress) => void
  ): Promise<{ success: boolean; error?: string }> {
    const algorithm: CompressionAlgorithm = options.algorithm || 'LZX';
    
    // First, scan directory to get total file count and size estimate
    const { totalBytes, fileCount } = await calculateDirectorySize(game.installPath);
    const totalFiles = Math.max(fileCount, 1);
    
    let processedFiles = 0;
    let processedBytes = 0;
    let savedBytes = 0;
    const startTime = Date.now();
    let lastTime = startTime;
    let bytesSinceLast = 0;
    let speedBytesPerSec = 0;

    // Capture exact file timestamps before compression to prevent Steam/Epic from detecting date changes
    const savedTimestamps = captureDirectoryTimestamps(game.installPath);

    // Build compact.exe arguments
    // /c : Compress
    // /s : Subdirectories
    // /a : Hidden and system files
    // /i : Ignore errors and continue
    // /f : Force compression on all files
    // /exe:<algo> : WOF algorithm (XPRESS4K, XPRESS8K, XPRESS16K, LZX)
    const args = ['/c', `/s:${game.installPath}`, '/a', '/i', '/f', `/exe:${algorithm}`, '*'];

    const cpuLimit = options.cpuLimitPercentage || 30;

    return new Promise((resolve) => {
      // Spawn compact.exe pre-throttled: CPU affinity + low priority applied BEFORE first instruction
      const proc = spawnThrottledCompact(args, game.installPath, cpuLimit);

      activeJobs.set(game.id, proc);

      let buffer = '';

      proc.stdout.on('data', (data: Buffer) => {
        buffer += data.toString();
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          // Pattern: "filename.ext   12345 : 6789 = 1.8 to 1 [OK]"
          const match = trimmed.match(/^(.*?)\s+(\d+)\s*:\s*(\d+)\s*=\s*[\d\.]+\s*to\s*1\s*\[OK\]/i);
          if (match) {
            const fileName = match[1].trim();
            const origSize = parseInt(match[2], 10);
            const compSize = parseInt(match[3], 10);
            
            processedFiles++;
            processedBytes += origSize;
            savedBytes += Math.max(0, origSize - compSize);
            bytesSinceLast += origSize;

            const now = Date.now();
            if (now - lastTime >= 500) {
              const elapsedSec = (now - lastTime) / 1000;
              speedBytesPerSec = Math.round(bytesSinceLast / elapsedSec);
              bytesSinceLast = 0;
              lastTime = now;
            }

            const percentage = Math.min(99, Math.round((processedFiles / totalFiles) * 100));
            const remainingBytes = Math.max(0, totalBytes - processedBytes);
            const estimatedRemainingSeconds = speedBytesPerSec > 0 ? Math.round(remainingBytes / speedBytesPerSec) : 0;

            onProgress({
              gameId: game.id,
              gameName: game.name,
              currentFile: fileName,
              processedFiles,
              totalFiles,
              processedBytes,
              totalBytes,
              savedBytes,
              percentage,
              speedBytesPerSec,
              estimatedRemainingSeconds,
              status: 'compressing',
              algorithm,
            });
          }
        }
      });

      let stderrOutput = '';
      proc.stderr.on('data', (data: Buffer) => {
        stderrOutput += data.toString();
      });

      proc.on('close', async (code) => {
        activeJobs.delete(game.id);

        if (code === 0 || code === null) {
          // Restore exact timestamps so Steam, Epic & launchers see ZERO file changes
          try {
            restoreDirectoryTimestamps(savedTimestamps);
          } catch {}

          // Ensure Steam manifest state remains Fully Installed (StateFlags 4)
          if (game.platform === 'steam') {
            try {
              ensureSteamManifestInstalled(game.installPath, game.appId);
            } catch {}
          }

          // Send 100% completed progress
          onProgress({
            gameId: game.id,
            gameName: game.name,
            currentFile: 'Complete',
            processedFiles: totalFiles,
            totalFiles,
            processedBytes: totalBytes,
            totalBytes,
            savedBytes,
            percentage: 100,
            speedBytesPerSec: 0,
            estimatedRemainingSeconds: 0,
            status: 'compressed',
            algorithm,
          });
          resolve({ success: true });
        } else {
          // If killed or exited with error
          const errorMsg = stderrOutput.trim() || `Process exited with code ${code}`;
          onProgress({
            gameId: game.id,
            gameName: game.name,
            currentFile: 'Stopped',
            processedFiles,
            totalFiles,
            processedBytes,
            totalBytes,
            savedBytes,
            percentage: 0,
            speedBytesPerSec: 0,
            estimatedRemainingSeconds: 0,
            status: 'error',
            algorithm,
            error: errorMsg,
          });
          resolve({ success: false, error: errorMsg });
        }
      });

      proc.on('error', (err) => {
        activeJobs.delete(game.id);
        resolve({ success: false, error: err.message });
      });
    });
  }

  /**
   * Decompresses a game folder (reverts WOF and standard NTFS compression)
   */
  public async decompress(
    game: Game,
    onProgress: (progress: CompressionProgress) => void,
    options?: CompressionOptions
  ): Promise<{ success: boolean; error?: string }> {
    const { totalBytes, fileCount } = await calculateDirectorySize(game.installPath);
    const totalFiles = Math.max(fileCount, 1);
    let processedFiles = 0;

    // Capture exact file timestamps before decompression
    const savedTimestamps = captureDirectoryTimestamps(game.installPath);

    // Decompress WOF and NTFS compressed files
    const argsExe = ['/u', `/s:${game.installPath}`, '/a', '/i', '/exe', '*'];
    const cpuLimit = options?.cpuLimitPercentage || 30;

    return new Promise((resolve) => {
      const proc = spawnThrottledCompact(argsExe, game.installPath, cpuLimit);

      activeJobs.set(game.id, proc);

      let buffer = '';
      proc.stdout.on('data', (data: Buffer) => {
        buffer += data.toString();
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          // Decompression outputs uncompressed file notifications
          if (trimmed.includes('[OK]') || trimmed.includes(':')) {
            processedFiles++;
            const percentage = Math.min(95, Math.round((processedFiles / totalFiles) * 100));
            onProgress({
              gameId: game.id,
              gameName: game.name,
              currentFile: trimmed.split(/\s+/)[0] || 'Uncompressing...',
              processedFiles,
              totalFiles,
              processedBytes: 0,
              totalBytes,
              savedBytes: 0,
              percentage,
              speedBytesPerSec: 0,
              estimatedRemainingSeconds: 0,
              status: 'decompressing',
              algorithm: 'LZX',
            });
          }
        }
      });

      proc.on('close', async (code) => {
        activeJobs.delete(game.id);
        // Also run standard uncompress flag to remove any NTFS directory marks
        try {
          const proc2 = spawnThrottledCompact(
            ['/u', `/s:${game.installPath}`, '/a', '/i', '*'],
            game.installPath,
            cpuLimit
          );
          proc2.on('close', () => {
            try {
              restoreDirectoryTimestamps(savedTimestamps);
            } catch {}

            if (game.platform === 'steam') {
              try {
                ensureSteamManifestInstalled(game.installPath, game.appId);
              } catch {}
            }

            onProgress({
              gameId: game.id,
              gameName: game.name,
              currentFile: 'Restored',
              processedFiles: totalFiles,
              totalFiles,
              processedBytes: totalBytes,
              totalBytes,
              savedBytes: 0,
              percentage: 100,
              speedBytesPerSec: 0,
              estimatedRemainingSeconds: 0,
              status: 'uncompressed',
              algorithm: 'LZX',
            });
            resolve({ success: true });
          });
        } catch {
          resolve({ success: true });
        }
      });

      proc.on('error', (err) => {
        activeJobs.delete(game.id);
        resolve({ success: false, error: err.message });
      });
    });
  }

  /**
   * Cancel an active compression/decompression job
   */
  public cancel(gameId: string): boolean {
    const proc = activeJobs.get(gameId);
    if (proc && !proc.killed) {
      try {
        // Kill process tree on Windows (kills cmd.exe + compact.exe)
        spawn('taskkill', ['/pid', proc.pid?.toString() || '', '/f', '/t']);
      } catch {
        proc.kill('SIGKILL');
      }
      activeJobs.delete(gameId);
      return true;
    }
    return false;
  }
}
