import React, { useState } from 'react';
import { 
  X, 
  Layers, 
  Zap, 
  CheckCircle2, 
  Square, 
  CheckSquare, 
  Sparkles,
  Play,
  RotateCcw
} from 'lucide-react';
import type { Game, CompressionAlgorithm } from '../types';
import { formatBytes } from '../utils/format';

interface BatchQueueModalProps {
  games: Game[];
  onClose: () => void;
  onStartBatch: (selectedGames: Game[], algorithm: CompressionAlgorithm) => void;
}

export const BatchQueueModal: React.FC<BatchQueueModalProps> = ({
  games,
  onClose,
  onStartBatch,
}) => {
  // Preselect uncompressed games
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(games.filter(g => !g.isCompressed).map(g => g.id))
  );
  const [algorithm, setAlgorithm] = useState<CompressionAlgorithm>('LZX');

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const selectAll = () => {
    setSelectedIds(new Set(games.map(g => g.id)));
  };

  const selectNone = () => {
    setSelectedIds(new Set());
  };

  const selectOnlyUncompressed = () => {
    setSelectedIds(new Set(games.filter(g => !g.isCompressed).map(g => g.id)));
  };

  const selectedGames = games.filter(g => selectedIds.has(g.id));
  const totalUncompressedBytes = selectedGames.reduce((acc, g) => acc + g.uncompressedSize, 0);
  const estimatedSavingsBytes = Math.round(totalUncompressedBytes * 0.35); // ~35% average savings estimate

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-border w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border bg-surface-elevated/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary border border-primary/30 flex items-center justify-center shadow-lg">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white">Batch Compression Queue</h2>
              <p className="text-xs text-slate-400 font-medium">Select multiple games to compress sequentially in background</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-surface-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selection Bar & Algorithm Selector */}
        <div className="p-4 px-6 bg-surface-elevated/40 border-b border-border flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Select:</span>
            <button
              onClick={selectOnlyUncompressed}
              className="px-2.5 py-1 rounded-md bg-surface-elevated hover:bg-surface-hover text-slate-200 border border-border font-medium"
            >
              Uncompressed Only
            </button>
            <button
              onClick={selectAll}
              className="px-2.5 py-1 rounded-md bg-surface-elevated hover:bg-surface-hover text-slate-200 border border-border font-medium"
            >
              All
            </button>
            <button
              onClick={selectNone}
              className="px-2.5 py-1 rounded-md bg-surface-elevated hover:bg-surface-hover text-slate-400 border border-border font-medium"
            >
              None
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Algorithm:</span>
            <select
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value as CompressionAlgorithm)}
              className="bg-surface-elevated border border-border text-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold outline-none cursor-pointer"
            >
              <option value="LZX">LZX (Max Savings)</option>
              <option value="XPRESS16K">XPRESS 16K (Balanced)</option>
              <option value="XPRESS8K">XPRESS 8K (Fast)</option>
              <option value="XPRESS4K">XPRESS 4K (Ultra Fast)</option>
            </select>
          </div>
        </div>

        {/* Game List */}
        <div className="p-6 overflow-y-auto space-y-2 flex-1">
          {games.map((game) => {
            const isSelected = selectedIds.has(game.id);
            return (
              <div
                key={game.id}
                onClick={() => toggleSelect(game.id)}
                className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-primary/10 border-primary/60 text-slate-100'
                    : 'bg-surface-elevated/40 border-border text-slate-400 hover:border-border-light'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="text-primary">
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-primary" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-slate-200 truncate">{game.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono truncate">{game.installPath}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 text-right">
                  <div>
                    <div className="text-xs font-bold text-slate-300">
                      {formatBytes(game.uncompressedSize, 1)}
                    </div>
                    <div className="text-[10px] uppercase font-bold text-slate-500">
                      {game.isCompressed ? 'Already Compressed' : 'Uncompressed'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Estimated Savings & Footer */}
        <div className="p-4 px-6 border-t border-border bg-surface-elevated/60 flex items-center justify-between shrink-0">
          <div className="text-xs">
            <span className="text-slate-400">Selected: </span>
            <span className="font-extrabold text-slate-100">{selectedGames.length} games</span>
            <span className="text-slate-500 mx-1.5">•</span>
            <span className="text-slate-400">Est. Savings: </span>
            <span className="font-extrabold text-emerald-400 glow-emerald">~{formatBytes(estimatedSavingsBytes, 1)}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-surface-elevated hover:bg-surface-hover text-slate-300 border border-border text-xs font-bold transition-all"
            >
              Cancel
            </button>
            <button
              disabled={selectedGames.length === 0}
              onClick={() => {
                onClose();
                onStartBatch(selectedGames, algorithm);
              }}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-lg shadow-primary/25 disabled:opacity-40"
            >
              <Zap className="w-4 h-4" />
              <span>Start Batch ({selectedGames.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
