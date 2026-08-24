import fs from 'fs';
import path from 'path';
import type { Game } from '../../renderer/src/types';
import { getCompressionStats } from '../engines/size';

/**
 * Scan a single user-specified directory as a game folder
 */
export async function scanCustomFolder(dirPath: string): Promise<Game | null> {
  const normalized = path.normalize(dirPath);
  if (!fs.existsSync(normalized)) return null;

  try {
    const stat = fs.statSync(normalized);
    if (!stat.isDirectory()) return null;

    const gameName = path.basename(normalized);
    const stats = await getCompressionStats(normalized);

    // Look for potential executable
    let executablePath: string | undefined;
    try {
      const files = fs.readdirSync(normalized);
      const exeFile = files.find(f => {
        const lower = f.toLowerCase();
        return lower.endsWith('.exe') || lower.endsWith('.x86_64') || lower.endsWith('.bin') || lower.endsWith('.sh');
      });
      if (exeFile) {
        executablePath = path.join(normalized, exeFile);
      }
    } catch {}

    const game: Game = {
      id: `custom-${Buffer.from(normalized).toString('base64').replace(/=/g, '')}`,
      name: gameName,
      platform: 'custom',
      installPath: normalized,
      executablePath,
      uncompressedSize: stats.uncompressedSize,
      compressedSize: stats.compressedSize,
      savedBytes: Math.max(0, stats.uncompressedSize - stats.compressedSize),
      compressionRatio: stats.compressionRatio,
      isCompressed: stats.isCompressed,
      status: stats.isCompressed ? 'compressed' : 'uncompressed',
      fileCount: stats.fileCount,
    };

    return game;
  } catch {
    return null;
  }
}

/**
 * Scan a list of custom directories and their immediate subdirectories
 */
export async function scanCustomPaths(customPaths: string[]): Promise<Game[]> {
  const games: Game[] = [];
  const processedPaths = new Set<string>();

  for (const p of customPaths) {
    const normalized = path.normalize(p);
    if (!fs.existsSync(normalized) || processedPaths.has(normalized)) continue;
    processedPaths.add(normalized);

    try {
      const stat = fs.statSync(normalized);
      if (!stat.isDirectory()) continue;

      // Check if this directory itself is a game (has exes/binaries or game files)
      // or if it is a container of games (e.g. D:\Games\)
      const subItems = fs.readdirSync(normalized);
      const subDirs = subItems.filter(item => {
        try {
          return fs.statSync(path.join(normalized, item)).isDirectory();
        } catch {
          return false;
        }
      });

      // If it contains multiple subdirectories that look like games, scan each subfolder
      if (subDirs.length > 0 && !subItems.some(i => i.toLowerCase().endsWith('.exe'))) {
        for (const sub of subDirs) {
          const subPath = path.join(normalized, sub);
          const game = await scanCustomFolder(subPath);
          if (game && game.uncompressedSize > 0) {
            games.push(game);
          }
        }
      } else {
        const game = await scanCustomFolder(normalized);
        if (game && game.uncompressedSize > 0) {
          games.push(game);
        }
      }
    } catch {}
  }

  return games;
}
