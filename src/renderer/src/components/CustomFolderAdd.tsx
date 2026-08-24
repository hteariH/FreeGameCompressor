import React, { useState } from 'react';
import { 
  X, 
  PlusCircle, 
  FolderSearch, 
  FolderPlus, 
  CheckCircle2, 
  AlertCircle,
  FileCheck
} from 'lucide-react';
import type { Game } from '../types';
import { formatBytes } from '../utils/format';

interface CustomFolderAddProps {
  onClose: () => void;
  onSelectDirectory: () => Promise<string | null>;
  onScanFolder: (folderPath: string) => Promise<Game | null>;
  onAddGame: (game: Game) => void;
}

export const CustomFolderAdd: React.FC<CustomFolderAddProps> = ({
  onClose,
  onSelectDirectory,
  onScanFolder,
  onAddGame,
}) => {
  const [folderPath, setFolderPath] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scannedGame, setScannedGame] = useState<Game | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBrowse = async () => {
    setError(null);
    const selected = await onSelectDirectory();
    if (selected) {
      setFolderPath(selected);
      handleScan(selected);
    }
  };

  const handleScan = async (path: string) => {
    if (!path.trim()) return;
    setIsScanning(true);
    setError(null);
    setScannedGame(null);

    try {
      const result = await onScanFolder(path.trim());
      if (result) {
        setScannedGame(result);
      } else {
        setError('Could not identify a valid game folder or directory was empty.');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to scan directory.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleConfirm = () => {
    if (scannedGame) {
      onAddGame(scannedGame);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-border w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-border bg-surface-elevated/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shadow-lg">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white">Add Custom Game Folder</h2>
              <p className="text-xs text-slate-400 font-medium">Add standalone games, itch.io titles, or ROM folders</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-surface-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Select Game Directory
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={folderPath}
                onChange={(e) => {
                  setFolderPath(e.target.value);
                  setScannedGame(null);
                }}
                placeholder="e.g. C:\Games\StandaloneTitle or /home/user/Games/MyGame"
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-surface-elevated border border-border focus:border-primary text-xs font-mono text-slate-200 placeholder-slate-500 outline-none"
              />
              <button
                onClick={handleBrowse}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-surface-elevated hover:bg-surface-hover text-slate-200 border border-border text-xs font-bold transition-all shrink-0"
              >
                <FolderSearch className="w-4 h-4 text-cyan-400" />
                <span>Browse</span>
              </button>
            </div>
          </div>

          {/* Action button if path typed manually */}
          {folderPath && !scannedGame && !isScanning && (
            <button
              onClick={() => handleScan(folderPath)}
              className="w-full py-2 rounded-xl bg-surface-elevated hover:bg-surface-hover text-slate-200 border border-border text-xs font-bold transition-all"
            >
              Analyze Directory
            </button>
          )}

          {/* Scanning status */}
          {isScanning && (
            <div className="p-4 rounded-2xl bg-surface-elevated/40 border border-border text-center text-xs text-slate-400 animate-pulse">
              Analyzing directory files and disk footprint...
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-700/50 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Detected game summary */}
          {scannedGame && (
            <div className="p-4 rounded-2xl bg-surface-elevated border border-primary/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="font-extrabold text-sm text-slate-100">{scannedGame.name}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-surface border border-border text-cyan-300">
                  Custom
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-surface p-2.5 rounded-lg border border-border">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Size</span>
                  <span className="font-extrabold text-slate-200">{formatBytes(scannedGame.uncompressedSize, 1)}</span>
                </div>
                <div className="bg-surface p-2.5 rounded-lg border border-border">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Files</span>
                  <span className="font-extrabold text-slate-200">{scannedGame.fileCount || 0}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-border bg-surface-elevated/60 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface-elevated hover:bg-surface-hover text-slate-300 border border-border text-xs font-bold transition-all"
          >
            Cancel
          </button>
          <button
            disabled={!scannedGame}
            onClick={handleConfirm}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-lg shadow-primary/25 disabled:opacity-40"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Game to Library</span>
          </button>
        </div>
      </div>
    </div>
  );
};
