import React from 'react';
import { Play, ChevronRight } from 'lucide-react';
import { useLocaleStore } from '../../../../application/stores/useLocaleStore.ts';
import type { TestMode, RepetitionFilter } from './types.ts';

export interface CommandDeckLaunchBarProps {
  readonly selectedCategoryLabel: string;
  readonly matchingQuestionCount: number;
  readonly effectiveQuestionCount: number;
  readonly selectedMode: TestMode;
  readonly questionCount: number | 'all';
  readonly repetitionFilter: RepetitionFilter;
  readonly onLaunch: () => void;
}

export const CommandDeckLaunchBar: React.FC<CommandDeckLaunchBarProps> = ({
  selectedCategoryLabel,
  matchingQuestionCount,
  effectiveQuestionCount,
  selectedMode,
  questionCount,
  repetitionFilter,
  onLaunch,
}) => {
  const { t, isRtl } = useLocaleStore();

  return (
    <div className="glass-dark-capsule rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 relative overflow-hidden shadow-lg border border-slate-800">
      <div className="space-y-0.5 relative z-10 min-w-0">
        <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest flex items-center gap-1.5">
          <span>{t.test.matchingQuestions}</span>
          <span className="text-slate-600">•</span>
          <span className="text-blue-400 font-bold">{selectedCategoryLabel}</span>
        </div>
        <div className="text-base sm:text-lg font-black text-white flex items-center space-x-2 truncate">
          <span>
            {selectedMode === 'mock' 
              ? `50 ${t.common.questions} • 120 Mins ${t.test.mockMode}` 
              : selectedMode === 'rapid' 
              ? `${Math.min(matchingQuestionCount, 15)} ${t.test.highYieldOnly}` 
              : questionCount === 'all'
              ? `${effectiveQuestionCount} ${t.common.questions} (${repetitionFilter === 'unanswered' ? 'Fresh Only • Zero Duplicates' : t.test.fullCategoryBadge}) • ${t.test.practiceMode}`
              : `${effectiveQuestionCount} ${t.common.questions} (${repetitionFilter === 'unanswered' ? 'Fresh Only • Zero Duplicates' : 'Standard Pool'}) • ${t.test.practiceMode}`}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 font-normal flex items-center gap-2">
          <span>Launch: <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 font-mono font-bold">⌘↵</kbd></span>
          <span>Answer: <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 font-mono font-bold">1</kbd>–<kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 font-mono font-bold">4</kbd></span>
        </p>
      </div>

      <button
        onClick={onLaunch}
        disabled={matchingQuestionCount === 0}
        className={`w-full sm:w-auto py-2.5 sm:py-3 px-5 sm:px-7 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center space-x-2.5 transition-all duration-200 cursor-pointer shadow-md relative z-10 apple-tap ${
          matchingQuestionCount === 0
            ? 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
            : selectedMode === 'mock'
            ? 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700 hover:from-indigo-400 hover:to-indigo-600 text-white shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/40 dark:hover:shadow-indigo-400/25 hover:brightness-105 active:brightness-95'
            : selectedMode === 'rapid'
            ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black shadow-amber-500/25 hover:shadow-lg hover:shadow-amber-500/40 dark:hover:shadow-amber-400/25 hover:brightness-105 active:brightness-95'
            : 'bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/40 dark:hover:shadow-blue-400/25 hover:brightness-105 active:brightness-95'
        }`}
      >
        <Play className="w-3.5 h-3.5 fill-current" />
        <span>{selectedMode === 'mock' ? t.test.launchMock : selectedMode === 'rapid' ? t.test.launchRapid : t.test.launchPractice}</span>
        <ChevronRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
      </button>
    </div>
  );
};
