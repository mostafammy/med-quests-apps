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
  ShieldCheck
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
        timeLimitMinutes: timedSprint ? Math.ceil((questionCount * 1.5)) : undefined,
      },
    });
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-8 animate-in fade-in duration-200">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center space-x-2 text-blue-600 font-semibold text-xs uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4" />
            <span>Cardiovascular Block 206 Exam Engine</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Test & Examination Hub</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-xl">
            Configure focused micro-practice or full faculty exam simulations backed by official curriculum sources.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{questions.length} Questions Verified</span>
          </div>
        </div>
      </div>

      {/* Mode Selection Cards */}
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          1. Select Testing Paradigm
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Quick Practice Mode */}
          <button
            type="button"
            onClick={() => setSelectedMode('practice')}
            className={`text-left p-5 rounded-2xl border-2 transition-all relative cursor-pointer ${
              selectedMode === 'practice'
                ? 'border-blue-600 bg-blue-50/40 shadow-sm ring-1 ring-blue-500/20'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
            }`}
          >
            {selectedMode === 'practice' && (
              <span className="absolute top-4 right-4 text-blue-600">
                <CheckCircle2 className="w-5 h-5 fill-blue-600 text-white" />
              </span>
            )}
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Quick Practice</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Immediate answer feedback, comprehensive rationale cards, and instant faculty page citations.
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-blue-700">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Zero-friction keyboard entry (1–4)</span>
            </div>
          </button>

          {/* Full Mock Exam */}
          <button
            type="button"
            onClick={() => setSelectedMode('mock')}
            className={`text-left p-5 rounded-2xl border-2 transition-all relative cursor-pointer ${
              selectedMode === 'mock'
                ? 'border-indigo-600 bg-indigo-50/40 shadow-sm ring-1 ring-indigo-500/20'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
            }`}
          >
            {selectedMode === 'mock' && (
              <span className="absolute top-4 right-4 text-indigo-600">
                <CheckCircle2 className="w-5 h-5 fill-indigo-600 text-white" />
              </span>
            )}
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Faculty Mock Exam</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Standardized 50-question simulation under authentic 2-hour timed conditions.
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-indigo-700">
              <Clock className="w-3.5 h-3.5" />
              <span>50 Qs • 120 Mins • Blind scoring</span>
            </div>
          </button>

          {/* High-Yield Sprint */}
          <button
            type="button"
            onClick={() => setSelectedMode('rapid')}
            className={`text-left p-5 rounded-2xl border-2 transition-all relative cursor-pointer ${
              selectedMode === 'rapid'
                ? 'border-amber-500 bg-amber-50/40 shadow-sm ring-1 ring-amber-500/20'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
            }`}
          >
            {selectedMode === 'rapid' && (
              <span className="absolute top-4 right-4 text-amber-600">
                <CheckCircle2 className="w-5 h-5 fill-amber-500 text-white" />
              </span>
            )}
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
              <Flame className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">High-Yield Sprint</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              15 high-impact questions curated from heavily examined faculty concepts in a rapid blitz.
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-amber-700">
              <Sparkles className="w-3.5 h-3.5" />
              <span>15 Qs • 15 Mins • High-yield only</span>
            </div>
          </button>
        </div>
      </div>

      {/* Mode Details & Configuration Section */}
      {selectedMode === 'mock' ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Faculty 2-Hour Examination Specifications</h2>
              <p className="text-xs text-slate-500">Official Block 206 exam blueprint distribution</p>
            </div>
            <span className="px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-full">
              Standardized Exam
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <div className="text-xs text-slate-500 uppercase font-semibold">Structure</div>
              <div className="text-2xl font-black text-slate-900 mt-1">50 Questions</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Stratified across CVS subjects</div>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <div className="text-xs text-slate-500 uppercase font-semibold">Time Allocation</div>
              <div className="text-2xl font-black text-slate-900 mt-1">120 Minutes</div>
              <div className="text-[11px] text-slate-500 mt-0.5">144s per Question pacing</div>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <div className="text-xs text-slate-500 uppercase font-semibold">Feedback Mode</div>
              <div className="text-2xl font-black text-indigo-600 mt-1">Exam Conditions</div>
              <div className="text-[11px] text-indigo-700 mt-0.5">Explanations deferred to report</div>
            </div>
          </div>

          <div className="p-4 bg-slate-900 text-slate-200 rounded-xl text-xs space-y-2">
            <div className="flex items-center space-x-2 text-amber-400 font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Standardized Exam Rules</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li>Immediate keyboard answering (1–4) silently registers selections without revealing answers.</li>
              <li>Free question navigation matrix and flagging (Press `F`) remain active throughout.</li>
              <li>Detailed post-exam calibration report and faculty revision plan render upon completion.</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {selectedMode === 'rapid' ? 'High-Yield Sprint Scope' : '2. Scope & Target Curriculum'}
              </h2>
              <p className="text-xs text-slate-500">Filter question pool by subject discipline or exact chapter</p>
            </div>
            <div className="text-xs font-semibold text-slate-600 flex items-center space-x-1.5">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              <span>Available Pool: <strong className="text-slate-900">{matchingQuestionCount}</strong> Qs</span>
            </div>
          </div>

          {/* Subject Pills */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
              Subject Filter
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedSubject('all');
                  setSelectedChapter('all');
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-between cursor-pointer ${
                  selectedSubject === 'all'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>All Subjects</span>
                <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                  selectedSubject === 'all' ? 'bg-blue-700 text-blue-100' : 'bg-slate-200 text-slate-600'
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
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-between cursor-pointer ${
                    selectedSubject === sub.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="truncate pr-1">{sub.name.replace('CVS ', '')}</span>
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                    selectedSubject === sub.id ? 'bg-blue-700 text-blue-100' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {subjectCounts[sub.id] || 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Chapter Selector Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Target Chapter
            </label>
            <select
              value={selectedChapter}
              onChange={(e) => setSelectedChapter(e.target.value)}
              className="w-full text-sm rounded-xl border border-slate-300 py-3 px-3.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-slate-50 font-medium text-slate-800"
            >
              <option value="all">
                {selectedSubject === 'all' ? 'All Chapters across CVS' : 'All Chapters in Selected Subject'}
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
                  Question Volume
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[10, 20, 30, 50].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setQuestionCount(num)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        questionCount === num
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {num} Qs
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Modifiers & Timers
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setHighYieldOnly(!highYieldOnly)}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 border transition-all cursor-pointer ${
                      highYieldOnly
                        ? 'bg-amber-50 border-amber-300 text-amber-900'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>High-Yield Only</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTimedSprint(!timedSprint)}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 border transition-all cursor-pointer ${
                      timedSprint
                        ? 'bg-blue-50 border-blue-300 text-blue-900'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
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

      {/* Start Button & Session Metadata Footer */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Ready to test</div>
          <div className="text-lg font-bold text-white mt-0.5 flex items-center space-x-2">
            <span>
              {selectedMode === 'mock' 
                ? '50 Questions • 120 Mins Timed Mock' 
                : selectedMode === 'rapid' 
                ? `${Math.min(matchingQuestionCount, 15)} High-Yield Questions • Rapid Blitz` 
                : `${Math.min(matchingQuestionCount, questionCount)} Questions • Practice Mode`}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Press <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 font-mono">1</kbd>–<kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 font-mono">4</kbd> during test to answer instantly without mouse clicks
          </p>
        </div>

        <button
          onClick={handleLaunchSession}
          disabled={matchingQuestionCount === 0}
          className={`py-3.5 px-8 rounded-xl text-sm font-extrabold flex items-center justify-center space-x-2.5 shadow-md transition-all cursor-pointer ${
            matchingQuestionCount === 0
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : selectedMode === 'mock'
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
              : selectedMode === 'rapid'
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Launch Session</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
