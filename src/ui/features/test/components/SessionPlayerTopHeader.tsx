import React from 'react';
import {
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  Clock,
  Flag,
  LayoutGrid,
} from 'lucide-react';
import { LocaleToggle } from '../../../app/LocaleToggle.tsx';
import { ThemeToggle } from '../../../app/ThemeToggle.tsx';
import { CopilotTriggerButton } from '../../copilot/CopilotTriggerButton.tsx';
import { useLocaleStore } from '../../../../application/stores/useLocaleStore.ts';
import type { Question } from '../../../../domain/model/types.ts';
import { formatSessionCountdownTime } from '../sessionPlayerHelpers.ts';

export interface SessionPlayerTopHeaderProps {
  readonly isExamMode: boolean;
  readonly currentIndex: number;
  readonly totalQuestions: number;
  readonly currentQuestion: Question;
  readonly questionFilter?: 'all' | 'unanswered' | 'incorrect';
  readonly timeLeftSeconds: number;
  readonly isFlagged: boolean;
  readonly isBookmarked: boolean;
  readonly answeredCount: number;
  readonly onExitSession: () => void;
  readonly onOpenMatrix: () => void;
  readonly onToggleFlag: () => void;
  readonly onToggleBookmark: () => void;
  readonly onRequestFinish: () => void;
}

export const SessionPlayerTopHeader: React.FC<SessionPlayerTopHeaderProps> = ({
  isExamMode,
  currentIndex,
  totalQuestions,
  currentQuestion,
  questionFilter,
  timeLeftSeconds,
  isFlagged,
  isBookmarked,
  answeredCount,
  onExitSession,
  onOpenMatrix,
  onToggleFlag,
  onToggleBookmark,
  onRequestFinish,
}) => {
  const { t } = useLocaleStore();

  return (
    <header
      className={`sticky top-0 z-40 border-b px-2.5 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-1.5 sm:gap-3 backdrop-blur-2xl transition-all ${
        isExamMode
          ? 'bg-slate-900/85 border-slate-800/80 text-slate-100 shadow-md'
          : 'bg-white/75 dark:bg-zinc-900/75 border-white/60 dark:border-zinc-800/80 text-slate-900 dark:text-zinc-100 shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)]'
      }`}
    >
      <div className="flex items-center space-x-2 sm:space-x-3 rtl:space-x-reverse shrink-0">
        <button
          onClick={onExitSession}
          className={`p-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 rtl:space-x-reverse apple-tap cursor-pointer transition-all ${
            isExamMode
              ? 'text-slate-400 hover:text-white hover:bg-slate-800'
              : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
          }`}
          title={t.common.exitSession}
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          <span className="hidden sm:inline font-bold">{t.common.exit}</span>
        </button>
        <div className="h-4 w-px bg-slate-300 dark:bg-zinc-700" />

        {/* Apple Dynamic Capsule Pill */}
        <button
          onClick={onOpenMatrix}
          className={`group flex items-center space-x-1.5 sm:space-x-2.5 rtl:space-x-reverse px-3 py-1.5 rounded-full transition-all border shadow-xs cursor-pointer apple-tap ${
            isExamMode
              ? 'bg-slate-800/90 hover:bg-slate-750 border-slate-700 text-slate-100 hover:border-slate-600'
              : 'glass-pill-luxury text-slate-900 dark:text-zinc-100'
          }`}
          title={t.test.matrix.title}
        >
          <div className="flex items-center space-x-1 rtl:space-x-reverse text-xs font-bold tracking-tight">
            <span className="text-blue-600 dark:text-blue-400 font-mono font-extrabold text-xs sm:text-sm">
              {String(currentIndex + 1).padStart(2, '0')}
            </span>
            <span className="text-slate-400 font-normal">/</span>
            <span className="text-slate-500 font-mono font-semibold text-xs">
              {String(totalQuestions).padStart(2, '0')}
            </span>
          </div>

          {/* Apple Micro Progress Bar inside capsule */}
          <div className="w-12 h-1.5 bg-slate-200/80 dark:bg-zinc-700/80 rounded-full overflow-hidden hidden sm:block">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 rounded-full transition-all duration-300"
              style={{
                width: `${Math.round(((currentIndex + 1) / Math.max(1, totalQuestions)) * 100)}%`,
              }}
            />
          </div>

          <LayoutGrid className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
        </button>

        {currentQuestion.highYield && (
          <span className="hidden md:inline-flex items-center space-x-1 rtl:space-x-reverse text-[10px] font-black px-2.5 py-0.5 bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-400/40 rounded-full shadow-xs">
            <span>⚡ {t.common.highYield}</span>
          </span>
        )}

        {questionFilter === 'unanswered' && (
          <span className="hidden md:inline-flex items-center space-x-1.5 rtl:space-x-reverse text-[10px] font-black px-2.5 py-0.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-400/40 rounded-full shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{t.test.zeroDuplicatesBadge}</span>
          </span>
        )}
      </div>

      {/* Center / Right: Timer, Theme Toggle & Controls */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {isExamMode && (
          <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono font-bold text-amber-400 shadow-xs">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatSessionCountdownTime(timeLeftSeconds)}</span>
          </div>
        )}

        <button
          onClick={onToggleFlag}
          className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all apple-tap cursor-pointer ${
            isFlagged
              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40'
              : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100/70 dark:hover:bg-zinc-800/70'
          }`}
          title={isFlagged ? t.test.player.flagged : t.test.player.flagQuestion}
        >
          <Flag className={`w-4 h-4 ${isFlagged ? 'fill-current text-amber-500' : ''}`} />
          <span className="hidden lg:inline font-bold">
            {isFlagged ? t.test.player.flagged : t.test.player.flagQuestion}
          </span>
        </button>

        <button
          onClick={onToggleBookmark}
          className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all apple-tap cursor-pointer ${
            isBookmarked
              ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/40'
              : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100/70 dark:hover:bg-zinc-800/70'
          }`}
          title={isBookmarked ? t.test.player.bookmarked : t.test.player.bookmarkQuestion}
        >
          <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current text-blue-500' : ''}`} />
        </button>

        {/* Locale Toggle (Apple Bilingual EN / AR Switcher) */}
        <div className="hidden sm:inline-flex">
          <LocaleToggle />
        </div>

        {/* Theme Toggle (Apple Light / Dark Switcher) */}
        <ThemeToggle />

        {/* AI Cognitive Co-Pilot Trigger */}
        <CopilotTriggerButton />

        {/* Always-accessible Finish Practice / Submit Exam CTA across all viewports */}
        <button
          type="button"
          onClick={onRequestFinish}
          data-testid="header-finish-session-btn"
          className={`inline-flex items-center gap-1.5 py-1.5 px-2.5 sm:px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer apple-tap shadow-xs shrink-0 ${
            isExamMode
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25'
              : answeredCount > 0
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/20'
              : 'bg-slate-100/90 dark:bg-zinc-800/90 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-zinc-200 hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200/80 dark:border-zinc-700/80'
          }`}
          title={isExamMode ? t.test.player.submitExam : t.test.player.finishPractice}
        >
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden md:inline">
            {isExamMode ? t.test.player.submitExam : t.test.player.finishPractice}
          </span>
          <span className="md:hidden">
            {isExamMode ? t.common.submit : t.common.finish}
          </span>
        </button>
      </div>
    </header>
  );
};
