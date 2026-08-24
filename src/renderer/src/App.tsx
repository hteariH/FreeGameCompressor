import React, { useState, useEffect, useMemo } from 'react';
import type { 
  Game, 
  Platform, 
  DriveInfo, 
  AppSettings, 
  CompressionProgress, 
  CompressionAlgorithm 
} from './types';
import { Header } from './components/Header';
import { StatsOverview } from './components/StatsOverview';
import { GameGrid } from './components/GameGrid';
import { GameTable } from './components/GameTable';
import { CompressionModal } from './components/CompressionModal';
import { GameDetailModal } from './components/GameDetailModal';
import { BatchQueueModal } from './components/BatchQueueModal';
import { SettingsModal } from './components/SettingsModal';
import { CustomFolderAdd } from './components/CustomFolderAdd';

export const App: React.FC = () => {
  // Main Data States
  const [games, setGames] = useState<Game[]>([]);
  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
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
  });

  // UI & Filter States
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'uncompressed' | 'compressed'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals & Active Operation States
  const [selectedGameForDetails, setSelectedGameForDetails] = useState<Game | null>(null);
  const [activeProgress, setActiveProgress] = useState<CompressionProgress | null>(null);
  const [showBatchModal, setShowBatchModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showAddCustomModal, setShowAddCustomModal] = useState<boolean>(false);

  // Load initial data & register listeners
  useEffect(() => {
    const init = async () => {
      if (window.api) {
        try {
          const loadedSettings = await window.api.getSettings();
          if (loadedSettings) setSettings(loadedSettings);
        } catch {}

        await refreshDrives();
        await refreshLibrary();

        // Subscribe to compression progress events
        window.api.onCompressionProgress((progress: CompressionProgress) => {
          setActiveProgress(progress);
          
          // Update game status in list if finished
          if (progress.status === 'compressed' || progress.status === 'uncompressed') {
            refreshLibrary();
            refreshDrives();
          }
        });
      }
    };
    init();
  }, []);

  const refreshDrives = async () => {
    if (window.api) {
      try {
        const driveData = await window.api.getDriveInfos();
        setDrives(driveData);
      } catch (err) {
        console.error('Failed to get drive infos:', err);
      }
    }
  };

  const refreshLibrary = async () => {
    if (!window.api) return;
    setIsScanning(true);
    try {
      const scannedGames = await window.api.scanGames();
      setGames(scannedGames);
    } catch (err) {
      console.error('Failed to scan games:', err);
    } finally {
      setIsScanning(false);
    }
  };

  // Compression Handlers
  const handleCompress = async (
    game: Game, 
    algorithm?: CompressionAlgorithm, 
    skipMedia?: boolean
  ) => {
    if (!window.api) return;
    const algo = algorithm || settings.defaultAlgorithm || 'LZX';
    const skip = skipMedia !== undefined ? skipMedia : settings.skipMediaFiles;

    // Initialize progress state immediately
    setActiveProgress({
      gameId: game.id,
      gameName: game.name,
      currentFile: 'Starting compression...',
      processedFiles: 0,
      totalFiles: game.fileCount || 1,
      processedBytes: 0,
      totalBytes: game.uncompressedSize,
      savedBytes: 0,
      percentage: 0,
      speedBytesPerSec: 0,
      estimatedRemainingSeconds: 0,
      status: 'compressing',
      algorithm: algo,
    });

    try {
      await window.api.compressGame(game, { algorithm: algo, skipMediaFiles: skip });
    } catch (err: any) {
      setActiveProgress(prev => prev ? { ...prev, status: 'error', error: err?.message || 'Compression error' } : null);
    }
  };

  const handleDecompress = async (game: Game) => {
    if (!window.api) return;

    setActiveProgress({
      gameId: game.id,
      gameName: game.name,
      currentFile: 'Restoring uncompressed files...',
      processedFiles: 0,
      totalFiles: game.fileCount || 1,
      processedBytes: 0,
      totalBytes: game.uncompressedSize,
      savedBytes: 0,
      percentage: 0,
      speedBytesPerSec: 0,
      estimatedRemainingSeconds: 0,
      status: 'decompressing',
      algorithm: 'LZX',
    });

    try {
      await window.api.decompressGame(game);
    } catch (err: any) {
      setActiveProgress(prev => prev ? { ...prev, status: 'error', error: err?.message || 'Decompression error' } : null);
    }
  };

  const handleCancelCompression = async () => {
    if (!window.api || !activeProgress) return;
    await window.api.cancelCompression(activeProgress.gameId);
    setActiveProgress(null);
    refreshLibrary();
  };

  const handleStartBatch = async (selectedGames: Game[], algorithm: CompressionAlgorithm) => {
    for (const game of selectedGames) {
      await handleCompress(game, algorithm);
    }
  };

  // Utilities
  const handleOpenFolder = (folderPath: string) => {
    if (window.api) window.api.openInExplorer(folderPath);
  };

  const handleLaunch = (game: Game) => {
    if (window.api) window.api.launchGame(game);
  };

  const handleSelectDirectory = async (): Promise<string | null> => {
    if (window.api) {
      return await window.api.selectFolder();
    }
    return null;
  };

  const handleScanSingleFolder = async (folderPath: string): Promise<Game | null> => {
    if (window.api) {
      return await window.api.scanCustomFolder(folderPath);
    }
    return null;
  };

  const handleAddCustomGame = (newGame: Game) => {
    setGames(prev => {
      const exists = prev.some(g => g.installPath.toLowerCase() === newGame.installPath.toLowerCase());
      if (exists) return prev;
      return [newGame, ...prev];
    });
  };

  const handleSaveSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    if (window.api) {
      await window.api.saveSettings(newSettings);
      refreshLibrary();
    }
  };

  // Filtered Games computation
  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = game.name.toLowerCase().includes(q);
        const matchesPath = game.installPath.toLowerCase().includes(q);
        if (!matchesName && !matchesPath) return false;
      }

      // Platform filter
      if (selectedPlatform !== 'all' && game.platform !== selectedPlatform) {
        return false;
      }

      // Compression Status filter
      if (filterStatus === 'uncompressed' && game.isCompressed) {
        return false;
      }
      if (filterStatus === 'compressed' && !game.isCompressed) {
        return false;
      }

      return true;
    });
  }, [games, searchQuery, selectedPlatform, filterStatus]);

  const uncompressedCount = games.filter(g => !g.isCompressed).length;

  return (
    <div className="flex flex-col h-screen w-screen bg-background text-slate-100 overflow-hidden select-none">
      {/* Top Navigation Bar */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        selectedPlatform={selectedPlatform}
        onPlatformChange={setSelectedPlatform}
        filterStatus={filterStatus}
        onFilterStatusChange={setFilterStatus}
        isScanning={isScanning}
        onRefresh={refreshLibrary}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenAddCustom={() => setShowAddCustomModal(true)}
        onOpenBatchQueue={() => setShowBatchModal(true)}
        uncompressedCount={uncompressedCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-12">
        {/* Storage Stats Dashboard */}
        <StatsOverview games={games} drives={drives} />

        {/* Game List Display */}
        {viewMode === 'grid' ? (
          <GameGrid
            games={filteredGames}
            onCompress={(g) => handleCompress(g)}
            onDecompress={handleDecompress}
            onOpenDetails={setSelectedGameForDetails}
            onOpenFolder={handleOpenFolder}
            onLaunch={handleLaunch}
            onOpenAddCustom={() => setShowAddCustomModal(true)}
          />
        ) : (
          <GameTable
            games={filteredGames}
            onCompress={(g) => handleCompress(g)}
            onDecompress={handleDecompress}
            onOpenDetails={setSelectedGameForDetails}
            onOpenFolder={handleOpenFolder}
            onLaunch={handleLaunch}
          />
        )}
      </main>

      {/* Modals */}
      {/* 1. Live Compression Progress Modal */}
      {activeProgress && (
        <CompressionModal
          progress={activeProgress}
          onCancel={handleCancelCompression}
          onClose={() => setActiveProgress(null)}
        />
      )}

      {/* 2. Detailed Game Inspector Modal */}
      {selectedGameForDetails && (
        <GameDetailModal
          game={selectedGameForDetails}
          onClose={() => setSelectedGameForDetails(null)}
          onCompress={(game, algo, skipMedia) => handleCompress(game, algo, skipMedia)}
          onDecompress={handleDecompress}
          onOpenFolder={handleOpenFolder}
          onLaunch={handleLaunch}
        />
      )}

      {/* 3. Batch Compression Queue Modal */}
      {showBatchModal && (
        <BatchQueueModal
          games={games}
          onClose={() => setShowBatchModal(false)}
          onStartBatch={handleStartBatch}
        />
      )}

      {/* 4. Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          settings={settings}
          onClose={() => setShowSettingsModal(false)}
          onSave={handleSaveSettings}
          onSelectDirectory={handleSelectDirectory}
        />
      )}

      {/* 5. Custom Folder Add Modal */}
      {showAddCustomModal && (
        <CustomFolderAdd
          onClose={() => setShowAddCustomModal(false)}
          onSelectDirectory={handleSelectDirectory}
          onScanFolder={handleScanSingleFolder}
          onAddGame={handleAddCustomGame}
        />
      )}
    </div>
  );
};
export default App;
