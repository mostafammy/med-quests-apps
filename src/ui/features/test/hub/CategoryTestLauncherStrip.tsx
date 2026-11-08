import React from 'react';
import { Sparkles, CheckCircle2, Play } from 'lucide-react';
import { useLocaleStore } from '../../../../application/stores/useLocaleStore.ts';

export interface CategoryTestLauncherStripProps {
  readonly matchingQuestionCount: number;
  readonly questionCount: number | 'all';
  readonly effectiveQuestionCount: number;
  readonly isPracticeMode: boolean;
  readonly onToggleSelectAllCategory: () => void;
  readonly onLaunchAllCategory: () => void;
  readonly onSelectQuestionCount: (count: number | 'all') => void;
}

export const CategoryTestLauncherStrip: React.FC<CategoryTestLauncherStripProps> = ({
  matchingQuestionCount,
  questionCount,
  effectiveQuestionCount,
  isPracticeMode,
  onToggleSelectAllCategory,
  onLaunchAllCategory,
  onSelectQuestionCount,
}) => {
  const { t } = useLocaleStore();

  return (
    <div className="space-y-4">
      {/* Compact Streamlined Category Test Strip */}
      <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-purple-500/10 dark:from-blue-500/15 dark:via-indigo-500/10 dark:to-purple-500/15 border border-blue-500/20 dark:border-blue-400/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors">
        <div className="flex items-center space-x-2.5 rtl:space-x-reverse min-w-0">
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-slate-900 dark:text-white">
                {t.test.testAllCategory}
              </span>
              <span className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                {matchingQuestionCount} {t.common.questions}
              </span>
              {questionCount === 'all' && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-full font-black bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 uppercase tracking-wide">
                  {t.test.allCategorySelected}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-600 dark:text-zinc-400 truncate">
              {t.test.testAllCategoryDesc}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={onToggleSelectAllCategory}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 border cursor-pointer apple-tap flex items-center justify-center space-x-1 rtl:space-x-reverse ${
              questionCount === 'all'
                ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-600 shadow-xs'
                : 'bg-white/80 dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 border-slate-300/80 dark:border-zinc-700 hover:border-blue-400 dark:hover:border-blue-500/60 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-blue-50/60 dark:hover:bg-blue-950/30'
            }`}
          >
            {questionCount === 'all' ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-white" />
                <span>{t.test.allCategorySelected}</span>
              </>
            ) : (
              <span>{t.test.selectFullCategory}</span>
            )}
          </button>

          <button
            type="button"
            onClick={onLaunchAllCategory}
            disabled={matchingQuestionCount === 0}
            className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-xs hover:shadow-md hover:shadow-blue-500/20 dark:hover:shadow-blue-500/30 flex items-center justify-center space-x-1.5 rtl:space-x-reverse cursor-pointer apple-tap disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>{t.test.launchFullCategory}</span>
          </button>
        </div>
      </div>

      {/* Question Count Selection Strip with Unified Themed Hover */}
      {isPracticeMode && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">
              {t.test.questionCount}
            </label>
            <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
              {effectiveQuestionCount} targeted
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[10, 20, 30, 50].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => onSelectQuestionCount(num)}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all duration-150 border cursor-pointer apple-tap ${
                  questionCount === num
                    ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-600 shadow-xs font-black'
                    : 'glass-pill-luxury text-slate-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-300 hover:border-blue-400/50 dark:hover:border-blue-500/40 hover:bg-blue-50/50 dark:hover:bg-blue-950/20'
                }`}
              >
                {num} {t.common.questions}
              </button>
            ))}
            
            <button
              type="button"
              onClick={() => onSelectQuestionCount('all')}
              className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all duration-150 border cursor-pointer apple-tap flex items-center justify-center space-x-1 rtl:space-x-reverse col-span-2 sm:col-span-1 ${
                questionCount === 'all'
                  ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-600 shadow-xs font-black'
                  : 'glass-pill-luxury text-slate-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-300 hover:border-blue-400/50 dark:hover:border-blue-500/40 hover:bg-blue-50/50 dark:hover:bg-blue-950/20'
              }`}
            >
              <span>{t.test.allCategoryOption} ({matchingQuestionCount})</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
