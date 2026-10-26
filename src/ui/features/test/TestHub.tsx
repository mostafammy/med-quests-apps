import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  ChevronRight,
  ShieldCheck,
  Compass,
  RotateCcw,
  Sliders
} from 'lucide-react';
import { ResetBankConfirmationModal } from '../questionBank/ResetBankConfirmationModal.tsx';

type TestMode = 'practice' | 'mock' | 'rapid';

export const TestHub: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { questions } = useQuestionStore();
  const { t, isRtl } = useLocaleStore();

  // Mode & configuration state
  const [selectedMode, setSelectedMode] = useState<TestMode>('practice');
  const [selectedSubject, setSelectedSubject] = useState<string>(() => {
    const subParam = searchParams.get('subject');
    if (subParam) {
      const match = CVS_TAXONOMY.subjects.find(
        (s) => s.id.toLowerCase() === subParam.toLowerCase() || s.name.toLowerCase().includes(subParam.toLowerCase())
      );
      if (match) return match.id;
    }
    return 'all';
  });
  const [selectedChapter, setSelectedChapter] = useState<string>('all');
  const [questionCount, setQuestionCount] = useState<number | 'all'>(20);
  const [highYieldOnly, setHighYieldOnly] = useState<boolean>(false);
  const [timedSprint, setTimedSprint] = useState<boolean>(false);
  const [showResetBankModal, setShowResetBankModal] = useState<boolean>(false);

  // Sync with search params if they change
  useEffect(() => {
    const subParam = searchParams.get('subject');
    if (subParam) {
      const match = CVS_TAXONOMY.subjects.find(
        (s) => s.id.toLowerCase() === subParam.toLowerCase() || s.name.toLowerCase().includes(subParam.toLowerCase())
      );
      if (match) {
        setSelectedSubject(match.id);
        setSelectedChapter('all');
      }
    }
  }, [searchParams]);

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

  // Effective question count for the active session configuration
  const effectiveQuestionCount = useMemo(() => {
    if (questionCount === 'all') {
      return matchingQuestionCount;
    }
    return Math.min(matchingQuestionCount, questionCount);
  }, [questionCount, matchingQuestionCount]);

  // Dynamic human-readable label for the currently targeted category
  const selectedCategoryLabel = useMemo(() => {
    if (selectedChapter !== 'all') {
      const ch = CVS_TAXONOMY.chapters.find((c) => c.id === selectedChapter);
      if (ch) return ch.name;
    }
    if (selectedSubject !== 'all') {
      const sub = CVS_TAXONOMY.subjects.find((s) => s.id === selectedSubject);
      if (sub) return sub.name;
    }
    return t.test.allSubjects;
  }, [selectedSubject, selectedChapter, t]);

  // Subject statistics for badge counters
  const subjectCounts = useMemo(() => {
    const counts: Record<string, number> = { all: questions.length };
    CVS_TAXONOMY.subjects.forEach((s) => {
      counts[s.id] = questions.filter((q) => q.subjectId === s.id).length;
    });
    return counts;
  }, [questions]);

  // Master launch handler
  const handleLaunchSession = (overrideCount?: number | 'all', overrideMode?: TestMode) => {
    const targetMode = overrideMode || selectedMode;
    const effectiveCountMode = overrideCount !== undefined ? overrideCount : questionCount;

    if (targetMode === 'mock') {
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

    if (targetMode === 'rapid') {
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
    const count = effectiveCountMode === 'all'
      ? matchingQuestionCount
      : Math.min(matchingQuestionCount, effectiveCountMode);

    navigate('/session/practice-now', {
      state: {
        mode: 'practice',
        subjectId: selectedSubject,
        chapterId: selectedChapter,
        questionCount: count,
        highYieldOnly,
        timeLimitMinutes: timedSprint ? Math.ceil(count * 1.5) : undefined,
      },
    });
  };

  // Keyboard accelerators (Cmd/Ctrl + Enter to launch, 1/2/3 to switch modes)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside a select or typing in an input
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleLaunchSession();
        return;
      }

      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.key === '1') {
          setSelectedMode('practice');
        } else if (e.key === '2') {
          setSelectedMode('mock');
        } else if (e.key === '3') {
          setSelectedMode('rapid');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMode, selectedSubject, selectedChapter, questionCount, highYieldOnly, timedSprint, matchingQuestionCount]);

  return (
    <div className="relative max-w-5xl mx-auto py-4 sm:py-6 px-3 sm:px-6 space-y-4 sm:space-y-5 animate-apple-entrance">
      
      {/* 1. Sleek Apple Header Banner with Inline Actions */}
      <div className="glass-surface rounded-2xl sm:rounded-3xl p-4 sm:p-5 relative overflow-hidden shadow-xs border border-slate-200/70 dark:border-zinc-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 relative z-10">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-1.5 rtl:space-x-reverse px-2.5 py-0.5 rounded-full bg-blue-500/10 dark:bg-blue-400/15 border border-blue-500/20 dark:border-blue-400/30 text-blue-700 dark:text-blue-300 text-[11px] font-bold tracking-wide">
              <Compass className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              <span>Cardiovascular Block 206 Exam Platform</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
              {t.test.hubTitle}
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-xl font-medium">
              {t.test.hubSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="glass-pill-luxury px-3.5 py-1.5 rounded-xl flex items-center space-x-2 rtl:space-x-reverse border border-slate-200/60 dark:border-zinc-800">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-black text-slate-800 dark:text-zinc-200">
                {questions.length} <span className="font-semibold text-slate-500 dark:text-zinc-400">{t.common.questions}</span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowResetBankModal(true)}
              className="glass-pill-luxury px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 rtl:space-x-reverse text-slate-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200/60 dark:border-zinc-800 hover:border-rose-400/50 dark:hover:border-rose-500/40 hover:bg-rose-500/10 dark:hover:bg-rose-500/15 cursor-pointer apple-tap transition-all duration-200"
              title={t.bank.resetToGlobalBtn}
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
              <span className="hidden sm:inline">{t.bank.resetToGlobalBtn}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Apple Quick-Launch Presets Dock (Instant 1-Tap Access with High-Contrast Themed Hovers) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        {/* Preset 1: Instant Practice 20 Qs */}
        <button
          type="button"
          onClick={() => {
            setSelectedMode('practice');
            handleLaunchSession(20, 'practice');
          }}
          className="group text-left p-3.5 sm:p-4 rounded-2xl glass-surface border border-slate-200/80 dark:border-zinc-800/80 hover:border-blue-500/50 dark:hover:border-blue-400/50 hover:bg-white dark:hover:bg-zinc-800/90 hover:shadow-lg hover:shadow-blue-500/5 dark:hover:shadow-blue-500/10 transition-all duration-200 cursor-pointer apple-tap flex items-center justify-between"
        >
          <div className="flex items-center space-x-3 rtl:space-x-reverse min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 dark:bg-blue-400/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:bg-blue-600 dark:group-hover:bg-blue-500 group-hover:text-white transition-colors duration-200 shadow-2xs">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div className="truncate">
              <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Instant Practice</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-blue-500/10 dark:bg-blue-400/15 text-blue-700 dark:text-blue-300 group-hover:bg-blue-600/15 dark:group-hover:bg-blue-400/25 font-bold transition-colors">20 Qs</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">Immediate tutor rationales</div>
            </div>
          </div>
          <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-zinc-800/80 border border-slate-200/50 dark:border-zinc-700/50 flex items-center justify-center text-slate-400 dark:text-zinc-400 group-hover:bg-blue-600 dark:group-hover:bg-blue-500 group-hover:border-transparent group-hover:text-white transition-all duration-200 shrink-0 ml-2">
            <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
          </div>
        </button>

        {/* Preset 2: Rapid Sprint 15 Qs */}
        <button
          type="button"
          onClick={() => {
            setSelectedMode('rapid');
            handleLaunchSession(15, 'rapid');
          }}
          className="group text-left p-3.5 sm:p-4 rounded-2xl glass-surface border border-slate-200/80 dark:border-zinc-800/80 hover:border-amber-500/50 dark:hover:border-amber-400/50 hover:bg-white dark:hover:bg-zinc-800/90 hover:shadow-lg hover:shadow-amber-500/5 dark:hover:shadow-amber-500/10 transition-all duration-200 cursor-pointer apple-tap flex items-center justify-between"
        >
          <div className="flex items-center space-x-3 rtl:space-x-reverse min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-400/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:bg-amber-500 dark:group-hover:bg-amber-400 group-hover:text-slate-950 transition-colors duration-200 shadow-2xs">
              <Flame className="w-4 h-4 fill-current" />
            </div>
            <div className="truncate">
              <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>High-Yield Sprint</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-500/10 dark:bg-amber-400/15 text-amber-700 dark:text-amber-300 group-hover:bg-amber-500/20 dark:group-hover:bg-amber-400/25 font-bold transition-colors">15m</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">15 top-yield exam concepts</div>
            </div>
          </div>
          <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-zinc-800/80 border border-slate-200/50 dark:border-zinc-700/50 flex items-center justify-center text-slate-400 dark:text-zinc-400 group-hover:bg-amber-500 dark:group-hover:bg-amber-400 group-hover:border-transparent group-hover:text-slate-950 transition-all duration-200 shrink-0 ml-2">
            <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
          </div>
        </button>

        {/* Preset 3: Faculty Mock Exam 50 Qs */}
        <button
          type="button"
          onClick={() => {
            setSelectedMode('mock');
            handleLaunchSession(50, 'mock');
          }}
          className="group text-left p-3.5 sm:p-4 rounded-2xl glass-surface border border-slate-200/80 dark:border-zinc-800/80 hover:border-indigo-500/50 dark:hover:border-indigo-400/50 hover:bg-white dark:hover:bg-zinc-800/90 hover:shadow-lg hover:shadow-indigo-500/5 dark:hover:shadow-indigo-500/10 transition-all duration-200 cursor-pointer apple-tap flex items-center justify-between"
        >
          <div className="flex items-center space-x-3 rtl:space-x-reverse min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 dark:bg-indigo-400/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 dark:group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-200 shadow-2xs">
              <Award className="w-4 h-4 fill-current" />
            </div>
            <div className="truncate">
              <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Faculty Mock</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-indigo-500/10 dark:bg-indigo-400/15 text-indigo-700 dark:text-indigo-300 group-hover:bg-indigo-600/15 dark:group-hover:bg-indigo-400/25 font-bold transition-colors">50 Qs</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">120m timed exam simulation</div>
            </div>
          </div>
          <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-zinc-800/80 border border-slate-200/50 dark:border-zinc-700/50 flex items-center justify-center text-slate-400 dark:text-zinc-400 group-hover:bg-indigo-600 dark:group-hover:bg-indigo-500 group-hover:border-transparent group-hover:text-white transition-all duration-200 shrink-0 ml-2">
            <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
          </div>
        </button>
      </div>

      {/* 3. High-Precision Apple Segmented Mode Switcher with Responsive Hover */}
      <div className="p-1 rounded-2xl bg-slate-200/60 dark:bg-zinc-900/80 border border-slate-300/40 dark:border-zinc-800/80 backdrop-blur-md">
        <div className="grid grid-cols-3 gap-1">
          {/* Practice Mode Tab */}
          <button
            type="button"
            onClick={() => setSelectedMode('practice')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center space-x-2 rtl:space-x-reverse cursor-pointer apple-tap ${
              selectedMode === 'practice'
                ? 'bg-white dark:bg-zinc-800 text-blue-700 dark:text-blue-300 shadow-sm border border-slate-200/80 dark:border-zinc-700 font-black'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-zinc-800/60'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${selectedMode === 'practice' ? 'text-blue-600 dark:text-blue-400 fill-blue-500/20' : ''}`} />
            <span>{t.test.practiceMode}</span>
            <span className="hidden sm:inline text-[10px] opacity-60 font-mono">[1]</span>
          </button>

          {/* Mock Exam Tab */}
          <button
            type="button"
            onClick={() => setSelectedMode('mock')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center space-x-2 rtl:space-x-reverse cursor-pointer apple-tap ${
              selectedMode === 'mock'
                ? 'bg-white dark:bg-zinc-800 text-indigo-700 dark:text-indigo-300 shadow-sm border border-slate-200/80 dark:border-zinc-700 font-black'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-zinc-800/60'
            }`}
          >
            <Award className={`w-3.5 h-3.5 ${selectedMode === 'mock' ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
            <span>{t.test.mockMode}</span>
            <span className="hidden sm:inline text-[10px] opacity-60 font-mono">[2]</span>
          </button>

          {/* Rapid High-Yield Tab */}
          <button
            type="button"
            onClick={() => setSelectedMode('rapid')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center space-x-2 rtl:space-x-reverse cursor-pointer apple-tap ${
              selectedMode === 'rapid'
                ? 'bg-white dark:bg-zinc-800 text-amber-700 dark:text-amber-300 shadow-sm border border-slate-200/80 dark:border-zinc-700 font-black'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-zinc-800/60'
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${selectedMode === 'rapid' ? 'text-amber-500 fill-amber-500/20' : ''}`} />
            <span>{t.test.rapidMode}</span>
            <span className="hidden sm:inline text-[10px] opacity-60 font-mono">[3]</span>
          </button>
        </div>
      </div>

      {/* 4. Streamlined Configuration Console */}
      {selectedMode === 'mock' ? (
        <div className="glass-surface rounded-2xl sm:rounded-3xl p-5 sm:p-6 space-y-4 border border-slate-200/70 dark:border-zinc-800">
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-zinc-800 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Official Exam Simulation Parameters
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Faculty Block 206 Standardized Blueprint</p>
            </div>
            <span className="px-3 py-1 bg-indigo-500/10 dark:bg-indigo-400/15 border border-indigo-400/30 dark:border-indigo-400/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-full">
              Timed Simulation
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="glass-surface p-3.5 rounded-xl text-center border border-slate-200/60 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors">
              <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase font-black tracking-wider">Volume</div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">50 Questions</div>
              <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">Stratified across CVS subjects</div>
            </div>

            <div className="glass-surface p-3.5 rounded-xl text-center border border-slate-200/60 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors">
              <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase font-black tracking-wider">Duration</div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">120 Minutes</div>
              <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">144s per Question pacing</div>
            </div>

            <div className="glass-surface p-3.5 rounded-xl text-center border border-slate-200/60 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors">
              <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase font-black tracking-wider">Feedback Mode</div>
              <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">Exam Conditions</div>
              <div className="text-[11px] text-indigo-600/80 dark:text-indigo-400/80 mt-0.5">Explanations deferred to report</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/90 dark:bg-black/80 text-slate-200 border border-slate-800 text-xs space-y-1.5">
            <div className="flex items-center space-x-1.5 rtl:space-x-reverse text-amber-400 font-bold uppercase tracking-wider text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Standardized Exam Rules</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-300 dark:text-zinc-400 text-[11px]">
              <li>Keyboard answering (`1`–`4`) records choices silently without feedback.</li>
              <li>Free question navigation matrix and flagging (Press `F`) available throughout.</li>
              <li>Comprehensive score report & curriculum revision plan appear upon submission.</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="glass-surface rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 sm:space-y-5 border border-slate-200/70 dark:border-zinc-800">
          {/* Section 2 Header & Scope */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-zinc-800 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>{selectedMode === 'rapid' ? t.test.highYieldScope : t.test.curriculumScope}</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">{t.test.scopeSubtitle}</p>
            </div>
            
            <div className="glass-pill-luxury px-3 py-1 rounded-xl text-xs font-bold flex items-center space-x-1.5 rtl:space-x-reverse text-blue-700 dark:text-blue-300 self-start sm:self-auto border border-blue-500/20 dark:border-blue-400/30">
              <Filter className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              <span>{t.test.matchingQuestions}: <strong className="text-slate-900 dark:text-white font-black">{matchingQuestionCount}</strong></span>
            </div>
          </div>

          {/* Subject Discipline Filter Strip with Refined Hover Feedback */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                {t.test.filterSubject}
              </label>
              <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">{selectedCategoryLabel}</span>
            </div>
            
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedSubject('all');
                  setSelectedChapter('all');
                }}
                className={`group py-1.5 px-3 rounded-xl text-xs font-bold transition-all duration-150 flex items-center space-x-1.5 rtl:space-x-reverse cursor-pointer apple-tap ${
                  selectedSubject === 'all'
                    ? 'bg-blue-600 text-white shadow-xs scale-[1.01]'
                    : 'glass-pill-luxury text-slate-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-400/50 dark:hover:border-blue-500/40 hover:bg-blue-50/50 dark:hover:bg-blue-950/20'
                }`}
              >
                <span>{t.test.allSubjects}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold transition-colors ${
                  selectedSubject === 'all' 
                    ? 'bg-blue-700 text-blue-100' 
                    : 'bg-slate-200/80 dark:bg-zinc-700/80 text-slate-700 dark:text-zinc-300 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 group-hover:text-blue-700 dark:group-hover:text-blue-300'
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
                  className={`group py-1.5 px-3 rounded-xl text-xs font-bold transition-all duration-150 flex items-center space-x-1.5 rtl:space-x-reverse cursor-pointer apple-tap ${
                    selectedSubject === sub.id
                      ? 'bg-blue-600 text-white shadow-xs scale-[1.01]'
                      : 'glass-pill-luxury text-slate-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-400/50 dark:hover:border-blue-500/40 hover:bg-blue-50/50 dark:hover:bg-blue-950/20'
                  }`}
                >
                  <span>{sub.name.replace('CVS ', '')}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold transition-colors ${
                    selectedSubject === sub.id 
                      ? 'bg-blue-700 text-blue-100' 
                      : 'bg-slate-200/80 dark:bg-zinc-700/80 text-slate-700 dark:text-zinc-300 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 group-hover:text-blue-700 dark:group-hover:text-blue-300'
                  }`}>
                    {subjectCounts[sub.id] || 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Chapter Selector & Toggles Inline Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 items-end">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">
                {t.test.filterChapter}
              </label>
              <select
                value={selectedChapter}
                onChange={(e) => setSelectedChapter(e.target.value)}
                className="w-full text-xs font-semibold rounded-xl border border-slate-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-800/90 hover:border-slate-300 dark:hover:border-zinc-700 hover:bg-white dark:hover:bg-zinc-800 py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-slate-900 dark:text-zinc-100 shadow-xs transition-colors duration-200 cursor-pointer"
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

            {selectedMode === 'practice' && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setHighYieldOnly(!highYieldOnly)}
                  className={`flex-1 py-2.5 px-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1.5 rtl:space-x-reverse border transition-all duration-150 cursor-pointer apple-tap ${
                    highYieldOnly
                      ? 'bg-amber-500/15 border-amber-400/60 dark:border-amber-500/50 text-amber-900 dark:text-amber-200 shadow-xs hover:bg-amber-500/20 dark:hover:bg-amber-500/25'
                      : 'glass-pill-luxury text-slate-700 dark:text-zinc-300 hover:text-amber-700 dark:hover:text-amber-300 hover:border-amber-400/50 dark:hover:border-amber-500/40 hover:bg-amber-50/50 dark:hover:bg-amber-950/20'
                  }`}
                  title={t.test.highYieldSub}
                >
                  <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                  <span className="truncate">{t.test.highYieldOnly}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTimedSprint(!timedSprint)}
                  className={`flex-1 py-2.5 px-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1.5 rtl:space-x-reverse border transition-all duration-150 cursor-pointer apple-tap ${
                    timedSprint
                      ? 'bg-blue-500/15 border-blue-400/60 dark:border-blue-500/50 text-blue-900 dark:text-blue-200 shadow-xs hover:bg-blue-500/20 dark:hover:bg-blue-500/25'
                      : 'glass-pill-luxury text-slate-700 dark:text-zinc-300 hover:text-blue-700 dark:hover:text-blue-300 hover:border-blue-400/50 dark:hover:border-blue-500/40 hover:bg-blue-50/50 dark:hover:bg-blue-950/20'
                  }`}
                  title={t.test.timedSprintSub}
                >
                  <Clock className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="truncate">{t.test.timedSprint}</span>
                </button>
              </div>
            )}
          </div>

          {/* Compact Streamlined Category Test Strip */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-purple-500/10 dark:from-blue-500/15 dark:via-indigo-500/10 dark:to-purple-500/15 border border-blue-500/20 dark:border-blue-400/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors">
            <div className="flex items-center space-x-2.5 rtl:space-x-reverse min-w-0">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    {t.test.testAllCategory}
                  </span>
                  <span className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                    {matchingQuestionCount} {t.common.questions}
                  </span>
                  {questionCount === 'all' && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full font-black bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 uppercase tracking-wide">
                      {t.test.allCategorySelected}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 dark:text-zinc-400 truncate">
                  {t.test.testAllCategoryDesc}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-stretch sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  setQuestionCount((prev) => (prev === 'all' ? 20 : 'all'));
                }}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 border cursor-pointer apple-tap flex items-center justify-center space-x-1 rtl:space-x-reverse ${
                  questionCount === 'all'
                    ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-600 shadow-xs'
                    : 'bg-white/80 dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 border-slate-300/80 dark:border-zinc-700 hover:border-blue-400 dark:hover:border-blue-500/60 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-blue-50/60 dark:hover:bg-blue-950/30'
                }`}
              >
                {questionCount === 'all' ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-white" />
                    <span>{t.test.allCategorySelected}</span>
                  </>
                ) : (
                  <span>{t.test.selectFullCategory}</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleLaunchSession('all')}
                disabled={matchingQuestionCount === 0}
                className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-xs hover:shadow-md hover:shadow-blue-500/20 dark:hover:shadow-blue-500/30 flex items-center justify-center space-x-1.5 rtl:space-x-reverse cursor-pointer apple-tap disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>{t.test.launchFullCategory}</span>
              </button>
            </div>
          </div>

          {/* Question Count Selection Strip with Unified Themed Hover */}
          {selectedMode === 'practice' && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">
                  {t.test.questionCount}
                </label>
                <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                  {effectiveQuestionCount} targeted
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[10, 20, 30, 50].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setQuestionCount(num)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all duration-150 border cursor-pointer apple-tap ${
                      questionCount === num
                        ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-600 shadow-xs font-black'
                        : 'glass-pill-luxury text-slate-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-300 hover:border-blue-400/50 dark:hover:border-blue-500/40 hover:bg-blue-50/50 dark:hover:bg-blue-950/20'
                    }`}
                  >
                    {num} {t.common.questions}
                  </button>
                ))}
                
                <button
                  type="button"
                  onClick={() => setQuestionCount('all')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all duration-150 border cursor-pointer apple-tap flex items-center justify-center space-x-1 rtl:space-x-reverse col-span-2 sm:col-span-1 ${
                    questionCount === 'all'
                      ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-600 shadow-xs font-black'
                      : 'glass-pill-luxury text-slate-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-300 hover:border-blue-400/50 dark:hover:border-blue-500/40 hover:bg-blue-50/50 dark:hover:bg-blue-950/20'
                  }`}
                >
                  <span>{t.test.allCategoryOption} ({matchingQuestionCount})</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. Apple Command Deck Launch Bar */}
      <div className="glass-dark-capsule rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 relative overflow-hidden shadow-lg border border-slate-800">
        <div className="space-y-0.5 relative z-10 min-w-0">
          <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest flex items-center gap-1.5">
            <span>{t.test.matchingQuestions}</span>
            <span className="text-slate-600">•</span>
            <span className="text-blue-400 font-bold">{selectedCategoryLabel}</span>
          </div>
          <div className="text-base sm:text-lg font-black text-white flex items-center space-x-2 truncate">
            <span>
              {selectedMode === 'mock' 
                ? `50 ${t.common.questions} • 120 Mins ${t.test.mockMode}` 
                : selectedMode === 'rapid' 
                ? `${Math.min(matchingQuestionCount, 15)} ${t.test.highYieldOnly}` 
                : questionCount === 'all'
                ? `${effectiveQuestionCount} ${t.common.questions} (${t.test.fullCategoryBadge}) • ${t.test.practiceMode}`
                : `${effectiveQuestionCount} ${t.common.questions} • ${t.test.practiceMode}`}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-normal flex items-center gap-2">
            <span>Launch: <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 font-mono font-bold">⌘↵</kbd></span>
            <span>Answer: <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 font-mono font-bold">1</kbd>–<kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 font-mono font-bold">4</kbd></span>
          </p>
        </div>

        <button
          onClick={() => handleLaunchSession()}
          disabled={matchingQuestionCount === 0}
          className={`w-full sm:w-auto py-2.5 sm:py-3 px-5 sm:px-7 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center space-x-2.5 transition-all duration-200 cursor-pointer shadow-md relative z-10 apple-tap ${
            matchingQuestionCount === 0
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
              : selectedMode === 'mock'
              ? 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700 hover:from-indigo-400 hover:to-indigo-600 text-white shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/40 dark:hover:shadow-indigo-400/25 hover:brightness-105 active:brightness-95'
              : selectedMode === 'rapid'
              ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black shadow-amber-500/25 hover:shadow-lg hover:shadow-amber-500/40 dark:hover:shadow-amber-400/25 hover:brightness-105 active:brightness-95'
              : 'bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/40 dark:hover:shadow-blue-400/25 hover:brightness-105 active:brightness-95'
          }`}
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{selectedMode === 'mock' ? t.test.launchMock : selectedMode === 'rapid' ? t.test.launchRapid : t.test.launchPractice}</span>
          <ChevronRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
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
