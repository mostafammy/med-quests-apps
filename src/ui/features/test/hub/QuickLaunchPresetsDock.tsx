import React from 'react';
import { Play, Zap, Flame, Award } from 'lucide-react';
import type { TestMode } from './types.ts';

export interface QuickLaunchPresetsDockProps {
  readonly onLaunchPreset: (count: number, mode: TestMode) => void;
}

export const QuickLaunchPresetsDock: React.FC<QuickLaunchPresetsDockProps> = ({
  onLaunchPreset,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
      {/* Preset 1: Instant Practice 20 Qs */}
      <button
        type="button"
        onClick={() => onLaunchPreset(20, 'practice')}
        className="group text-left p-3.5 sm:p-4 rounded-2xl glass-surface border border-slate-200/80 dark:border-zinc-800/80 hover:border-blue-500/50 dark:hover:border-blue-400/50 hover:bg-white dark:hover:bg-zinc-800/90 hover:shadow-lg hover:shadow-blue-500/5 dark:hover:shadow-blue-500/10 transition-all duration-200 cursor-pointer apple-tap flex items-center justify-between"
      >
        <div className="flex items-center space-x-3 rtl:space-x-reverse min-w-0">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 dark:bg-blue-400/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:bg-blue-600 dark:group-hover:bg-blue-500 group-hover:text-white transition-colors duration-200 shadow-2xs">
            <Zap className="w-4 h-4 fill-current" />
          </div>
          <div className="truncate">
            <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Instant Practice</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-blue-500/10 dark:bg-blue-400/15 text-blue-700 dark:text-blue-300 group-hover:bg-blue-600/15 dark:group-hover:bg-blue-400/25 font-bold transition-colors">20 Qs</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">Immediate tutor rationales</div>
          </div>
        </div>
        <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-zinc-800/80 border border-slate-200/50 dark:border-zinc-700/50 flex items-center justify-center text-slate-400 dark:text-zinc-400 group-hover:bg-blue-600 dark:group-hover:bg-blue-500 group-hover:border-transparent group-hover:text-white transition-all duration-200 shrink-0 ml-2">
          <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
        </div>
      </button>

      {/* Preset 2: Rapid Sprint 15 Qs */}
      <button
        type="button"
        onClick={() => onLaunchPreset(15, 'rapid')}
        className="group text-left p-3.5 sm:p-4 rounded-2xl glass-surface border border-slate-200/80 dark:border-zinc-800/80 hover:border-amber-500/50 dark:hover:border-amber-400/50 hover:bg-white dark:hover:bg-zinc-800/90 hover:shadow-lg hover:shadow-amber-500/5 dark:hover:shadow-amber-500/10 transition-all duration-200 cursor-pointer apple-tap flex items-center justify-between"
      >
        <div className="flex items-center space-x-3 rtl:space-x-reverse min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-400/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:bg-amber-500 dark:group-hover:bg-amber-400 group-hover:text-slate-950 transition-colors duration-200 shadow-2xs">
            <Flame className="w-4 h-4 fill-current" />
          </div>
          <div className="truncate">
            <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>High-Yield Sprint</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-500/10 dark:bg-amber-400/15 text-amber-700 dark:text-amber-300 group-hover:bg-amber-500/20 dark:group-hover:bg-amber-400/25 font-bold transition-colors">15m</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">15 top-yield exam concepts</div>
          </div>
        </div>
        <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-zinc-800/80 border border-slate-200/50 dark:border-zinc-700/50 flex items-center justify-center text-slate-400 dark:text-zinc-400 group-hover:bg-amber-500 dark:group-hover:bg-amber-400 group-hover:border-transparent group-hover:text-slate-950 transition-all duration-200 shrink-0 ml-2">
          <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
        </div>
      </button>

      {/* Preset 3: Faculty Mock Exam 50 Qs */}
      <button
        type="button"
        onClick={() => onLaunchPreset(50, 'mock')}
        className="group text-left p-3.5 sm:p-4 rounded-2xl glass-surface border border-slate-200/80 dark:border-zinc-800/80 hover:border-indigo-500/50 dark:hover:border-indigo-400/50 hover:bg-white dark:hover:bg-zinc-800/90 hover:shadow-lg hover:shadow-indigo-500/5 dark:hover:shadow-indigo-500/10 transition-all duration-200 cursor-pointer apple-tap flex items-center justify-between"
      >
        <div className="flex items-center space-x-3 rtl:space-x-reverse min-w-0">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 dark:bg-indigo-400/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 dark:group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-200 shadow-2xs">
            <Award className="w-4 h-4 fill-current" />
          </div>
          <div className="truncate">
            <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Faculty Mock</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-indigo-500/10 dark:bg-indigo-400/15 text-indigo-700 dark:text-indigo-300 group-hover:bg-indigo-600/15 dark:group-hover:bg-indigo-400/25 font-bold transition-colors">50 Qs</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">120m timed exam simulation</div>
          </div>
        </div>
        <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-zinc-800/80 border border-slate-200/50 dark:border-zinc-700/50 flex items-center justify-center text-slate-400 dark:text-zinc-400 group-hover:bg-indigo-600 dark:group-hover:bg-indigo-500 group-hover:border-transparent group-hover:text-white transition-all duration-200 shrink-0 ml-2">
          <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
        </div>
      </button>
    </div>
  );
};
