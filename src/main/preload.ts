import { contextBridge, ipcRenderer } from 'electron';
import type { Game, CompressionOptions, CompressionProgress, DriveInfo, AppSettings, Platform } from '../renderer/src/types';

export const api = {
  scanGames: (options?: any): Promise<Game[]> => ipcRenderer.invoke('scan-games', options),
  scanCustomFolder: (folderPath: string): Promise<Game | null> => ipcRenderer.invoke('scan-custom-folder', folderPath),
  selectFolder: (): Promise<string | null> => ipcRenderer.invoke('select-folder'),
  
  compressGame: (game: Game, options: CompressionOptions): Promise<{ success: boolean; error?: string }> => 
    ipcRenderer.invoke('compress-game', game, options),
  decompressGame: (game: Game): Promise<{ success: boolean; error?: string }> => 
    ipcRenderer.invoke('decompress-game', game),
  cancelCompression: (gameId: string): Promise<boolean> => 
    ipcRenderer.invoke('cancel-compression', gameId),

  onCompressionProgress: (callback: (progress: CompressionProgress) => void) => {
    const subscription = (_event: any, progress: CompressionProgress) => callback(progress);
    ipcRenderer.on('compression-progress', subscription);
    return () => {
      ipcRenderer.removeListener('compression-progress', subscription);
    };
  },

  getDriveInfos: (): Promise<DriveInfo[]> => ipcRenderer.invoke('get-drive-infos'),
  openInExplorer: (targetPath: string): Promise<void> => ipcRenderer.invoke('open-in-explorer', targetPath),
  launchGame: (game: Game): Promise<void> => ipcRenderer.invoke('launch-game', game),
  
  getPlatform: (): Promise<string> => ipcRenderer.invoke('get-platform'),
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: AppSettings): Promise<void> => ipcRenderer.invoke('save-settings', settings),

  // Window Controls
  minimizeWindow: (): Promise<void> => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: (): Promise<boolean> => ipcRenderer.invoke('window-maximize'),
  closeWindow: (): Promise<void> => ipcRenderer.invoke('window-close'),
  isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window-is-maximized'),
};

contextBridge.exposeInMainWorld('api', api);

export type ElectronAPI = typeof api;
