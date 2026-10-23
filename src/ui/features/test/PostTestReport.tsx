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
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Top Banner: Score & Performance Summary */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-md ${
              scorePercent >= 75 ? 'bg-emerald-600' : scorePercent >= 60 ? 'bg-amber-500' : 'bg-red-600'
            }`}>
              <Trophy className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {mode.toUpperCase()} SESSION COMPLETE
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-semibold text-emerald-600">Calibration Recorded</span>
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                {scorePercent}% Overall Score
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {incorrectQuestions.length > 0 && (
              <button
                onClick={handleRetestMistakes}
                className="py-3 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center space-x-2 shadow-xs transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retest Mistakes ({incorrectQuestions.length})</span>
              </button>
            )}
            <button
              onClick={() => navigate('/')}
              className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center space-x-1"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>
          </div>
        </div>

        {/* 4 Metric Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-center">
          <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl">
            <div className="text-xs font-semibold text-emerald-700">Correct</div>
            <div className="text-2xl font-bold text-emerald-900 mt-0.5">{correctCount}</div>
            <div className="text-[11px] text-emerald-600">of {totalQuestions} Questions</div>
          </div>

          <div className="p-3 bg-red-50/70 border border-red-100 rounded-2xl">
            <div className="text-xs font-semibold text-red-700">Incorrect</div>
            <div className="text-2xl font-bold text-red-900 mt-0.5">{incorrectQuestions.length}</div>
            <div className="text-[11px] text-red-600">Needs Revision</div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
            <div className="text-xs font-semibold text-slate-600">Unanswered</div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">{unansweredCount}</div>
            <div className="text-[11px] text-slate-500">Skipped</div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
            <div className="text-xs font-semibold text-slate-600">Pacing</div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">{avgTimePerQuestion}s</div>
            <div className="text-[11px] text-slate-500">Avg Time / Question</div>
          </div>
        </div>
      </div>

      {/* Chapter Breakdown */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-900 text-base">Performance by Curriculum Chapter</h3>
        <div className="space-y-3">
          {Object.entries(chapterStats).map(([chapId, stat]) => {
            const pct = Math.round((stat.correct / stat.total) * 100);
            return (
              <div key={chapId} className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-700">
                  <span className="font-semibold">{chapId}</span>
                  <span>{stat.correct} / {stat.total} ({pct}%)</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
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
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Detailed Question Review</h3>
            <p className="text-xs text-slate-500">Inspect mistakes and curriculum citations to close understanding gaps.</p>
          </div>
          <span className="text-xs text-slate-500">{sessionQuestions.length} Total</span>
        </div>

        <div className="divide-y divide-slate-100">
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
                    <span className="text-xs font-bold font-mono text-slate-400 mt-0.5">#{idx + 1}</span>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        {ans ? (
                          isCorrect ? (
                            <span className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Correct</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-md">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Incorrect</span>
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            <span>Unanswered</span>
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400 uppercase font-mono">{q.chapterId}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-2">
                        {q.stem}
                      </p>
                    </div>
                  </div>

                  <div className="p-1 rounded-lg text-slate-400 group-hover:bg-slate-100 shrink-0">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="pl-7 pt-2 space-y-4 text-xs">
                    {/* Choices breakdown */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.choices.map((c) => {
                        const wasChosen = ans?.choiceId === c.id;
                        return (
                          <div
                            key={c.id}
                            className={`p-3 rounded-xl border text-xs ${
                              c.isCorrect
                                ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-medium'
                                : wasChosen
                                  ? 'bg-red-50/80 border-red-300 text-red-950'
                                  : 'bg-slate-50 border-slate-200 text-slate-600'
                            }`}
                          >
                            <div className="flex items-center justify-between font-bold uppercase mb-1">
                              <span>Option {c.id}</span>
                              {c.isCorrect && <span className="text-emerald-700 text-[10px]">Key (Correct)</span>}
                              {wasChosen && !c.isCorrect && <span className="text-red-700 text-[10px]">Your Answer</span>}
                            </div>
                            <div>{c.text}</div>
                            <div className="text-[11px] text-slate-500 mt-1.5 pt-1.5 border-t border-slate-200/50">
                              {c.rationale}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation & Curriculum Reference */}
                    <div className="p-4 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
                      <p className="text-slate-800"><strong>Full Explanation:</strong> {q.explanation}</p>
                      {q.evidence && q.evidence[0] && (
                        <div className="pt-2 border-t border-slate-200 flex items-center space-x-1.5 text-blue-700 font-medium">
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Curriculum Reference: {q.evidence[0].sourceName} ({q.evidence[0].location})</span>
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
