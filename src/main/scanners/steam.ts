import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { Game } from '../../renderer/src/types';
import { parseVDF } from '../utils/vdf';
import { getCompressionStats } from '../engines/size';

const execAsync = promisify(exec);

export async function scanSteamGames(): Promise<Game[]> {
  const games: Game[] = [];
  const isWindows = process.platform === 'win32';
  const isLinux = process.platform === 'linux';
  const steamPaths: string[] = [];

  if (isWindows) {
    // 1. Check registry for SteamPath
    try {
      const { stdout } = await execAsync(
        'reg query "HKCU\\Software\\Valve\\Steam" /v SteamPath'
      );
      const match = stdout.match(/SteamPath\s+REG_SZ\s+(.*)/i);
      if (match && match[1]) {
        steamPaths.push(path.normalize(match[1].trim()));
      }
    } catch {}

    // 2. Default Windows fallback paths
    const defaults = [
      'C:\\Program Files (x86)\\Steam',
      'C:\\Program Files\\Steam',
      'D:\\Steam',
      'E:\\Steam',
      'D:\\SteamLibrary',
      'E:\\SteamLibrary',
    ];
    for (const d of defaults) {
      if (fs.existsSync(d) && !steamPaths.includes(path.normalize(d))) {
        steamPaths.push(path.normalize(d));
      }
    }
  } else if (isLinux) {
    const home = os.homedir();
    const linuxSteamPaths = [
      path.join(home, '.steam', 'steam'),
      path.join(home, '.local', 'share', 'Steam'),
      path.join(home, '.var', 'app', 'com.valvesoftware.Steam', '.local', 'share', 'Steam'), // Flatpak
    ];
    for (const p of linuxSteamPaths) {
      if (fs.existsSync(p)) {
        steamPaths.push(p);
      }
    }
  } else if (process.platform === 'darwin') {
    const home = os.homedir();
    const macSteamPath = path.join(home, 'Library', 'Application Support', 'Steam');
    if (fs.existsSync(macSteamPath)) {
      steamPaths.push(macSteamPath);
    }
  }

  // Set of unique library directories to scan
  const libraryFolders = new Set<string>();

  for (const sPath of steamPaths) {
    if (!fs.existsSync(sPath)) continue;
    libraryFolders.add(sPath);

    // Read steamapps/libraryfolders.vdf
    const vdfPath = path.join(sPath, 'steamapps', 'libraryfolders.vdf');
    if (fs.existsSync(vdfPath)) {
      try {
        const vdfContent = fs.readFileSync(vdfPath, 'utf-8');
        const parsed = parseVDF(vdfContent);
        
        // libraryfolders can have keys "0", "1", "2" or "libraryfolders" object
        const root = parsed.libraryfolders || parsed;
        for (const key of Object.keys(root)) {
          const item = root[key];
          if (typeof item === 'object' && item !== null) {
            if (item.path && typeof item.path === 'string') {
              libraryFolders.add(path.normalize(item.path));
            }
          }
        }
      } catch (err) {
        console.error('Error parsing libraryfolders.vdf:', err);
      }
    }
  }

  // Scan all library folders for appmanifest_*.acf
  for (const libPath of libraryFolders) {
    const steamappsDir = path.join(libPath, 'steamapps');
    if (!fs.existsSync(steamappsDir)) continue;

    try {
      const files = fs.readdirSync(steamappsDir);
      for (const file of files) {
        if (file.startsWith('appmanifest_') && file.endsWith('.acf')) {
          try {
            const acfPath = path.join(steamappsDir, file);
            const content = fs.readFileSync(acfPath, 'utf-8');
            const parsed = parseVDF(content);
            const appState = parsed.AppState || parsed;

            const appId = appState.appid || appState.appId;
            const name = appState.name;
            const installdir = appState.installdir;

            // Filter out Steamworks Common Redistributables, Proton, etc. if desired, or keep games
            if (!name || !installdir || !appId) continue;
            // Ignore standard Steam redistributables / proton runtimes
            if (['228980', '1070560', '1391110'].includes(String(appId))) continue;

            const installPath = path.join(steamappsDir, 'common', installdir);
            if (!fs.existsSync(installPath)) continue;

            const coverImage = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;
            const stats = await getCompressionStats(installPath);

            games.push({
              id: `steam-${appId}`,
              name,
              platform: 'steam',
              installPath,
              appId: String(appId),
              coverImage,
              uncompressedSize: stats.uncompressedSize,
              compressedSize: stats.compressedSize,
              savedBytes: Math.max(0, stats.uncompressedSize - stats.compressedSize),
              compressionRatio: stats.compressionRatio,
              isCompressed: stats.isCompressed,
              status: stats.isCompressed ? 'compressed' : 'uncompressed',
              fileCount: stats.fileCount,
            });
          } catch (e) {
            // ignore individual corrupted manifest
          }
        }
      }
    } catch {}
  }

  return games;
}
