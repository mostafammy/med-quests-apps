import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuestionStore } from '../../../application/stores/useQuestionStore.ts';
import { useStatsStore } from '../../../application/stores/useStatsStore.ts';
import { 
  Play, 
  RotateCcw, 
  ArrowRight, 
  Sparkles,
  AlertTriangle,
  Award,
  BookOpen,
  Zap,
  Clock
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
    <div className="relative min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-300">
      {/* Top Banner: Glassmorphic Hub Card */}
      <div className="p-6 md:p-8 rounded-3xl bg-white/65 dark:bg-zinc-900/65 backdrop-blur-xl border border-white/80 dark:border-zinc-800/80 shadow-[0_8px_32px_0_rgba(31,38,135,0.06)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] space-y-6 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700 dark:text-blue-300 bg-blue-500/10 dark:bg-blue-400/10 px-2.5 py-0.5 rounded-full border border-blue-400/20 backdrop-blur-md">
                Exam Preparation
              </span>
              <span className="text-xs text-slate-300 dark:text-zinc-600">•</span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Local-First IndexedDB Engine</span>
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 dark:from-zinc-100 dark:via-zinc-200 dark:to-blue-200 bg-clip-text text-transparent">
              CVS Block Mastery
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 max-w-xl leading-relaxed">
              Real-time calibration across Anatomy, Histology, and Microbiology faculty documents.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowResetConfirm(true)}
              className="py-2.5 px-3.5 bg-white/50 dark:bg-zinc-800/50 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 text-slate-600 dark:text-zinc-400 rounded-2xl text-xs font-bold flex items-center space-x-1.5 border border-white/80 dark:border-zinc-700/80 backdrop-blur-md shadow-xs transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
              title="Reset all test attempts and mastery statistics"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Stats</span>
            </button>
            <button
              onClick={() => navigate('/test/quick')}
              className="py-2.5 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-xs sm:text-sm font-bold flex items-center space-x-2 shadow-md shadow-blue-500/20 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{totalAttempts > 0 ? 'Continue Practice' : 'Start Practice'}</span>
            </button>
            <button
              onClick={() => navigate('/test/mock')}
              className="py-2.5 px-5 bg-slate-900/90 dark:bg-zinc-800/90 hover:bg-slate-800 dark:hover:bg-zinc-700 text-white rounded-2xl text-xs sm:text-sm font-bold border border-slate-700/60 dark:border-zinc-700 backdrop-blur-md shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer flex items-center space-x-2"
            >
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Start Exam (2h)</span>
            </button>
          </div>
        </div>

        {/* 5 Key Metric Cards (Grounded in Real IndexedDB Stats) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 pt-4 border-t border-slate-200/60 dark:border-zinc-800/60">
          <div className="p-4 rounded-2xl bg-white/50 dark:bg-zinc-800/40 backdrop-blur-md border border-white/80 dark:border-zinc-700/60 shadow-xs transition-all duration-200 hover:-translate-y-0.5">
            <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider">Overall Mastery</div>
            <div className="text-2xl font-black text-slate-900 dark:text-zinc-50 mt-1">
              {masteryPercentage}%
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
              {totalAttempts > 0 ? `${masteryPercentage}% mastered` : 'No attempts yet'}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/50 dark:bg-zinc-800/40 backdrop-blur-md border border-white/80 dark:border-zinc-700/60 shadow-xs transition-all duration-200 hover:-translate-y-0.5">
            <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider">Active Bank</div>
            <div className="text-2xl font-black text-slate-900 dark:text-zinc-50 mt-1">
              {questions.length} <span className="text-xs font-normal text-slate-400">Qs</span>
            </div>
            <div className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold mt-1">
              <span onClick={() => navigate('/studio')} className="cursor-pointer hover:underline">
                Manage in Studio →
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/50 dark:bg-zinc-800/40 backdrop-blur-md border border-white/80 dark:border-zinc-700/60 shadow-xs transition-all duration-200 hover:-translate-y-0.5">
            <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider">Attempts Logged</div>
            <div className="text-2xl font-black text-slate-900 dark:text-zinc-50 mt-1">
              {totalAttempts}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-semibold mt-1">
              {totalAttempts > 0 ? `${overallAccuracy}% accuracy` : 'Awaiting 1st attempt'}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/50 dark:bg-zinc-800/40 backdrop-blur-md border border-white/80 dark:border-zinc-700/60 shadow-xs transition-all duration-200 hover:-translate-y-0.5">
            <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider">Weak Areas</div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
              {weakTopicsCount}
            </div>
            <div className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-1">
              <span onClick={() => navigate('/review')} className="cursor-pointer hover:underline">
                {weakTopicsCount > 0 ? 'Remediate now →' : 'No weak areas'}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/50 dark:bg-zinc-800/40 backdrop-blur-md border border-white/80 dark:border-zinc-700/60 shadow-xs col-span-2 sm:col-span-1 transition-all duration-200 hover:-translate-y-0.5">
            <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider">Due Reviews</div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {dueReviewsCount}
            </div>
            <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-1">
              <span onClick={() => navigate('/review')} className="cursor-pointer hover:underline">
                Spaced repetition →
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Launchers & Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Mode Action Launchpads */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 px-1">
            Study Modes & Launchers
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Quick Practice Card */}
            <div 
              onClick={() => navigate('/test/quick')}
              className="p-6 rounded-3xl bg-white/60 dark:bg-zinc-900/60 hover:bg-white/80 dark:hover:bg-zinc-900/80 backdrop-blur-xl border border-white/80 dark:border-zinc-800/80 shadow-[0_4px_24px_0_rgba(0,0,0,0.03)] dark:shadow-[0_4px_24px_0_rgba(0,0,0,0.3)] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer group space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500/20 to-blue-400/10 border border-blue-400/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-inner group-hover:scale-105 transition-all">
                <Zap className="w-6 h-6 fill-blue-500/20" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-zinc-100 text-lg flex items-center justify-between">
                  <span>Quick Practice</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 leading-relaxed">
                  Zero-friction keyboard answering (`1`–`4`) with immediate explanation and lecture slide citation.
                </p>
              </div>
              <div className="flex items-center space-x-2 text-[11px] font-bold text-blue-600 dark:text-blue-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Instant Feedback • No setup screens</span>
              </div>
            </div>

            {/* Mock Exam Card */}
            <div 
              onClick={() => navigate('/test/mock')}
              className="p-6 rounded-3xl bg-white/60 dark:bg-zinc-900/60 hover:bg-white/80 dark:hover:bg-zinc-900/80 backdrop-blur-xl border border-white/80 dark:border-zinc-800/80 shadow-[0_4px_24px_0_rgba(0,0,0,0.03)] dark:shadow-[0_4px_24px_0_rgba(0,0,0,0.3)] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer group space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-indigo-400/10 border border-indigo-400/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner group-hover:scale-105 transition-all">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-zinc-100 text-lg flex items-center justify-between">
                  <span>Faculty Mock Exam</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 leading-relaxed">
                  Standardized 50-question / 120-minute simulation with blind scoring matching university conditions.
                </p>
              </div>
              <div className="flex items-center space-x-2 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                <Clock className="w-3.5 h-3.5" />
                <span>50 Qs • 2 Hours • Score calibration</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Curriculum & Spaced Repetition Summary */}
        <div className="space-y-4">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 px-1">
            Curriculum Grounding
          </h2>

          <div className="p-6 rounded-3xl bg-white/65 dark:bg-zinc-900/65 backdrop-blur-xl border border-white/80 dark:border-zinc-800/80 shadow-[0_8px_32px_0_rgba(31,38,135,0.06)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-sm">Faculty Handouts</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">6 Authoritative Documents</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
              Every question in Med Quests is derived from official university lecture handouts and slide decks with verbatim citations.
            </p>

            <button
              onClick={() => navigate('/curriculum')}
              className="w-full py-2.5 px-4 rounded-2xl bg-white/60 dark:bg-zinc-800/60 hover:bg-white/80 dark:hover:bg-zinc-800 border border-white/80 dark:border-zinc-700/80 text-xs font-bold text-slate-800 dark:text-zinc-200 transition-all duration-200 hover:-translate-y-0.5 flex items-center justify-between cursor-pointer"
            >
              <span>Explore Curriculum Library</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Resetting Stats */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl rounded-3xl max-w-md w-full p-6 border border-white/80 dark:border-zinc-800 shadow-2xl space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-50">Reset Study Statistics?</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                This will delete all test attempts and calibration statistics from IndexedDB. Your 106-question bank remains untouched.
              </p>
            </div>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="py-2 px-4 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleResetConfirm}
                disabled={resetting}
                className="py-2 px-4 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer"
              >
                {resetting ? 'Resetting...' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
