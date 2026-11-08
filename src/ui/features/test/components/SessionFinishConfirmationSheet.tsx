import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useLocaleStore } from '../../../../application/stores/useLocaleStore.ts';

export interface SessionFinishConfirmationSheetProps {
  readonly isOpen: boolean;
  readonly isExamMode: boolean;
  readonly answeredCount: number;
  readonly unansweredCount: number;
  readonly flaggedCount: number;
  readonly onClose: () => void;
  readonly onConfirmFinish: () => void;
}

export const SessionFinishConfirmationSheet: React.FC<
  SessionFinishConfirmationSheetProps
> = ({
  isOpen,
  isExamMode,
  answeredCount,
  unansweredCount,
  flaggedCount,
  onClose,
  onConfirmFinish,
}) => {
  const { t } = useLocaleStore();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-xl"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="finish-session-modal-title"
        className="w-full max-w-md glass-surface rounded-t-[28px] sm:rounded-3xl p-5 sm:p-6 shadow-2xl border border-white/80 dark:border-white/10 space-y-5 animate-sheet-slide-up sm:animate-spring-modal-in pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-zinc-700 rounded-full mx-auto -mt-1 sm:hidden" />

        <div className="space-y-1.5 text-center sm:text-start">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{isExamMode ? t.test.player.submitExam : t.test.player.finishPractice}</span>
          </div>
          <h2
            id="finish-session-modal-title"
            className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight font-heading"
          >
            {t.test.player.finishModalTitle}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
            {t.test.player.finishModalSubtitle}
          </p>
        </div>

        {/* Session Telemetry Summary Counters */}
        <div className="grid grid-cols-3 gap-2.5 text-center">
          <div className="p-3 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/25">
            <div className="text-lg sm:text-xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
              {answeredCount}
            </div>
            <div className="text-[11px] font-semibold text-emerald-800/80 dark:text-emerald-400">
              {t.test.player.finishModalAnswered}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-100/80 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700/80">
            <div className="text-lg sm:text-xl font-black text-slate-800 dark:text-zinc-100 font-mono">
              {unansweredCount}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
              {t.test.player.finishModalUnanswered}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/25">
            <div className="text-lg sm:text-xl font-black text-amber-700 dark:text-amber-300 font-mono">
              {flaggedCount}
            </div>
            <div className="text-[11px] font-semibold text-amber-800/80 dark:text-amber-400">
              {t.test.player.finishModalFlagged}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs sm:text-sm font-bold transition-all cursor-pointer apple-tap"
          >
            {t.test.player.finishModalKeepPracticing}
          </button>
          <button
            type="button"
            onClick={onConfirmFinish}
            data-testid="confirm-finish-session-btn"
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/25 transition-all cursor-pointer apple-tap"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{t.test.player.finishModalConfirm}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
