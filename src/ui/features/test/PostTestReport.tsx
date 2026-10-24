import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Question, ChoiceId } from '../../../domain/model/types.ts';
import { 
  Trophy, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  BookOpen, 
  ChevronDown, 
  ChevronUp,
  LayoutDashboard
} from 'lucide-react';

export interface TestSessionResult {
  sessionQuestions: Question[];
  answers: Record<string, { choiceId: ChoiceId; isCorrect: boolean }>;
  timeSpentSeconds: number;
  mode: string;
}

export const PostTestReport: React.FC<{
  result: TestSessionResult;
  onRetestMistakes?: (mistakeQuestions: Question[]) => void;
}> = ({ result, onRetestMistakes }) => {
  const navigate = useNavigate();
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  const { sessionQuestions, answers, timeSpentSeconds, mode } = result;

  const totalQuestions = sessionQuestions.length;
  const answeredCount = Object.keys(answers).length;
  const correctCount = Object.values(answers).filter((a) => a.isCorrect).length;
  const incorrectQuestions = sessionQuestions.filter((q) => {
    const ans = answers[q.id];
    return ans && !ans.isCorrect;
  });
  const unansweredCount = totalQuestions - answeredCount;
  const scorePercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const avgTimePerQuestion = answeredCount > 0 ? Math.round(timeSpentSeconds / answeredCount) : 0;

  // Group performance by subject/chapter
  const chapterStats: Record<string, { total: number; correct: number }> = {};
  sessionQuestions.forEach((q) => {
    if (!chapterStats[q.chapterId]) {
      chapterStats[q.chapterId] = { total: 0, correct: 0 };
    }
    chapterStats[q.chapterId].total += 1;
    if (answers[q.id]?.isCorrect) {
      chapterStats[q.chapterId].correct += 1;
    }
  });

  const handleRetestMistakes = () => {
    if (onRetestMistakes && incorrectQuestions.length > 0) {
      onRetestMistakes(incorrectQuestions);
    } else {
      navigate('/session/retest-session', {
        state: {
          mode: 'retest',
          questionCount: incorrectQuestions.length,
        },
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 sm:py-8 px-3.5 sm:px-6 space-y-6 sm:space-y-8 animate-apple-entrance">
      {/* Top Banner: Score & Performance Summary */}
      <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl rounded-3xl border border-slate-200/80 dark:border-zinc-800/80 p-5 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 sm:gap-6">
          <div className="flex items-center space-x-3.5 sm:space-x-4">
            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0 ${
              scorePercent >= 75 ? 'bg-emerald-600 shadow-emerald-500/25' : scorePercent >= 60 ? 'bg-amber-500 shadow-amber-500/25' : 'bg-rose-600 shadow-rose-500/25'
            }`}>
              <Trophy className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  {mode.toUpperCase()} SESSION COMPLETE
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-[11px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400">Calibration Recorded</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-zinc-50 tracking-tight mt-0.5">
                {scorePercent}% Overall Score
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {incorrectQuestions.length > 0 && (
              <button
                onClick={handleRetestMistakes}
                className="flex-1 sm:flex-none py-2.5 sm:py-3 px-4 sm:px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-1.5 shadow-sm shadow-blue-500/25 transition-all cursor-pointer apple-tap"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retest Mistakes ({incorrectQuestions.length})</span>
              </button>
            )}
            <button
              onClick={() => navigate('/')}
              className="py-2.5 sm:py-3 px-3.5 sm:px-4 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-center space-x-1.5 apple-tap"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>
          </div>
        </div>

        {/* 4 Metric Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-4 border-t border-slate-100 dark:border-zinc-800 text-center">
          <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/40 rounded-2xl">
            <div className="text-[11px] sm:text-xs font-semibold text-emerald-700 dark:text-emerald-400">Correct</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-900 dark:text-emerald-200 mt-0.5">{correctCount}</div>
            <div className="text-[10px] sm:text-[11px] text-emerald-600 dark:text-emerald-400">of {totalQuestions} Questions</div>
          </div>

          <div className="p-3 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-800/40 rounded-2xl">
            <div className="text-[11px] sm:text-xs font-semibold text-rose-700 dark:text-rose-400">Incorrect</div>
            <div className="text-xl sm:text-2xl font-black text-rose-900 dark:text-rose-200 mt-0.5">{incorrectQuestions.length}</div>
            <div className="text-[10px] sm:text-[11px] text-rose-600 dark:text-rose-400">Needs Revision</div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 rounded-2xl">
            <div className="text-[11px] sm:text-xs font-semibold text-slate-600 dark:text-zinc-400">Unanswered</div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-100 mt-0.5">{unansweredCount}</div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-zinc-400">Skipped</div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 rounded-2xl">
            <div className="text-[11px] sm:text-xs font-semibold text-slate-600 dark:text-zinc-400">Pacing</div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-100 mt-0.5">{avgTimePerQuestion}s</div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-zinc-400">Avg Time / Question</div>
          </div>
        </div>
      </div>

      {/* Chapter Breakdown */}
      <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl rounded-3xl border border-slate-200/80 dark:border-zinc-800/80 p-5 sm:p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-base">Performance by Curriculum Chapter</h3>
        <div className="space-y-3">
          {Object.entries(chapterStats).map(([chapId, stat]) => {
            const pct = Math.round((stat.correct / stat.total) * 100);
            return (
              <div key={chapId} className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-zinc-300">
                  <span className="font-semibold">{chapId}</span>
                  <span>{stat.correct} / {stat.total} ({pct}%)</span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Question Review List */}
      <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl rounded-3xl border border-slate-200/80 dark:border-zinc-800/80 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-base">Detailed Question Review</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Inspect mistakes and curriculum citations to close understanding gaps.</p>
          </div>
          <span className="text-xs text-slate-500 dark:text-zinc-400 font-mono">{sessionQuestions.length} Total</span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-zinc-800">
          {sessionQuestions.map((q, idx) => {
            const ans = answers[q.id];
            const isCorrect = ans?.isCorrect;
            const isExpanded = expandedQuestionId === q.id;

            return (
              <div key={q.id} className="py-4 space-y-3">
                <div
                  onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                  className="flex items-start justify-between cursor-pointer group"
                >
                  <div className="flex items-start space-x-3 pr-4">
                    <span className="text-xs font-bold font-mono text-slate-400 dark:text-zinc-500 mt-0.5">#{idx + 1}</span>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        {ans ? (
                          isCorrect ? (
                            <span className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Correct</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Incorrect</span>
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-xs font-semibold text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                            <span>Unanswered</span>
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400 dark:text-zinc-500 uppercase font-mono">{q.chapterId}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-800 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                        {q.stem}
                      </p>
                    </div>
                  </div>

                  <div className="p-1 rounded-lg text-slate-400 dark:text-zinc-500 group-hover:bg-slate-100 dark:group-hover:bg-zinc-800 shrink-0">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="pl-6 sm:pl-7 pt-2 space-y-4 text-xs">
                    {/* Choices breakdown */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.choices.map((c) => {
                        const wasChosen = ans?.choiceId === c.id;
                        return (
                          <div
                            key={c.id}
                            className={`p-3 rounded-2xl border text-xs ${
                              c.isCorrect
                                ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700/60 text-emerald-950 dark:text-emerald-100 font-medium'
                                : wasChosen
                                  ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700/60 text-rose-950 dark:text-rose-100'
                                  : 'bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700/60 text-slate-600 dark:text-zinc-300'
                            }`}
                          >
                            <div className="flex items-center justify-between font-bold uppercase mb-1">
                              <span>Option {c.id}</span>
                              {c.isCorrect && <span className="text-emerald-700 dark:text-emerald-400 text-[10px]">Key (Correct)</span>}
                              {wasChosen && !c.isCorrect && <span className="text-rose-700 dark:text-rose-400 text-[10px]">Your Answer</span>}
                            </div>
                            <div>{c.text}</div>
                            <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1.5 pt-1.5 border-t border-slate-200/50 dark:border-zinc-700/50">
                              {c.rationale}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation & Curriculum Reference */}
                    <div className="p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl space-y-2 border border-slate-200 dark:border-zinc-700/60">
                      <p className="text-slate-800 dark:text-zinc-200"><strong>Full Explanation:</strong> {q.explanation}</p>
                      {q.evidence && q.evidence[0] && (
                        <div className="pt-2 border-t border-slate-200 dark:border-zinc-700/60 flex items-center space-x-1.5 text-blue-700 dark:text-blue-400 font-medium">
                          <BookOpen className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">Curriculum Reference: {q.evidence[0].sourceName} ({q.evidence[0].location})</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
