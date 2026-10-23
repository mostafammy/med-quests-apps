import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CVS_TAXONOMY } from '../../../domain/taxonomy/cvsTaxonomy.ts';
import { 
  AlertOctagon, 
  TrendingDown, 
  Calendar, 
  RotateCcw, 
  Play, 
  ArrowRight
} from 'lucide-react';

export const ReviewHub: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'mistakes' | 'weak' | 'exam'>('weak');

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Review Workspaces</h1>
        <p className="text-sm text-slate-500">
          Target what you do not know, what you repeatedly get wrong, and high-yield unstable areas.
        </p>

        {/* Workspace Switcher Tabs */}
        <div className="flex space-x-2 pt-4">
          <button
            onClick={() => setActiveTab('weak')}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'weak'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Weak Areas</span>
          </button>

          <button
            onClick={() => setActiveTab('mistakes')}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'mistakes'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Mistakes Workspace</span>
          </button>

          <button
            onClick={() => setActiveTab('exam')}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'exam'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Exam Review Roadmap</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Weak Areas */}
      {activeTab === 'weak' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 text-sm">Where are you currently weak?</h3>
            <span className="text-xs text-slate-500">Ordered by Mastery %</span>
          </div>

          <div className="divide-y divide-slate-100">
            {CVS_TAXONOMY.topics.slice(0, 10).map((topic, index) => {
              // Synthetic mastery band demonstration
              const sampleMastery = [54, 58, 64, 71, 74, 82, 86, 89, 92, 95][index] || 75;
              const isCritical = sampleMastery < 60;
              const isWeak = sampleMastery >= 60 && sampleMastery < 70;
              const isDeveloping = sampleMastery >= 70 && sampleMastery < 85;

              return (
                <div key={topic.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm text-slate-900">{topic.name}</span>
                      <span className="text-[10px] text-slate-400 uppercase font-mono">{topic.chapterId}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-slate-500">
                      <span>Accuracy: {sampleMastery}%</span>
                      <span>•</span>
                      <span>High-Yield Topic</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <span className="text-sm font-bold">
                        {isCritical && <span className="text-red-600">{sampleMastery}% 🔴</span>}
                        {isWeak && <span className="text-amber-600">{sampleMastery}% 🟠</span>}
                        {isDeveloping && <span className="text-yellow-600">{sampleMastery}% 🟡</span>}
                        {!isCritical && !isWeak && !isDeveloping && <span className="text-emerald-600">{sampleMastery}% 🟢</span>}
                      </span>
                    </div>

                    <button
                      onClick={() => navigate('/test/quick')}
                      className="py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Practice</span>
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-500 font-semibold uppercase">Total Mistakes</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">32 Questions</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Awaiting resolution</div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs text-red-600 font-semibold uppercase">Repeated Errors</div>
              <div className="text-2xl font-bold text-red-600 mt-1">12 Questions</div>
              <div className="text-[11px] text-red-700 mt-0.5">Missed ≥ 2 times</div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs text-amber-600 font-semibold uppercase">Danger-Zone</div>
              <div className="text-2xl font-bold text-amber-600 mt-1">7 Questions</div>
              <div className="text-[11px] text-amber-700 mt-0.5">Confident mistakes (sure)</div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs text-purple-600 font-semibold uppercase">Overdue Review</div>
              <div className="text-2xl font-bold text-purple-600 mt-1">4 Questions</div>
              <div className="text-[11px] text-purple-700 mt-0.5">SM-2 interval expired</div>
            </div>
          </div>

          <div className="p-6 bg-slate-900 rounded-2xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-lg">Launch Focused Mistake Review Session</h3>
              <p className="text-xs text-slate-300">Creates a targeted test containing only your 32 unresolved mistake questions.</p>
            </div>
            <button
              onClick={() => navigate('/test/quick')}
              className="py-2.5 px-5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm flex items-center space-x-2 shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Start Mistake Review</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Exam Review Roadmap */}
      {activeTab === 'exam' && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-blue-900 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div>
                <span className="font-bold text-sm">3 Days Until Your CVS Block 206 Exam</span>
                <p className="text-xs text-blue-700">Follow the prioritized roadmap below to close unstable knowledge gaps.</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { priority: 1, title: 'Renal & Cardiac Embryology', details: '4 repeated errors • 2 danger-zone questions' },
              { priority: 2, title: 'Atrial Septation & Heart Defects', details: '3 unstable concepts • 5 due questions' },
              { priority: 3, title: 'Coronary Arteries & Blood Supply', details: '7 due questions • High exam weight' },
            ].map((p) => (
              <div key={p.priority} className="p-5 bg-white rounded-2xl border border-slate-200 flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                    Priority {p.priority}
                  </span>
                  <h4 className="font-bold text-slate-900 text-base mt-1">{p.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{p.details}</p>
                </div>
                <button
                  onClick={() => navigate('/test/quick')}
                  className="py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
                >
                  <span>Start Review</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
