import React from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, LayoutGrid } from 'lucide-react';
import { useLocaleStore } from '../../../../application/stores/useLocaleStore.ts';

export interface SessionBottomCommandDockProps {
  readonly isExamMode: boolean;
  readonly isAnswered: boolean;
  readonly isLastQuestion: boolean;
  readonly currentIndex: number;
  readonly totalQuestions: number;
  readonly onPrev: () => void;
  readonly onNext: () => void;
  readonly onRequestFinish: () => void;
  readonly onSubmitExam: () => void;
  readonly onOpenMatrix: () => void;
}

export const SessionBottomCommandDock: React.FC<SessionBottomCommandDockProps> = ({
  isExamMode,
  isAnswered,
  isLastQuestion,
  currentIndex,
  totalQuestions,
  onPrev,
  onNext,
  onRequestFinish,
  onSubmitExam,
  onOpenMatrix,
}) => {
  const { t, isRtl } = useLocaleStore();

  return (
    <div className="fixed bottom-0 inset-x-0 z-30 pointer-events-none px-3 sm:px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
      <div
        data-testid="session-bottom-dock"
        className={`pointer-events-auto max-w-4xl mx-auto rounded-2xl sm:rounded-full px-2.5 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-3 border backdrop-blur-2xl transition-all duration-300 ${
          isExamMode
            ? 'bg-slate-900/90 border-slate-700/80 text-slate-200 shadow-[0_16px_48px_rgba(0,0,0,0.65)]'
            : 'glass-surface border-white/90 dark:border-zinc-700/80 text-slate-800 dark:text-zinc-100 shadow-[0_12px_40px_rgba(15,23,42,0.12)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.65)]'
        }`}
      >
        {/* Left Slot: Tactile Back Pill */}
        <button
          type="button"
          onClick={onPrev}
          disabled={currentIndex === 0}
          className={`h-10 sm:h-11 px-3.5 sm:px-4 rounded-xl sm:rounded-full border font-bold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer apple-tap transition-all shrink-0 disabled:opacity-35 disabled:pointer-events-none ${
            isExamMode
              ? 'border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200'
              : 'border-slate-200/90 dark:border-zinc-700/80 bg-white/80 dark:bg-zinc-800/80 hover:bg-white dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-100 shadow-2xs'
          }`}
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180 shrink-0" />
          <span>{t.common.back}</span>
        </button>

        {/* Center Slot: Apple Dynamic HUD & Keyboard Command Bar */}
        <div className="flex items-center justify-center min-w-0 flex-1">
          {/* Desktop / Tablet: Refined Tactile Keycap Command Capsule */}
          <div
            className={`hidden md:inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border transition-all duration-300 ${
              isExamMode
                ? 'bg-slate-950/80 border-slate-800 text-slate-300'
                : 'bg-slate-100/85 dark:bg-zinc-900/90 border-slate-200/80 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 shadow-inner'
            }`}
          >
            {!isExamMode && isAnswered ? (
              <div className="flex items-center gap-2.5 animate-apple-entrance">
                <button
                  type="button"
                  onClick={isLastQuestion ? onRequestFinish : onNext}
                  className="inline-flex items-center gap-1.5 group cursor-pointer"
                >
                  <kbd className="ltr-isolate px-2 py-0.5 rounded-md bg-blue-600 text-white font-mono text-[10px] font-extrabold shadow-2xs border border-blue-500">
                    Enter ⏎
                  </kbd>
                  <span className="text-xs font-bold text-slate-800 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {isLastQuestion ? t.test.player.finishResults : t.test.player.next}
                  </span>
                </button>

                <span className="h-3.5 w-px bg-slate-300/80 dark:bg-zinc-700" />

                <div className="inline-flex items-center gap-1.5">
                  <kbd className="ltr-isolate px-1.5 py-0.5 rounded-md bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-mono text-[10px] font-bold border border-slate-300/80 dark:border-zinc-700 shadow-2xs">
                    ←
                  </kbd>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                    {t.nav.review}
                  </span>
                </div>

                <span className="h-3.5 w-px bg-slate-300/80 dark:bg-zinc-700" />

                <button
                  type="button"
                  onClick={onOpenMatrix}
                  className="inline-flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                  title={t.test.player.questionMatrixShortcut}
                >
                  <kbd className="ltr-isolate px-1.5 py-0.5 rounded-md bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-mono text-[10px] font-bold border border-slate-300/80 dark:border-zinc-700 shadow-2xs">
                    G
                  </kbd>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                    {t.test.player.gridShortcut}
                  </span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                {/* 1-4 Answer Keycaps */}
                <div className="inline-flex items-center gap-1.5">
                  <div className="ltr-isolate inline-flex items-center gap-0.5">
                    {(['1', '2', '3', '4'] as const).map((k) => (
                      <kbd
                        key={k}
                        className="w-5 h-5 inline-flex items-center justify-center rounded-md bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 font-mono text-[10px] font-extrabold border border-slate-300/90 dark:border-zinc-700 shadow-[0_1px_0_rgba(0,0,0,0.08)]"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300">
                    {t.test.player.answerShortcut}
                  </span>
                </div>

                <span className="h-3.5 w-px bg-slate-300/80 dark:bg-zinc-700" />

                {/* Arrow Keycaps */}
                <div className="inline-flex items-center gap-1.5">
                  <div className="ltr-isolate inline-flex items-center gap-0.5">
                    <kbd className="w-5 h-5 inline-flex items-center justify-center rounded-md bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 font-mono text-[10px] font-extrabold border border-slate-300/90 dark:border-zinc-700 shadow-[0_1px_0_rgba(0,0,0,0.08)]">
                      ←
                    </kbd>
                    <kbd className="w-5 h-5 inline-flex items-center justify-center rounded-md bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 font-mono text-[10px] font-extrabold border border-slate-300/90 dark:border-zinc-700 shadow-[0_1px_0_rgba(0,0,0,0.08)]">
                      →
                    </kbd>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300">
                    {t.test.player.navigateShortcut}
                  </span>
                </div>

                <span className="h-3.5 w-px bg-slate-300/80 dark:bg-zinc-700" />

                {/* Matrix Grid Shortcut */}
                <button
                  type="button"
                  onClick={onOpenMatrix}
                  className="inline-flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                  title={t.test.player.questionMatrixShortcut}
                >
                  <kbd className="ltr-isolate w-5 h-5 inline-flex items-center justify-center rounded-md bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 font-mono text-[10px] font-extrabold border border-slate-300/90 dark:border-zinc-700 shadow-[0_1px_0_rgba(0,0,0,0.08)]">
                    G
                  </kbd>
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300">
                    {t.test.player.gridShortcut}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile / Compact Tablet: Interactive Matrix Progress Pill */}
          <button
            type="button"
            onClick={onOpenMatrix}
            className={`md:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer apple-tap ${
              isExamMode
                ? 'bg-slate-800 border-slate-700 text-slate-200'
                : 'bg-slate-100/90 dark:bg-zinc-800/90 border-slate-200/80 dark:border-zinc-700 text-slate-700 dark:text-zinc-200'
            }`}
            title={t.test.matrix.title}
          >
            <LayoutGrid className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="ltr-isolate font-mono font-extrabold text-blue-600 dark:text-blue-400">
              {currentIndex + 1}
            </span>
            <span className="text-slate-400">/</span>
            <span className="ltr-isolate font-mono text-slate-500 dark:text-zinc-400">
              {totalQuestions}
            </span>
          </button>
        </div>

        {/* Right Slot: Finish Practice CTA + Next Action */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {!isLastQuestion && (
            <button
              type="button"
              onClick={onRequestFinish}
              data-testid="dock-finish-session-btn"
              title={isExamMode ? t.test.player.submitExam : t.test.player.finishPractice}
              className={`h-10 sm:h-11 px-3 sm:px-4 rounded-xl sm:rounded-full font-bold text-xs sm:text-sm flex items-center gap-1.5 border cursor-pointer transition-all apple-tap ${
                isExamMode
                  ? 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border-emerald-700/60'
                  : 'bg-emerald-50/90 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/90 dark:border-emerald-800/70 shadow-2xs'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">
                {isExamMode ? t.test.player.submitExam : t.test.player.finishPractice}
              </span>
              <span className="sm:hidden">{isExamMode ? t.common.submit : t.common.finish}</span>
            </button>
          )}

          {isLastQuestion ? (
            <button
              type="button"
              onClick={onSubmitExam}
              data-testid="dock-primary-finish-btn"
              className={`h-10 sm:h-11 px-4 sm:px-6 rounded-xl sm:rounded-full font-extrabold text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-lg transition-all apple-tap ${
                isExamMode
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/25'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/25'
              }`}
            >
              <span>{isExamMode ? t.test.player.submitExam : t.test.player.finishResults}</span>
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onNext}
              className="h-10 sm:h-11 px-4 sm:px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl sm:rounded-full font-bold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/25 transition-all apple-tap"
            >
              <span>{t.common.next}</span>
              <ArrowRight
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${isRtl ? 'rotate-180' : ''}`}
              />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
