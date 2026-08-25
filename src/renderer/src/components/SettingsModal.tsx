import React, { useState } from 'react';
import { 
  X, 
  Settings as SettingsIcon, 
  FolderPlus, 
  Trash2, 
  Check, 
  Cpu, 
  Layers, 
  FolderSearch,
  HardDrive,
  Wifi,
  ShieldCheck,
  Zap
} from 'lucide-react';
import type { AppSettings, Platform, CompressionAlgorithm } from '../types';

interface SettingsModalProps {
  settings: AppSettings;
  onClose: () => void;
  onSave: (newSettings: AppSettings) => void;
  onSelectDirectory: () => Promise<string | null>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onClose,
  onSave,
  onSelectDirectory,
}) => {
  const [currentSettings, setCurrentSettings] = useState<AppSettings>({ ...settings });
  const [newPathInput, setNewPathInput] = useState('');

  const togglePlatform = (platform: Platform) => {
    setCurrentSettings(prev => ({
      ...prev,
      enabledPlatforms: {
        ...prev.enabledPlatforms,
        [platform]: !prev.enabledPlatforms[platform],
      }
    }));
  };

  const handleAddScanPath = async () => {
    const selected = await onSelectDirectory();
    if (selected && !currentSettings.customScanPaths.includes(selected)) {
      setCurrentSettings(prev => ({
        ...prev,
        customScanPaths: [...prev.customScanPaths, selected],
      }));
    }
  };

  const handleRemoveScanPath = (index: number) => {
    setCurrentSettings(prev => ({
      ...prev,
      customScanPaths: prev.customScanPaths.filter((_, i) => i !== index),
    }));
  };

  const handleSave = () => {
    onSave(currentSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-border w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border bg-surface-elevated/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary/20 text-primary border border-primary/30 flex items-center justify-center shadow-sm">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white">Application Settings</h2>
              <p className="text-xs text-slate-400 font-medium">Configure compression defaults and library scanning</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-surface-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Default Algorithm */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-cyan-400" /> Default Compression Algorithm
            </label>
            <select
              value={currentSettings.defaultAlgorithm}
              onChange={(e) => setCurrentSettings(prev => ({ ...prev, defaultAlgorithm: e.target.value as CompressionAlgorithm }))}
              className="w-full bg-surface-elevated border border-border text-slate-200 text-xs font-semibold rounded-md p-3 outline-none cursor-pointer"
            >
              <option value="LZX">LZX (Maximum Compression, Highest Storage Savings)</option>
              <option value="XPRESS16K">XPRESS 16K (Balanced, High Speed & High Compression)</option>
              <option value="XPRESS8K">XPRESS 8K (Fast)</option>
              <option value="XPRESS4K">XPRESS 4K (Ultra Fast, Zero CPU Overhead)</option>
            </select>
          </div>

          {/* CPU & Wi-Fi Protection Mode */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Wifi className="w-4 h-4 text-emerald-400" /> CPU Load & Wi-Fi Stability Limit
              </label>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                {currentSettings.cpuLimitPercentage || 30}% Max Load
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setCurrentSettings(prev => ({ ...prev, cpuLimitPercentage: 30 }))}
                className={`p-3 rounded-md border text-left transition-all ${
                  (currentSettings.cpuLimitPercentage || 30) === 30
                    ? 'bg-emerald-500/15 border-emerald-500/50 shadow-md shadow-emerald-500/10'
                    : 'bg-surface-elevated/40 border-border hover:bg-surface-elevated text-slate-400'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>30% (Wi-Fi Safe)</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-snug">
                  Cores 0 & 1 untouched. Zero Wi-Fi drops & completely silent fans.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setCurrentSettings(prev => ({ ...prev, cpuLimitPercentage: 50 }))}
                className={`p-3 rounded-md border text-left transition-all ${
                  currentSettings.cpuLimitPercentage === 50
                    ? 'bg-primary/15 border-primary/50 shadow-md shadow-primary/10'
                    : 'bg-surface-elevated/40 border-border hover:bg-surface-elevated text-slate-400'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-primary mb-1">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>50% (Balanced)</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-snug">
                  Uses half of CPU cores for balanced speed and responsiveness.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setCurrentSettings(prev => ({ ...prev, cpuLimitPercentage: 100 }))}
                className={`p-3 rounded-md border text-left transition-all ${
                  currentSettings.cpuLimitPercentage === 100
                    ? 'bg-amber-500/15 border-amber-500/50 shadow-md shadow-amber-500/10'
                    : 'bg-surface-elevated/40 border-border hover:bg-surface-elevated text-slate-400'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 mb-1">
                  <Zap className="w-3.5 h-3.5" />
                  <span>100% (Turbo)</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-snug">
                  Max multi-threading speed. Recommended for wired Ethernet.
                </p>
              </button>
            </div>
          </div>

          {/* Enabled Platforms */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-primary" /> Au Launchers
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {(['steam', 'epic', 'gog', 'ubisoft', 'ea', 'xbox', 'lutris', 'bottles'] as Platform[]).map((p) => (
                <div
                  key={p}
                  onClick={() => togglePlatform(p)}
                  className={`p-3 rounded-md border flex items-center justify-between cursor-pointer transition-all ${
                    currentSettings.enabledPlatforms[p]
                      ? 'bg-primary/10 border-primary/50 text-slate-100'
                      : 'bg-surface-elevated/40 border-border text-slate-500'
                  }`}
                >
                  <span className="text-xs font-bold uppercase">{p}</span>
                  <div className={`w-4 h-4 rounded flex items-center justify-center ${
                    currentSettings.enabledPlatforms[p] ? 'bg-primary text-zinc-950' : 'border border-border'
                  }`}>
                    {currentSettings.enabledPlatforms[p] && <Check className="w-3 h-3" />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Community Insights & Telemetry */}
          <div className="space-y-3 p-3.5 rounded-md bg-surface-elevated/50 border border-border">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-200 block">Community Compression Insights</span>
                <span className="text-[11px] text-slate-400">Share anonymous compression results and view crowdsourced estimates</span>
              </div>
              <input
                type="checkbox"
                checked={currentSettings.shareAnonymousStats}
                onChange={(e) => setCurrentSettings(prev => ({ ...prev, shareAnonymousStats: e.target.checked }))}
                className="w-4 h-4 rounded bg-surface border-border text-primary focus:ring-0 cursor-pointer"
              />
            </div>
          </div>

          {/* Custom Scan Directories */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-emerald-400" /> Additional Game Scan Folders
              </label>
              <button
                onClick={handleAddScanPath}
                className="flex items-center gap-1 text-xs text-primary hover:text-blue-300 font-bold"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Add Folder</span>
              </button>
            </div>

            {currentSettings.customScanPaths.length === 0 ? (
              <p className="text-xs text-slate-500 italic bg-surface-elevated/40 p-3 rounded-md border border-border">
                No custom folders added yet. Click "Add Folder" to include extra directories (e.g. D:\Games).
              </p>
            ) : (
              <div className="space-y-2">
                {currentSettings.customScanPaths.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-surface-elevated p-2.5 px-3 rounded-md border border-border">
                    <span className="text-xs font-mono text-slate-300 truncate max-w-[400px]">{p}</span>
                    <button
                      onClick={() => handleRemoveScanPath(idx)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-border bg-surface-elevated/60 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-surface-elevated hover:bg-surface-hover text-slate-300 border border-border text-xs font-bold transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 rounded-md bg-primary hover:bg-primary-hover text-zinc-950 text-xs font-bold transition-all shadow-sm shadow-primary/25"
          >
            <Check className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
