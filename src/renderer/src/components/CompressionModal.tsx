import React from 'react';
import { 
  Zap, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  Activity, 
  Clock, 
  HardDrive,
  FileText
} from 'lucide-react';
import type { CompressionProgress } from '../types';
import { formatBytes, formatDuration, formatSpeed } from '../utils/format';

interface CompressionModalProps {
  progress: CompressionProgress | null;
  onCancel: () => void;
  onClose: () => void;
}

export const CompressionModal: React.FC<CompressionModalProps> = ({
  progress,
  onCancel,
  onClose,
}) => {
  if (!progress) return null;

  const isCompleted = progress.status === 'compressed' || progress.status === 'uncompressed';
  const isError = progress.status === 'error';
  const isDecompressing = progress.status === 'decompressing';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-border w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-border bg-surface-elevated/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-md flex items-center justify-center shadow-sm ${
              isError
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : isCompleted
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : isDecompressing
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-primary/20 text-primary border border-primary/30'
            }`}>
              {isError ? (
                <AlertCircle className="w-5 h-5" />
              ) : isCompleted ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : isDecompressing ? (
                <RotateCcw className="w-5 h-5 animate-spin" />
              ) : (
                <Zap className="w-5 h-5 animate-pulse" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-100 line-clamp-1">
                {isCompleted
                  ? isDecompressing ? 'Decompression Finished' : 'Compression Complete!'
                  : isError
                  ? 'Operation Failed'
                  : isDecompressing
                  ? `Decompressing ${progress.gameName}`
                  : `Compressing ${progress.gameName}`}
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                {isCompleted
                  ? 'All game files were successfully processed.'
                  : `Using algorithm: ${progress.algorithm}`}
              </p>
            </div>
          </div>

          {(isCompleted || isError) && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-surface-hover transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5">
          {/* Progress percentage bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                {progress.percentage}% Processed
              </span>
              <span className="text-slate-400 font-mono">
                {progress.processedFiles} / {progress.totalFiles} files
              </span>
            </div>

            <div className="w-full h-3.5 bg-surface-elevated rounded-full overflow-hidden border border-border flex">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isError
                    ? 'bg-rose-500'
                    : isCompleted
                    ? 'bg-emerald-500'
                    : 'bg-cyan-500 animate-pulse'
                }`}
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>

          {/* Current file notification */}
          <div className="bg-surface-elevated/60 rounded-md p-3.5 border border-border">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1">
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              Current File
            </div>
            <p className="text-xs font-mono text-slate-200 truncate" title={progress.currentFile}>
              {progress.currentFile || 'Scanning files...'}
            </p>
          </div>

          {/* Live Metrics Grid */}
          <div className="grid grid-cols-3 gap-3">
            {/* Speed */}
            <div className="bg-surface-elevated/50 p-3 rounded-md border border-border">
              <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                <Activity className="w-3 h-3 text-cyan-400" /> Speed
              </div>
              <div className="text-sm font-extrabold text-slate-100 mt-1">
                {isCompleted ? '0 B/s' : formatSpeed(progress.speedBytesPerSec)}
              </div>
            </div>

            {/* Space Saved Live */}
            <div className="bg-surface-elevated/50 p-3 rounded-md border border-border">
              <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                <HardDrive className="w-3 h-3 text-emerald-400" /> Space Saved
              </div>
              <div className="text-sm font-extrabold text-emerald-400 mt-1 glow-emerald">
                +{formatBytes(progress.savedBytes, 1)}
              </div>
            </div>

            {/* ETA */}
            <div className="bg-surface-elevated/50 p-3 rounded-md border border-border">
              <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" /> ETA
              </div>
              <div className="text-sm font-extrabold text-slate-100 mt-1 font-mono">
                {isCompleted ? '00:00' : formatDuration(progress.estimatedRemainingSeconds)}
              </div>
            </div>
          </div>

          {/* Error Message display */}
          {isError && progress.error && (
            <div className="p-3.5 rounded-md bg-rose-950/50 border border-rose-700/50 text-rose-300 text-xs font-mono">
              {progress.error}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 border-t border-border bg-surface-elevated/40 flex items-center justify-end gap-3">
          {!isCompleted && !isError ? (
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-md bg-surface-elevated hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-border hover:border-rose-700/50 text-xs font-bold transition-all"
            >
              Cancel Operation
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-md bg-primary hover:bg-primary-hover text-zinc-950 text-xs font-bold transition-all shadow-md shadow-primary/20"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
