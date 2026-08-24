import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import type { Game, CompressionOptions, CompressionProgress, AppSettings } from '../renderer/src/types';
import { scanAllGames, scanCustomFolder } from './scanners';
import { CompressionEngineManager } from './engines';
import { getDriveInfos } from './utils/disk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
};

function loadSettings(): AppSettings {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      return { ...defaultSettings, ...data };
    }
  } catch {}
  return defaultSettings;
}

function saveSettings(settings: AppSettings) {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
  } catch {}
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#0a0d14',
    titleBarStyle: 'hiddenInset',
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
  return await engineManager.compress(game, options, (progress: CompressionProgress) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('compression-progress', progress);
    }
  });
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
