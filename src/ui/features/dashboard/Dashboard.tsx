import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuestionStore } from '../../../application/stores/useQuestionStore.ts';
import { 
  Play, 
  AlertTriangle, 
  ArrowRight, 
  Sparkles
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { questions } = useQuestionStore();

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
              <span className="text-xs font-medium text-slate-500">Target Date: Not Set</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">CVS Block Mastery</h1>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigate('/test/quick')}
              className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold flex items-center space-x-2 shadow-xs transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Continue Studying</span>
            </button>
            <button
              onClick={() => navigate('/test/mock')}
              className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-all"
            >
              Start Exam (2h)
            </button>
          </div>
        </div>

        {/* 5 Key Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-2 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-xl">
            <div className="text-xs text-slate-500 font-medium">Overall Mastery</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">
              {questions.length > 0 ? '78%' : '0%'}
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-1">Ready to drill</div>
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
            <div className="text-xl font-bold text-slate-900 mt-0.5">81%</div>
            <div className="text-[11px] text-slate-500 mt-1">Last 50 attempts</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl">
            <div className="text-xs text-slate-500 font-medium">Weak Areas</div>
            <div className="text-xl font-bold text-amber-600 mt-0.5">2 topics</div>
            <div className="text-[11px] text-amber-700 font-semibold mt-1">Needs practice</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl">
            <div className="text-xs text-slate-500 font-medium">Due Reviews</div>
            <div className="text-xl font-bold text-purple-600 mt-0.5">7 cards</div>
            <div className="text-[11px] text-purple-700 font-semibold mt-1">Spaced Repetition</div>
          </div>
        </div>
      </div>

      {/* Middle Section: "WHAT SHOULD I DO NOW?" - One Primary Action */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-white/10 to-transparent pointer-events-none" />

        <div className="max-w-2xl space-y-4 relative z-10">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-bold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Recommended Next Action</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            15-Question Cardiac Embryology & Septation Review
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-blue-100">
            <div className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              <span>Lowest-performing topic (54% mastery)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              <span>3 repeated mistakes identified</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>5 questions due for spaced review</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>High exam relevance (CVS Block Exam)</span>
            </div>
          </div>

          <div className="pt-2 flex items-center space-x-4">
            <button
              onClick={() => navigate('/test/quick')}
              className="py-3 px-6 bg-white hover:bg-slate-50 text-blue-700 rounded-xl font-bold text-sm shadow-sm flex items-center space-x-2 transition-all"
            >
              <span>Start Review Session</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <span className="text-xs text-blue-200">Press <strong>Enter ⏎</strong> to start</span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Exam Readiness Report */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Exam Readiness Score</h3>
            <p className="text-xs text-slate-500">Calculated from knowledge stability, response timing, and error calibration.</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-3xl font-extrabold text-blue-600">78%</span>
            <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-md">Passing Track</span>
          </div>
        </div>

        {/* Breakdown bars */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Knowledge', score: 82, color: 'bg-blue-600' },
            { label: 'Consistency', score: 74, color: 'bg-indigo-600' },
            { label: 'High-Yield', score: 89, color: 'bg-emerald-600' },
            { label: 'Weak Areas', score: 68, color: 'bg-amber-500' },
            { label: 'Recent Accuracy', score: 81, color: 'bg-blue-500' },
            { label: 'Timing (Target <60s)', score: 76, color: 'bg-slate-700' },
          ].map((item) => (
            <div key={item.label} className="p-3 bg-slate-50 rounded-xl space-y-2">
              <div className="flex justify-between text-xs font-medium text-slate-600">
                <span>{item.label}</span>
                <span className="font-bold text-slate-900">{item.score}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.score}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Blockers: What is holding you back? */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="font-semibold text-slate-700">What is holding you back?</span>
            <span className="text-slate-500">1. Atrial Septation • 2. Blood Vessel Histology • 3. 7 Overdue Reviews</span>
          </div>
          <button
            onClick={() => navigate('/review')}
            className="text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center space-x-1"
          >
            <span>Open Exam Review Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
