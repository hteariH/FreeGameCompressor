import fs from 'fs';
import path from 'path';

export interface FileTimestamps {
  atimeMs: number;
  mtimeMs: number;
}

/**
 * Recursively captures all file atime and mtime timestamps within a directory
 */
export async function captureDirectoryTimestamps(dirPath: string): Promise<Map<string, FileTimestamps>> {
  const timestamps = new Map<string, FileTimestamps>();
  if (!fs.existsSync(dirPath)) return timestamps;

  let fileCount = 0;

  async function walk(currentDir: string) {
    try {
      const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        try {
          if (entry.isDirectory()) {
            await walk(fullPath);
          } else if (entry.isFile()) {
            const stat = await fs.promises.stat(fullPath);
            timestamps.set(fullPath, {
              atimeMs: stat.atimeMs,
              mtimeMs: stat.mtimeMs,
            });
            
            fileCount++;
            // Throttle the I/O storm: pause 5ms every 50 files
            // This prevents fs.stat from saturating the NVMe/PCIe bus and dropping Wi-Fi
            if (fileCount % 50 === 0) {
              await new Promise(resolve => setTimeout(resolve, 5));
            }
          }
        } catch {
          // ignore unreadable files
        }
      }
    } catch {
      // ignore unreadable dirs
    }
  }

  await walk(dirPath);
  return timestamps;
}

/**
 * Restores exact atime and mtime timestamps for all captured files
 * This prevents launchers like Steam, Epic, EA, Ubisoft from detecting modified dates and triggering unnecessary updates
 */
export function restoreDirectoryTimestamps(timestamps: Map<string, FileTimestamps>) {
  for (const [filePath, times] of timestamps.entries()) {
    try {
      if (fs.existsSync(filePath)) {
        fs.utimesSync(filePath, new Date(times.atimeMs), new Date(times.mtimeMs));
      }
    } catch {
      // Ignore files that cannot have utimes updated
    }
  }
}
