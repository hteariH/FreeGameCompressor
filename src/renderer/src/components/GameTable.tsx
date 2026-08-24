import React, { useState } from 'react';
import { 
  Zap, 
  RotateCcw, 
  FolderOpen, 
  Play, 
  Info, 
  CheckCircle2, 
  FileArchive,
  ArrowUpDown,
  Gamepad2
} from 'lucide-react';
import type { Game } from '../types';
import { formatBytes, formatSavingsPercent } from '../utils/format';

interface GameTableProps {
  games: Game[];
  onCompress: (game: Game) => void;
  onDecompress: (game: Game) => void;
  onOpenDetails: (game: Game) => void;
  onOpenFolder: (path: string) => void;
  onLaunch: (game: Game) => void;
}

type SortField = 'name' | 'platform' | 'size' | 'saved' | 'status';

export const GameTable: React.FC<GameTableProps> = ({
  games,
  onCompress,
  onDecompress,
  onOpenDetails,
  onOpenFolder,
  onLaunch,
}) => {
  const [sortField, setSortField] = useState<SortField>('size');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const sortedGames = [...games].sort((a, b) => {
    let diff = 0;
    if (sortField === 'name') {
      diff = a.name.localeCompare(b.name);
    } else if (sortField === 'platform') {
      diff = a.platform.localeCompare(b.platform);
    } else if (sortField === 'size') {
      diff = a.uncompressedSize - b.uncompressedSize;
    } else if (sortField === 'saved') {
      diff = a.savedBytes - b.savedBytes;
    } else if (sortField === 'status') {
      diff = (a.isCompressed ? 1 : 0) - (b.isCompressed ? 1 : 0);
    }
    return sortAsc ? diff : -diff;
  });

  return (
    <div className="p-6 pt-2">
      <div className="glass-panel rounded-2xl overflow-hidden border border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-200">
            <thead className="bg-surface-elevated text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-border select-none">
              <tr>
                <th className="py-3.5 px-4 cursor-pointer hover:text-slate-200" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1.5">
                    <span>Game</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                </th>
                <th className="py-3.5 px-4 cursor-pointer hover:text-slate-200" onClick={() => handleSort('platform')}>
                  <div className="flex items-center gap-1.5">
                    <span>Launcher</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                </th>
                <th className="py-3.5 px-4 cursor-pointer hover:text-slate-200" onClick={() => handleSort('size')}>
                  <div className="flex items-center gap-1.5">
                    <span>Original Size</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                </th>
                <th className="py-3.5 px-4 cursor-pointer hover:text-slate-200" onClick={() => handleSort('saved')}>
                  <div className="flex items-center gap-1.5">
                    <span>Space Saved</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                </th>
                <th className="py-3.5 px-4 cursor-pointer hover:text-slate-200" onClick={() => handleSort('status')}>
                  <div className="flex items-center gap-1.5">
                    <span>Status</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {sortedGames.map((game) => (
                <tr key={game.id} className="hover:bg-surface-hover/50 transition-colors group">
                  {/* Game Name & Icon */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-surface-elevated flex items-center justify-center overflow-hidden shrink-0 border border-border">
                        {game.coverImage ? (
                          <img src={game.coverImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Gamepad2 className="w-5 h-5 text-slate-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div 
                          onClick={() => onOpenDetails(game)}
                          className="font-bold text-slate-100 hover:text-primary cursor-pointer transition-colors truncate max-w-[260px]"
                        >
                          {game.name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono truncate max-w-[260px]">
                          {game.installPath}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Platform */}
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-surface-elevated border border-border text-slate-300">
                      {game.platform}
                    </span>
                  </td>

                  {/* Original Size */}
                  <td className="py-3.5 px-4 font-semibold text-slate-300">
                    {formatBytes(game.uncompressedSize, 1)}
                  </td>

                  {/* Space Saved */}
                  <td className="py-3.5 px-4">
                    {game.isCompressed ? (
                      <span className="font-bold text-emerald-400 glow-emerald">
                        +{formatBytes(game.savedBytes, 1)} ({formatSavingsPercent(game.uncompressedSize, game.compressedSize)})
                      </span>
                    ) : (
                      <span className="text-slate-500 text-xs">--</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    {game.isCompressed ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-700/50">
                        <CheckCircle2 className="w-3 h-3" />
                        Compressed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-950/80 text-amber-300 border border-amber-700/50">
                        <FileArchive className="w-3 h-3" />
                        Uncompressed
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {game.isCompressed ? (
                        <button
                          onClick={() => onDecompress(game)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface-hover text-amber-300 border border-border text-xs font-bold transition-all"
                          title="Decompress"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Revert</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onCompress(game)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-sm"
                          title="Compress"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>Compress</span>
                        </button>
                      )}

                      <button
                        onClick={() => onOpenDetails(game)}
                        className="p-1.5 rounded-lg bg-surface-elevated hover:bg-surface-hover text-slate-400 hover:text-slate-200 border border-border transition-all"
                        title="Details"
                      >
                        <Info className="w-4 h-4 text-blue-400" />
                      </button>

                      <button
                        onClick={() => onOpenFolder(game.installPath)}
                        className="p-1.5 rounded-lg bg-surface-elevated hover:bg-surface-hover text-slate-400 hover:text-slate-200 border border-border transition-all"
                        title="Open Directory"
                      >
                        <FolderOpen className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onLaunch(game)}
                        className="p-1.5 rounded-lg bg-surface-elevated hover:bg-surface-hover text-emerald-400 border border-border transition-all"
                        title="Launch Game"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
