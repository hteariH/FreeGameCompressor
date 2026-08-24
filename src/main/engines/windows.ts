import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import type { Game, CompressionOptions, CompressionProgress, CompressionAlgorithm } from '../../renderer/src/types';
import { calculateDirectorySize, getCompressionStats } from './size';

const activeJobs = new Map<string, ChildProcess>();

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

    // Build compact.exe arguments
    // /c : Compress
    // /s : Subdirectories
    // /a : Hidden and system files
    // /i : Ignore errors and continue
    // /f : Force compression on all files
    // /exe:<algo> : WOF algorithm (XPRESS4K, XPRESS8K, XPRESS16K, LZX)
    const args = ['/c', `/s:${game.installPath}`, '/a', '/i', '/f', `/exe:${algorithm}`, '*'];

    return new Promise((resolve) => {
      // Spawn compact.exe
      const proc = spawn('compact.exe', args, {
        cwd: game.installPath,
        windowsHide: true,
      });

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
    onProgress: (progress: CompressionProgress) => void
  ): Promise<{ success: boolean; error?: string }> {
    const { totalBytes, fileCount } = await calculateDirectorySize(game.installPath);
    const totalFiles = Math.max(fileCount, 1);
    let processedFiles = 0;

    // First decompress WOF executables / files
    const argsExe = ['/u', `/s:${game.installPath}`, '/a', '/i', '/exe', '*'];

    return new Promise((resolve) => {
      const proc = spawn('compact.exe', argsExe, {
        cwd: game.installPath,
        windowsHide: true,
      });

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
          const proc2 = spawn('compact.exe', ['/u', `/s:${game.installPath}`, '/a', '/i', '*'], {
            cwd: game.installPath,
            windowsHide: true,
          });
          proc2.on('close', () => {
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
        // Kill process tree on Windows
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
