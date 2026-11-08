import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useLocaleStore } from '../../../../application/stores/useLocaleStore.ts';
import type { RepetitionFilter } from './types.ts';

export interface RepetitionFilterStripProps {
  readonly repetitionFilter: RepetitionFilter;
  readonly scopeCoverage: {
    readonly unanswered: number;
    readonly total: number;
    readonly incorrect: number;
  };
  readonly onSelectFilter: (filter: RepetitionFilter) => void;
}

export const RepetitionFilterStrip: React.FC<RepetitionFilterStripProps> = ({
  repetitionFilter,
  scopeCoverage,
  onSelectFilter,
}) => {
  const { t } = useLocaleStore();

  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">
          {t.test.repetitionFilterTitle}
        </label>
        <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
          {repetitionFilter === 'unanswered'
            ? t.test.filterUnansweredDesc
            : repetitionFilter === 'incorrect'
            ? t.test.filterIncorrectOnlyDesc
            : t.test.filterAllPoolDesc}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {/* Tab 1: Fresh / Unanswered */}
        <button
          type="button"
          onClick={() => onSelectFilter('unanswered')}
          className={`p-3 rounded-2xl text-left border transition-all duration-150 cursor-pointer apple-tap flex items-center justify-between ${
            repetitionFilter === 'unanswered'
              ? 'bg-blue-600/10 dark:bg-blue-500/15 border-blue-500/60 text-blue-900 dark:text-blue-100 shadow-xs'
              : 'glass-pill-luxury text-slate-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-400/40'
          }`}
        >
          <div className="min-w-0 pr-2">
            <div className="text-xs font-black flex items-center gap-1.5">
              <span>{t.test.filterUnanswered}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                repetitionFilter === 'unanswered'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300'
              }`}>
                {scopeCoverage.unanswered}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">
              Zero duplicates guarantee
            </div>
          </div>
          {repetitionFilter === 'unanswered' && (
            <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          )}
        </button>

        {/* Tab 2: All Questions */}
        <button
          type="button"
          onClick={() => onSelectFilter('all')}
          className={`p-3 rounded-2xl text-left border transition-all duration-150 cursor-pointer apple-tap flex items-center justify-between ${
            repetitionFilter === 'all'
              ? 'bg-indigo-600/10 dark:bg-indigo-500/15 border-indigo-500/60 text-indigo-900 dark:text-indigo-100 shadow-xs'
              : 'glass-pill-luxury text-slate-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-400/40'
          }`}
        >
          <div className="min-w-0 pr-2">
            <div className="text-xs font-black flex items-center gap-1.5">
              <span>{t.test.filterAllPool}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                repetitionFilter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300'
              }`}>
                {scopeCoverage.total}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">
              Full bank rotation
            </div>
          </div>
          {repetitionFilter === 'all' && (
            <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          )}
        </button>

        {/* Tab 3: Missed Only */}
        <button
          type="button"
          onClick={() => onSelectFilter('incorrect')}
          disabled={scopeCoverage.incorrect === 0}
          className={`p-3 rounded-2xl text-left border transition-all duration-150 cursor-pointer apple-tap flex items-center justify-between disabled:opacity-40 disabled:cursor-not-allowed ${
            repetitionFilter === 'incorrect'
              ? 'bg-rose-600/10 dark:bg-rose-500/15 border-rose-500/60 text-rose-900 dark:text-rose-100 shadow-xs'
              : 'glass-pill-luxury text-slate-700 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-400/40'
          }`}
        >
          <div className="min-w-0 pr-2">
            <div className="text-xs font-black flex items-center gap-1.5">
              <span>{t.test.filterIncorrectOnly}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                repetitionFilter === 'incorrect'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300'
              }`}>
                {scopeCoverage.incorrect}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">
              Targeted remediation
            </div>
          </div>
          {repetitionFilter === 'incorrect' && (
            <CheckCircle2 className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
        </button>
      </div>
    </div>
  );
};
