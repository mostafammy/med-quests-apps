import React, { useState, useEffect } from 'react';
import { Question, ChoiceId } from '../../../domain/model/types.ts';
import { 
  X, 
  Flag, 
  HelpCircle
} from 'lucide-react';

interface QuestionMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: Question[];
  currentIndex: number;
  answers: Record<string, { choiceId: ChoiceId; isCorrect: boolean }>;
  flags: Record<string, boolean>;
  bookmarks: Record<string, boolean>;
  isExamMode: boolean;
  onSelectIndex?: (index: number) => void;
  onSelectQuestion?: (index: number) => void;
}

type FilterTab = 'all' | 'unanswered' | 'answered' | 'flagged';

export const QuestionMatrixModal: React.FC<QuestionMatrixModalProps> = ({
  isOpen,
  onClose,
  questions,
  currentIndex,
  answers,
  flags,
  bookmarks,
  isExamMode,
  onSelectIndex,
  onSelectQuestion,
}) => {
  const [filter, setFilter] = useState<FilterTab>('all');

  const handleSelect = (idx: number) => {
    onSelectQuestion?.(idx);
    onSelectIndex?.(idx);
  };

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalCount = questions.length;
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = totalCount - answeredCount;
  const flaggedCount = Object.values(flags).filter(Boolean).length;
  const progressPercent = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  // Filter questions for display
  const filteredQuestions = questions.map((q, idx) => ({ q, idx })).filter(({ q }) => {
    if (filter === 'answered') return !!answers[q.id];
    if (filter === 'unanswered') return !answers[q.id];
    if (filter === 'flagged') return !!flags[q.id];
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 backdrop-blur-md">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-t-[28px] sm:rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col max-h-[90dvh] sm:max-h-[88vh] overflow-hidden animate-sheet-slide-up sm:animate-in sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Apple Mobile Sheet Handle Bar */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2 sm:hidden shrink-0" />

        {/* Apple-style Sheet Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Session Overview
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-semibold text-slate-500">
                {answeredCount} of {totalCount} Completed ({progressPercent}%)
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Question Navigator
            </h2>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer apple-tap"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar Track */}
        <div className="w-full h-1 bg-slate-100 dark:bg-slate-800">
          <div 
            className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Apple Segmented Filter Control */}
        <div className="p-3 sm:p-4 bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800">
          <div className="flex p-1 bg-slate-200/70 dark:bg-slate-800/80 rounded-xl max-w-md mx-auto text-xs font-semibold overflow-x-auto scrollbar-none">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => setFilter('answered')}
              className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                filter === 'answered'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Answered ({answeredCount})
            </button>
            <button
              onClick={() => setFilter('unanswered')}
              className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                filter === 'unanswered'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Unanswered ({unansweredCount})
            </button>
            <button
              onClick={() => setFilter('flagged')}
              className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                filter === 'flagged'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Flag className="w-3 h-3 text-amber-500 fill-current" />
              <span>Flagged ({flaggedCount})</span>
            </button>
          </div>
        </div>

        {/* Matrix Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 pb-[max(1.5rem,env(safe-area-inset-bottom))] scroll-momentum">
          {filteredQuestions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <HelpCircle className="w-8 h-8 mx-auto opacity-50" />
              <p className="text-sm font-medium">No questions match this filter</p>
            </div>
          ) : (
            <div className="grid grid-cols-5 xs:grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2 sm:gap-2.5">
              {filteredQuestions.map(({ q, idx }) => {
                const isActive = idx === currentIndex;
                const ans = answers[q.id];
                const isAnswered = !!ans;
                const isFlagged = !!flags[q.id];
                const isBookmarked = !!bookmarks[q.id];

                let pillColor = '';
                if (isActive) {
                  pillColor = 'bg-blue-600 text-white font-bold ring-2 ring-blue-500 ring-offset-2 scale-105 shadow-md shadow-blue-500/30';
                } else if (isExamMode) {
                  if (isAnswered) {
                    pillColor = 'bg-slate-800 text-white font-medium hover:bg-slate-700';
                  } else {
                    pillColor = 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-750';
                  }
                } else {
                  if (isAnswered) {
                    if (ans.isCorrect) {
                      pillColor = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100';
                    } else {
                      pillColor = 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700 hover:bg-rose-100';
                    }
                  } else {
                    pillColor = 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-750';
                  }
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      handleSelect(idx);
                      onClose();
                    }}
                    className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center p-1 text-sm font-bold tabular-nums transition-all duration-150 cursor-pointer apple-tap ${pillColor}`}
                    title={`Question ${idx + 1}`}
                  >
                    <span>{idx + 1}</span>

                    {/* Micro Indicators */}
                    <div className="absolute top-1 right-1 flex space-x-0.5">
                      {isFlagged && (
                        <span className="w-2 h-2 rounded-full bg-amber-400 ring-1 ring-white dark:ring-slate-900" />
                      )}
                      {isBookmarked && (
                        <span className="w-2 h-2 rounded-full bg-blue-400 ring-1 ring-white dark:ring-slate-900" />
                      )}
                    </div>

                    {q.highYield && (
                      <span className="text-[9px] opacity-60 font-mono tracking-tighter">HY</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Apple Sheet Footer: Legend & Close */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <span>Current</span>
            </div>
            {!isExamMode ? (
              <>
                <div className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Correct</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>Incorrect</span>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-800 dark:bg-slate-600" />
                <span>Answered</span>
              </div>
            )}
            <div className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span>Unanswered</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>Flagged</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="py-1.5 px-4 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded-xl font-bold transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
