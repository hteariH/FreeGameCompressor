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

export type CompressionAlgorithm = 'XPRESS4K' | 'XPRESS8K' | 'XPRESS16K' | 'LZX' | 'ZSTD' | 'LZFSE';

export type CompressionStatus = 'uncompressed' | 'compressing' | 'compressed' | 'decompressing' | 'error';

export interface CommunityGameEstimate {
  gameId: string;
  gameName: string;
  appId?: string;
  totalSubmissions: number;
  avgSavedBytes: number;
  avgRatio: number;
  bestAlgorithm: CompressionAlgorithm;
  savingsPercent: number;
}

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
  communityEstimate?: CommunityGameEstimate;
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
  filesystem?: string; // e.g. "NTFS", "btrfs", "ext4", "APFS"
}

export interface AppSettings {
  defaultAlgorithm: CompressionAlgorithm;
  skipMediaFiles: boolean; // skip mp4, bik, zip, etc.
  customScanPaths: string[];
  enabledPlatforms: Record<Platform, boolean>;
  concurrentJobs: number;
  cpuLimitPercentage: number; // e.g. 30 (Wi-Fi safe), 50 (balanced), 100 (turbo)
  theme: 'dark' | 'midnight' | 'cyberpunk';
  autoScanOnStartup: boolean;
  notifyOnComplete: boolean;
  shareAnonymousStats: boolean;
  hasSeenConsentModal: boolean;
  communityServerUrl?: string;
}

export interface CompressionOptions {
  algorithm: CompressionAlgorithm;
  skipMediaFiles?: boolean;
  cpuLimitPercentage?: number;
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
  
  // Community Insights
  fetchCommunityEstimates: (games: Array<{ gameId: string; name: string; appId?: string }>) => Promise<Record<string, CommunityGameEstimate>>;
  submitCommunityReport: (report: any) => Promise<boolean>;
  fetchCommunityOverview: () => Promise<any>;

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
