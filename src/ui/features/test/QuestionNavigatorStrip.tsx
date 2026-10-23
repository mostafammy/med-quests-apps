import React, { useRef, useEffect } from 'react';
import { Question, ChoiceId } from '../../../domain/model/types.ts';
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
        ? 'bg-slate-900/80 border-slate-800/80 backdrop-blur-xl text-slate-200' 
        : 'bg-white/80 border-slate-200/70 backdrop-blur-xl text-slate-800'
    }`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between gap-3">
        {/* Left: Interactive Grid Trigger Pill */}
        <button
          onClick={onOpenMatrix}
          title="Open Question Overview Grid (Press G)"
          className={`shrink-0 flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer ${
            isExamMode
              ? 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 border border-slate-700/60 shadow-xs'
              : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200/70 shadow-xs'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5 text-blue-500" />
          <span className="hidden sm:inline">Overview</span>
          <span className="font-mono text-[11px] opacity-75">
            ({answeredCount}/{questions.length})
          </span>
        </button>

        {/* Center: Sleek Horizontal Question Pills with smooth auto-scroll */}
        <div 
          ref={containerRef}
          className="flex-1 flex items-center space-x-1.5 overflow-x-auto py-1 scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {questions.map((q, idx) => {
            const isActive = idx === currentIndex;
            const ans = answers[q.id];
            const isAnswered = !!ans;
            const isFlagged = !!flags[q.id];

            // Apple-style tactile pill styling
            let pillStyle = '';
            if (isActive) {
              pillStyle = 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/25 ring-2 ring-blue-500/40 ring-offset-1 scale-105 z-10';
            } else if (isExamMode) {
              if (isAnswered) {
                pillStyle = 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-750';
              } else {
                pillStyle = 'bg-slate-900/60 text-slate-400 hover:bg-slate-800 border border-slate-800/80';
              }
            } else {
              // Practice mode: color-coded answer confirmation
              if (isAnswered) {
                if (ans.isCorrect) {
                  pillStyle = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300/80 dark:border-emerald-700/80 hover:bg-emerald-100/70';
                } else {
                  pillStyle = 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-300/80 dark:border-rose-700/80 hover:bg-rose-100/70';
                }
              } else {
                pillStyle = 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-600 border border-transparent hover:border-slate-300/60';
              }
            }

            return (
              <button
                key={q.id}
                ref={isActive ? activePillRef : null}
                onClick={() => handleSelect(idx)}
                className={`relative shrink-0 w-8 h-8 rounded-lg text-xs font-semibold tabular-nums flex items-center justify-center transition-all duration-150 cursor-pointer ${pillStyle}`}
                title={`Question ${idx + 1}${isFlagged ? ' (Flagged)' : ''}${isAnswered ? ' (Answered)' : ''}`}
              >
                <span>{idx + 1}</span>

                {/* Flagged micro-indicator (Apple vibrancy amber dot) */}
                {isFlagged && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-white dark:ring-slate-900 shadow-xs flex items-center justify-center">
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
            className={`shrink-0 hidden md:flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-medium cursor-pointer ${
              isExamMode 
                ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' 
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}
          >
            <Flag className="w-3 h-3 fill-current" />
            <span>{flaggedCount} Flagged</span>
          </div>
        )}
      </div>
    </div>
  );
};
