import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CVS_TAXONOMY } from '../../../domain/taxonomy/cvsTaxonomy.ts';
import { useQuestionStore } from '../../../application/stores/useQuestionStore.ts';
import { Play, Sparkles, CheckCircle2 } from 'lucide-react';

export const QuickPractice: React.FC = () => {
  const navigate = useNavigate();
  const { questions } = useQuestionStore();

  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedChapter, setSelectedChapter] = useState<string>('all');
  const [questionCount, setQuestionCount] = useState<number>(20);
  const [highYieldOnly, setHighYieldOnly] = useState<boolean>(true);

  const availableChapters = selectedSubject === 'all'
    ? CVS_TAXONOMY.chapters
    : CVS_TAXONOMY.chapters.filter((c) => c.subjectId === selectedSubject);

  const handleStartTest = () => {
    // Navigate to player with session config in state
    navigate('/session/practice-now', {
      state: {
        mode: 'practice',
        subjectId: selectedSubject,
        chapterId: selectedChapter,
        questionCount,
        highYieldOnly,
      },
    });
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      <div className="border-b border-slate-200 pb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Quick Practice</h1>
          <p className="text-sm text-slate-500">
            Configure your focus and start testing immediately. No unnecessary setup screens.
          </p>
        </div>
        <span className="text-xs font-semibold px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
          Immediate Answer Feedback
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Subject Scope
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                setSelectedChapter('all');
              }}
              className="w-full text-sm rounded-lg border border-slate-300 py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="all">All Subjects (Anatomy, Histology, Microbiology)</option>
              {CVS_TAXONOMY.subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Chapter
            </label>
            <select
              value={selectedChapter}
              onChange={(e) => setSelectedChapter(e.target.value)}
              className="w-full text-sm rounded-lg border border-slate-300 py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="all">All Chapters in Selected Subject</option>
              {availableChapters.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Question Count & High-Yield Toggle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Question Count
            </label>
            <div className="flex space-x-2">
              {[10, 20, 30, 50].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setQuestionCount(num)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                    questionCount === num
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {num} Qs
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Filter Modifiers
            </label>
            <button
              type="button"
              onClick={() => setHighYieldOnly(!highYieldOnly)}
              className={`w-full py-2 px-3 rounded-lg text-sm font-semibold flex items-center justify-between border transition-all ${
                highYieldOnly
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>High-Yield Questions Only</span>
              </div>
              {highYieldOnly && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
            </button>
          </div>
        </div>

        {/* Start Button */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Available in Bank: <strong className="text-slate-800">{questions.length}</strong> questions
          </div>
          <button
            onClick={handleStartTest}
            className="py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center space-x-2 shadow-xs transition-all"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Practice (Enter ⏎)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
