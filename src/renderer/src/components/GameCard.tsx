import React from 'react';
import { 
  Zap, 
  RotateCcw, 
  FolderOpen, 
  Play, 
  Info, 
  CheckCircle2, 
  FileArchive,
  Gamepad2,
  Sparkles
} from 'lucide-react';
import type { Game } from '../types';
import { formatBytes, formatSavingsPercent } from '../utils/format';

interface GameCardProps {
  game: Game;
  onCompress: (game: Game) => void;
  onDecompress: (game: Game) => void;
  onOpenDetails: (game: Game) => void;
  onOpenFolder: (path: string) => void;
  onLaunch: (game: Game) => void;
}

const platformColors: Record<string, string> = {
  steam: 'bg-blue-950/80 text-blue-300 border-blue-800/60',
  epic: 'bg-slate-900/90 text-slate-200 border-slate-700/60',
  gog: 'bg-purple-950/80 text-purple-300 border-purple-800/60',
  ubisoft: 'bg-indigo-950/80 text-indigo-300 border-indigo-800/60',
  ea: 'bg-orange-950/80 text-orange-300 border-orange-800/60',
  xbox: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60',
  lutris: 'bg-amber-950/80 text-amber-300 border-amber-800/60',
  bottles: 'bg-teal-950/80 text-teal-300 border-teal-800/60',
  custom: 'bg-slate-800/80 text-slate-300 border-slate-700/60',
};

export const GameCard: React.FC<GameCardProps> = ({
  game,
  onCompress,
  onDecompress,
  onOpenDetails,
  onOpenFolder,
  onLaunch,
}) => {
  return (
    <div className="glass-card rounded-2xl overflow-hidden flex flex-col group relative">
      {/* Cover / Header Banner */}
      <div className="relative h-36 w-full bg-gradient-to-br from-surface to-surface-elevated overflow-hidden flex items-center justify-center">
        {game.coverImage ? (
          <img
            src={game.coverImage}
            alt={game.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              // Hide broken image link
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-500 gap-2">
            <Gamepad2 className="w-10 h-10 text-slate-600 group-hover:text-blue-400 transition-colors" />
            <span className="text-xs font-semibold px-2 text-center text-slate-400 line-clamp-1">{game.name}</span>
          </div>
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent opacity-80" />

        {/* Platform badge */}
        <div className="absolute top-3 left-3">
          <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border shadow-sm ${platformColors[game.platform] || platformColors.custom}`}>
            {game.platform}
          </span>
        </div>

        {/* Compression Status pill */}
        <div className="absolute top-3 right-3">
          {game.isCompressed ? (
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-950/90 text-emerald-400 border border-emerald-600/50 shadow-md">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Compressed
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-950/80 text-amber-300 border border-amber-600/40 shadow-md">
              <FileArchive className="w-3.5 h-3.5" />
              Uncompressed
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
        <div>
          <h3 
            onClick={() => onOpenDetails(game)}
            className="text-base font-bold text-slate-100 hover:text-primary transition-colors cursor-pointer line-clamp-1" 
            title={game.name}
          >
            {game.name}
          </h3>
          <p className="text-[11px] text-slate-400 truncate mt-0.5 font-mono" title={game.installPath}>
            {game.installPath}
          </p>
        </div>

        {/* Size stats */}
        <div className="bg-surface-elevated/70 rounded-xl p-3 border border-border/80 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Current Size</div>
            <div className="text-sm font-extrabold text-slate-100 mt-0.5">
              {formatBytes(game.isCompressed ? game.compressedSize : game.uncompressedSize, 1)}
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-400">
              {game.isCompressed ? 'Space Saved' : 'Original Size'}
            </div>
            {game.isCompressed ? (
              <div className="text-sm font-extrabold text-emerald-400 mt-0.5 glow-emerald">
                +{formatBytes(game.savedBytes, 1)} ({formatSavingsPercent(game.uncompressedSize, game.compressedSize)})
              </div>
            ) : (
              <div className="text-sm font-semibold text-slate-300 mt-0.5">
                {formatBytes(game.uncompressedSize, 1)}
              </div>
            )}
          </div>
        </div>

        {/* Community Estimate Badge if uncompressed */}
        {!game.isCompressed && game.communityEstimate && (
          <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-cyan-950/40 border border-cyan-800/40 text-[11px]">
            <span className="text-cyan-300 font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              Est. Savings:
            </span>
            <span className="font-extrabold text-cyan-300 font-mono">
              ~{game.communityEstimate.savingsPercent}% ({game.communityEstimate.bestAlgorithm})
            </span>
          </div>
        )}

        {/* Actions bar */}
        <div className="flex items-center gap-2 pt-1">
          {game.isCompressed ? (
            <button
              onClick={() => onDecompress(game)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-surface-elevated hover:bg-surface-hover text-slate-200 border border-border font-semibold text-xs transition-all shadow-sm"
              title="Decompress and revert files"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Decompress</span>
            </button>
          ) : (
            <button
              onClick={() => onCompress(game)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold text-xs transition-all shadow-md shadow-primary/20"
              title="Compress game files transparently"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Compress Game</span>
            </button>
          )}

          <button
            onClick={() => onOpenDetails(game)}
            className="p-2 rounded-lg bg-surface-elevated hover:bg-surface-hover text-slate-300 border border-border transition-all"
            title="Inspect Details & Algorithms"
          >
            <Info className="w-4 h-4 text-blue-400" />
          </button>

          <button
            onClick={() => onOpenFolder(game.installPath)}
            className="p-2 rounded-lg bg-surface-elevated hover:bg-surface-hover text-slate-300 border border-border transition-all"
            title="Open Directory in File Explorer"
          >
            <FolderOpen className="w-4 h-4 text-slate-400" />
          </button>

          <button
            onClick={() => onLaunch(game)}
            className="p-2 rounded-lg bg-surface-elevated hover:bg-surface-hover text-slate-300 border border-border transition-all"
            title="Launch Game"
          >
            <Play className="w-4 h-4 text-emerald-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
