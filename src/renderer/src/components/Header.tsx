import React from 'react';
import { 
  Sparkles, 
  RotateCw, 
  Settings as SettingsIcon, 
  PlusCircle, 
  Layers, 
  LayoutGrid, 
  List, 
  Search,
  Zap,
  HardDrive
} from 'lucide-react';
import type { Platform } from '../types';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: 'grid' | 'table';
  onViewModeChange: (mode: 'grid' | 'table') => void;
  selectedPlatform: Platform | 'all';
  onPlatformChange: (platform: Platform | 'all') => void;
  filterStatus: 'all' | 'uncompressed' | 'compressed';
  onFilterStatusChange: (status: 'all' | 'uncompressed' | 'compressed') => void;
  isScanning: boolean;
  onRefresh: () => void;
  onOpenSettings: () => void;
  onOpenAddCustom: () => void;
  onOpenBatchQueue: () => void;
  uncompressedCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  selectedPlatform,
  onPlatformChange,
  filterStatus,
  onFilterStatusChange,
  isScanning,
  onRefresh,
  onOpenSettings,
  onOpenAddCustom,
  onOpenBatchQueue,
  uncompressedCount,
}) => {
  return (
    <header className="border-b border-border bg-surface/90 backdrop-blur-md px-6 py-4 sticky top-0 z-30 flex flex-col gap-4">
      {/* Top row: Brand & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
              FreeGameCompressor
            </h1>
            <p className="text-xs text-slate-400 font-medium">Cross-Platform Transparent Storage Optimizer</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenBatchQueue}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 transition-all font-semibold text-sm shadow-sm"
          >
            <Layers className="w-4 h-4" />
            <span>Batch Compress</span>
            {uncompressedCount > 0 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-primary text-white font-bold">
                {uncompressedCount}
              </span>
            )}
          </button>

          <button
            onClick={onOpenAddCustom}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface-elevated hover:bg-surface-hover text-slate-200 border border-border hover:border-border-light transition-all font-medium text-sm"
          >
            <PlusCircle className="w-4 h-4 text-cyan-400" />
            <span>Add Folder</span>
          </button>

          <button
            onClick={onRefresh}
            disabled={isScanning}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface-elevated hover:bg-surface-hover text-slate-200 border border-border hover:border-border-light transition-all font-medium text-sm disabled:opacity-50"
            title="Rescan Game Libraries"
          >
            <RotateCw className={`w-4 h-4 text-blue-400 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Scanning...' : 'Scan'}</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg bg-surface-elevated hover:bg-surface-hover text-slate-300 border border-border hover:border-border-light transition-all"
            title="Settings"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Bottom row: Search & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {/* Search input */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search discovered games..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-surface-elevated border border-border focus:border-primary focus:ring-1 focus:ring-primary text-sm text-slate-100 placeholder-slate-500 outline-none transition-all"
          />
        </div>

        {/* Platform & Status Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filters */}
          <div className="flex bg-surface-elevated p-1 rounded-lg border border-border">
            <button
              onClick={() => onFilterStatusChange('all')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                filterStatus === 'all'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => onFilterStatusChange('uncompressed')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                filterStatus === 'uncompressed'
                  ? 'bg-accent-amber/20 text-accent-amber border border-accent-amber/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Uncompressed
            </button>
            <button
              onClick={() => onFilterStatusChange('compressed')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                filterStatus === 'compressed'
                  ? 'bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Compressed
            </button>
          </div>

          {/* Platform filter dropdown */}
          <select
            value={selectedPlatform}
            onChange={(e) => onPlatformChange(e.target.value as any)}
            className="bg-surface-elevated border border-border text-slate-200 text-xs font-semibold rounded-lg px-3 py-1.5 outline-none cursor-pointer hover:border-border-light transition-all"
          >
            <option value="all">All Launchers</option>
            <option value="steam">Steam</option>
            <option value="epic">Epic Games</option>
            <option value="gog">GOG Galaxy</option>
            <option value="ubisoft">Ubisoft Connect</option>
            <option value="ea">EA App</option>
            <option value="xbox">Xbox / Game Pass</option>
            <option value="lutris">Lutris & Bottles</option>
            <option value="custom">Custom / Standalone</option>
          </select>

          {/* View toggle */}
          <div className="flex bg-surface-elevated p-1 rounded-lg border border-border">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'grid'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange('table')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'table'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
