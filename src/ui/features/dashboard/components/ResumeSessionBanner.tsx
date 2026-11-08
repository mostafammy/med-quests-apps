import React from 'react';
import { Bookmark, ArrowRight } from 'lucide-react';
import type { SavedSessionMemento } from '../../../../application/curriculum/SessionLeaveGuard.ts';

export interface ResumeSessionBannerProps {
  readonly savedSession: SavedSessionMemento;
  readonly onDiscard: () => void;
  readonly onResume: () => void;
}

export const ResumeSessionBanner: React.FC<ResumeSessionBannerProps> = ({
  savedSession,
  onDiscard,
  onResume,
}) => {
  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-blue-500/10 dark:bg-blue-950/40 border border-blue-400/30 dark:border-blue-700/40 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-apple-entrance">
      <div className="flex items-center space-x-3.5 rtl:space-x-reverse">
        <div className="p-3 bg-blue-600 text-white rounded-2xl flex-shrink-0 shadow-md shadow-blue-500/20">
          <Bookmark className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-600 text-white">
              In-Progress {savedSession.mode.toUpperCase()}
            </span>
            <span className="text-xs text-slate-400 dark:text-zinc-500 font-mono">
              {Object.keys(savedSession.answers).length} / {savedSession.questionIds.length} Answered
            </span>
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-zinc-100 mt-0.5">
            Resume your paused {savedSession.mode} session
          </h3>
        </div>
      </div>
      <div className="flex items-center gap-2 self-end sm:self-auto">
        <button
          onClick={onDiscard}
          className="px-3.5 py-2 text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:text-rose-600 rounded-xl transition-colors cursor-pointer"
        >
          Discard
        </button>
        <button
          onClick={onResume}
          className="py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer apple-tap"
        >
          <span>Resume Session</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
