import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { Game } from '../../renderer/src/types';
import { getCompressionStats } from '../engines/size';

const execAsync = promisify(exec);

export async function scanGOGGames(): Promise<Game[]> {
  const games: Game[] = [];
  const isWindows = process.platform === 'win32';

  if (isWindows) {
    // Check HKLM\SOFTWARE\WOW6432Node\GOG.com\Games and HKLM\SOFTWARE\GOG.com\Games
    const regKeys = [
      'HKLM\\SOFTWARE\\WOW6432Node\\GOG.com\\Games',
      'HKLM\\SOFTWARE\\GOG.com\\Games',
    ];

    for (const regKey of regKeys) {
      try {
        const { stdout } = await execAsync(`reg query "${regKey}"`);
        const subKeys = stdout.split(/\r?\n/).filter(line => line.trim().startsWith('HKEY_'));
        
        for (const subKey of subKeys) {
          try {
            const { stdout: keyData } = await execAsync(`reg query "${subKey.trim()}"`);
            const nameMatch = keyData.match(/gameName\s+REG_SZ\s+(.*)/i);
            const pathMatch = keyData.match(/path\s+REG_SZ\s+(.*)/i);
            const idMatch = keyData.match(/gameID\s+REG_SZ\s+(.*)/i);

            if (nameMatch && pathMatch) {
              const name = nameMatch[1].trim();
              const installPath = path.normalize(pathMatch[1].trim());
              const appId = idMatch ? idMatch[1].trim() : subKey.split('\\').pop() || '';

              if (fs.existsSync(installPath)) {
                const stats = await getCompressionStats(installPath);
                games.push({
                  id: `gog-${appId}`,
                  name,
                  platform: 'gog',
                  installPath,
                  appId,
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
      } catch {}
    }
  }

  // Heroic GOG Linux / Windows config
  const home = os.homedir();
  const heroicGOGConfig = path.join(home, '.config', 'heroic', 'gog_store', 'installed.json');
  if (fs.existsSync(heroicGOGConfig)) {
    try {
      const data = JSON.parse(fs.readFileSync(heroicGOGConfig, 'utf-8'));
      if (Array.isArray(data.installed)) {
        for (const item of data.installed) {
          if (item.appName && item.install_path && fs.existsSync(item.install_path)) {
            const stats = await getCompressionStats(item.install_path);
            games.push({
              id: `heroic-gog-${item.appName}`,
              name: item.appName,
              platform: 'gog',
              installPath: item.install_path,
              appId: item.appName,
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

  return games;
}
