import fs from 'fs';
import path from 'path';
import os from 'os';
import type { Game } from '../../renderer/src/types';
import { getCompressionStats } from '../engines/size';

export async function scanLutrisAndBottlesGames(): Promise<Game[]> {
  const games: Game[] = [];
  if (process.platform !== 'linux') return games;

  const home = os.homedir();

  // 1. Check Lutris games directory / configs
  const lutrisGamesDir = path.join(home, 'Games');
  if (fs.existsSync(lutrisGamesDir)) {
    try {
      const dirs = fs.readdirSync(lutrisGamesDir);
      for (const d of dirs) {
        const gamePath = path.join(lutrisGamesDir, d);
        if (fs.statSync(gamePath).isDirectory()) {
          const stats = await getCompressionStats(gamePath);
          games.push({
            id: `lutris-${d}`,
            name: d,
            platform: 'lutris',
            installPath: gamePath,
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

  // 2. Check Bottles
  const bottlesDir = path.join(home, '.local', 'share', 'bottles', 'bottles');
  if (fs.existsSync(bottlesDir)) {
    try {
      const dirs = fs.readdirSync(bottlesDir);
      for (const d of dirs) {
        const bottlePath = path.join(bottlesDir, d);
        if (fs.statSync(bottlePath).isDirectory()) {
          const stats = await getCompressionStats(bottlePath);
          games.push({
            id: `bottles-${d}`,
            name: `Bottle: ${d}`,
            platform: 'bottles',
            installPath: bottlePath,
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

  return games;
}
