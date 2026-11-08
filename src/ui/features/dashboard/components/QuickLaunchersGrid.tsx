import React from 'react';
import { Zap, Award, BookOpen, Clock, Sparkles, ArrowRight } from 'lucide-react';
import { useLocaleStore } from '../../../../application/stores/useLocaleStore.ts';

export interface QuickLaunchersGridProps {
  readonly onQuickPractice: () => void;
  readonly onMockExam: () => void;
  readonly onCurriculum: () => void;
}

export const QuickLaunchersGrid: React.FC<QuickLaunchersGridProps> = ({
  onQuickPractice,
  onMockExam,
  onCurriculum,
}) => {
  const { t, isRtl } = useLocaleStore();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Left 2 Cols: Mode Action Launchpads */}
      <div className="md:col-span-2 space-y-4">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 px-1">
          {t.dashboard.quickLaunchTitle}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Quick Practice Card */}
          <div 
            onClick={onQuickPractice}
            className="p-6 rounded-3xl glass-card-interactive cursor-pointer group space-y-4 bg-gradient-to-b from-blue-500/10 via-white/50 to-white/70 dark:from-blue-950/30 dark:via-zinc-900/60 dark:to-zinc-900/80 border-blue-400/30 dark:border-blue-800/40"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30 group-hover:scale-110 group-hover:rotate-2 transition-all duration-300">
              <Zap className="w-6 h-6 fill-white text-white group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-zinc-100 text-lg flex items-center justify-between">
                <span>{t.test.quickPractice.title}</span>
                <ArrowRight className={`w-4 h-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1.5 transition-all duration-300 ${isRtl ? 'rotate-180' : ''}`} />
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 leading-relaxed">
                {t.test.quickPractice.subtitle}
              </p>
            </div>
            <div className="flex items-center space-x-2 text-[11px] font-bold text-blue-600 dark:text-blue-400">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>{t.test.quickPractice.immediateFeedback}</span>
            </div>
          </div>

          {/* Mock Exam Card */}
          <div 
            onClick={onMockExam}
            className="p-6 rounded-3xl glass-card-interactive cursor-pointer group space-y-4 bg-gradient-to-b from-purple-500/10 via-white/50 to-white/70 dark:from-purple-950/30 dark:via-zinc-900/60 dark:to-zinc-900/80 border-purple-400/30 dark:border-purple-800/40"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/30 group-hover:scale-110 group-hover:rotate-2 transition-all duration-300">
              <Award className="w-6 h-6 text-amber-300 group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-zinc-100 text-lg flex items-center justify-between">
                <span>{t.dashboard.mockExamCardTitle}</span>
                <ArrowRight className={`w-4 h-4 text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:translate-x-1.5 transition-all duration-300 ${isRtl ? 'rotate-180' : ''}`} />
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 leading-relaxed">
                {t.dashboard.mockExamCardDesc}
              </p>
            </div>
            <div className="flex items-center space-x-2 text-[11px] font-bold text-purple-600 dark:text-purple-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{t.dashboard.mockExamBadge}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Col: Curriculum & Spaced Repetition Summary */}
      <div className="space-y-4">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 px-1">
          {t.curriculum.badge}
        </h2>

        <div className="p-6 rounded-3xl glass-surface space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-sm">{t.dashboard.curriculumCardTitle}</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">{t.curriculum.title}</p>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
            {t.dashboard.curriculumCardDesc}
          </p>

          <button
            onClick={onCurriculum}
            className="w-full py-2.5 px-4 rounded-2xl glass-card-interactive text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center justify-between cursor-pointer"
          >
            <span>{t.curriculum.title}</span>
            <ArrowRight className={`w-3.5 h-3.5 text-blue-600 dark:text-blue-400 ${isRtl ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
};
