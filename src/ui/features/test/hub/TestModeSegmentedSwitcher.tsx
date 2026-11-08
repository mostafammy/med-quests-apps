import React from 'react';
import { Zap, Award, Flame } from 'lucide-react';
import { useLocaleStore } from '../../../../application/stores/useLocaleStore.ts';
import type { TestMode } from './types.ts';

export interface TestModeSegmentedSwitcherProps {
  readonly selectedMode: TestMode;
  readonly onSelectMode: (mode: TestMode) => void;
}

export const TestModeSegmentedSwitcher: React.FC<TestModeSegmentedSwitcherProps> = ({
  selectedMode,
  onSelectMode,
}) => {
  const { t } = useLocaleStore();

  return (
    <div className="p-1 rounded-2xl bg-slate-200/60 dark:bg-zinc-900/80 border border-slate-300/40 dark:border-zinc-800/80 backdrop-blur-md">
      <div className="grid grid-cols-3 gap-1">
        {/* Practice Mode Tab */}
        <button
          type="button"
          onClick={() => onSelectMode('practice')}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center space-x-2 rtl:space-x-reverse cursor-pointer apple-tap ${
            selectedMode === 'practice'
              ? 'bg-white dark:bg-zinc-800 text-blue-700 dark:text-blue-300 shadow-sm border border-slate-200/80 dark:border-zinc-700 font-black'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-zinc-800/60'
          }`}
        >
          <Zap className={`w-3.5 h-3.5 ${selectedMode === 'practice' ? 'text-blue-600 dark:text-blue-400 fill-blue-500/20' : ''}`} />
          <span>{t.test.practiceMode}</span>
          <span className="hidden sm:inline text-[10px] opacity-60 font-mono">[1]</span>
        </button>

        {/* Mock Exam Tab */}
        <button
          type="button"
          onClick={() => onSelectMode('mock')}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center space-x-2 rtl:space-x-reverse cursor-pointer apple-tap ${
            selectedMode === 'mock'
              ? 'bg-white dark:bg-zinc-800 text-indigo-700 dark:text-indigo-300 shadow-sm border border-slate-200/80 dark:border-zinc-700 font-black'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-zinc-800/60'
          }`}
        >
          <Award className={`w-3.5 h-3.5 ${selectedMode === 'mock' ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
          <span>{t.test.mockMode}</span>
          <span className="hidden sm:inline text-[10px] opacity-60 font-mono">[2]</span>
        </button>

        {/* Rapid High-Yield Tab */}
        <button
          type="button"
          onClick={() => onSelectMode('rapid')}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center space-x-2 rtl:space-x-reverse cursor-pointer apple-tap ${
            selectedMode === 'rapid'
              ? 'bg-white dark:bg-zinc-800 text-amber-700 dark:text-amber-300 shadow-sm border border-slate-200/80 dark:border-zinc-700 font-black'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-zinc-800/60'
          }`}
        >
          <Flame className={`w-3.5 h-3.5 ${selectedMode === 'rapid' ? 'text-amber-500 fill-amber-500/20' : ''}`} />
          <span>{t.test.rapidMode}</span>
          <span className="hidden sm:inline text-[10px] opacity-60 font-mono">[3]</span>
        </button>
      </div>
    </div>
  );
};
