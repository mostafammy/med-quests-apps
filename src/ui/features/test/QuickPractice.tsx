import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CVS_TAXONOMY } from '../../../domain/taxonomy/cvsTaxonomy.ts';
import { useQuestionStore } from '../../../application/stores/useQuestionStore.ts';
import { useStatsStore } from '../../../application/stores/useStatsStore.ts';
import { useLocaleStore } from '../../../application/stores/useLocaleStore.ts';
import { Play, Sparkles, CheckCircle2, Zap } from 'lucide-react';

export const QuickPractice: React.FC = () => {
  const navigate = useNavigate();
  const { questions } = useQuestionStore();
  const { 
    refreshStats, 
    getScopeCoverage, 
    answeredQuestionIds, 
    correctQuestionIds, 
    mistakeQuestionIds 
  } = useStatsStore();
  const { t } = useLocaleStore();

  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedChapter, setSelectedChapter] = useState<string>('all');
  const [questionCount, setQuestionCount] = useState<number | 'all'>(20);
  const [highYieldOnly, setHighYieldOnly] = useState<boolean>(true);
  const [repetitionFilter, setRepetitionFilter] = useState<'unanswered' | 'all' | 'incorrect'>('unanswered');

  useEffect(() => {
    refreshStats(questions);
  }, [questions, refreshStats]);

  const availableChapters = selectedSubject === 'all'
    ? CVS_TAXONOMY.chapters
    : CVS_TAXONOMY.chapters.filter((c) => c.subjectId === selectedSubject);

  const scopeCoverage = useMemo(() => {
    return getScopeCoverage(questions, {
      subjectId: selectedSubject,
      chapterId: selectedChapter,
      highYieldOnly,
    });
  }, [questions, selectedSubject, selectedChapter, highYieldOnly, answeredQuestionIds, correctQuestionIds, mistakeQuestionIds, getScopeCoverage]);

  const matchingQuestionCount = useMemo(() => {
    if (repetitionFilter === 'unanswered') return scopeCoverage.unanswered;
    if (repetitionFilter === 'incorrect') return scopeCoverage.incorrect;
    return scopeCoverage.total;
  }, [repetitionFilter, scopeCoverage]);

  const handleStartTest = () => {
    const targetIds = repetitionFilter === 'unanswered'
      ? scopeCoverage.unansweredIds
      : repetitionFilter === 'incorrect'
      ? scopeCoverage.incorrectIds
      : undefined;

    const count = questionCount === 'all' ? matchingQuestionCount : Math.min(matchingQuestionCount, questionCount);
    navigate('/session/practice-now', {
      state: {
        mode: 'practice',
        subjectId: selectedSubject,
        chapterId: selectedChapter,
        questionCount: count,
        questionFilter: repetitionFilter,
        questionIds: targetIds ? targetIds.slice(0, count) : undefined,
        highYieldOnly,
      },
    });
  };

  return (
    <div className="max-w-4xl mx-auto py-6 sm:py-8 px-3.5 sm:px-6 space-y-5 sm:space-y-6 animate-apple-entrance">
      <div className="border-b border-slate-200 dark:border-zinc-800 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">{t.test.quickPractice.title}</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
            {t.test.quickPractice.subtitle}
          </p>
        </div>
        <span className="self-start sm:self-auto text-xs font-semibold px-3 py-1 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-900/60">
          {t.test.quickPractice.immediateFeedback}
        </span>
      </div>

      <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl rounded-3xl border border-slate-200 dark:border-zinc-800 p-5 sm:p-6 shadow-xs space-y-6">
        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
              {t.test.quickPractice.subjectScope}
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                setSelectedChapter('all');
              }}
              className="w-full text-sm rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="all">{t.test.allSubjects}</option>
              {CVS_TAXONOMY.subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
              {t.test.quickPractice.targetChapter}
            </label>
            <select
              value={selectedChapter}
              onChange={(e) => setSelectedChapter(e.target.value)}
              className="w-full text-sm rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="all">{t.test.allChapters}</option>
              {availableChapters.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Repetition Scope Strip */}
        <div className="space-y-1.5 pt-1">
          <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
            {t.test.repetitionFilterTitle}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setRepetitionFilter('unanswered')}
              className={`p-2.5 rounded-xl text-left border transition-all text-xs font-semibold flex items-center justify-between cursor-pointer apple-tap ${
                repetitionFilter === 'unanswered'
                  ? 'bg-blue-600/10 dark:bg-blue-500/15 border-blue-500/60 text-blue-900 dark:text-blue-100'
                  : 'bg-slate-50 dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:border-blue-400/50'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>{t.test.filterUnanswered}</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-600 text-white font-bold">
                {scopeCoverage.unanswered}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setRepetitionFilter('all')}
              className={`p-2.5 rounded-xl text-left border transition-all text-xs font-semibold flex items-center justify-between cursor-pointer apple-tap ${
                repetitionFilter === 'all'
                  ? 'bg-indigo-600/10 dark:bg-indigo-500/15 border-indigo-500/60 text-indigo-900 dark:text-indigo-100'
                  : 'bg-slate-50 dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:border-indigo-400/50'
              }`}
            >
              <span>{t.test.filterAllPool}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-bold">
                {scopeCoverage.total}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setRepetitionFilter('incorrect')}
              disabled={scopeCoverage.incorrect === 0}
              className={`p-2.5 rounded-xl text-left border transition-all text-xs font-semibold flex items-center justify-between cursor-pointer apple-tap disabled:opacity-40 disabled:cursor-not-allowed ${
                repetitionFilter === 'incorrect'
                  ? 'bg-rose-600/10 dark:bg-rose-500/15 border-rose-500/60 text-rose-900 dark:text-rose-100'
                  : 'bg-slate-50 dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:border-rose-400/50'
              }`}
            >
              <span>{t.test.filterIncorrectOnly}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-600 text-white font-bold">
                {scopeCoverage.incorrect}
              </span>
            </button>
          </div>
        </div>

        {/* Question Count & High-Yield Toggle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase tracking-wider mb-2">
              {t.test.questionCount}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[10, 20, 30, 50].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setQuestionCount(num)}
                  className={`py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    questionCount === num
                      ? 'bg-blue-600 text-white shadow-xs font-bold'
                      : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {num} {t.common.questions}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setQuestionCount('all')}
                className={`py-2 rounded-lg text-xs font-semibold transition-all col-span-2 sm:col-span-1 cursor-pointer ${
                  questionCount === 'all'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
                }`}
              >
                {t.test.allCategoryOption} ({matchingQuestionCount})
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase tracking-wider mb-2">
              {t.test.filterSubject}
            </label>
            <button
              type="button"
              onClick={() => setHighYieldOnly(!highYieldOnly)}
              className={`w-full py-2 px-3 rounded-lg text-sm font-semibold flex items-center justify-between border transition-all cursor-pointer ${
                highYieldOnly
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-300'
                  : 'bg-slate-50 dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <span>{t.test.highYieldOnly}</span>
              </div>
              {highYieldOnly && <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
            </button>
          </div>
        </div>

        {/* Start Button */}
        <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-zinc-400">
            {t.test.matchingQuestions}: <strong className="text-slate-800 dark:text-zinc-200">{matchingQuestionCount}</strong> ({repetitionFilter === 'unanswered' ? 'Fresh Pool • Zero Duplicates' : 'Full Pool'})
          </div>
          <button
            onClick={handleStartTest}
            disabled={matchingQuestionCount === 0}
            className="w-full sm:w-auto py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center justify-center space-x-2 shadow-xs transition-all cursor-pointer apple-tap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{t.test.quickPractice.launchBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
