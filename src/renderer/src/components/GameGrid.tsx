import React from 'react';
import type { Game } from '../types';
import { GameCard } from './GameCard';
import { Gamepad2, PlusCircle } from 'lucide-react';

interface GameGridProps {
  games: Game[];
  onCompress: (game: Game) => void;
  onDecompress: (game: Game) => void;
  onOpenDetails: (game: Game) => void;
  onOpenFolder: (path: string) => void;
  onLaunch: (game: Game) => void;
  onOpenAddCustom: () => void;
}

export const GameGrid: React.FC<GameGridProps> = ({
  games,
  onCompress,
  onDecompress,
  onOpenDetails,
  onOpenFolder,
  onLaunch,
  onOpenAddCustom,
}) => {
  if (games.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-surface-elevated flex items-center justify-center text-slate-500 mb-4 border border-border">
          <Gamepad2 className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-200">No Games Found</h3>
        <p className="text-sm text-slate-400 max-w-md mt-1 mb-6">
          We couldn't find any games matching your current filters. Make sure your game launchers are installed, or manually add your game folder.
        </p>
        <button
          onClick={onOpenAddCustom}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-sm transition-all shadow-lg shadow-primary/20"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Custom Game Folder</span>
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 p-6 pt-2">
      {games.map((game) => (
        <GameCard
          key={game.id}
          game={game}
          onCompress={onCompress}
          onDecompress={onDecompress}
          onOpenDetails={onOpenDetails}
          onOpenFolder={onOpenFolder}
          onLaunch={onLaunch}
        />
      ))}
    </div>
  );
};
