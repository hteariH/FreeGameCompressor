import type { Game, Platform } from '../../renderer/src/types';
import { scanSteamGames } from './steam';
import { scanEpicGames } from './epic';
import { scanGOGGames } from './gog';
import { scanUbisoftGames } from './ubisoft';
import { scanEAGames } from './ea';
import { scanXboxGames } from './xbox';
import { scanLutrisAndBottlesGames } from './lutris';
import { scanMacGames } from './mac';
import { scanCustomPaths, scanCustomFolder } from './custom';

export interface ScanOptions {
  enabledPlatforms?: Partial<Record<Platform, boolean>>;
  customPaths?: string[];
}

export async function scanAllGames(options: ScanOptions = {}): Promise<Game[]> {
  const enabled = {
    steam: true,
    epic: true,
    gog: true,
    ubisoft: true,
    ea: true,
    xbox: true,
    lutris: true,
    heroic: true,
    bottles: true,
    custom: true,
    ...options.enabledPlatforms,
  };

  const scanPromises: Promise<Game[]>[] = [];

  if (enabled.steam) {
    scanPromises.push(scanSteamGames().catch(() => []));
  }
  if (enabled.epic) {
    scanPromises.push(scanEpicGames().catch(() => []));
  }
  if (enabled.gog) {
    scanPromises.push(scanGOGGames().catch(() => []));
  }
  if (enabled.ubisoft) {
    scanPromises.push(scanUbisoftGames().catch(() => []));
  }
  if (enabled.ea) {
    scanPromises.push(scanEAGames().catch(() => []));
  }
  if (enabled.xbox) {
    scanPromises.push(scanXboxGames().catch(() => []));
  }
  if (enabled.lutris || enabled.bottles) {
    scanPromises.push(scanLutrisAndBottlesGames().catch(() => []));
  }
  if (process.platform === 'darwin') {
    scanPromises.push(scanMacGames().catch(() => []));
  }
  if (enabled.custom && options.customPaths && options.customPaths.length > 0) {
    scanPromises.push(scanCustomPaths(options.customPaths).catch(() => []));
  }

  const results = await Promise.all(scanPromises);
  const allGames = results.flat();

  // Deduplicate by installPath
  const uniqueMap = new Map<string, Game>();
  for (const game of allGames) {
    const key = game.installPath.toLowerCase();
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, game);
    }
  }

  return Array.from(uniqueMap.values());
}

export { scanCustomFolder };
