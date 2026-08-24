import fs from 'fs';
import path from 'path';
import os from 'os';
import type { Game } from '../../renderer/src/types';
import { getCompressionStats } from '../engines/size';

/**
 * Scan macOS specific games in /Applications, ~/Applications, and Whisky/CrossOver bottles
 */
export async function scanMacGames(): Promise<Game[]> {
  const games: Game[] = [];
  if (process.platform !== 'darwin') return games;

  const home = os.homedir();

  // 1. Scan /Applications and ~/Applications for Game apps
  const appDirs = ['/Applications', path.join(home, 'Applications'), path.join(home, 'Games')];
  const knownGameKeywords = ['game', 'steam', 'gog', 'epic', 'resident evil', 'death stranding', 'lies of p', 'baldurs gate', 'hades', 'tomb raider', 'cyberpunk', 'minecraft', 'roblox', 'world of warcraft', 'diablo', 'league of legends'];

  for (const appDir of appDirs) {
    if (!fs.existsSync(appDir)) continue;
    try {
      const items = fs.readdirSync(appDir);
      for (const item of items) {
        if (item.endsWith('.app')) {
          const appPath = path.join(appDir, item);
          const name = item.replace(/\.app$/, '');
          const lowerName = name.toLowerCase();

          // Check if it has a Game signature in Info.plist or category
          let isGame = knownGameKeywords.some(k => lowerName.includes(k));
          const plistPath = path.join(appPath, 'Contents', 'Info.plist');
          if (fs.existsSync(plistPath)) {
            try {
              const plist = fs.readFileSync(plistPath, 'utf-8');
              if (plist.includes('public.app-category.games') || plist.includes('LSApplicationCategoryType.games') || isGame) {
                isGame = true;
              }
            } catch {}
          }

          if (isGame) {
            const stats = await getCompressionStats(appPath);
            games.push({
              id: `mac-${Buffer.from(appPath).toString('base64').replace(/=/g, '')}`,
              name,
              platform: 'custom',
              installPath: appPath,
              executablePath: appPath,
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
      }
    } catch {}
  }

  // 2. Scan Whisky Bottles (Windows games on Apple Silicon)
  const whiskyDir = path.join(home, 'Library', 'Application Support', 'com.isaacmarovitz.Whisky', 'Bottles');
  if (fs.existsSync(whiskyDir)) {
    try {
      const bottles = fs.readdirSync(whiskyDir);
      for (const bottle of bottles) {
        const bottlePath = path.join(whiskyDir, bottle, 'drive_c', 'Program Files (x86)');
        if (fs.existsSync(bottlePath)) {
          const subdirs = fs.readdirSync(bottlePath);
          for (const sub of subdirs) {
            const gamePath = path.join(bottlePath, sub);
            if (fs.statSync(gamePath).isDirectory() && sub !== 'Common Files' && sub !== 'Internet Explorer') {
              const stats = await getCompressionStats(gamePath);
              games.push({
                id: `whisky-${bottle}-${sub}`,
                name: `${sub} (Whisky)`,
                platform: 'custom',
                installPath: gamePath,
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
        }
      }
    } catch {}
  }

  return games;
}
