import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useLocaleStore } from '../../../../application/stores/useLocaleStore.ts';

export interface DynamicRecommendationBannerProps {
  readonly totalAttempts: number;
  readonly weakTopicsCount: number;
  readonly onLaunchPractice: () => void;
}

export const DynamicRecommendationBanner: React.FC<DynamicRecommendationBannerProps> = ({
  totalAttempts,
  weakTopicsCount,
  onLaunchPractice,
}) => {
  const { t, isRtl } = useLocaleStore();

  const title = totalAttempts === 0
    ? t.dashboard.startPractice
    : weakTopicsCount > 0
    ? t.dashboard.weaknessCardTitle
    : t.dashboard.mockExamCardTitle;

  const description = totalAttempts === 0
    ? t.dashboard.quickLaunchSub
    : weakTopicsCount > 0
    ? t.dashboard.weaknessCardDesc
    : t.dashboard.mockExamCardDesc;

  return (
    <div className="relative rounded-3xl p-5 sm:p-8 text-white shadow-xl overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 border border-white/20">
      <div className="absolute right-0 top-0 bottom-0 w-2/5 bg-gradient-to-l from-white/10 to-transparent pointer-events-none" />
      <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-pink-500/20 rounded-full blur-2xl pointer-events-none" />

      <div className="max-w-2xl space-y-3 sm:space-y-4 relative z-10">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-extrabold tracking-wide uppercase border border-white/30 text-white">
          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
          <span>{t.dashboard.quickLaunchTitle}</span>
        </div>

        <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white leading-tight">
          {title}
        </h2>

        <p className="text-xs sm:text-sm text-blue-100 leading-relaxed max-w-xl">
          {description}
        </p>

        <div className="pt-2">
          <button
            onClick={onLaunchPractice}
            className="w-full sm:w-auto py-3 px-6 bg-white text-indigo-700 hover:bg-blue-50 font-extrabold rounded-2xl text-sm flex items-center justify-center space-x-2 shadow-lg transition-all apple-tap cursor-pointer"
          >
            <span>{totalAttempts === 0 ? t.dashboard.startPractice : t.dashboard.continuePractice}</span>
            <ArrowRight className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
};
