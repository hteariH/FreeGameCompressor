export type Platform = 
  | 'steam' 
  | 'epic' 
  | 'gog' 
  | 'ubisoft' 
  | 'ea' 
  | 'xbox' 
  | 'lutris' 
  | 'heroic' 
  | 'bottles' 
  | 'custom';

export type CompressionAlgorithm = 'XPRESS4K' | 'XPRESS8K' | 'XPRESS16K' | 'LZX' | 'ZSTD';

export type CompressionStatus = 'uncompressed' | 'compressing' | 'compressed' | 'decompressing' | 'error';

export interface Game {
  id: string;
  name: string;
  platform: Platform;
  installPath: string;
  executablePath?: string;
  coverImage?: string;
  icon?: string;
  uncompressedSize: number; // in bytes
  compressedSize: number;   // in bytes
  savedBytes: number;       // in bytes
  compressionRatio: number; // e.g. 1.45 (1.45:1)
  isCompressed: boolean;
  status: CompressionStatus;
  algorithm?: CompressionAlgorithm;
  fileCount?: number;
  lastCompressedAt?: string;
  appId?: string;
}

export interface CompressionProgress {
  gameId: string;
  gameName: string;
  currentFile: string;
  processedFiles: number;
  totalFiles: number;
  processedBytes: number;
  totalBytes: number;
  savedBytes: number;
  percentage: number;
  speedBytesPerSec: number;
  estimatedRemainingSeconds: number;
  status: CompressionStatus;
  algorithm: CompressionAlgorithm;
  error?: string;
}

export interface DriveInfo {
  mount: string;       // e.g. "C:" or "/"
  label?: string;      // e.g. "Local Disk" or "NVMe SSD"
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
  savedBytes: number;  // Space saved by compressed games on this drive
  filesystem?: string; // e.g. "NTFS", "btrfs", "ext4"
}

export interface AppSettings {
  defaultAlgorithm: CompressionAlgorithm;
  skipMediaFiles: boolean; // skip mp4, bik, zip, etc.
  customScanPaths: string[];
  enabledPlatforms: Record<Platform, boolean>;
  concurrentJobs: number;
  theme: 'dark' | 'midnight' | 'cyberpunk';
  autoScanOnStartup: boolean;
  notifyOnComplete: boolean;
}

export interface CompressionOptions {
  algorithm: CompressionAlgorithm;
  skipMediaFiles?: boolean;
}

export interface ElectronAPI {
  scanGames: (options?: any) => Promise<Game[]>;
  scanCustomFolder: (folderPath: string) => Promise<Game | null>;
  selectFolder: () => Promise<string | null>;
  compressGame: (game: Game, options: CompressionOptions) => Promise<{ success: boolean; error?: string }>;
  decompressGame: (game: Game) => Promise<{ success: boolean; error?: string }>;
  cancelCompression: (gameId: string) => Promise<boolean>;
  onCompressionProgress: (callback: (progress: CompressionProgress) => void) => () => void;
  getDriveInfos: () => Promise<DriveInfo[]>;
  openInExplorer: (targetPath: string) => Promise<void>;
  launchGame: (game: Game) => Promise<void>;
  getPlatform: () => Promise<string>;
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: AppSettings) => Promise<void>;
  
  // Window Controls
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<boolean>;
  closeWindow: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
}

declare global {
  interface Window {
    api?: ElectronAPI;
  }
}
