import fs from 'fs';
import path from 'path';
import type { Game } from '../../renderer/src/types';
import { getCompressionStats } from '../engines/size';

export async function scanXboxGames(): Promise<Game[]> {
  const games: Game[] = [];
  if (process.platform !== 'win32') return games;

  // Xbox Games are commonly located in <Drive>:\XboxGames
  const drives = ['C:', 'D:', 'E:', 'F:', 'G:', 'H:', 'Z:'];
  for (const drive of drives) {
    const xboxFolder = path.join(drive + '\\', 'XboxGames');
    if (fs.existsSync(xboxFolder)) {
      try {
        const subdirs = fs.readdirSync(xboxFolder);
        for (const sub of subdirs) {
          const gamePath = path.join(xboxFolder, sub);
          if (fs.statSync(gamePath).isDirectory()) {
            const stats = await getCompressionStats(gamePath);
            games.push({
              id: `xbox-${sub}`,
              name: sub,
              platform: 'xbox',
              installPath: gamePath,
              appId: sub,
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

  return games;
}
