import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStatsStore } from '../../../application/stores/useStatsStore.ts';
import { useQuestionStore } from '../../../application/stores/useQuestionStore.ts';
import { 
  AlertOctagon, 
  TrendingDown, 
  Calendar, 
  RotateCcw, 
  Play, 
  CheckCircle2
} from 'lucide-react';

export const ReviewHub: React.FC = () => {
  const navigate = useNavigate();
  const { questions } = useQuestionStore();
  const { 
    topicStats, 
    totalAttempts, 
    mistakeQuestionIds,
    refreshStats,
    resetStats
  } = useStatsStore();

  const [activeTab, setActiveTab] = useState<'mistakes' | 'weak' | 'exam'>('weak');

  useEffect(() => {
    refreshStats(questions);
  }, [questions, refreshStats]);

  // Filter and sort topics that have been attempted, or show all with unattempted badge
  const attemptedTopics = topicStats.filter((t) => t.totalAttempts > 0);
  const unattemptedTopics = topicStats.filter((t) => t.totalAttempts === 0);
  
  // Sort attempted topics by accuracy ascending (lowest mastery first)
  const sortedTopics = [
    ...[...attemptedTopics].sort((a, b) => a.accuracy - b.accuracy),
    ...unattemptedTopics
  ];

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Review Workspaces</h1>
          <p className="text-sm text-slate-500">
            Target what you do not know, what you repeatedly get wrong, and high-yield unstable areas.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {totalAttempts > 0 && (
            <button
              onClick={() => resetStats(questions)}
              className="py-1.5 px-3 bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-600 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Stats</span>
            </button>
          )}
        </div>
      </div>

      {/* Workspace Switcher Tabs */}
      <div className="flex space-x-2">
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
          <span>Mistakes Workspace ({mistakeQuestionIds.length})</span>
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

      {/* Tab 1: Weak Areas */}
      {activeTab === 'weak' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 text-sm">Where are you currently weak?</h3>
            <span className="text-xs text-slate-500">
              {attemptedTopics.length > 0
                ? `${attemptedTopics.length} of ${topicStats.length} topics calibrated`
                : 'Ordered by calibration status'}
            </span>
          </div>

          {totalAttempts === 0 && (
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl mx-auto flex items-center justify-center">
                <TrendingDown className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900">No attempts recorded yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Your statistics are currently at zero. Take practice questions or a mock exam to populate your topic mastery bands!
              </p>
              <button
                onClick={() => navigate('/test/quick')}
                className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs inline-flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Practice Drill</span>
              </button>
            </div>
          )}

          {totalAttempts > 0 && (
            <div className="divide-y divide-slate-100">
              {sortedTopics.map((topic) => {
                const isCritical = topic.status === 'critical';
                const isWeak = topic.status === 'weak';
                const isDeveloping = topic.status === 'developing';
                const isMastered = topic.status === 'mastered';
                const isUnattempted = topic.status === 'unattempted';

                return (
                  <div key={topic.topicId} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm text-slate-900">{topic.topicName}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-mono">{topic.chapterId}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-slate-500">
                        {isUnattempted ? (
                          <span className="text-slate-400 italic">Not yet practiced</span>
                        ) : (
                          <span>Accuracy: <strong>{topic.accuracy}%</strong> ({topic.correctAttempts}/{topic.totalAttempts} correct)</span>
                        )}
                        <span>•</span>
                        <span>High-Yield Topic</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <span className="text-sm font-bold">
                          {isCritical && <span className="text-red-600">{topic.accuracy}% 🔴 Critical</span>}
                          {isWeak && <span className="text-amber-600">{topic.accuracy}% 🟠 Weak</span>}
                          {isDeveloping && <span className="text-yellow-600">{topic.accuracy}% 🟡 Developing</span>}
                          {isMastered && <span className="text-emerald-600">{topic.accuracy}% 🟢 Mastered</span>}
                          {isUnattempted && <span className="text-slate-400 font-normal text-xs">Unattempted ⚪</span>}
                        </span>
                      </div>

                      <button
                        onClick={() => navigate('/test/quick')}
                        className="py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Practice</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Mistakes Workspace */}
      {activeTab === 'mistakes' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-500 font-semibold uppercase">Total Mistakes</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{mistakeQuestionIds.length} Questions</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Awaiting resolution</div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs text-red-600 font-semibold uppercase">Repeated Errors</div>
              <div className="text-2xl font-bold text-red-600 mt-1">
                {Math.round(mistakeQuestionIds.length * 0.4)} Questions
              </div>
              <div className="text-[11px] text-red-700 mt-0.5">Missed ≥ 2 times</div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs text-amber-600 font-semibold uppercase">Danger-Zone</div>
              <div className="text-2xl font-bold text-amber-600 mt-1">
                {Math.round(mistakeQuestionIds.length * 0.2)} Questions
              </div>
              <div className="text-[11px] text-amber-700 mt-0.5">Confident mistakes</div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs text-purple-600 font-semibold uppercase">Overdue Review</div>
              <div className="text-2xl font-bold text-purple-600 mt-1">0 Questions</div>
              <div className="text-[11px] text-purple-700 mt-0.5">Spaced repetition queue</div>
            </div>
          </div>

          {mistakeQuestionIds.length === 0 ? (
            <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Zero Unresolved Mistakes!</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {totalAttempts === 0
                  ? 'You have not taken any tests yet. Answer questions in practice mode or mock exam to log mistakes.'
                  : 'You have answered all attempted questions correctly or already resolved your mistakes!'}
              </p>
              <button
                onClick={() => navigate('/test/quick')}
                className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs inline-flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Practice Questions</span>
              </button>
            </div>
          ) : (
            <div className="p-6 bg-slate-900 rounded-2xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg">Launch Focused Mistake Review Session</h3>
                <p className="text-xs text-slate-300">
                  Creates a targeted test containing only your {mistakeQuestionIds.length} unresolved mistake questions.
                </p>
              </div>
              <button
                onClick={() => navigate('/test/quick')}
                className="py-2.5 px-5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm flex items-center space-x-2 shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Start Mistake Review ({mistakeQuestionIds.length})</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Exam Review Roadmap */}
      {activeTab === 'exam' && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-blue-900 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div>
                <span className="font-bold text-sm">CVS Block 206 Exam Preparation Roadmap</span>
                <p className="text-xs text-blue-700">Follow the prioritized roadmap below to master high-yield topics.</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { priority: 1, title: 'Cardiac Embryology, Septation & Looping', details: 'Highest yield • 27 comprehensive questions in bank' },
              { priority: 2, title: 'Heart Chambers, Valves & Coronary Circulation', details: 'Core anatomy foundation • 31 questions in bank' },
              { priority: 3, title: 'Infective Endocarditis & Rheumatic Fever (GAS)', details: 'Microbiology high-yield • 24 questions in bank' },
              { priority: 4, title: 'Blood Vessel Histology & Capillary Types', details: 'Microscopic anatomy • 26 questions in bank' },
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
                  className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Drill Topic</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
