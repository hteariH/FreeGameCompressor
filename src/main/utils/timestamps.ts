import fs from 'fs';
import path from 'path';

export interface FileTimestamps {
  atimeMs: number;
  mtimeMs: number;
}

/**
 * Recursively captures all file atime and mtime timestamps within a directory
 */
export function captureDirectoryTimestamps(dirPath: string): Map<string, FileTimestamps> {
  const timestamps = new Map<string, FileTimestamps>();
  if (!fs.existsSync(dirPath)) return timestamps;

  function walk(currentDir: string) {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        try {
          const stat = fs.statSync(fullPath);
          timestamps.set(fullPath, {
            atimeMs: stat.atimeMs,
            mtimeMs: stat.mtimeMs,
          });
          if (entry.isDirectory()) {
            walk(fullPath);
          }
        } catch {
          // Ignore unreadable files
        }
      }
    } catch {
      // Ignore unreadable directory
    }
  }

  walk(dirPath);
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
