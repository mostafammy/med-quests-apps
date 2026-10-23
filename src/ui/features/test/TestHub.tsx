import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CVS_TAXONOMY } from '../../../domain/taxonomy/cvsTaxonomy.ts';
import { useQuestionStore } from '../../../application/stores/useQuestionStore.ts';
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
  Compass
} from 'lucide-react';

type TestMode = 'practice' | 'mock' | 'rapid';

export const TestHub: React.FC = () => {
  const navigate = useNavigate();
  const { questions } = useQuestionStore();

  const [selectedMode, setSelectedMode] = useState<TestMode>('practice');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedChapter, setSelectedChapter] = useState<string>('all');
  const [questionCount, setQuestionCount] = useState<number>(20);
  const [highYieldOnly, setHighYieldOnly] = useState<boolean>(false);
  const [timedSprint, setTimedSprint] = useState<boolean>(false);

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
    <div className="relative min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Dynamic Ambient Glassmorphism Background Orbs */}
      <div className="pointer-events-none absolute -top-24 -left-20 w-96 h-96 bg-gradient-to-br from-blue-400/25 to-indigo-500/20 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2" />
      <div className="pointer-events-none absolute top-1/3 -right-24 w-[30rem] h-[30rem] bg-gradient-to-br from-purple-400/20 via-pink-300/15 to-blue-300/20 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-1/3 w-80 h-80 bg-gradient-to-tr from-amber-300/20 to-emerald-400/15 rounded-full blur-3xl" />

      <div className="relative max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
        {/* Glassmorphic Header Card */}
        <div className="p-6 md:p-8 rounded-3xl bg-white/60 backdrop-blur-xl border border-white/80 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all">
          <div className="space-y-1.5">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-700 text-xs font-semibold backdrop-blur-md">
              <Compass className="w-3.5 h-3.5 text-blue-600" />
              <span>Cardiovascular Block 206 Exam Engine</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 bg-clip-text text-transparent">
              Test & Examination Hub
            </h1>
            <p className="text-sm text-slate-600 max-w-xl leading-relaxed">
              Targeted micro-practice with instant explanations or full 2-hour university mock simulations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2.5 rounded-2xl bg-white/70 backdrop-blur-md border border-white/80 shadow-xs flex items-center space-x-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-slate-800 tracking-tight">
                {questions.length} Questions Grounded
              </span>
            </div>
          </div>
        </div>

        {/* 1. Paradigm Selection - Glass Cards */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-2">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>1. Choose Testing Mode</span>
            </label>
            <span className="text-[11px] font-medium text-slate-400">Select paradigm to configure parameters</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Quick Practice Mode Card */}
            <button
              type="button"
              onClick={() => setSelectedMode('practice')}
              className={`text-left p-6 rounded-3xl transition-all duration-300 relative cursor-pointer backdrop-blur-xl border ${
                selectedMode === 'practice'
                  ? 'bg-gradient-to-b from-blue-500/15 via-white/80 to-white/90 border-blue-500/40 shadow-[0_12px_36px_0_rgba(59,130,246,0.18)] ring-2 ring-blue-500/30 -translate-y-1'
                  : 'bg-white/50 hover:bg-white/70 border-white/80 hover:border-blue-200/60 shadow-[0_4px_20px_0_rgba(0,0,0,0.03)] hover:-translate-y-0.5'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500/20 to-blue-400/10 border border-blue-400/30 flex items-center justify-center text-blue-600 shadow-inner">
                  <Zap className="w-6 h-6 fill-blue-500/20" />
                </div>
                {selectedMode === 'practice' && (
                  <div className="p-1 rounded-full bg-blue-600 text-white shadow-sm shadow-blue-500/40">
                    <CheckCircle2 className="w-4 h-4 fill-white text-blue-600" />
                  </div>
                )}
              </div>
              <h3 className="font-extrabold text-slate-900 text-lg mt-4">Quick Practice</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Zero-friction keyboard answering (`1`–`4`) with instant rationales and faculty slide citations.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-200/50 flex items-center gap-1.5 text-xs font-semibold text-blue-700">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Immediate Feedback</span>
              </div>
            </button>

            {/* Faculty Mock Exam Card */}
            <button
              type="button"
              onClick={() => setSelectedMode('mock')}
              className={`text-left p-6 rounded-3xl transition-all duration-300 relative cursor-pointer backdrop-blur-xl border ${
                selectedMode === 'mock'
                  ? 'bg-gradient-to-b from-indigo-500/15 via-white/80 to-white/90 border-indigo-500/40 shadow-[0_12px_36px_0_rgba(99,102,241,0.18)] ring-2 ring-indigo-500/30 -translate-y-1'
                  : 'bg-white/50 hover:bg-white/70 border-white/80 hover:border-indigo-200/60 shadow-[0_4px_20px_0_rgba(0,0,0,0.03)] hover:-translate-y-0.5'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-indigo-400/10 border border-indigo-400/30 flex items-center justify-center text-indigo-600 shadow-inner">
                  <Award className="w-6 h-6" />
                </div>
                {selectedMode === 'mock' && (
                  <div className="p-1 rounded-full bg-indigo-600 text-white shadow-sm shadow-indigo-500/40">
                    <CheckCircle2 className="w-4 h-4 fill-white text-indigo-600" />
                  </div>
                )}
              </div>
              <h3 className="font-extrabold text-slate-900 text-lg mt-4">Faculty Mock Exam</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Authentic 50-question simulation under 2-hour timed conditions with delayed score calibration.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-200/50 flex items-center gap-1.5 text-xs font-semibold text-indigo-700">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <span>50 Qs • 120 Mins • Strict</span>
              </div>
            </button>

            {/* High-Yield Sprint Card */}
            <button
              type="button"
              onClick={() => setSelectedMode('rapid')}
              className={`text-left p-6 rounded-3xl transition-all duration-300 relative cursor-pointer backdrop-blur-xl border ${
                selectedMode === 'rapid'
                  ? 'bg-gradient-to-b from-amber-500/15 via-white/80 to-white/90 border-amber-500/40 shadow-[0_12px_36px_0_rgba(245,158,11,0.18)] ring-2 ring-amber-500/30 -translate-y-1'
                  : 'bg-white/50 hover:bg-white/70 border-white/80 hover:border-amber-200/60 shadow-[0_4px_20px_0_rgba(0,0,0,0.03)] hover:-translate-y-0.5'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-600 shadow-inner">
                  <Flame className="w-6 h-6" />
                </div>
                {selectedMode === 'rapid' && (
                  <div className="p-1 rounded-full bg-amber-500 text-white shadow-sm shadow-amber-500/40">
                    <CheckCircle2 className="w-4 h-4 fill-white text-amber-500" />
                  </div>
                )}
              </div>
              <h3 className="font-extrabold text-slate-900 text-lg mt-4">High-Yield Sprint</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                15 high-frequency questions strictly derived from heavily tested curriculum exam objectives.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-200/50 flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                <Flame className="w-3.5 h-3.5 text-amber-600" />
                <span>15 Qs • 15 Mins Sprint</span>
              </div>
            </button>
          </div>
        </div>

        {/* 2. Configuration & Scope Card */}
        {selectedMode === 'mock' ? (
          <div className="p-6 md:p-8 rounded-3xl bg-white/65 backdrop-blur-xl border border-white/80 shadow-[0_8px_32px_0_rgba(31,38,135,0.06)] space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Official Exam Simulation Parameters
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Faculty Block 206 Standardized Distribution</p>
              </div>
              <span className="px-3.5 py-1 bg-indigo-500/10 border border-indigo-400/30 text-indigo-700 text-xs font-bold rounded-full backdrop-blur-md">
                Standardized Exam
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-white/50 backdrop-blur-md border border-white/80 text-center shadow-xs">
                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Volume</div>
                <div className="text-3xl font-black text-slate-900 mt-1">50 Questions</div>
                <div className="text-[11px] text-slate-500 mt-1 font-medium">Stratified across CVS subjects</div>
              </div>

              <div className="p-5 rounded-2xl bg-white/50 backdrop-blur-md border border-white/80 text-center shadow-xs">
                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Duration</div>
                <div className="text-3xl font-black text-slate-900 mt-1">120 Minutes</div>
                <div className="text-[11px] text-slate-500 mt-1 font-medium">144s per Question pacing</div>
              </div>

              <div className="p-5 rounded-2xl bg-white/50 backdrop-blur-md border border-white/80 text-center shadow-xs">
                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Scoring Mode</div>
                <div className="text-3xl font-black text-indigo-600 mt-1">Exam Mode</div>
                <div className="text-[11px] text-indigo-700 mt-1 font-medium">Full report provided upon submit</div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/95 backdrop-blur-xl text-slate-200 border border-slate-700/50 text-xs space-y-2.5 shadow-md">
              <div className="flex items-center space-x-2 text-amber-400 font-bold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                <span>Simulation Rules</span>
              </div>
              <ul className="list-disc list-inside space-y-1.5 text-slate-300">
                <li>Immediate keyboard answering (1–4) silently registers selections without revealing answers.</li>
                <li>Free question navigation matrix and flagging (Press `F`) remain active throughout.</li>
                <li>Comprehensive calibration report and curriculum revision plan appear upon submission.</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="p-6 md:p-8 rounded-3xl bg-white/65 backdrop-blur-xl border border-white/80 shadow-[0_8px_32px_0_rgba(31,38,135,0.06)] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {selectedMode === 'rapid' ? 'Sprint Scope & Focus' : '2. Scope & Target Curriculum'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Filter questions by medical discipline or specific chapter</p>
              </div>
              <div className="px-3.5 py-1.5 rounded-xl bg-blue-500/10 border border-blue-400/20 text-blue-800 text-xs font-bold flex items-center space-x-2 self-start sm:self-auto backdrop-blur-md">
                <Filter className="w-3.5 h-3.5 text-blue-600" />
                <span>Available Questions: <strong className="text-blue-900">{matchingQuestionCount}</strong></span>
              </div>
            </div>

            {/* Subject Filter Pills with Frosted Glass */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                Target Discipline
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSubject('all');
                    setSelectedChapter('all');
                  }}
                  className={`py-3 px-3.5 rounded-2xl text-xs font-bold border transition-all duration-200 flex items-center justify-between cursor-pointer backdrop-blur-md ${
                    selectedSubject === 'all'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-[0_4px_16px_0_rgba(37,99,235,0.25)]'
                      : 'bg-white/50 text-slate-700 border-white/80 hover:bg-white/80 hover:border-slate-300'
                  }`}
                >
                  <span>All Subjects</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                    selectedSubject === 'all' ? 'bg-blue-700 text-blue-100' : 'bg-slate-200/80 text-slate-700'
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
                    className={`py-3 px-3.5 rounded-2xl text-xs font-bold border transition-all duration-200 flex items-center justify-between cursor-pointer backdrop-blur-md ${
                      selectedSubject === sub.id
                        ? 'bg-blue-600 text-white border-blue-600 shadow-[0_4px_16px_0_rgba(37,99,235,0.25)]'
                        : 'bg-white/50 text-slate-700 border-white/80 hover:bg-white/80 hover:border-slate-300'
                    }`}
                  >
                    <span className="truncate pr-1">{sub.name.replace('CVS ', '')}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                      selectedSubject === sub.id ? 'bg-blue-700 text-blue-100' : 'bg-slate-200/80 text-slate-700'
                    }`}>
                      {subjectCounts[sub.id] || 0}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Chapter Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Curriculum Chapter
              </label>
              <select
                value={selectedChapter}
                onChange={(e) => setSelectedChapter(e.target.value)}
                className="w-full text-sm rounded-2xl border border-slate-200/80 bg-white/60 backdrop-blur-md py-3 px-4 focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium text-slate-800 shadow-inner"
              >
                <option value="all">
                  {selectedSubject === 'all' ? 'All Chapters across CVS' : 'All Chapters in Selected Discipline'}
                </option>
                {availableChapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Practice Parameters (Question Count & High-Yield Toggle) */}
            {selectedMode === 'practice' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Question Count
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[10, 20, 30, 50].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setQuestionCount(num)}
                        className={`py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer backdrop-blur-md ${
                          questionCount === num
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white/50 text-slate-700 border-white/80 hover:bg-white/80 hover:border-slate-300'
                        }`}
                      >
                        {num} Qs
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Session Modifiers
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setHighYieldOnly(!highYieldOnly)}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 border transition-all cursor-pointer backdrop-blur-md ${
                        highYieldOnly
                          ? 'bg-amber-500/15 border-amber-400/40 text-amber-900 shadow-xs'
                          : 'bg-white/50 border-white/80 text-slate-600 hover:bg-white/80'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>High-Yield Only</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTimedSprint(!timedSprint)}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 border transition-all cursor-pointer backdrop-blur-md ${
                        timedSprint
                          ? 'bg-blue-500/15 border-blue-400/40 text-blue-900 shadow-xs'
                          : 'bg-white/50 border-white/80 text-slate-600 hover:bg-white/80'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      <span>Timed ({Math.ceil(questionCount * 1.5)}m)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. Launchpad Action Footer Card */}
        <div className="relative p-6 sm:p-7 rounded-3xl bg-slate-900/90 backdrop-blur-2xl text-white border border-slate-700/60 shadow-[0_16px_40px_0_rgba(15,23,42,0.25)] flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-1">
            <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Ready to begin</div>
            <div className="text-xl font-black text-white flex items-center space-x-2">
              <span>
                {selectedMode === 'mock' 
                  ? '50 Questions • 120 Mins Timed Mock' 
                  : selectedMode === 'rapid' 
                  ? `${Math.min(matchingQuestionCount, 15)} High-Yield Questions • Rapid Blitz` 
                  : `${Math.min(matchingQuestionCount, questionCount)} Questions • Practice Mode`}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Zero mouse clicks required: Press <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 font-mono">1</kbd>–<kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 font-mono">4</kbd> during test to commit choices instantly
            </p>
          </div>

          <button
            onClick={handleLaunchSession}
            disabled={matchingQuestionCount === 0}
            className={`py-4 px-8 rounded-2xl text-sm font-extrabold flex items-center justify-center space-x-2.5 transition-all duration-200 cursor-pointer shadow-lg ${
              matchingQuestionCount === 0
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                : selectedMode === 'mock'
                ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-indigo-500/25'
                : selectedMode === 'rapid'
                ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black shadow-amber-500/25'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/25'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Launch Test Session</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
