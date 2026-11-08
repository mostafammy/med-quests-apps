import React from 'react';
import { ChevronDown, RotateCcw, Clock, Play } from 'lucide-react';
import { useLocaleStore } from '../../../../application/stores/useLocaleStore.ts';

export interface CurriculumBlockDescriptor {
  readonly id?: string;
  readonly code?: string;
  readonly name: { en: string; ar: string };
  readonly description: { en: string; ar: string };
  readonly shortName?: string;
  readonly [key: string]: unknown;
}

export interface DashboardHeaderHubProps {
  readonly block: CurriculumBlockDescriptor | null;
  readonly defaultBlockName: string;
  readonly visibleBlocksCount: number;
  readonly totalAttempts: number;
  readonly onOpenBlockSheet: () => void;
  readonly onResetBank: () => void;
  readonly onResetStats: () => void;
  readonly onLaunchMockExam: () => void;
  readonly onLaunchPractice: () => void;
}

export const DashboardHeaderHub: React.FC<DashboardHeaderHubProps> = ({
  block,
  defaultBlockName,
  visibleBlocksCount,
  totalAttempts,
  onOpenBlockSheet,
  onResetBank,
  onResetStats,
  onLaunchMockExam,
  onLaunchPractice,
}) => {
  const { t, locale } = useLocaleStore();

  const title = block 
    ? (locale === 'ar' ? block.name.ar : block.name.en) 
    : t.dashboard.title.replace('{blockName}', defaultBlockName);

  const description = block 
    ? (locale === 'ar' ? block.description.ar : block.description.en) 
    : t.dashboard.subtitle;

  return (
    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 sm:gap-5">
      <div className="space-y-1.5 min-w-0">
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-blue-700 dark:text-blue-300 bg-blue-500/15 dark:bg-blue-400/15 px-2.5 py-0.5 rounded-full border border-blue-400/30 backdrop-blur-md">
            {block?.code || t.dashboard.badgeExamPrep}
          </span>
          <span className="text-xs text-slate-300 dark:text-zinc-600">•</span>
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1.5 rtl:space-x-reverse">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="hidden xs:inline sm:inline">{t.dashboard.engineBadge}</span>
          </span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-300 dark:to-purple-300 bg-clip-text text-transparent flex items-center gap-2">
          <span>{title}</span>
          {visibleBlocksCount >= 2 && (
            <button
              type="button"
              onClick={onOpenBlockSheet}
              aria-label="Switch Curriculum Block"
              className="inline-flex md:hidden items-center justify-center p-1 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-zinc-300 cursor-pointer apple-tap"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          )}
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 max-w-xl leading-relaxed">
          {description}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-2.5 w-full xl:w-auto shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onResetBank}
            className="py-2.5 px-3 glass-pill-luxury text-slate-700 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400 rounded-2xl text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer apple-tap flex-1 sm:flex-none whitespace-nowrap shrink-0 border hover:border-rose-300 dark:hover:border-rose-800 transition-all"
            title={t.bank.resetToGlobalBtn}
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span className="hidden sm:inline">{t.bank.resetToGlobalBtn}</span>
          </button>
          <button
            type="button"
            onClick={onResetStats}
            className="py-2.5 px-3 glass-pill-luxury text-slate-600 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 rounded-2xl text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer apple-tap flex-1 sm:flex-none whitespace-nowrap shrink-0"
            title={t.dashboard.resetModalDesc}
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
            <span>{t.dashboard.resetBtn}</span>
          </button>
          <button
            type="button"
            onClick={onLaunchMockExam}
            className="py-2.5 px-4 bg-gradient-to-r from-slate-900 to-indigo-950 dark:from-zinc-800 dark:to-zinc-900 hover:from-slate-800 hover:to-indigo-900 text-white rounded-2xl text-xs sm:text-sm font-bold border border-indigo-500/30 dark:border-indigo-500/20 backdrop-blur-md shadow-md shadow-indigo-950/20 transition-all cursor-pointer flex items-center justify-center space-x-1.5 apple-tap flex-1 sm:flex-none whitespace-nowrap shrink-0"
          >
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{t.dashboard.mockExamBtn}</span>
          </button>
        </div>
        <button
          onClick={onLaunchPractice}
          className="shimmer-active py-2.5 px-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-xs sm:text-sm font-extrabold flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/25 transition-all cursor-pointer apple-tap w-full sm:w-auto whitespace-nowrap shrink-0"
        >
          <Play className="w-4 h-4 fill-current text-white shrink-0" />
          <span>{totalAttempts > 0 ? t.dashboard.continuePractice : t.dashboard.startPractice}</span>
        </button>
      </div>
    </div>
  );
};
