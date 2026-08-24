import React, { useState, useEffect } from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';

export const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState<boolean>(false);

  useEffect(() => {
    const checkMaximized = async () => {
      if (window.api) {
        const max = await window.api.isMaximized();
        setIsMaximized(max);
      }
    };
    checkMaximized();
  }, []);

  const handleMinimize = () => {
    if (window.api) window.api.minimizeWindow();
  };

  const handleMaximize = async () => {
    if (window.api) {
      const state = await window.api.maximizeWindow();
      setIsMaximized(state);
    }
  };

  const handleClose = () => {
    if (window.api) window.api.closeWindow();
  };

  return (
    <div 
      className="h-10 bg-[#070a10] border-b border-border/70 flex items-center justify-between select-none z-50 shrink-0 px-3"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* App Branding & Icon */}
      <div 
        className="flex items-center gap-2.5"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <div className="w-5 h-5 rounded-md overflow-hidden flex items-center justify-center shadow-md shadow-blue-500/20 border border-border/80">
          <img src="/logo.png" alt="FreeGameCompressor" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
            FreeGameCompressor
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface-elevated text-cyan-300 border border-border">
            v1.0.0
          </span>
        </div>
      </div>

      {/* Center Draggable Spacer */}
      <div className="flex-1 h-full flex items-center justify-center text-[11px] text-slate-500 font-medium">
        Game Storage Optimizer
      </div>

      {/* Window Controls */}
      <div 
        className="flex items-center h-full -mr-3"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* Minimize */}
        <button
          onClick={handleMinimize}
          className="h-10 px-3.5 flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-surface-hover transition-colors"
          title="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        {/* Maximize / Restore */}
        <button
          onClick={handleMaximize}
          className="h-10 px-3.5 flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-surface-hover transition-colors"
          title={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized ? (
            <Copy className="w-3 h-3 rotate-180" />
          ) : (
            <Square className="w-3 h-3" />
          )}
        </button>

        {/* Close */}
        <button
          onClick={handleClose}
          className="h-10 px-4 flex items-center justify-center text-slate-400 hover:text-white hover:bg-rose-600 transition-colors"
          title="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
