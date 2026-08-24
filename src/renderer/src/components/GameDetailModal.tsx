import React, { useState } from 'react';
import { 
  X, 
  Zap, 
  RotateCcw, 
  FolderOpen, 
  Play, 
  CheckCircle2, 
  FileArchive, 
  HardDrive,
  Cpu,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import type { Game, CompressionAlgorithm } from '../types';
import { formatBytes, formatSavingsPercent } from '../utils/format';

interface GameDetailModalProps {
  game: Game | null;
  onClose: () => void;
  onCompress: (game: Game, algorithm: CompressionAlgorithm, skipMedia: boolean) => void;
  onDecompress: (game: Game) => void;
  onOpenFolder: (path: string) => void;
  onLaunch: (game: Game) => void;
}

const algorithms: Array<{
  id: CompressionAlgorithm;
  name: string;
  desc: string;
  speed: string;
  ratio: string;
  overhead: string;
}> = [
  {
    id: 'LZX',
    name: 'LZX (Maximum Compression)',
    desc: 'Highest compression ratio. Best for huge modern games (50GB-150GB+). Fast decompression on modern multi-core CPUs.',
    speed: 'Moderate',
    ratio: '30% - 60%',
    overhead: 'Negligible',
  },
  {
    id: 'XPRESS16K',
    name: 'XPRESS 16K (Balanced)',
    desc: 'Great balance between compression ratio and high compression throughput. Recommended for general gaming.',
    speed: 'Fast',
    ratio: '20% - 35%',
    overhead: 'Very Low',
  },
  {
    id: 'XPRESS8K',
    name: 'XPRESS 8K (Fast)',
    desc: 'Faster compression pass with minimal system overhead.',
    speed: 'Very Fast',
    ratio: '15% - 25%',
    overhead: 'Minimal',
  },
  {
    id: 'XPRESS4K',
    name: 'XPRESS 4K (Ultra Fast)',
    desc: 'Lowest CPU footprint. Compresses at maximum NVMe disk speed.',
    speed: 'Blazing Fast',
    ratio: '10% - 20%',
    overhead: 'Zero',
  },
];

export const GameDetailModal: React.FC<GameDetailModalProps> = ({
  game,
  onClose,
  onCompress,
  onDecompress,
  onOpenFolder,
  onLaunch,
}) => {
  const [selectedAlgo, setSelectedAlgo] = useState<CompressionAlgorithm>('LZX');
  const [skipMedia, setSkipMedia] = useState<boolean>(false);

  if (!game) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-border w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header with Game Banner / Background */}
        <div className="relative h-44 bg-surface-elevated overflow-hidden shrink-0">
          {game.coverImage && (
            <img
              src={game.coverImage}
              alt=""
              className="w-full h-full object-cover opacity-40 blur-xs scale-105"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-surface/80 hover:bg-surface text-slate-300 hover:text-white border border-border transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Game Title info */}
          <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-surface/90 border border-border text-slate-200">
                  {game.platform}
                </span>
                {game.isCompressed ? (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-950/90 text-emerald-400 border border-emerald-700/60">
                    <CheckCircle2 className="w-3 h-3" />
                    Compressed
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-950/90 text-amber-300 border border-amber-700/60">
                    <FileArchive className="w-3 h-3" />
                    Uncompressed
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight line-clamp-1">{game.name}</h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenFolder(game.installPath)}
                className="p-2.5 rounded-xl bg-surface-elevated/80 hover:bg-surface-hover text-slate-200 border border-border transition-all"
                title="Open Folder"
              >
                <FolderOpen className="w-4 h-4" />
              </button>
              <button
                onClick={() => onLaunch(game)}
                className="p-2.5 rounded-xl bg-surface-elevated/80 hover:bg-surface-hover text-emerald-400 border border-border transition-all"
                title="Launch Game"
              >
                <Play className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable details body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Path */}
          <div className="bg-surface-elevated/60 rounded-xl p-3 border border-border">
            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Install Directory</span>
            <span className="text-xs font-mono text-slate-300 break-all">{game.installPath}</span>
          </div>

          {/* Size Cards Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-surface-elevated p-3.5 rounded-xl border border-border">
              <div className="text-[10px] font-bold uppercase text-slate-400">Nominal Size</div>
              <div className="text-base font-extrabold text-slate-100 mt-1">
                {formatBytes(game.uncompressedSize, 1)}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">{game.fileCount || 0} files</div>
            </div>

            <div className="bg-surface-elevated p-3.5 rounded-xl border border-border">
              <div className="text-[10px] font-bold uppercase text-slate-400">Size on Disk</div>
              <div className="text-base font-extrabold text-slate-100 mt-1">
                {formatBytes(game.isCompressed ? game.compressedSize : game.uncompressedSize, 1)}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {game.isCompressed ? 'Transparently compressed' : 'Standard'}
              </div>
            </div>

            <div className="bg-surface-elevated p-3.5 rounded-xl border border-border">
              <div className="text-[10px] font-bold uppercase text-slate-400">Space Saved</div>
              <div className="text-base font-extrabold text-emerald-400 mt-1 glow-emerald">
                {game.isCompressed ? `+${formatBytes(game.savedBytes, 1)}` : '0 B'}
              </div>
              <div className="text-[11px] text-emerald-400/80 mt-0.5">
                {game.isCompressed ? `${formatSavingsPercent(game.uncompressedSize, game.compressedSize)} saved` : 'Uncompressed'}
              </div>
            </div>
          </div>

          {/* Algorithm Selection Section (if uncompressed or to re-compress) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-cyan-400" />
                Select Compression Algorithm
              </label>
              <span className="text-[11px] text-slate-400">Windows WOF / Native Filesystem</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {algorithms.map((algo) => (
                <div
                  key={algo.id}
                  onClick={() => setSelectedAlgo(algo.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    selectedAlgo === algo.id
                      ? 'bg-primary/15 border-primary text-slate-100 shadow-md shadow-primary/15'
                      : 'bg-surface-elevated/70 border-border text-slate-300 hover:border-border-light'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold">{algo.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface border border-border text-cyan-300">
                      {algo.ratio}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">{algo.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Safe exclusions checkbox */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-surface-elevated/40 border border-border">
            <input
              type="checkbox"
              id="skipMedia"
              checked={skipMedia}
              onChange={(e) => setSkipMedia(e.target.checked)}
              className="w-4 h-4 rounded bg-surface border-border text-primary focus:ring-0 cursor-pointer"
            />
            <label htmlFor="skipMedia" className="text-xs text-slate-300 cursor-pointer">
              Skip already compressed video/audio formats (<span className="font-mono text-slate-400">.mp4, .bik, .zip, .rar</span>)
            </label>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 px-6 border-t border-border bg-surface-elevated/50 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface-elevated hover:bg-surface-hover text-slate-300 border border-border text-xs font-bold transition-all"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            {game.isCompressed && (
              <button
                onClick={() => {
                  onClose();
                  onDecompress(game);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-elevated hover:bg-amber-950/40 text-amber-300 border border-border hover:border-amber-700/50 text-xs font-bold transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Revert to Uncompressed</span>
              </button>
            )}

            <button
              onClick={() => {
                onClose();
                onCompress(game, selectedAlgo, skipMedia);
              }}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-lg shadow-primary/25"
            >
              <Zap className="w-4 h-4" />
              <span>{game.isCompressed ? 'Re-Compress Game' : 'Compress Game Now'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
