import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuestionStore } from '../../../application/stores/useQuestionStore.ts';
import { useStatsStore } from '../../../application/stores/useStatsStore.ts';
import { 
  Play, 
  RotateCcw, 
  ArrowRight, 
  Sparkles,
  AlertTriangle
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { questions } = useQuestionStore();
  const { 
    totalAttempts, 
    overallAccuracy, 
    masteryPercentage, 
    weakTopicsCount, 
    dueReviewsCount,
    refreshStats,
    resetStats
  } = useStatsStore();

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    refreshStats(questions);
  }, [questions, refreshStats]);

  const handleResetConfirm = async () => {
    setResetting(true);
    await resetStats(questions);
    setResetting(false);
    setShowResetConfirm(false);
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Top Section: Exam Preparation Overview */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                Exam Preparation
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-semibold text-emerald-600">Local-First Storage (IndexedDB)</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">CVS Block Mastery</h1>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowResetConfirm(true)}
              className="py-2.5 px-3.5 bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-600 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
              title="Reset all test attempts and mastery statistics"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Stats</span>
            </button>
            <button
              onClick={() => navigate('/test/quick')}
              className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold flex items-center space-x-2 shadow-xs transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{totalAttempts > 0 ? 'Continue Studying' : 'Start Practice'}</span>
            </button>
            <button
              onClick={() => navigate('/test/mock')}
              className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-all cursor-pointer"
            >
              Start Exam (2h)
            </button>
          </div>
        </div>

        {/* 5 Key Metric Cards (Grounded in Real IndexedDB Stats) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-2 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-xl">
            <div className="text-xs text-slate-500 font-medium">Overall Mastery</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">
              {masteryPercentage}%
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-1">
              {totalAttempts > 0 ? `${masteryPercentage}% of bank mastered` : 'No attempts yet'}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl">
            <div className="text-xs text-slate-500 font-medium">Active Bank</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">
              {questions.length} <span className="text-xs font-normal text-slate-500">questions</span>
            </div>
            <div className="text-[11px] text-blue-600 font-semibold mt-1">
              <span onClick={() => navigate('/studio')} className="cursor-pointer hover:underline">
                Manage in Studio
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl">
            <div className="text-xs text-slate-500 font-medium">Accuracy</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">
              {totalAttempts > 0 ? `${overallAccuracy}%` : '—'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {totalAttempts > 0 ? `${totalAttempts} attempts recorded` : '0 attempts'}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl">
            <div className="text-xs text-slate-500 font-medium">Weak Areas</div>
            <div className={`text-xl font-bold mt-0.5 ${weakTopicsCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {weakTopicsCount} <span className="text-xs font-normal text-slate-500">topics</span>
            </div>
            <div className="text-[11px] text-amber-700 font-semibold mt-1">
              {weakTopicsCount > 0 ? 'Needs practice' : totalAttempts > 0 ? 'Looking strong' : 'Drill to reveal'}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl">
            <div className="text-xs text-slate-500 font-medium">Due Reviews</div>
            <div className="text-xl font-bold text-purple-600 mt-0.5">
              {dueReviewsCount} <span className="text-xs font-normal text-slate-500">cards</span>
            </div>
            <div className="text-[11px] text-purple-700 font-semibold mt-1">Spaced Repetition</div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Resetting Stats */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Reset All Test Statistics?</h3>
              <p className="text-sm text-slate-500 mt-1">
                This will delete all test attempts, accuracy logs, and spaced repetition cards from your browser's IndexedDB. Your 106-question bank will remain intact.
              </p>
            </div>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                disabled={resetting}
                className="py-2 px-4 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleResetConfirm}
                disabled={resetting}
                className="py-2 px-4 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer flex items-center space-x-2"
              >
                {resetting ? <span>Resetting...</span> : <span>Yes, Reset to 0%</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Middle Section: "WHAT SHOULD I DO NOW?" - One Primary Action */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-white/10 to-transparent pointer-events-none" />

        <div className="max-w-2xl space-y-4 relative z-10">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-bold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Recommended Next Action</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {totalAttempts === 0
              ? 'Start Your 15-Question Baseline Practice Drill'
              : weakTopicsCount > 0
              ? 'Target Your Identified Weak Topics'
              : 'Take a Timed 50-Question CVS Mock Examination'}
          </h2>

          <p className="text-sm text-blue-100 leading-relaxed">
            {totalAttempts === 0
              ? 'Your stats are clean. Complete a quick 15-question practice set with spatial keys (1–4) to calibrate your topic mastery.'
              : `You have completed ${totalAttempts} total attempts with an overall accuracy of ${overallAccuracy}%. Continue drilling to maintain exam readiness.`}
          </p>

          <div className="pt-2">
            <button
              onClick={() => navigate(totalAttempts === 0 ? '/test/quick' : '/test/quick')}
              className="py-3 px-6 bg-white text-blue-700 hover:bg-blue-50 font-bold rounded-xl text-sm flex items-center space-x-2 shadow-sm transition-all cursor-pointer"
            >
              <span>{totalAttempts === 0 ? 'Start Diagnostic Practice' : 'Continue Practice'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Section: Exam Readiness Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">CVS Anatomy & Embryology</h3>
            <span className="text-xs font-mono text-slate-400">3 Chapters</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Heart chambers, valves, coronaries, pericardium, cardiac looping, atrial & ventricular septation.
          </p>
          <div className="pt-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">58 Questions</span>
            <button
              onClick={() => navigate('/test/quick')}
              className="text-blue-600 font-bold hover:underline cursor-pointer"
            >
              Practice Chapter →
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">CVS Histology</h3>
            <span className="text-xs font-mono text-slate-400">2 Chapters</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Heart wall layers, intercalated discs, Purkinje fibers, elastic/muscular arteries, and capillary beds.
          </p>
          <div className="pt-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">26 Questions</span>
            <button
              onClick={() => navigate('/test/quick')}
              className="text-blue-600 font-bold hover:underline cursor-pointer"
            >
              Practice Chapter →
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">CVS Microbiology</h3>
            <span className="text-xs font-mono text-slate-400">3 Chapters</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Rheumatic fever (JONES criteria & M protein mimicry), infective endocarditis, and viral myocarditis.
          </p>
          <div className="pt-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">24 Questions</span>
            <button
              onClick={() => navigate('/test/quick')}
              className="text-blue-600 font-bold hover:underline cursor-pointer"
            >
              Practice Chapter →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
