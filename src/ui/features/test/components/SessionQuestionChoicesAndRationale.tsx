import React from 'react';
import { BookOpen, CheckCircle2, Sparkles, XCircle } from 'lucide-react';
import { useLocaleStore } from '../../../../application/stores/useLocaleStore.ts';
import type { ChoiceId, Confidence, Question } from '../../../../domain/model/types.ts';
import type {
  PresentedChoiceViewModel,
  VisualSlotIndex,
} from '../../../../../specs/006-psychometric-choice-entropy-and-spatial-presentation/contracts/choice-entropy-ports.ts';

export interface SessionQuestionChoicesAndRationaleProps {
  readonly currentQuestion: Question;
  readonly currentIndex: number;
  readonly totalQuestions: number;
  readonly isExamMode: boolean;
  readonly isAnswered: boolean;
  readonly isLastQuestion: boolean;
  readonly showExplanation: boolean;
  readonly currentConfidence: Confidence;
  readonly currentAnswer?: { choiceId: ChoiceId; isCorrect: boolean };
  readonly presentedChoices: ReadonlyArray<PresentedChoiceViewModel>;
  readonly onSelectConfidence: (level: Confidence) => void;
  readonly onSelectAnswer: (
    choiceId: ChoiceId,
    slotIdx: VisualSlotIndex,
    modality: 'pointer-click' | 'keyboard-digit-shortcut' | 'touch-tap'
  ) => void;
}

export const SessionQuestionChoicesAndRationale: React.FC<
  SessionQuestionChoicesAndRationaleProps
