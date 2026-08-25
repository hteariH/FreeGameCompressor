import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import os from 'os';
import type { Game, CompressionOptions, CompressionProgress, CompressionAlgorithm } from '../../renderer/src/types';
import { calculateDirectorySize, getCompressionStats, getAllFiles } from './size';
import { captureDirectoryTimestamps, restoreDirectoryTimestamps } from '../utils/timestamps';
import { ensureSteamManifestInstalled } from '../utils/steamManifest';
import { spawnThrottledCompact } from '../utils/processPriority';

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
    
    const files = await getAllFiles(game.installPath);
    if (files.length === 0) {
      activeJobs.delete(game.id);
      return { success: true };
    }
    
    const { totalBytes } = await calculateDirectorySize(game.installPath);
    const totalFiles = files.length;
    
    let processedFiles = 0;
    let processedBytes = 0;
    let savedBytes = 0;
    const startTime = Date.now();
    let lastTime = startTime;
    let bytesSinceLast = 0;
    let speedBytesPerSec = 0;
    let lastIpcTime = 0;

    const savedTimestamps = await captureDirectoryTimestamps(game.installPath);
    const cpuLimit = options.cpuLimitPercentage || 30;

    const CHUNK_SIZE = 50;

    for (let i = 0; i < files.length; i += CHUNK_SIZE) {
      if (isCancelled.has(game.id)) break;

      const chunk = files.slice(i, i + CHUNK_SIZE);
      const args = ['/c', '/a', '/i', '/f', '/exe:' + algorithm, ...chunk];

      await new Promise<void>((resolveChunk) => {
        const proc = spawnThrottledCompact(args, game.installPath, cpuLimit);
        activeJobs.set(game.id, proc);

        let buffer = '';
        proc.stdout.on('data', (data: Buffer) => {
          buffer += data.toString();
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

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

              if (now - lastIpcTime >= 100 || processedFiles === totalFiles) {
                lastIpcTime = now;
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
          }
        });

        proc.on('close', () => resolveChunk());
        proc.on('error', () => resolveChunk());
      });

      // The Magic Pause: Absolute Wi-Fi savior
      await new Promise(r => setTimeout(r, 50));
    }

    activeJobs.delete(game.id);

    if (isCancelled.has(game.id)) {
      isCancelled.delete(game.id);
      return { success: false, error: 'Cancelled' };
    }

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

    const files = await getAllFiles(game.installPath);
    if (files.length === 0) {
      activeJobs.delete(game.id);
      return { success: true };
    }

    const { totalBytes } = await calculateDirectorySize(game.installPath);
    const totalFiles = files.length;
    let processedFiles = 0;
    let lastIpcTime = 0;

    const savedTimestamps = await captureDirectoryTimestamps(game.installPath);
    const cpuLimit = options?.cpuLimitPercentage || 30;

    const CHUNK_SIZE = 50;

    for (let i = 0; i < files.length; i += CHUNK_SIZE) {
      if (isCancelled.has(game.id)) break;

      const chunk = files.slice(i, i + CHUNK_SIZE);
      const argsExe = ['/u', '/a', '/i', '/exe', ...chunk];

      await new Promise<void>((resolveChunk) => {
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
            if (trimmed.includes('[OK]') || trimmed.includes(':')) {
              processedFiles++;
              const percentage = Math.min(95, Math.round((processedFiles / totalFiles) * 100));
              const now = Date.now();
              if (now - lastIpcTime >= 100 || processedFiles === totalFiles) {
                lastIpcTime = now;
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
          }
        });

        proc.on('close', () => resolveChunk());
        proc.on('error', () => resolveChunk());
      });

      // Pause for Wi-Fi stability
      await new Promise(r => setTimeout(r, 50));
    }

    if (isCancelled.has(game.id)) {
      activeJobs.delete(game.id);
      isCancelled.delete(game.id);
      return { success: false, error: 'Cancelled' };
    }

    await new Promise<void>((resolveFinal) => {
      const proc2 = spawnThrottledCompact(['/u', '/s:' + game.installPath, '/a', '/i', '*'], game.installPath, cpuLimit);
      proc2.on('close', () => resolveFinal());
      proc2.on('error', () => resolveFinal());
    });

    activeJobs.delete(game.id);

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
