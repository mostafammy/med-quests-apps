import React from 'react';
import { TrendingUp, BookOpen, RotateCcw, CheckCircle2, Flame, Clock } from 'lucide-react';
import { useLocaleStore } from '../../../../application/stores/useLocaleStore.ts';

export interface MasteryKpiCardsProps {
  readonly masteryPercentage: number;
  readonly totalAttempts: number;
  readonly questionsCount: number;
  readonly overallAccuracy: number;
  readonly weakTopicsCount: number;
  readonly dueReviewsCount: number;
  readonly onOpenStudio: () => void;
  readonly onOpenReview: () => void;
  readonly onResetBank: () => void;
}

export const MasteryKpiCards: React.FC<MasteryKpiCardsProps> = ({
  masteryPercentage,
  totalAttempts,
  questionsCount,
  overallAccuracy,
  weakTopicsCount,
  dueReviewsCount,
  onOpenStudio,
  onOpenReview,
  onResetBank,
}) => {
  const { t } = useLocaleStore();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5 pt-4 border-t border-slate-200/60 dark:border-zinc-800/60">
      {/* Overall Mastery - Emerald Tinted Glass */}
      <div className="p-3.5 sm:p-4 rounded-2xl glass-card-interactive bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-400/30 dark:border-emerald-700/40 hover:border-emerald-400/60 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-[11px] text-emerald-800 dark:text-emerald-300 font-bold uppercase tracking-wider">{t.dashboard.masteryScore}</span>
          <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="text-xl sm:text-2xl font-black text-emerald-900 dark:text-emerald-200 mt-1">
          {masteryPercentage}%
        </div>
        <div className="text-[10px] sm:text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
          {totalAttempts > 0 ? `${masteryPercentage}% ${t.dashboard.masterySub}` : t.review.notAttempted}
        </div>
      </div>

      {/* Active Bank - Sapphire Blue Tinted Glass */}
      <div className="p-3.5 sm:p-4 rounded-2xl glass-card-interactive bg-blue-500/5 dark:bg-blue-950/20 border-blue-400/30 dark:border-blue-700/40 hover:border-blue-400/60 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-[11px] text-blue-800 dark:text-blue-300 font-bold uppercase tracking-wider">{t.common.questions}</span>
          <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="text-xl sm:text-2xl font-black text-blue-950 dark:text-blue-100 mt-1">
          {questionsCount} <span className="text-xs font-normal text-slate-400 dark:text-zinc-500">{t.common.questions}</span>
        </div>
        <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-semibold mt-1">
          <span onClick={onOpenStudio} className="cursor-pointer text-blue-600 dark:text-blue-400 hover:underline">
            {t.nav.studio} →
          </span>
          <button
            type="button"
            onClick={onResetBank}
            className="cursor-pointer text-slate-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 flex items-center space-x-1 rtl:space-x-reverse transition-colors"
            title={t.bank.resetToGlobalBtn}
          >
            <RotateCcw className="w-2.5 h-2.5 text-rose-500" />
            <span>{t.bank.resetToGlobalBtn}</span>
          </button>
        </div>
      </div>

      {/* Attempts Logged - Royal Indigo Tinted Glass */}
      <div className="p-3.5 sm:p-4 rounded-2xl glass-card-interactive bg-indigo-500/5 dark:bg-indigo-950/20 border-indigo-400/30 dark:border-indigo-700/40 hover:border-indigo-400/60 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-[11px] text-indigo-800 dark:text-indigo-300 font-bold uppercase tracking-wider">{t.dashboard.overallAccuracy}</span>
          <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="text-xl sm:text-2xl font-black text-indigo-950 dark:text-indigo-100 mt-1">
          {totalAttempts}
        </div>
        <div className="text-[10px] sm:text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mt-1">
          {totalAttempts > 0 ? `${overallAccuracy}% ${t.common.accuracy}` : t.dashboard.accuracySub}
        </div>
      </div>

      {/* Weak Areas - Coral Rose Tinted Glass */}
      <div className="p-3.5 sm:p-4 rounded-2xl glass-card-interactive bg-rose-500/5 dark:bg-rose-950/20 border-rose-400/30 dark:border-rose-700/40 hover:border-rose-400/60 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-[11px] text-rose-800 dark:text-rose-300 font-bold uppercase tracking-wider">{t.dashboard.weakTopics}</span>
          <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600 dark:text-rose-400" />
        </div>
        <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
          {weakTopicsCount}
        </div>
        <div className="text-[10px] sm:text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-1">
          <span onClick={onOpenReview} className="cursor-pointer hover:underline">
            {weakTopicsCount > 0 ? `${t.review.badge} →` : t.review.noWeakTitle}
          </span>
        </div>
      </div>

      {/* Due Reviews - Amber Gold Tinted Glass */}
      <div className="p-3.5 sm:p-4 rounded-2xl glass-card-interactive bg-amber-500/5 dark:bg-amber-950/20 border-amber-400/30 dark:border-amber-700/40 hover:border-amber-400/60 col-span-2 sm:col-span-1 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-[11px] text-amber-800 dark:text-amber-300 font-bold uppercase tracking-wider">{t.dashboard.dueReviews}</span>
          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
          {dueReviewsCount}
        </div>
        <div className="text-[10px] sm:text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-1">
          <span onClick={onOpenReview} className="cursor-pointer hover:underline">
            {t.nav.review} →
          </span>
        </div>
      </div>
    </div>
  );
};