> = ({
  currentQuestion,
  currentIndex,
  totalQuestions,
  isExamMode,
  isAnswered,
  isLastQuestion,
  showExplanation,
  currentConfidence,
  currentAnswer,
  presentedChoices,
  onSelectConfidence,
  onSelectAnswer,
}) => {
  const { t } = useLocaleStore();

  return (
    <div className="space-y-6">
      {/* Question Card (Apple Glass Surface) */}
      <div className="glass-surface rounded-3xl p-5 sm:p-7 space-y-4 border border-white/80 dark:border-white/10 shadow-[0_8px_32px_rgba(15,23,42,0.06)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] animate-apple-entrance">
        {/* Question Meta & Pill Counter */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-slate-200/60 dark:border-zinc-800/60">
          <div className="flex items-center flex-wrap gap-2 text-xs font-semibold">
            <span className="glass-pill-luxury px-3 py-1 rounded-full text-blue-700 dark:text-blue-300 font-mono font-bold text-xs border border-blue-400/30">
              {t.test.player.questionOf
                .replace('{current}', String(currentIndex + 1))
                .replace('{total}', String(totalQuestions))}
            </span>
            <span className="glass-pill-luxury px-3 py-1 rounded-full text-slate-700 dark:text-zinc-300 text-xs">
              {currentQuestion.subjectId}
            </span>
            <span className="glass-pill-luxury px-3 py-1 rounded-full text-slate-500 dark:text-zinc-400 text-xs">
              {currentQuestion.chapterId}
            </span>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-zinc-400 font-mono">
            <span className="hidden sm:inline">{t.test.player.pacingTarget}</span>
            <span className="hidden sm:inline">•</span>
            <span className="font-bold text-slate-700 dark:text-zinc-300">
              {t.test.player.complete.replace(
                '{percent}',
                String(Math.round(((currentIndex + 1) / Math.max(1, totalQuestions)) * 100))
              )}
            </span>
          </div>
        </div>

        {/* Question Stem */}
        <h1
          className={`text-lg sm:text-xl lg:text-2xl font-bold leading-relaxed tracking-tight font-heading ${
            isExamMode ? 'text-slate-100' : 'text-slate-900 dark:text-zinc-50'
          }`}
        >
          {currentQuestion.stem}
        </h1>

        {/* Apple Confidence Calibration Pill Bar */}
        <div className="pt-2 border-t border-slate-200/50 dark:border-zinc-800/50 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-1.5 rtl:space-x-reverse text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>{t.test.player.confidenceLabel}</span>
          </div>
          <div className="inline-flex items-center p-1 rounded-full bg-slate-100/80 dark:bg-zinc-800/80 border border-slate-200/70 dark:border-zinc-700/70 gap-1">
            {[
              { id: 'guess' as const, label: t.test.player.confidenceGuess },
              { id: 'unsure' as const, label: t.test.player.confidenceUnsure },
              { id: 'sure' as const, label: t.test.player.confidenceSure },
            ].map((item) => {
              const active = currentConfidence === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectConfidence(item.id)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-all cursor-pointer apple-tap ${
                    active
                      ? item.id === 'sure'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : item.id === 'guess'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Choices (A, B, C, D) - Apple Glassmorphism with High Contrast Answer Differentiation */}
      <div className="space-y-3.5 pt-1" role="radiogroup" aria-label="Question choices">
        {presentedChoices.map((choice, idx) => {
          const isSelected = currentAnswer?.choiceId === choice.canonicalChoiceId;
          const isCorrect = choice.isCorrect;
          const choiceLetter = choice.visualBadgeLetter;

          let containerStyle = '';
          let badgeStyle = '';
          let statusPill: React.ReactNode = null;

          if (isExamMode) {
            if (isSelected) {
              containerStyle =
                'bg-blue-500/15 dark:bg-blue-600/25 border-2 border-blue-500 dark:border-blue-400 text-slate-900 dark:text-white shadow-lg shadow-blue-500/15 ring-2 ring-blue-500/30';
              badgeStyle =
                'bg-blue-600 text-white shadow-md shadow-blue-500/40 ring-2 ring-blue-400/60 font-black';
              statusPill = (
                <span className="glass-pill-luxury px-2.5 py-1 rounded-full text-xs font-bold text-blue-600 dark:text-blue-400 border border-blue-400/40 shrink-0">
                  Selected
                </span>
              );
            } else {
              containerStyle =
                'glass-surface border border-slate-200/80 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-white/80 dark:hover:bg-zinc-800/80 hover:border-slate-300 dark:hover:border-zinc-700';
              badgeStyle =
                'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200/80 dark:border-zinc-700/80 font-bold';
            }
          } else if (!isAnswered) {
            containerStyle =
              'bg-white/85 dark:bg-zinc-900/60 border border-slate-200/90 dark:border-zinc-800 text-slate-800 dark:text-zinc-100 hover:border-blue-500/80 dark:hover:border-blue-400/80 hover:bg-white dark:hover:bg-zinc-800/80 hover:shadow-[0_8px_25px_rgba(59,130,246,0.12)] group shadow-2xs backdrop-blur-xl';
            badgeStyle =
              'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200/80 dark:border-zinc-700/80 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-colors shadow-2xs font-bold';
            statusPill = (
              <span className="opacity-0 group-hover:opacity-100 transition-opacity font-mono text-[11px] text-blue-600 dark:text-blue-400 font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 shrink-0 hidden sm:inline-block">
                {t.test.player.keyShortcut.replace('{num}', String(idx + 1))}
              </span>
            );
          } else if (isSelected && isCorrect) {
            containerStyle =
              'bg-emerald-500/15 dark:bg-emerald-500/20 border-2 border-emerald-600 dark:border-emerald-400 text-emerald-950 dark:text-emerald-50 shadow-[0_8px_30px_rgba(16,185,129,0.22)] ring-2 ring-emerald-500/30 backdrop-blur-xl';
            badgeStyle =
              'bg-emerald-600 text-white shadow-md shadow-emerald-500/40 ring-2 ring-emerald-400/60 font-black';
            statusPill = (
              <div className="shrink-0 flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white font-bold text-xs shadow-sm shadow-emerald-600/30 animate-apple-entrance">
                <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{t.test.player.yourAnswerCorrect}</span>
              </div>
            );
          } else if (isSelected && !isCorrect) {
            containerStyle =
              'bg-rose-500/15 dark:bg-rose-500/20 border-2 border-rose-600 dark:border-rose-400 text-rose-950 dark:text-rose-50 shadow-[0_8px_30px_rgba(244,63,94,0.22)] ring-2 ring-rose-500/30 backdrop-blur-xl';
            badgeStyle =
              'bg-rose-600 text-white shadow-md shadow-rose-500/40 ring-2 ring-rose-400/60 font-black';
            statusPill = (
              <div className="shrink-0 flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-600 text-white font-bold text-xs shadow-sm shadow-rose-600/30 animate-apple-entrance">
                <XCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{t.test.player.yourChoiceIncorrect}</span>
              </div>
            );
          } else if (!isSelected && isCorrect) {
            containerStyle =
              'bg-emerald-500/10 dark:bg-emerald-500/15 border-2 border-dashed border-emerald-600 dark:border-emerald-400 text-emerald-950 dark:text-emerald-50 shadow-[0_4px_24px_rgba(16,185,129,0.16)] ring-1 ring-emerald-500/20 backdrop-blur-xl';
            badgeStyle =
              'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-200 border-2 border-emerald-600 dark:border-emerald-400 font-black';
            statusPill = (
              <div className="shrink-0 flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/15 dark:bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 border border-emerald-600/30 dark:border-emerald-400/40 font-bold text-xs backdrop-blur-md animate-apple-entrance">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                <span>{t.test.player.correctAnswerKey}</span>
              </div>
            );
          } else {
            containerStyle =
              'bg-slate-100/40 dark:bg-zinc-900/40 border border-slate-200/60 dark:border-zinc-800/60 text-slate-400 dark:text-zinc-500 opacity-60 backdrop-blur-xs cursor-not-allowed';
            badgeStyle =
              'bg-slate-200/60 dark:bg-zinc-800/60 text-slate-400 dark:text-zinc-500 border border-slate-200/80 dark:border-zinc-700/80 font-bold';
            statusPill = null;
          }

          return (
            <button
              key={choice.canonicalChoiceId}
              onClick={() =>
                onSelectAnswer(
                  choice.canonicalChoiceId,
                  idx as VisualSlotIndex,
                  'pointer-click'
                )
              }
              disabled={!isExamMode && isAnswered}
              className={`w-full text-left p-3.5 sm:p-4 rounded-2xl flex items-center justify-between gap-3 transition-all text-sm sm:text-base select-none apple-tap ${
                !isExamMode && isAnswered ? '' : 'cursor-pointer'
              } ${containerStyle}`}
              role="radio"
              aria-checked={isSelected}
            >
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1 text-start">
                <span
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl text-xs flex items-center justify-center shrink-0 uppercase transition-all ${badgeStyle}`}
                >
                  {choiceLetter}
                </span>
                <span className="leading-snug pt-0.5 break-words font-medium">{choice.text}</span>
              </div>

              {statusPill}
            </button>
          );
        })}
      </div>

      {/* Immediate Evaluation Feedback in Practice Mode - Apple Frosted Glass Panel */}
      {!isExamMode && isAnswered && showExplanation && currentAnswer && (
        <div className="p-5 sm:p-7 rounded-3xl border border-white/80 dark:border-white/10 glass-surface space-y-4 animate-apple-entrance shadow-[0_8px_32px_rgba(15,23,42,0.06)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          {/* Top Verdict Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-zinc-800/60">
            <div className="flex items-center space-x-2.5">
              {currentAnswer.isCorrect ? (
                <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs sm:text-sm border border-emerald-500/30 shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                  <span>{t.test.player.correctAnswer}</span>
                </div>
              ) : (
                <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-rose-500/15 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 font-extrabold text-xs sm:text-sm border border-rose-500/30 shadow-xs">
                  <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 stroke-[2.5]" />
                  <span>
                    {t.test.player.incorrectChoice.replace(
                      '{key}',
                      presentedChoices.find((c) => c.isCorrect)?.visualBadgeLetter || ''
                    )}
                  </span>
                </div>
              )}
            </div>

            <div className="glass-pill-luxury px-3 py-1 rounded-full text-xs font-semibold text-slate-600 dark:text-zinc-300 flex items-center space-x-1.5 self-start sm:self-auto">
              <span>{t.test.player.press}</span>
              <kbd className="px-1.5 py-0.5 rounded-md bg-slate-200/80 dark:bg-zinc-800 font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400 border border-slate-300/80 dark:border-zinc-700 shadow-2xs">
                Enter ⏎
              </kbd>
              <span>
                {isLastQuestion ? t.test.player.toFinish : t.test.player.forNextQuestion}
              </span>
            </div>
          </div>

          {/* Comprehensive Explanation & Rationale */}
          <div className="space-y-1.5 pt-1">
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              {t.test.player.explanationTitle}
            </div>
            <p className="text-slate-900 dark:text-zinc-100 text-sm sm:text-base leading-relaxed font-normal">
              {currentQuestion.explanation}
            </p>
          </div>

          {/* High-Yield Exam Tip - Apple Callout Capsule */}
          {currentQuestion.examTip && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/25 flex items-start space-x-3 text-slate-900 dark:text-zinc-100">
              <span className="text-amber-500 text-base select-none shrink-0 mt-0.5">⚡</span>
              <div className="text-xs sm:text-sm leading-relaxed">
                <strong className="font-extrabold text-amber-800 dark:text-amber-300 mr-1.5">
                  {t.test.player.examTipTitle}
                </strong>
                <span className="text-slate-800 dark:text-zinc-200 font-medium">
                  {currentQuestion.examTip}
                </span>
              </div>
            </div>
          )}

          {/* Curriculum Citation */}
          {currentQuestion.evidence && currentQuestion.evidence[0] && (
            <div className="pt-3 border-t border-slate-200/60 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center space-x-2 text-slate-600 dark:text-zinc-300">
                <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>
                  Source:{' '}
                  <strong className="text-slate-900 dark:text-zinc-100 font-semibold">
                    {currentQuestion.evidence[0].sourceName}
                  </strong>{' '}
                  ({currentQuestion.evidence[0].location})
                </span>
              </div>
              <div className="italic text-slate-500 dark:text-zinc-400 truncate max-w-sm">
                "{currentQuestion.evidence[0].quote}"
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
