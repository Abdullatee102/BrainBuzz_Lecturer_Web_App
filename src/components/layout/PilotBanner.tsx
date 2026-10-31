import React, { useState } from 'react';
import { Sparkles, X, Info } from 'lucide-react';

export const PilotBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white px-4 py-2.5 text-xs border-b border-indigo-700/50 shadow-sm"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 font-semibold text-[10px] uppercase tracking-wider flex-shrink-0">
            <Sparkles className="w-3 h-3 text-indigo-300" />
            Pilot Release
          </span>
          <p className="text-slate-200 truncate">
            <span className="font-medium text-white">Academic Faculty Portal (BB-07):</span> This system is currently in active pilot evaluation. Course assignments and question metrics are live.
          </p>
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="p-1 text-indigo-300 hover:text-white rounded hover:bg-white/10 transition-colors flex-shrink-0"
          aria-label="Dismiss banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
