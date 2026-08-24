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
          }
        } catch {
          // skip inaccessible files
        }
      }
    } catch {
      // skip inaccessible directories
    }
  }

  await walk(dirPath);
  return { totalBytes, fileCount };
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
      // Run compact /q /s:"dirPath" * to get exact compressed vs uncompressed bytes
      const { stdout } = await execAsync(`compact /q /s:"${dirPath}" *`, { maxBuffer: 10 * 1024 * 1024 });
      
      // Parse output:
      // "12,345,678 total bytes of data are stored in 8,234,567 bytes."
      // "The compression ratio is 1.5 to 1."
      // "Of 120 files within 10 directories 110 are compressed and 10 are not compressed."
      const bytesMatch = stdout.match(/([\d,]+)\s+total bytes of data are stored in\s+([\d,]+)\s+bytes/i);
      const filesMatch = stdout.match(/Of\s+([\d,]+)\s+files within\s+([\d,]+)\s+directories\s+([\d,]+)\s+are compressed/i);
      const ratioMatch = stdout.match(/compression ratio is\s+([\d\.]+)\s+to\s+1/i);

      if (bytesMatch) {
        const uncompressed = parseInt(bytesMatch[1].replace(/,/g, ''), 10);
        const compressed = parseInt(bytesMatch[2].replace(/,/g, ''), 10);
        const ratio = ratioMatch ? parseFloat(ratioMatch[1]) : (compressed > 0 ? uncompressed / compressed : 1.0);
        const fileCount = filesMatch ? parseInt(filesMatch[1].replace(/,/g, ''), 10) : 0;
        const compressedCount = filesMatch ? parseInt(filesMatch[3].replace(/,/g, ''), 10) : 0;

        return {
          uncompressedSize: uncompressed,
          compressedSize: compressed,
          fileCount: fileCount,
          isCompressed: compressedCount > 0 && compressed < uncompressed * 0.95,
          compressionRatio: Math.max(1.0, parseFloat(ratio.toFixed(2))),
        };
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
