import { app, BrowserWindow, ipcMain, dialog, shell, nativeImage } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import type { Game, CompressionOptions, CompressionProgress, AppSettings } from '../renderer/src/types';
import { scanAllGames, scanCustomFolder } from './scanners';
import { CompressionEngineManager } from './engines';
import { getDriveInfos } from './utils/disk';
import { communityService } from './services/community';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set App User Model ID for Windows Taskbar icon grouping and pinning
if (process.platform === 'win32') {
  app.setAppUserModelId('com.antigravity.freegamecompressor');
}

let mainWindow: BrowserWindow | null = null;
const engineManager = new CompressionEngineManager();

// Settings file path in userData
const settingsPath = path.join(app.getPath('userData'), 'settings.json');

const defaultSettings: AppSettings = {
  defaultAlgorithm: 'LZX',
  skipMediaFiles: false,
  customScanPaths: [],
  enabledPlatforms: {
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
  },
  concurrentJobs: 1,
  theme: 'dark',
  autoScanOnStartup: true,
  notifyOnComplete: true,
  shareAnonymousStats: true,
  hasSeenConsentModal: false,
  communityServerUrl: 'http://hw.falsetrue.net:8090',
};

function loadSettings(): AppSettings {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      const merged = { ...defaultSettings, ...data };
      if (merged.communityServerUrl) {
        communityService.setServerUrl(merged.communityServerUrl);
      }
      return merged;
    }
  } catch {}
  return defaultSettings;
}

function saveSettings(settings: AppSettings) {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
    if (settings.communityServerUrl) {
      communityService.setServerUrl(settings.communityServerUrl);
    }
  } catch {}
}

function getAppIcon() {
  const possiblePaths = [
    path.join(__dirname, '../build/icon.ico'),
    path.join(__dirname, '../build/icon.png'),
    path.join(__dirname, 'icon.ico'),
    path.join(__dirname, 'icon.png'),
    path.join(process.resourcesPath, 'build', 'icon.ico'),
    path.join(process.resourcesPath, 'build', 'icon.png'),
    path.join(process.resourcesPath, 'icon.ico'),
    path.join(process.resourcesPath, 'icon.png'),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return nativeImage.createFromPath(p);
    }
  }
  return undefined;
}

function createWindow() {
  const appIcon = getAppIcon();
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    frame: false,
    icon: appIcon,
    backgroundColor: '#0a0d14',
    webPreferences: {
      preload: fs.existsSync(path.join(__dirname, 'preload.js'))
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handler Registrations

ipcMain.handle('window-minimize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.minimize();
  }
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
      return false;
    } else {
      mainWindow.maximize();
      return true;
    }
  }
  return false;
});

ipcMain.handle('window-close', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow && !mainWindow.isDestroyed() ? mainWindow.isMaximized() : false;
});

ipcMain.handle('get-platform', () => {
  return process.platform;
});

ipcMain.handle('get-settings', () => {
  return loadSettings();
});

ipcMain.handle('save-settings', (_event, settings: AppSettings) => {
  saveSettings(settings);
});

ipcMain.handle('get-drive-infos', async () => {
  return await getDriveInfos();
});

ipcMain.handle('scan-games', async (_event, options) => {
  const currentSettings = loadSettings();
  const scanOpts = {
    enabledPlatforms: currentSettings.enabledPlatforms,
    customPaths: currentSettings.customScanPaths,
    ...options,
  };
  return await scanAllGames(scanOpts);
});

ipcMain.handle('scan-custom-folder', async (_event, folderPath: string) => {
  return await scanCustomFolder(folderPath);
});

ipcMain.handle('select-folder', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Game Directory',
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

ipcMain.handle('open-in-explorer', async (_event, targetPath: string) => {
  if (fs.existsSync(targetPath)) {
    shell.openPath(targetPath);
  }
});

ipcMain.handle('launch-game', async (_event, game: Game) => {
  if (game.platform === 'steam' && game.appId) {
    shell.openExternal(`steam://rungameid/${game.appId}`);
  } else if (game.platform === 'epic' && game.appId) {
    shell.openExternal(`com.epicgames.launcher://apps/${game.appId}?action=launch&silent=true`);
  } else if (game.executablePath && fs.existsSync(game.executablePath)) {
    shell.openPath(game.executablePath);
  } else if (fs.existsSync(game.installPath)) {
    shell.openPath(game.installPath);
  }
});

ipcMain.handle('compress-game', async (_event, game: Game, options: CompressionOptions) => {
  const result = await engineManager.compress(game, options, (progress: CompressionProgress) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('compression-progress', progress);
    }
  });

  // Submit anonymous crowdsourced compression report if user opted in
  if (result.success) {
    const currentSettings = loadSettings();
    if (currentSettings.shareAnonymousStats) {
      communityService.submitReport({
        gameId: game.id,
        gameName: game.name,
        appId: game.appId,
        platform: game.platform,
        uncompressedBytes: game.uncompressedSize,
        compressedBytes: game.uncompressedSize - (game.savedBytes || 0),
        savedBytes: game.savedBytes || 0,
        ratio: game.compressionRatio || 1.45,
        algorithm: options.algorithm || 'LZX',
        os: process.platform,
      }).catch(() => {});
    }
  }

  return result;
});

ipcMain.handle('decompress-game', async (_event, game: Game) => {
  return await engineManager.decompress(game, (progress: CompressionProgress) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('compression-progress', progress);
    }
  });
});

ipcMain.handle('cancel-compression', (_event, gameId: string) => {
  return engineManager.cancel(gameId);
});

// Community Insights Handlers
ipcMain.handle('fetch-community-estimates', async (_event, games) => {
  return await communityService.fetchEstimates(games);
});

ipcMain.handle('submit-community-report', async (_event, report) => {
  return await communityService.submitReport(report);
});

ipcMain.handle('fetch-community-overview', async () => {
  return await communityService.fetchOverview();
});
