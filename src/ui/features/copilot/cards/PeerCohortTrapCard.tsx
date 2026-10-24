import React from 'react';
import type { PeerCohortDifficultyResult } from '../../../../domain/ai/tools/toolTypes.ts';
import { Users, AlertTriangle } from 'lucide-react';

interface Props {
  result: PeerCohortDifficultyResult;
}

export const PeerCohortTrapCard: React.FC<Props> = ({ result }) => {
  return (
    <div className="relative my-3 p-4 rounded-2xl border border-amber-300/80 dark:border-amber-900/60 bg-gradient-to-br from-amber-50/70 via-orange-50/40 to-transparent dark:from-amber-950/30 dark:via-zinc-900/60 backdrop-blur-xl shadow-md shadow-amber-500/5 space-y-3 overflow-hidden">
      {/* Top Accent Line */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />

      {/* Header */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2 font-black text-amber-950 dark:text-amber-300">
          <div className="w-5 h-5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Users className="w-3.5 h-3.5" />
          </div>
          <span className="uppercase tracking-wider">Peer Cohort Analytics</span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 font-bold border border-amber-500/30">
          {result.difficultyLabel} ({result.overallAccuracyPct}% Pass)
        </span>
      </div>

      {/* Choice Distribution Bars */}
      <div className="space-y-1.5 pt-1">
        <div className="text-[10px] uppercase font-bold text-slate-400">Choice Distribution</div>
        {Object.entries(result.choiceDistributionPct).map(([choiceId, pct]) => {
          const isTopTrap = choiceId === result.topTrapChoiceId;
          return (
            <div key={choiceId} className="flex items-center space-x-2 text-xs">
              <span className="w-6 font-mono font-bold uppercase text-slate-700 dark:text-zinc-300">
                {choiceId}:
              </span>
              <div className="flex-1 h-3 rounded-full bg-slate-200/80 dark:bg-zinc-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isTopTrap
                      ? 'bg-rose-500'
                      : 'bg-indigo-600 dark:bg-indigo-500'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-10 text-right font-mono text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                {String(pct)}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Primary Trap Alert */}
      <div className="p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200 flex items-start space-x-2 leading-relaxed">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <p className="font-medium">{result.peerTrapExplanation}</p>
      </div>
    </div>
  );
};
