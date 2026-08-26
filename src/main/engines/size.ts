import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface FolderSizeInfo {
  uncompressedSize: number;
  compressedSize: number;
  fileCount: number;
  isCompressed: boolean;
  compressionRatio: number;
}

/**
 * Recursively scans directory to calculate total size and file count
 */
export async function calculateDirectorySize(dirPath: string): Promise<{ totalBytes: number; fileCount: number }> {
  let totalBytes = 0;
  let fileCount = 0;

  async function walk(currentPath: string) {
    try {
      const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        try {
          if (entry.isDirectory()) {
            await walk(fullPath);
          } else if (entry.isFile()) {
            const stats = await fs.promises.stat(fullPath);
            totalBytes += stats.size;
            fileCount++;

            // Throttle the I/O storm: pause 5ms every 50 files
            // Prevents NVMe bus saturation before compact.exe even starts
            if (fileCount % 50 === 0) {
              await new Promise(resolve => setTimeout(resolve, 5));
            }
          }
        } catch {
          // skip inaccessible files
        }
      }
    } catch {
      // ignore
    }
  }

  await walk(dirPath);
  return { totalBytes, fileCount };
}

export async function scanGameDirectory(dirPath: string): Promise<{
  files: string[];
  totalBytes: number;
  timestamps: Map<string, { atimeMs: number; mtimeMs: number }>;
}> {
  const files: string[] = [];
  let totalBytes = 0;
  const timestamps = new Map<string, { atimeMs: number; mtimeMs: number }>();

  async function walk(currentPath: string) {
    try {
      const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        try {
          if (entry.isDirectory()) {
            await walk(fullPath);
          } else if (entry.isFile()) {
            const stat = await fs.promises.stat(fullPath);
            files.push(fullPath);
            totalBytes += stat.size;
            timestamps.set(fullPath, { atimeMs: stat.atimeMs, mtimeMs: stat.mtimeMs });
            
            // Limit to ~1000 stats/sec to prevent Defender NAT/Port exhaustion
            if (files.length % 50 === 0) {
              await new Promise(r => setTimeout(r, 50));
            }
          }
        } catch { }
      }
    } catch { }
  }

  await walk(dirPath);
  return { files, totalBytes, timestamps };
}

export async function getAllFiles(dirPath: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(currentPath: string) {
    try {
      const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        try {
          if (entry.isDirectory()) {
            await walk(fullPath);
          } else if (entry.isFile()) {
            files.push(fullPath);
            if (files.length % 50 === 0) {
              await new Promise(resolve => setTimeout(resolve, 5));
            }
          }
        } catch {
          // skip inaccessible
        }
      }
    } catch {
      // ignore
    }
  }

  await walk(dirPath);
  return files;
}

/**
 * Gets detailed size & compression information for a game folder
 */
export async function getCompressionStats(dirPath: string): Promise<FolderSizeInfo> {
  const isWindows = process.platform === 'win32';
  const isLinux = process.platform === 'linux';

  if (!fs.existsSync(dirPath)) {
    return {
      uncompressedSize: 0,
      compressedSize: 0,
      fileCount: 0,
      isCompressed: false,
      compressionRatio: 1.0,
    };
  }

  if (isWindows) {
    try {
      // Run chcp 437 to force English output, so the regex matches on any language Windows
      const { stdout } = await execAsync(`chcp 437 && compact /q /s:"${dirPath}" *`, { maxBuffer: 10 * 1024 * 1024 });
      
      // Parse output language-agnostically by reading the last few lines
      const lines = stdout.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length >= 4) {
        // Last line: "The compression ratio is 1.5 to 1."
        const ratioLine = lines[lines.length - 1];
        // 2nd to last: "12,345,678 total bytes of data are stored in 8,234,567 bytes."
        const bytesLine = lines[lines.length - 2];
        // 3rd to last: "110 are compressed and 10 are not compressed."
        const compressedLine = lines[lines.length - 3];
        // 4th to last: "Of 120 files within 10 directories"
        const filesLine = lines[lines.length - 4];

        const extractNumbers = (str: string) => str.match(/\d+(?:[.,\s]\d+)*/g)?.map(n => parseInt(n.replace(/\D/g, ''), 10)) || [];
        const bytesNums = extractNumbers(bytesLine);
        const compNums = extractNumbers(compressedLine);
        const filesNums = extractNumbers(filesLine);

        if (bytesNums.length >= 2) {
          const uncompressed = bytesNums[0];
          const compressed = bytesNums[1];
          const fileCount = filesNums.length >= 1 ? filesNums[0] : 0;
          const compressedCount = compNums.length >= 1 ? compNums[0] : 0;
          
          const ratioMatch = ratioLine.match(/(\d+[.,]\d+)/);
          const parsedRatio = ratioMatch ? parseFloat(ratioMatch[1].replace(',', '.')) : (compressed > 0 ? uncompressed / compressed : 1.0);

          return {
            uncompressedSize: uncompressed,
            compressedSize: compressed,
            fileCount: fileCount,
            isCompressed: compressedCount > 0 && compressed < uncompressed * 0.95,
            compressionRatio: Math.max(1.0, parseFloat(parsedRatio.toFixed(2))),
          };
        }
      }
    } catch {
      // Compact query failed (or path has special chars), fallback to manual scan
    }
  } else if (isLinux) {
    try {
      // Check with compsize if btrfs
      const { stdout } = await execAsync(`compsize "${dirPath}" 2>/dev/null || true`);
      // Parse compsize:
      // "Processed 500 files, 1234567 regular extents (1234567 data, 0 inline)"
      // "Type       Perc     Disk Usage   Uncompressed Data"
      // "TOTAL      65%      650M         1.0G"
      const totalLine = stdout.split('\n').find(l => l.trim().startsWith('TOTAL'));
      if (totalLine) {
        const parts = totalLine.trim().split(/\s+/);
        if (parts.length >= 4) {
          // e.g. TOTAL, 65%, 650M, 1.0G
          const perc = parseInt(parts[1].replace('%', ''), 10);
          const ratio = perc > 0 ? 100 / perc : 1.0;
          const { totalBytes, fileCount } = await calculateDirectorySize(dirPath);
          const compressedBytes = Math.round(totalBytes * (perc / 100));
          return {
            uncompressedSize: totalBytes,
            compressedSize: compressedBytes,
            fileCount,
            isCompressed: perc < 95,
            compressionRatio: Math.max(1.0, parseFloat(ratio.toFixed(2))),
          };
        }
      }
    } catch {
      // compsize not installed or non-btrfs
    }
  }

  // Generic fallback
  const { totalBytes, fileCount } = await calculateDirectorySize(dirPath);
  return {
    uncompressedSize: totalBytes,
    compressedSize: totalBytes,
    fileCount,
    isCompressed: false,
    compressionRatio: 1.0,
  };
}
