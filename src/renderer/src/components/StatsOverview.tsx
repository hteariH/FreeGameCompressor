import React from 'react';
import { HardDrive, Sparkles, Database, PieChart, ShieldCheck } from 'lucide-react';
import type { Game, DriveInfo } from '../types';
import { formatBytes, formatSavingsPercent } from '../utils/format';

interface StatsOverviewProps {
  games: Game[];
  drives: DriveInfo[];
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ games, drives }) => {
  const totalUncompressed = games.reduce((acc, g) => acc + g.uncompressedSize, 0);
  const totalCompressed = games.reduce((acc, g) => acc + (g.isCompressed ? g.compressedSize : g.uncompressedSize), 0);
  const totalSaved = games.reduce((acc, g) => acc + (g.isCompressed ? g.savedBytes : 0), 0);
  const compressedCount = games.filter(g => g.isCompressed).length;

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-4 gap-4">
      {/* Total Saved Card */}
      <div className="bg-surface border border-border rounded-md p-5 relative overflow-hidden flex flex-col justify-between border-l-4 border-l-accent-emerald">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Space Saved</span>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>
        <div className="my-2">
          <div className="text-3xl font-extrabold text-white tracking-tight glow-emerald">
            {formatBytes(totalSaved, 1)}
          </div>
          <p className="text-xs text-emerald-400 font-semibold mt-1">
            {formatSavingsPercent(totalUncompressed, totalCompressed)} library size reduction
          </p>
        </div>
        <div className="text-xs text-slate-400 flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>{compressedCount} of {games.length} games compressed</span>
        </div>
      </div>

      {/* Library Size Card */}
      <div className="bg-surface border border-border rounded-md p-5 flex flex-col justify-between border-l-4 border-l-primary">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Games Size</span>
          <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center">
            <Database className="w-4 h-4" />
          </div>
        </div>
        <div className="my-2">
          <div className="text-2xl font-bold text-slate-100">
            {formatBytes(totalCompressed, 1)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Originally <span className="line-through text-slate-500">{formatBytes(totalUncompressed, 1)}</span>
          </p>
        </div>
        <div className="text-xs text-slate-400">
          Transparent Windows & Linux compression
        </div>
      </div>

      {/* Drive Visualizer (Spans 2 columns) */}
      <div className="bg-surface border border-border rounded-md p-5 lg:col-span-2 flex flex-col justify-between border-l-4 border-l-cyan-500">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <HardDrive className="w-4 h-4 text-cyan-400" />
            Storage Drives
          </span>
          <span className="text-xs text-cyan-400 font-semibold">
            {drives.length} {drives.length === 1 ? 'Drive' : 'Drives'} Detected
          </span>
        </div>

        <div className="space-y-3 overflow-y-auto max-h-[85px] pr-1">
          {drives.map((drive) => {
            const usedPerc = drive.totalBytes > 0 ? Math.round((drive.usedBytes / drive.totalBytes) * 100) : 0;
            return (
              <div key={drive.mount} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-surface-elevated text-[11px] font-mono text-cyan-300 border border-border">
                      {drive.mount}
                    </span>
                    <span className="truncate max-w-[140px] text-slate-400">{drive.label || drive.filesystem}</span>
                  </span>
                  <span>
                    {formatBytes(drive.freeBytes, 0)} free of {formatBytes(drive.totalBytes, 0)}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-2 bg-surface-elevated rounded-full overflow-hidden flex border border-border">
                  <div 
                    className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                    style={{ width: `${usedPerc}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
