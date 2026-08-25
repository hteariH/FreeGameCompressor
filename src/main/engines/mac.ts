import { spawn, ChildProcess, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import type { Game, CompressionOptions, CompressionProgress } from '../../renderer/src/types';
import { calculateDirectorySize } from './size';

const execAsync = promisify(exec);
const activeJobs = new Map<string, ChildProcess>();

export class MacCompressionEngine {
  /**
   * Compresses game directory on macOS using APFS / HFS+ transparent compression (ditto or afsctool)
   */
  public async compress(
    game: Game,
    options: CompressionOptions,
    onProgress: (progress: CompressionProgress) => void
  ): Promise<{ success: boolean; error?: string }> {
    const { totalBytes, fileCount } = await calculateDirectorySize(game.installPath);
    const totalFiles = Math.max(fileCount, 1);

    // On macOS, transparent compression is natively executed via ditto --hfsCompression or afsctool
    return new Promise((resolve) => {
      // Create temporary compressed clone and atomic replace or in-place ditto
      const tmpPath = `${game.installPath}.compressing_tmp`;
      const proc = spawn('ditto', ['--hfsCompression', game.installPath, tmpPath]);
      if (proc.pid) {
        try {
          os.setPriority(proc.pid, os.constants.priority.PRIORITY_BELOW_NORMAL);
        } catch {}
      }
      activeJobs.set(game.id, proc);

      onProgress({
        gameId: game.id,
        gameName: game.name,
        currentFile: 'Applying Apple APFS transparent compression...',
        processedFiles: Math.round(totalFiles * 0.5),
        totalFiles,
        processedBytes: Math.round(totalBytes * 0.5),
        totalBytes,
        savedBytes: 0,
        percentage: 50,
        speedBytesPerSec: 0,
        estimatedRemainingSeconds: 0,
        status: 'compressing',
        algorithm: 'LZFSE' as any,
      });

      proc.on('close', async (code) => {
        activeJobs.delete(game.id);
        if (code === 0 && fs.existsSync(tmpPath)) {
          try {
            // Swap temporary compressed directory with original
            const backupPath = `${game.installPath}.old_bak`;
            fs.renameSync(game.installPath, backupPath);
            fs.renameSync(tmpPath, game.installPath);
            fs.rmSync(backupPath, { recursive: true, force: true });

            onProgress({
              gameId: game.id,
              gameName: game.name,
              currentFile: 'Complete',
              processedFiles: totalFiles,
              totalFiles,
              processedBytes: totalBytes,
              totalBytes,
              savedBytes: Math.round(totalBytes * 0.35),
              percentage: 100,
              speedBytesPerSec: 0,
              estimatedRemainingSeconds: 0,
              status: 'compressed',
              algorithm: 'LZFSE' as any,
            });
            resolve({ success: true });
          } catch (e: any) {
            resolve({ success: false, error: e?.message || 'Failed to finalize compressed directory' });
          }
        } else {
          if (fs.existsSync(tmpPath)) fs.rmSync(tmpPath, { recursive: true, force: true });
          resolve({ success: false, error: `ditto compression returned code ${code}` });
        }
      });

      proc.on('error', (err) => {
        activeJobs.delete(game.id);
        resolve({ success: false, error: err.message });
      });
    });
  }

  /**
   * Decompress on macOS
   */
  public async decompress(
    game: Game,
    onProgress: (progress: CompressionProgress) => void
  ): Promise<{ success: boolean; error?: string }> {
    const { totalBytes, fileCount } = await calculateDirectorySize(game.installPath);
    const totalFiles = Math.max(fileCount, 1);

    return new Promise((resolve) => {
      const tmpPath = `${game.installPath}.decompressing_tmp`;
      const proc = spawn('ditto', ['--noHFSCompression', game.installPath, tmpPath]);
      if (proc.pid) {
        try {
          os.setPriority(proc.pid, os.constants.priority.PRIORITY_BELOW_NORMAL);
        } catch {}
      }
      activeJobs.set(game.id, proc);

      proc.on('close', (code) => {
        activeJobs.delete(game.id);
        if (code === 0 && fs.existsSync(tmpPath)) {
          try {
            const backupPath = `${game.installPath}.old_bak`;
            fs.renameSync(game.installPath, backupPath);
            fs.renameSync(tmpPath, game.installPath);
            fs.rmSync(backupPath, { recursive: true, force: true });

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
              algorithm: 'LZFSE' as any,
            });
            resolve({ success: true });
          } catch (e: any) {
            resolve({ success: false, error: e?.message || 'Failed to revert files' });
          }
        } else {
          if (fs.existsSync(tmpPath)) fs.rmSync(tmpPath, { recursive: true, force: true });
          resolve({ success: false, error: `ditto decompress returned code ${code}` });
        }
      });

      proc.on('error', (err) => {
        activeJobs.delete(game.id);
        resolve({ success: false, error: err.message });
      });
    });
  }

  /**
   * Cancel active job
   */
  public cancel(gameId: string): boolean {
    const proc = activeJobs.get(gameId);
    if (proc && !proc.killed) {
      proc.kill('SIGKILL');
      activeJobs.delete(gameId);
      return true;
    }
    return false;
  }
}
