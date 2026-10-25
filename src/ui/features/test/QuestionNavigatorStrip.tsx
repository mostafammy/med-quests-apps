import React, { useRef, useEffect } from 'react';
import { Question, ChoiceId } from '../../../domain/model/types.ts';
import { useLocaleStore } from '../../../application/stores/useLocaleStore.ts';
import { LayoutGrid, Flag } from 'lucide-react';

interface QuestionNavigatorStripProps {
  questions: Question[];
  currentIndex: number;
  answers: Record<string, { choiceId: ChoiceId; isCorrect: boolean }>;
  flags: Record<string, boolean>;
  bookmarks: Record<string, boolean>;
  isExamMode: boolean;
  onSelectIndex?: (index: number) => void;
  onSelectQuestion?: (index: number) => void;
  onOpenMatrix: () => void;
}

export const QuestionNavigatorStrip: React.FC<QuestionNavigatorStripProps> = ({
  questions,
  currentIndex,
  answers,
  flags,
  isExamMode,
  onSelectIndex,
  onSelectQuestion,
  onOpenMatrix,
}) => {
  const { t } = useLocaleStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const activePillRef = useRef<HTMLButtonElement>(null);

  const handleSelect = (idx: number) => {
    onSelectQuestion?.(idx);
    onSelectIndex?.(idx);
  };

  // Smoothly center the active pill in the horizontal strip
  useEffect(() => {
    if (activePillRef.current) {
      activePillRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [currentIndex]);

  const answeredCount = Object.keys(answers).length;
  const flaggedCount = Object.values(flags).filter(Boolean).length;

  return (
    <div className={`w-full border-b transition-colors select-none ${
      isExamMode 
        ? 'bg-slate-900/85 border-slate-800/80 backdrop-blur-xl text-slate-200' 
        : 'bg-white/75 dark:bg-zinc-900/75 border-b border-white/60 dark:border-zinc-800/80 backdrop-blur-xl text-slate-800 dark:text-zinc-200 shadow-xs'
    }`}>
      <div className="max-w-6xl mx-auto px-2.5 sm:px-6 h-12 flex items-center justify-between gap-2 sm:gap-3">
        {/* Left: Interactive Grid Trigger Pill */}
        <button
          onClick={onOpenMatrix}
          title={t.test.player.questionMatrixShortcut}
          className={`shrink-0 flex items-center space-x-1 sm:space-x-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all duration-150 cursor-pointer apple-tap ${
            isExamMode
              ? 'bg-slate-800/80 hover:bg-slate-750 text-slate-200 border border-slate-700/60 shadow-xs'
              : 'glass-pill-luxury text-slate-700 dark:text-zinc-200 shadow-xs'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5 text-blue-500" />
          <span className="hidden sm:inline">{t.test.strip.overviewGrid}</span>
          <span className="font-mono text-[11px] opacity-75">
            ({answeredCount}/{questions.length})
          </span>
        </button>

        {/* Center: Sleek Horizontal Question Pills with smooth auto-scroll */}
        <div 
          ref={containerRef}
          className="flex-1 flex items-center space-x-1.5 overflow-x-auto py-1 scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-momentum"
        >
          {questions.map((q, idx) => {
            const isActive = idx === currentIndex;
            const ans = answers[q.id];
            const isAnswered = !!ans;
            const isFlagged = !!flags[q.id];

            // Apple-style high-contrast tactile pill styling
            let pillStyle = '';
            if (isActive) {
              if (!isExamMode && isAnswered) {
                if (ans.isCorrect) {
                  pillStyle = 'bg-emerald-600 text-white font-black shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400 ring-offset-1 scale-105 z-10';
                } else {
                  pillStyle = 'bg-rose-600 text-white font-black shadow-md shadow-rose-500/30 ring-2 ring-rose-400 ring-offset-1 scale-105 z-10';
                }
              } else {
                pillStyle = 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/25 ring-2 ring-blue-500/40 ring-offset-1 scale-105 z-10';
              }
            } else if (isExamMode) {
              if (isAnswered) {
                pillStyle = 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-750';
              } else {
                pillStyle = 'bg-slate-900/60 text-slate-400 hover:bg-slate-800 border border-slate-800/80';
              }
            } else {
              // Practice mode: high-contrast color-coded answer confirmation
              if (isAnswered) {
                if (ans.isCorrect) {
                  pillStyle = 'bg-emerald-500/15 dark:bg-emerald-500/25 text-emerald-900 dark:text-emerald-200 border-2 border-emerald-600/70 dark:border-emerald-400/70 font-bold hover:bg-emerald-500/25 dark:hover:bg-emerald-500/35 shadow-2xs';
                } else {
                  pillStyle = 'bg-rose-500/15 dark:bg-rose-500/25 text-rose-900 dark:text-rose-200 border-2 border-rose-600/70 dark:border-rose-400/70 font-bold hover:bg-rose-500/25 dark:hover:bg-rose-500/35 shadow-2xs';
                }
              } else {
                pillStyle = 'bg-slate-100/80 dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 border border-slate-200/90 dark:border-zinc-700/80 hover:border-blue-400/70 hover:bg-white dark:hover:bg-zinc-700/80 shadow-2xs';
              }
            }

            return (
              <button
                key={q.id}
                ref={isActive ? activePillRef : null}
                onClick={() => handleSelect(idx)}
                className={`relative shrink-0 w-8 h-8 rounded-xl text-xs font-bold tabular-nums flex items-center justify-center transition-all duration-150 cursor-pointer apple-tap ${pillStyle}`}
                title={`${t.common.questions} ${idx + 1}${isFlagged ? ` (${t.test.strip.flagged})` : ''}${isAnswered ? ` (${t.test.strip.answered})` : ''}`}
              >
                <span>{idx + 1}</span>

                {/* Flagged micro-indicator (Apple vibrancy amber dot) */}
                {isFlagged && (
                  <span className="absolute -top-1 -end-1 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-white dark:ring-slate-900 shadow-xs flex items-center justify-center">
                    <span className="w-1 h-1 rounded-full bg-amber-700" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right: Flagged summary badge if any are flagged */}
        {flaggedCount > 0 && (
          <div 
            onClick={onOpenMatrix}
            className={`shrink-0 hidden md:flex items-center space-x-1 rtl:space-x-reverse px-2 py-0.5 rounded-md text-[11px] font-medium cursor-pointer ${
              isExamMode 
                ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' 
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}
          >
            <Flag className="w-3 h-3 fill-current" />
            <span>{flaggedCount} {t.test.strip.flagged}</span>
          </div>
        )}
      </div>
    </div>
  );
};
