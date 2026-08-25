import React from 'react';
import { 
  Users, 
  ShieldCheck, 
  Sparkles, 
  Check, 
  X, 
  Database,
  Lock
} from 'lucide-react';

interface CommunityConsentModalProps {
  onAccept: () => void;
  onDecline: () => void;
}

export const CommunityConsentModal: React.FC<CommunityConsentModalProps> = ({
  onAccept,
  onDecline,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-surface border border-primary/40 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 pb-4 bg-surface-elevated /15 -elevated/40  flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-md bg-surface-elevated -600 -400 flex items-center justify-center shadow-sm shadow-cyan-500/30 mb-3 border border-border">
            <Users className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            Enable Community Insights?
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Help build the open-source community game compression database & preview storage savings before compressing!
          </p>
        </div>

        {/* Features & Privacy bullets */}
        <div className="p-6 pt-2 space-y-3.5 text-xs text-slate-300">
          <div className="flex items-start gap-3 p-3 rounded-md bg-surface-elevated/60 border border-border">
            <Sparkles className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-100 block mb-0.5">Pre-Compression Savings Estimates</span>
              <p className="text-slate-400 leading-snug">
                See how many gigabytes other players saved on specific titles (e.g. <i>"Cyberpunk 2077: ~35 GB saved (42% Avg)"</i>).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-md bg-surface-elevated/60 border border-border">
            <Database className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-100 block mb-0.5">Crowdsourced Optimal Algorithms</span>
              <p className="text-slate-400 leading-snug">
                Automatically know which algorithm (LZX, XPRESS16K) yields the best balance of speed and storage ratio for each game.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-md bg-surface-elevated/60 border border-border">
            <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-100 block mb-0.5">100% Anonymous & Privacy-First</span>
              <p className="text-slate-400 leading-snug">
                Zero personal data or file paths. Only game names, sizes before/after, and compression ratio are submitted. You can disable this anytime in Settings.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 px-6 border-t border-border bg-surface-elevated/50 flex items-center justify-end gap-3">
          <button
            onClick={onDecline}
            className="px-4 py-2 rounded-md bg-surface-elevated hover:bg-surface-hover text-slate-400 hover:text-slate-200 border border-border text-xs font-bold transition-all"
          >
            No thanks, keep offline
          </button>

          <button
            onClick={onAccept}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-md bg-primary hover:bg-primary-hover text-zinc-950 text-xs font-bold transition-all shadow-sm shadow-primary/25"
          >
            <Check className="w-4 h-4" />
            <span>Enable Community Insights</span>
          </button>
        </div>
      </div>
    </div>
  );
};
