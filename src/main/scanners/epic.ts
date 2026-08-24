import fs from 'fs';
import path from 'path';
import os from 'os';
import type { Game } from '../../renderer/src/types';
import { getCompressionStats } from '../engines/size';

export async function scanEpicGames(): Promise<Game[]> {
  const games: Game[] = [];
  const isWindows = process.platform === 'win32';
  const isLinux = process.platform === 'linux';

  if (isWindows) {
    // Check ProgramData/Epic/EpicGamesLauncher/Data/Manifests
    const programData = process.env.ProgramData || 'C:\\ProgramData';
    const manifestsDir = path.join(programData, 'Epic', 'EpicGamesLauncher', 'Data', 'Manifests');

    if (fs.existsSync(manifestsDir)) {
      try {
        const files = fs.readdirSync(manifestsDir);
        for (const file of files) {
          if (file.endsWith('.item')) {
            try {
              const fullPath = path.join(manifestsDir, file);
              const data = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
              const name = data.DisplayName;
              const installPath = data.InstallLocation;
              const appName = data.AppName || data.CatalogItemId;

              if (name && installPath && fs.existsSync(installPath)) {
                const stats = await getCompressionStats(installPath);
                games.push({
                  id: `epic-${appName || file}`,
                  name,
                  platform: 'epic',
                  installPath,
                  appId: appName,
                  uncompressedSize: stats.uncompressedSize,
                  compressedSize: stats.compressedSize,
                  savedBytes: Math.max(0, stats.uncompressedSize - stats.compressedSize),
                  compressionRatio: stats.compressionRatio,
                  isCompressed: stats.isCompressed,
                  status: stats.isCompressed ? 'compressed' : 'uncompressed',
                  fileCount: stats.fileCount,
                });
              }
            } catch {}
          }
        }
      } catch {}
    }
  }

  // Linux: Heroic Games Launcher (Legendary / GOG / Nile)
  const home = os.homedir();
  const heroicLegendaryConfig = path.join(home, '.config', 'heroic', 'legendaryConfig', 'legendary', 'installed.json');
  if (fs.existsSync(heroicLegendaryConfig)) {
    try {
      const data = JSON.parse(fs.readFileSync(heroicLegendaryConfig, 'utf-8'));
      for (const [appName, info] of Object.entries<any>(data)) {
        if (info.title && info.install_path && fs.existsSync(info.install_path)) {
          const stats = await getCompressionStats(info.install_path);
          games.push({
            id: `heroic-epic-${appName}`,
            name: info.title,
            platform: 'epic',
            installPath: info.install_path,
            appId: appName,
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
