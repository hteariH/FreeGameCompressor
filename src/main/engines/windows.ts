import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import os from 'os';
import type { Game, CompressionOptions, CompressionProgress, CompressionAlgorithm } from '../../renderer/src/types';
import { scanGameDirectory } from './size';
import { restoreDirectoryTimestamps } from '../utils/timestamps';
import { ensureSteamManifestInstalled } from '../utils/steamManifest';

const activeJobs = new Map<string, ChildProcess | 'pending'>();
let isCancelled = new Set<string>();

export class WindowsCompressionEngine {
  public async compress(
    game: Game,
    options: CompressionOptions,
    onProgress: (progress: CompressionProgress) => void
  ): Promise<{ success: boolean; error?: string }> {
    const algorithm: CompressionAlgorithm = options.algorithm || 'LZX';
    isCancelled.delete(game.id);
    activeJobs.set(game.id, 'pending');
    
    onProgress({
      gameId: game.id,
      gameName: game.name,
      currentFile: 'Scanning directory...',
      processedFiles: 0,
      totalFiles: 0,
      processedBytes: 0,
      totalBytes: 0,
      savedBytes: 0,
      percentage: 0,
      speedBytesPerSec: 0,
      estimatedRemainingSeconds: 0,
      status: 'compressing',
      algorithm,
    });

    const { files, totalBytes, timestamps } = await scanGameDirectory(game.installPath);
    if (files.length === 0) {
      activeJobs.delete(game.id);
      return { success: true };
    }
    
    const totalFiles = files.length;
    let processedFiles = 0;
    let processedBytes = 0;
    let savedBytes = 0;
    const startTime = Date.now();
    let lastTime = startTime;
    let bytesSinceLast = 0;
    let speedBytesPerSec = 0;
    let lastIpcTime = 0;

    for (const file of files) {
      if (isCancelled.has(game.id)) break;

      const args = ['/c', '/a', '/i', '/f', '/exe:' + algorithm, file];
      const fileSize = timestamps.get(file)?.mtimeMs ? (await import('fs')).statSync(file).size : 0; // We have totalBytes from scan

      await new Promise<void>((resolveFile) => {
        const proc = spawn('compact.exe', args, { windowsHide: true });
        activeJobs.set(game.id, proc);

        let buffer = '';
        proc.stdout.on('data', (data: Buffer) => {
          buffer += data.toString();
        });

        proc.on('close', () => {
          // Parse the compact output to get the new size
          const match = buffer.match(/(\d+)\s*:\s*(\d+)\s*=\s*[\d\.]+\s*to\s*1/i);
          let origSize = fileSize;
          let compSize = fileSize;
          
          if (match) {
            origSize = parseInt(match[1], 10);
            compSize = parseInt(match[2], 10);
          }
          
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

          if (now - lastIpcTime >= 50 || processedFiles === totalFiles) {
            lastIpcTime = now;
            onProgress({
              gameId: game.id,
              gameName: game.name,
              currentFile: path.basename(file),
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
          resolveFile();
        });
        
        proc.on('error', () => resolveFile());
      });

      // The Absolute Nuclear Savior: Let the OS breathe after every single file
      // If a large file was compressed, the system might have starved the Wi-Fi NDIS driver for seconds.
      // This delay flushes the entire OS networking stack and disk queue!
      await new Promise(r => setTimeout(r, 20));
    }

    activeJobs.delete(game.id);

    if (isCancelled.has(game.id)) {
      isCancelled.delete(game.id);
      return { success: false, error: 'Cancelled' };
    }

    try {
      restoreDirectoryTimestamps(timestamps);
    } catch {}

    if (game.platform === 'steam') {
      try {
        ensureSteamManifestInstalled(game.installPath, game.appId);
      } catch {}
    }

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
    return { success: true };
  }

  public async decompress(
    game: Game,
    onProgress: (progress: CompressionProgress) => void,
    options?: CompressionOptions
  ): Promise<{ success: boolean; error?: string }> {
    isCancelled.delete(game.id);
    activeJobs.set(game.id, 'pending');

    onProgress({
      gameId: game.id,
      gameName: game.name,
      currentFile: 'Scanning directory...',
      processedFiles: 0,
      totalFiles: 0,
      processedBytes: 0,
      totalBytes: 0,
      savedBytes: 0,
      percentage: 0,
      speedBytesPerSec: 0,
      estimatedRemainingSeconds: 0,
      status: 'decompressing',
      algorithm: 'LZX',
    });

    const { files, totalBytes, timestamps } = await scanGameDirectory(game.installPath);
    if (files.length === 0) {
      activeJobs.delete(game.id);
      return { success: true };
    }

    const totalFiles = files.length;
    let processedFiles = 0;
    let lastIpcTime = 0;

    for (const file of files) {
      if (isCancelled.has(game.id)) break;

      const argsExe = ['/u', '/a', '/i', '/exe', file];

      await new Promise<void>((resolveFile) => {
        const proc = spawn('compact.exe', argsExe, { windowsHide: true });
        activeJobs.set(game.id, proc);

        proc.on('close', () => {
          processedFiles++;
          const percentage = Math.min(95, Math.round((processedFiles / totalFiles) * 100));
          const now = Date.now();
          if (now - lastIpcTime >= 50 || processedFiles === totalFiles) {
            lastIpcTime = now;
            onProgress({
              gameId: game.id,
              gameName: game.name,
              currentFile: path.basename(file),
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
          resolveFile();
        });
        proc.on('error', () => resolveFile());
      });

      await new Promise(r => setTimeout(r, 10));
    }

    if (isCancelled.has(game.id)) {
      activeJobs.delete(game.id);
      isCancelled.delete(game.id);
      return { success: false, error: 'Cancelled' };
    }

    await new Promise<void>((resolveFinal) => {
      const proc2 = spawn('compact.exe', ['/u', '/a', '/i', game.installPath], { windowsHide: true });
      proc2.on('close', () => resolveFinal());
      proc2.on('error', () => resolveFinal());
    });

    activeJobs.delete(game.id);

    try {
      restoreDirectoryTimestamps(timestamps);
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
    return { success: true };
  }

  public cancel(gameId: string): boolean {
    isCancelled.add(gameId);
    const proc = activeJobs.get(gameId);
    if (proc && proc !== 'pending' && !proc.killed) {
      try {
        spawn('taskkill', ['/pid', proc.pid?.toString() || '', '/f', '/t']);
      } catch {
        proc.kill('SIGKILL');
      }
      return true;
    }
    return true;
  }
}
