import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CVS_TAXONOMY } from '../../../domain/taxonomy/cvsTaxonomy.ts';
import { useQuestionStore } from '../../../application/stores/useQuestionStore.ts';
import { useLocaleStore } from '../../../application/stores/useLocaleStore.ts';
import { 
  Play, 
  Sparkles, 
  Award, 
  Zap, 
  Clock, 
  CheckCircle2, 
  Filter, 
  Flame, 
  Layers, 
  ChevronRight,
  ShieldCheck,
  Compass,
  ArrowUpRight,
  RotateCcw
} from 'lucide-react';
import { ResetBankConfirmationModal } from '../questionBank/ResetBankConfirmationModal.tsx';

type TestMode = 'practice' | 'mock' | 'rapid';

export const TestHub: React.FC = () => {
  const navigate = useNavigate();
  const { questions } = useQuestionStore();
  const { t, isRtl } = useLocaleStore();

  const [selectedMode, setSelectedMode] = useState<TestMode>('practice');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedChapter, setSelectedChapter] = useState<string>('all');
  const [questionCount, setQuestionCount] = useState<number>(20);
  const [highYieldOnly, setHighYieldOnly] = useState<boolean>(false);
  const [timedSprint, setTimedSprint] = useState<boolean>(false);
  const [showResetBankModal, setShowResetBankModal] = useState<boolean>(false);

  // Filter available chapters by selected subject
  const availableChapters = useMemo(() => {
    return selectedSubject === 'all'
      ? CVS_TAXONOMY.chapters
      : CVS_TAXONOMY.chapters.filter((c) => c.subjectId === selectedSubject);
  }, [selectedSubject]);

  // Dynamic question counts based on filter criteria
  const matchingQuestionCount = useMemo(() => {
    return questions.filter((q) => {
      if (selectedSubject !== 'all' && q.subjectId !== selectedSubject) return false;
      if (selectedChapter !== 'all' && q.chapterId !== selectedChapter) return false;
      if (highYieldOnly && !q.highYield) return false;
      return true;
    }).length;
  }, [questions, selectedSubject, selectedChapter, highYieldOnly]);

  // Subject statistics for badge counters
  const subjectCounts = useMemo(() => {
    const counts: Record<string, number> = { all: questions.length };
    CVS_TAXONOMY.subjects.forEach((s) => {
      counts[s.id] = questions.filter((q) => q.subjectId === s.id).length;
    });
    return counts;
  }, [questions]);

  const handleLaunchSession = () => {
    if (selectedMode === 'mock') {
      navigate('/session/mock-exam', {
        state: {
          mode: 'mock',
          subjectId: 'all',
          chapterId: 'all',
          questionCount: 50,
          timeLimitMinutes: 120,
        },
      });
      return;
    }

    if (selectedMode === 'rapid') {
      navigate('/session/rapid-sprint', {
        state: {
          mode: 'rapid',
          subjectId: selectedSubject,
          chapterId: selectedChapter,
          questionCount: Math.min(matchingQuestionCount, 15),
          timeLimitMinutes: 15,
          highYieldOnly: true,
        },
      });
      return;
    }

    // Practice mode
    navigate('/session/practice-now', {
      state: {
        mode: 'practice',
        subjectId: selectedSubject,
        chapterId: selectedChapter,
        questionCount: Math.min(matchingQuestionCount, questionCount),
        highYieldOnly,
        timeLimitMinutes: timedSprint ? Math.ceil(questionCount * 1.5) : undefined,
      },
    });
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] py-6 sm:py-10 px-3 sm:px-6 lg:px-8 space-y-6 sm:space-y-10 animate-apple-entrance">
      {/* 1. Header Hero Card with Specular Rim Highlight */}
      <div className="glass-surface rounded-3xl p-5 sm:p-7 lg:p-9 relative overflow-hidden group">
        {/* Subtle decorative inner corner glow */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-blue-500/10 dark:bg-blue-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-blue-500/10 dark:bg-blue-400/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-bold tracking-wide backdrop-blur-md">
              <Compass className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Cardiovascular Block 206 Exam Platform</span>
            </div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.1]">
              {t.test.hubTitle}
            </h1>
            <p className="text-xs sm:text-base text-slate-600 dark:text-zinc-400 max-w-xl font-normal leading-relaxed">
              {t.test.hubSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="glass-pill-luxury px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl flex items-center space-x-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-zinc-400">{t.common.questions}</div>
                <div className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-zinc-100">
                  {questions.length} {t.common.questions}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Mode Selector - Glass Interactive Cards */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-1 gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center space-x-2">
            <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>1. {t.test.hubTitle}</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {/* Quick Practice Mode Card */}
          <button
            type="button"
            onClick={() => setSelectedMode('practice')}
            className={`glass-card-interactive text-left p-5 sm:p-7 rounded-3xl relative cursor-pointer apple-tap ${
              selectedMode === 'practice'
                ? '!bg-white/85 dark:!bg-zinc-800/90 !border-blue-500/60 shadow-[0_16px_40px_rgba(59,130,246,0.18)] dark:shadow-[0_16px_40px_rgba(59,130,246,0.3)] ring-2 ring-blue-500/30'
                : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-tr from-blue-500/20 to-indigo-500/10 border border-blue-400/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-inner">
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 fill-blue-500/20" />
              </div>
              {selectedMode === 'practice' ? (
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/40">
                  <CheckCircle2 className="w-4 h-4 fill-white text-blue-600" />
                </div>
              ) : (
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
              )}
            </div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-lg sm:text-xl mt-4 sm:mt-5">{t.test.practiceMode}</h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 mt-2 leading-relaxed">
              {t.test.practiceModeDesc}
            </p>
            <div className="mt-4 sm:mt-5 pt-3.5 sm:pt-4 border-t border-slate-200/50 dark:border-zinc-800 flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-400">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>{t.test.quickPractice.immediateFeedback}</span>
            </div>
          </button>

          {/* Faculty Mock Exam Card */}
          <button
            type="button"
            onClick={() => setSelectedMode('mock')}
            className={`glass-card-interactive text-left p-5 sm:p-7 rounded-3xl relative cursor-pointer apple-tap ${
              selectedMode === 'mock'
                ? '!bg-white/85 dark:!bg-zinc-800/90 !border-indigo-500/60 shadow-[0_16px_40px_rgba(99,102,241,0.18)] dark:shadow-[0_16px_40px_rgba(99,102,241,0.3)] ring-2 ring-indigo-500/30'
                : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/10 border border-indigo-400/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner">
                <Award className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              {selectedMode === 'mock' ? (
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/40">
                  <CheckCircle2 className="w-4 h-4 fill-white text-indigo-600" />
                </div>
              ) : (
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
              )}
            </div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-lg sm:text-xl mt-4 sm:mt-5">{t.test.mockMode}</h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 mt-2 leading-relaxed">
              {t.test.mockModeDesc}
            </p>
            <div className="mt-4 sm:mt-5 pt-3.5 sm:pt-4 border-t border-slate-200/50 dark:border-zinc-800 flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-400">
              <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>50 Qs • 120 Mins • {t.test.mockSetup.mode}</span>
            </div>
          </button>

          {/* High-Yield Sprint Card */}
          <button
            type="button"
            onClick={() => setSelectedMode('rapid')}
            className={`glass-card-interactive text-left p-5 sm:p-7 rounded-3xl relative cursor-pointer apple-tap ${
              selectedMode === 'rapid'
                ? '!bg-white/85 dark:!bg-zinc-800/90 !border-amber-500/60 shadow-[0_16px_40px_rgba(245,158,11,0.18)] dark:shadow-[0_16px_40px_rgba(245,158,11,0.3)] ring-2 ring-amber-500/30'
                : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/10 border border-amber-400/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-inner">
                <Flame className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              {selectedMode === 'rapid' ? (
                <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/40">
                  <CheckCircle2 className="w-4 h-4 fill-white text-amber-500" />
                </div>
              ) : (
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
              )}
            </div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-lg sm:text-xl mt-4 sm:mt-5">{t.test.rapidMode}</h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 mt-2 leading-relaxed">
              {t.test.rapidModeDesc}
            </p>
            <div className="mt-4 sm:mt-5 pt-3.5 sm:pt-4 border-t border-slate-200/50 dark:border-zinc-800 flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>{t.test.highYieldOnly}</span>
            </div>
          </button>
        </div>
      </div>

      {/* 3. Configuration & Parameters Card */}
      {selectedMode === 'mock' ? (
        <div className="glass-surface rounded-3xl p-7 sm:p-9 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-zinc-800 pb-5">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Official Exam Simulation Parameters
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Faculty Block 206 Standardized Blueprint</p>
            </div>
            <span className="px-4 py-1.5 bg-indigo-500/10 border border-indigo-400/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-full backdrop-blur-md">
              Timed Simulation
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-surface p-6 rounded-2xl text-center">
              <div className="text-xs text-slate-400 dark:text-zinc-400 uppercase font-bold tracking-wider">Volume</div>
              <div className="text-3xl font-black text-slate-900 dark:text-white mt-2">50 Questions</div>
              <div className="text-xs text-slate-500 dark:text-zinc-400 mt-1 font-medium">Stratified across CVS subjects</div>
            </div>

            <div className="glass-surface p-6 rounded-2xl text-center">
              <div className="text-xs text-slate-400 dark:text-zinc-400 uppercase font-bold tracking-wider">Duration</div>
              <div className="text-3xl font-black text-slate-900 dark:text-white mt-2">120 Minutes</div>
              <div className="text-xs text-slate-500 dark:text-zinc-400 mt-1 font-medium">144s per Question pacing</div>
            </div>

            <div className="glass-surface p-6 rounded-2xl text-center">
              <div className="text-xs text-slate-400 dark:text-zinc-400 uppercase font-bold tracking-wider">Feedback Mode</div>
              <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-2">Exam Conditions</div>
              <div className="text-xs text-indigo-700 dark:text-indigo-400 mt-1 font-medium">Explanations deferred to report</div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/90 dark:bg-black/80 backdrop-blur-xl text-slate-200 border border-slate-700/60 dark:border-zinc-800 text-xs space-y-2.5">
            <div className="flex items-center space-x-2 text-amber-400 font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Standardized Exam Rules</span>
            </div>
            <ul className="list-disc list-inside space-y-1.5 text-slate-300 dark:text-zinc-400">
              <li>Keyboard answering (`1`–`4`) records choices silently without green/red feedback.</li>
              <li>Free question navigation matrix and flagging (Press `F`) remain available throughout.</li>
              <li>Comprehensive score report, calibration, and curriculum revision plan appear upon submission.</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="glass-surface rounded-3xl p-7 sm:p-9 space-y-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 dark:border-zinc-800 pb-5">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {selectedMode === 'rapid' ? t.test.highYieldScope : t.test.curriculumScope}
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">{t.test.scopeSubtitle}</p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              <div className="glass-pill-luxury px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 rtl:space-x-reverse text-blue-700 dark:text-blue-300">
                <Filter className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>{t.test.matchingQuestions}: <strong className="text-slate-900 dark:text-white font-black">{matchingQuestionCount}</strong></span>
              </div>
              <button
                type="button"
                onClick={() => setShowResetBankModal(true)}
                className="glass-pill-luxury px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 rtl:space-x-reverse text-slate-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 border hover:border-rose-400/40 cursor-pointer apple-tap transition-all"
                title={t.bank.resetToGlobalBtn}
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
                <span className="hidden sm:inline">{t.bank.resetToGlobalBtn}</span>
              </button>
            </div>
          </div>

          {/* Discipline Pills */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
              {t.test.filterSubject}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedSubject('all');
                  setSelectedChapter('all');
                }}
                className={`py-3.5 px-4 rounded-2xl text-xs font-bold border transition-all duration-300 flex items-center justify-between cursor-pointer ${
                  selectedSubject === 'all'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 scale-[1.01]'
                    : 'glass-pill-luxury text-slate-700 dark:text-zinc-300'
                }`}
              >
                <span>{t.test.allSubjects}</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                  selectedSubject === 'all' ? 'bg-blue-700 text-blue-100' : 'bg-slate-200/80 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300'
                }`}>
                  {subjectCounts.all}
                </span>
              </button>

              {CVS_TAXONOMY.subjects.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => {
                    setSelectedSubject(sub.id);
                    setSelectedChapter('all');
                  }}
                  className={`py-3.5 px-4 rounded-2xl text-xs font-bold border transition-all duration-300 flex items-center justify-between cursor-pointer ${
                    selectedSubject === sub.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 scale-[1.01]'
                      : 'glass-pill-luxury text-slate-700 dark:text-zinc-300'
                  }`}
                >
                  <span className="truncate pr-1">{sub.name.replace('CVS ', '')}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                    selectedSubject === sub.id ? 'bg-blue-700 text-blue-100' : 'bg-slate-200/80 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300'
                  }`}>
                    {subjectCounts[sub.id] || 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Chapter Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
              {t.test.filterChapter}
            </label>
            <select
              value={selectedChapter}
              onChange={(e) => setSelectedChapter(e.target.value)}
              className="w-full text-sm font-semibold rounded-2xl border border-white/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-800/70 backdrop-blur-md py-3.5 px-4 focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-slate-900 dark:text-zinc-100 shadow-inner"
            >
              <option value="all">
                {selectedSubject === 'all' ? t.test.allChapters : t.test.filterChapter}
              </option>
              {availableChapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Practice Parameters */}
          {selectedMode === 'practice' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                  {t.test.questionCount}
                </label>
                <div className="grid grid-cols-4 gap-2.5">
                  {[10, 20, 30, 50].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setQuestionCount(num)}
                      className={`py-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        questionCount === num
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25'
                          : 'glass-pill-luxury text-slate-700 dark:text-zinc-300'
                      }`}
                    >
                      {num} {t.common.questions}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                  {t.test.quickPractice.immediateFeedback}
                </label>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setHighYieldOnly(!highYieldOnly)}
                    className={`flex-1 py-3 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 border transition-all cursor-pointer ${
                      highYieldOnly
                        ? 'bg-amber-500/15 border-amber-400/50 text-amber-900 dark:text-amber-200 shadow-xs'
                        : 'glass-pill-luxury text-slate-700 dark:text-zinc-300'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>{t.test.highYieldOnly}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTimedSprint(!timedSprint)}
                    className={`flex-1 py-3 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 border transition-all cursor-pointer ${
                      timedSprint
                        ? 'bg-blue-500/15 border-blue-400/50 text-blue-900 dark:text-blue-200 shadow-xs'
                        : 'glass-pill-luxury text-slate-700 dark:text-zinc-300'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{t.test.timedSprint} ({Math.ceil(questionCount * 1.5)}m)</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Luxury Obsidian Capsule Action Footer */}
      <div className="glass-dark-capsule rounded-3xl p-5 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5 sm:gap-6 relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <div className="text-[10px] sm:text-[11px] text-slate-400 uppercase font-black tracking-widest">{t.test.matchingQuestions}</div>
          <div className="text-lg sm:text-2xl font-black text-white flex items-center space-x-2">
            <span>
              {selectedMode === 'mock' 
                ? `50 ${t.common.questions} • 120 Mins ${t.test.mockMode}` 
                : selectedMode === 'rapid' 
                ? `${Math.min(matchingQuestionCount, 15)} ${t.test.highYieldOnly}` 
                : `${Math.min(matchingQuestionCount, questionCount)} ${t.common.questions} • ${t.test.practiceMode}`}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-normal">
            Press <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded-md text-[11px] text-slate-300 font-mono font-bold">1</kbd>–<kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded-md text-[11px] text-slate-300 font-mono font-bold">4</kbd> {t.test.player.answerShortcut}
          </p>
        </div>

        <button
          onClick={handleLaunchSession}
          disabled={matchingQuestionCount === 0}
          className={`w-full sm:w-auto py-3.5 sm:py-4 px-6 sm:px-9 rounded-2xl text-sm font-black flex items-center justify-center space-x-3 transition-all duration-300 cursor-pointer shadow-xl relative z-10 apple-tap ${
            matchingQuestionCount === 0
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
              : selectedMode === 'mock'
              ? 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700 hover:from-indigo-400 hover:to-indigo-600 text-white shadow-indigo-500/30'
              : selectedMode === 'rapid'
              ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black shadow-amber-500/30'
              : 'bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/30'
          }`}
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{selectedMode === 'mock' ? t.test.launchMock : selectedMode === 'rapid' ? t.test.launchRapid : t.test.launchPractice}</span>
          <ChevronRight className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Global Question Bank Recovery Modal */}
      <ResetBankConfirmationModal
        isOpen={showResetBankModal}
        onClose={() => setShowResetBankModal(false)}
      />
    </div>
  );
};
