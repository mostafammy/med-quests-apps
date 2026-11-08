import React from 'react';
import { Activity, TrendingUp, RotateCcw, Zap } from 'lucide-react';
import { useLocaleStore } from '../../../../application/stores/useLocaleStore.ts';

export interface ScopeCoverageData {
  readonly total: number;
  readonly answered: number;
  readonly unanswered: number;
  readonly correct: number;
  readonly incorrect: number;
  readonly accuracy: number;
  readonly percentComplete: number;
}

export interface CurriculumScopeProgressCardProps {
  readonly selectedCategoryLabel: string;
  readonly scopeCoverage: ScopeCoverageData;
  readonly selectedSubject: string;
  readonly onResetSubjectStats: () => void;
  readonly onContinueBank: () => void;
  readonly onReviewMissed: () => void;
  readonly onRestartCategory: () => void;
}

export const CurriculumScopeProgressCard: React.FC<CurriculumScopeProgressCardProps> = ({
  selectedCategoryLabel,
  scopeCoverage,
  selectedSubject,
  onResetSubjectStats,
  onContinueBank,
  onReviewMissed,
  onRestartCategory,
}) => {
  const { t } = useLocaleStore();

  return (
    <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-white/95 via-slate-50/80 to-blue-50/40 dark:from-zinc-900/95 dark:via-zinc-900/80 dark:to-blue-950/25 border border-slate-200/90 dark:border-zinc-800 shadow-xs space-y-3.5 relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div className="flex items-center space-x-3 rtl:space-x-reverse min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-blue-600/10 dark:bg-blue-400/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20 shadow-2xs">
            <Activity className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight">
                {selectedCategoryLabel} Bank Continuity
              </h3>
              {scopeCoverage.unanswered === 0 && scopeCoverage.total > 0 ? (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
                  100% Mastered 🎉
                </span>
              ) : (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 uppercase tracking-wider">
                  {scopeCoverage.percentComplete}% Solved
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
              {scopeCoverage.answered} of {scopeCoverage.total} completed • <strong className="text-blue-600 dark:text-blue-400 font-bold">{scopeCoverage.unanswered} fresh questions remaining</strong>
            </p>
          </div>
        </div>

        {/* Accuracy Pill & Subject Reset */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <div className="glass-pill-luxury px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-zinc-800 flex items-center space-x-1.5 rtl:space-x-reverse text-xs font-bold text-slate-800 dark:text-zinc-200">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <span>{scopeCoverage.accuracy}% {t.common.accuracy}</span>
          </div>
          {selectedSubject !== 'all' && scopeCoverage.answered > 0 && (
            <button
              type="button"
              onClick={onResetSubjectStats}
              className="glass-pill-luxury px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200/80 dark:border-zinc-800 hover:border-rose-400/50 cursor-pointer apple-tap transition-all"
              title={t.test.resetSubjectProgressBtn}
            >
              <RotateCcw className="w-3 h-3 text-slate-400 hover:text-rose-500 inline mr-1" />
              <span>{t.test.resetSubjectProgressBtn}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tri-Color Glassmorphic Progress Bar */}
      <div className="space-y-1.5">
        <div className="h-2.5 sm:h-3 w-full bg-slate-200/70 dark:bg-zinc-800/80 rounded-full overflow-hidden flex p-0.5 gap-0.5 shadow-inner">
          {scopeCoverage.correct > 0 && (
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${(scopeCoverage.correct / (scopeCoverage.total || 1)) * 100}%` }}
              title={`${scopeCoverage.correct} Mastered`}
            />
          )}
          {scopeCoverage.incorrect > 0 && (
            <div
              className="h-full bg-rose-500 rounded-full transition-all duration-500"
              style={{ width: `${(scopeCoverage.incorrect / (scopeCoverage.total || 1)) * 100}%` }}
              title={`${scopeCoverage.incorrect} Missed`}
            />
          )}
          <div
            className="h-full bg-blue-500/20 dark:bg-blue-400/20 rounded-full transition-all duration-500"
            style={{ width: `${(scopeCoverage.unanswered / (scopeCoverage.total || 1)) * 100}%` }}
            title={`${scopeCoverage.unanswered} Fresh Remaining`}
          />
        </div>

        {/* Progress Legend Counters */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 font-semibold px-0.5">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {scopeCoverage.correct} Mastered
            </span>
            <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              {scopeCoverage.incorrect} Missed
            </span>
            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              {scopeCoverage.unanswered} Fresh Remaining
            </span>
          </div>
          <span className="text-slate-400 dark:text-zinc-500 font-mono text-[10px]">
            Total: {scopeCoverage.total} Qs
          </span>
        </div>
      </div>

      {/* Quick Hero Continuity Action Bar */}
      <div className="pt-1 flex flex-wrap items-center gap-2">
        {scopeCoverage.unanswered > 0 ? (
          <>
            <button
              type="button"
              onClick={onContinueBank}
              className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-xs hover:shadow-md hover:shadow-blue-500/25 flex items-center space-x-2 rtl:space-x-reverse cursor-pointer apple-tap transition-all"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>{t.test.continueBankCta} ({scopeCoverage.unanswered} Left)</span>
            </button>

            {scopeCoverage.incorrect > 0 && (
              <button
                type="button"
                onClick={onReviewMissed}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 flex items-center space-x-1.5 rtl:space-x-reverse cursor-pointer apple-tap transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t.test.reviewMissedCta.replace('{count}', String(scopeCoverage.incorrect))}</span>
              </button>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onRestartCategory}
              className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-xs hover:shadow-md hover:shadow-emerald-500/25 flex items-center space-x-2 rtl:space-x-reverse cursor-pointer apple-tap transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t.test.restartCategoryBtn} ({scopeCoverage.total} Qs)</span>
            </button>

            {scopeCoverage.incorrect > 0 && (
              <button
                type="button"
                onClick={onReviewMissed}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 flex items-center space-x-1.5 rtl:space-x-reverse cursor-pointer apple-tap transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t.test.reviewMissedCta.replace('{count}', String(scopeCoverage.incorrect))}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
