import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStatsStore } from '../../../application/stores/useStatsStore.ts';
import { useQuestionStore } from '../../../application/stores/useQuestionStore.ts';
import { useLocaleStore } from '../../../application/stores/useLocaleStore.ts';
import { 
  AlertOctagon, 
  TrendingDown, 
  RotateCcw, 
  Play, 
  CheckCircle2,
  ChevronRight
} from 'lucide-react';

export const ReviewHub: React.FC = () => {
  const navigate = useNavigate();
  const { questions } = useQuestionStore();
  const { t, isRtl } = useLocaleStore();
  const { 
    topicStats, 
    totalAttempts, 
    mistakeQuestionIds,
    refreshStats,
    resetStats
  } = useStatsStore();

  const [activeTab, setActiveTab] = useState<'weak' | 'mistakes'>('weak');

  useEffect(() => {
    refreshStats(questions);
  }, [questions, refreshStats]);

  const attemptedTopics = topicStats.filter((t) => t.totalAttempts > 0);
  const unattemptedTopics = topicStats.filter((t) => t.totalAttempts === 0);
  const sortedTopics = [
    ...[...attemptedTopics].sort((a, b) => a.accuracy - b.accuracy),
    ...unattemptedTopics
  ];

  const mistakeQuestions = questions.filter((q) => mistakeQuestionIds.includes(q.id));

  const handleStartMistakeRetest = () => {
    if (mistakeQuestions.length === 0) return;
    navigate('/session/retest-session', {
      state: {
        mode: 'retest',
        questionCount: mistakeQuestions.length,
      },
    });
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] py-6 sm:py-8 px-3 sm:px-6 lg:px-8 space-y-6 sm:space-y-8 animate-apple-entrance">
      {/* Top Header Card */}
      <div className="p-5 sm:p-7 md:p-8 rounded-3xl bg-white/65 dark:bg-zinc-900/65 backdrop-blur-xl border border-white/80 dark:border-zinc-800/80 shadow-[0_8px_32px_0_rgba(31,38,135,0.06)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all">
        <div className="space-y-1.5">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-400/20 text-rose-700 dark:text-rose-400 text-xs font-semibold backdrop-blur-md">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>{t.review.badge}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 dark:from-zinc-100 dark:via-zinc-200 dark:to-rose-200 bg-clip-text text-transparent">
            {t.review.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 max-w-xl leading-relaxed">
            {t.review.subtitle}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {totalAttempts > 0 && (
            <button
              onClick={() => resetStats(questions)}
              className="py-2.5 px-4 bg-white/50 dark:bg-zinc-800/50 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 text-slate-600 dark:text-zinc-400 rounded-2xl text-xs font-bold flex items-center space-x-1.5 border border-white/80 dark:border-zinc-700/80 backdrop-blur-md shadow-xs transition-all duration-200 cursor-pointer apple-tap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t.common.reset}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1.5 p-1.5 rounded-2xl bg-slate-200/40 dark:bg-zinc-800/40 backdrop-blur-lg border border-white/40 dark:border-zinc-700/40 w-full sm:max-w-md">
        <button
          onClick={() => setActiveTab('weak')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center space-x-2 cursor-pointer apple-tap ${
            activeTab === 'weak'
              ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/60 dark:border-zinc-700/60 font-extrabold'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
          }`}
        >
          <TrendingDown className="w-3.5 h-3.5" />
          <span>{t.review.tabWeak}</span>
        </button>

        <button
          onClick={() => setActiveTab('mistakes')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center space-x-2 cursor-pointer apple-tap ${
            activeTab === 'mistakes'
              ? 'bg-white dark:bg-zinc-900 text-rose-600 dark:text-rose-400 shadow-sm border border-slate-200/60 dark:border-zinc-700/60 font-extrabold'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
          }`}
        >
          <AlertOctagon className="w-3.5 h-3.5" />
          <span>{t.review.tabMistakes} ({mistakeQuestionIds.length})</span>
        </button>
      </div>

      {/* Tab 1: Curriculum Weak Areas */}
      {activeTab === 'weak' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedTopics.map((topic) => {
              const accuracy = topic.totalAttempts > 0 ? topic.accuracy : null;
              const isCritical = accuracy !== null && accuracy < 50;
              const isDeveloping = accuracy !== null && accuracy >= 50 && accuracy < 80;

              return (
                <div
                  key={topic.topicId}
                  className="p-5 rounded-3xl bg-white/60 dark:bg-zinc-900/60 hover:bg-white/80 dark:hover:bg-zinc-900/80 backdrop-blur-xl border border-white/80 dark:border-zinc-800/80 shadow-[0_4px_24px_0_rgba(0,0,0,0.03)] dark:shadow-[0_4px_24px_0_rgba(0,0,0,0.3)] transition-all duration-200 hover:-translate-y-0.5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 tracking-wider">
                        {t.review.tabWeak}
                      </span>
                      <h3 className="font-extrabold text-slate-900 dark:text-zinc-100 text-sm mt-0.5">
                        {topic.topicName}
                      </h3>
                    </div>

                    <div className="text-right">
                      {accuracy !== null ? (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                          isCritical
                            ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-400/20'
                            : isDeveloping
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-400/20'
                            : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-400/20'
                        }`}>
                          {accuracy}%
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400">
                          {t.review.notAttempted}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Micro Progress Bar */}
                  {accuracy !== null && (
                    <div className="w-full h-2 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCritical ? 'bg-rose-500' : isDeveloping ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${accuracy}%` }}
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 pt-1">
                    <span>{topic.totalAttempts} {t.dashboard.dueReviewsSub}</span>
                    <button
                      onClick={() => navigate('/test/quick')}
                      className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center space-x-1 cursor-pointer"
                    >
                      <span>{t.review.startTopicPractice}</span>
                      <ChevronRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Mistakes Workspace */}
      {activeTab === 'mistakes' && (
        <div className="space-y-6">
          {mistakeQuestions.length > 0 ? (
            <div className="space-y-4">
              <div className="p-6 rounded-3xl bg-rose-500/10 dark:bg-rose-950/30 border border-rose-400/20 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-rose-900 dark:text-rose-200 text-lg">
                    {mistakeQuestions.length} {t.review.tabMistakes}
                  </h3>
                  <p className="text-xs text-rose-700/80 dark:text-rose-300 mt-1">
                    {t.review.subtitle}
                  </p>
                </div>
                <button
                  onClick={handleStartMistakeRetest}
                  className="py-3 px-6 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white rounded-2xl text-xs sm:text-sm font-extrabold flex items-center space-x-2 shadow-lg shadow-rose-600/25 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer shrink-0"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{t.review.retestMistakesBtn}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {mistakeQuestions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-5 rounded-3xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-white/80 dark:border-zinc-800/80 shadow-xs space-y-2"
                  >
                    <div className="flex items-center space-x-2 text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                      <AlertOctagon className="w-3.5 h-3.5" />
                      <span>{t.review.tabMistakes} #{idx + 1} • {q.concept}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100 leading-snug">
                      {q.stem}
                    </p>
                    {q.evidence && q.evidence[0] && (
                      <p className="text-xs text-slate-500 dark:text-zinc-400 italic">
                        {t.test.player.curriculumRefTitle} {q.evidence[0].sourceName} ({q.evidence[0].location})
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center rounded-3xl bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl border border-white/80 dark:border-zinc-800/80 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-slate-900 dark:text-zinc-100 text-base">{t.review.noMistakesTitle}</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
                {t.review.noMistakesDesc}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
