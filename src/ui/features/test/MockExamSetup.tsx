import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Award, Play } from 'lucide-react';
import { useLocaleStore } from '../../../application/stores/useLocaleStore.ts';

export const MockExamSetup: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLocaleStore();

  const handleStartMock = () => {
    navigate('/session/mock-exam', {
      state: {
        mode: 'mock',
        subjectId: 'all',
        chapterId: 'all',
        questionCount: 50,
        timeLimitMinutes: 120, // 2 hours
      },
    });
  };

  return (
    <div className="max-w-3xl mx-auto py-6 sm:py-10 px-3.5 sm:px-6 space-y-5 sm:space-y-6 animate-apple-entrance">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center p-3 bg-slate-900 dark:bg-zinc-800 text-white rounded-2xl shadow-md">
          <Award className="w-8 h-8 text-amber-400" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight">{t.test.mockSetup.title}</h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 max-w-md mx-auto">
          {t.test.mockSetup.subtitle}
        </p>
      </div>

      <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl rounded-3xl border border-slate-200 dark:border-zinc-800 p-5 sm:p-8 shadow-xs space-y-6">
        {/* Exam Specification Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 text-center">
          <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl border border-slate-100 dark:border-zinc-800">
            <div className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400 uppercase font-semibold">{t.test.mockSetup.length}</div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-zinc-100 mt-1">50 {t.common.questions}</div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">{t.test.mockSetup.lengthSub}</div>
          </div>

          <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl border border-slate-100 dark:border-zinc-800">
            <div className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400 uppercase font-semibold">{t.test.mockSetup.duration}</div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-zinc-100 mt-1">2 Hours</div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">{t.test.mockSetup.durationSub}</div>
          </div>

          <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl border border-slate-100 dark:border-zinc-800 col-span-2 sm:col-span-1">
            <div className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400 uppercase font-semibold">{t.test.mockSetup.mode}</div>
            <div className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{t.test.mockMode}</div>
            <div className="text-[10px] sm:text-[11px] text-indigo-700 dark:text-indigo-300 mt-0.5">{t.test.mockSetup.modeSub}</div>
          </div>
        </div>

        {/* Examination Rules Banner */}
        <div className="p-4 bg-slate-900 dark:bg-zinc-950 text-slate-200 dark:text-zinc-300 rounded-2xl text-xs space-y-2 border border-slate-800 dark:border-zinc-800">
          <div className="flex items-center space-x-2 text-amber-400 font-bold uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4" />
            <span>{t.test.mockSetup.rulesTitle}</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-300 dark:text-zinc-400">
            <li>{t.test.mockSetup.rule1}</li>
            <li>{t.test.mockSetup.rule2}</li>
            <li>{t.test.mockSetup.rule3}</li>
            <li>{t.test.mockSetup.rule4}</li>
          </ul>
        </div>

        <button
          onClick={handleStartMock}
          className="w-full py-3.5 px-6 bg-slate-900 dark:bg-zinc-800 hover:bg-slate-800 dark:hover:bg-zinc-700 text-white rounded-2xl text-base font-bold flex items-center justify-center space-x-2 shadow-md transition-all cursor-pointer border border-transparent dark:border-zinc-700 apple-tap"
        >
          <Play className="w-5 h-5 fill-current text-emerald-400" />
          <span>{t.test.mockSetup.startBtn}</span>
        </button>
      </div>
    </div>
  );
};
