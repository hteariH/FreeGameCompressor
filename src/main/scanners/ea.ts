import fs from 'fs';
import path from 'path';
import type { Game } from '../../renderer/src/types';
import { getCompressionStats } from '../engines/size';

export async function scanEAGames(): Promise<Game[]> {
  const games: Game[] = [];
  if (process.platform !== 'win32') return games;

  const programData = process.env.ProgramData || 'C:\\ProgramData';
  const originLocalContent = path.join(programData, 'Origin', 'LocalContent');

  if (fs.existsSync(originLocalContent)) {
    try {
      const dirs = fs.readdirSync(originLocalContent);
      for (const d of dirs) {
        const itemPath = path.join(originLocalContent, d);
        if (fs.statSync(itemPath).isDirectory()) {
          // Check for .mfst files
          const files = fs.readdirSync(itemPath);
          for (const f of files) {
            if (f.endsWith('.mfst')) {
              try {
                const content = fs.readFileSync(path.join(itemPath, f), 'utf-8');
                const match = content.match(/dipinstallpath=(.*?)&/i);
                if (match) {
                  const installPath = decodeURIComponent(match[1].trim());
                  if (fs.existsSync(installPath)) {
                    const stats = await getCompressionStats(installPath);
                    games.push({
                      id: `ea-${d}`,
                      name: path.basename(installPath),
                      platform: 'ea',
                      installPath,
                      appId: d,
                      uncompressedSize: stats.uncompressedSize,
                      compressedSize: stats.compressedSize,
                      savedBytes: Math.max(0, stats.uncompressedSize - stats.compressedSize),
                      compressionRatio: stats.compressionRatio,
                      isCompressed: stats.isCompressed,
                      status: stats.isCompressed ? 'compressed' : 'uncompressed',
                      fileCount: stats.fileCount,
                    });
                  }
                }
              } catch {}
            }
          }
        }
      }
    } catch {}
  }

  return games;
}
