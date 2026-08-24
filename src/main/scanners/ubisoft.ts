import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { Game } from '../../renderer/src/types';
import { getCompressionStats } from '../engines/size';

const execAsync = promisify(exec);

export async function scanUbisoftGames(): Promise<Game[]> {
  const games: Game[] = [];
  if (process.platform !== 'win32') return games;

  const regKey = 'HKLM\\SOFTWARE\\WOW6432Node\\Ubisoft\\Launcher\\Installs';
  try {
    const { stdout } = await execAsync(`reg query "${regKey}"`);
    const subKeys = stdout.split(/\r?\n/).filter(line => line.trim().startsWith('HKEY_'));

    for (const subKey of subKeys) {
      try {
        const { stdout: keyData } = await execAsync(`reg query "${subKey.trim()}"`);
        const installDirMatch = keyData.match(/InstallDir\s+REG_SZ\s+(.*)/i);
        const appId = subKey.split('\\').pop() || '';

        if (installDirMatch) {
          const rawPath = installDirMatch[1].trim();
          const installPath = path.normalize(rawPath.replace(/\//g, '\\'));
          if (fs.existsSync(installPath)) {
            const gameName = path.basename(installPath);
            const stats = await getCompressionStats(installPath);
            games.push({
              id: `ubisoft-${appId}`,
              name: gameName,
              platform: 'ubisoft',
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

  return games;
}
