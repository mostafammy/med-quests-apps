import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuestionStore } from '../../../application/stores/useQuestionStore.ts';
import { useStatsStore } from '../../../application/stores/useStatsStore.ts';
import { useLocaleStore } from '../../../application/stores/useLocaleStore.ts';
import { 
  Play, 
  RotateCcw, 
  ArrowRight, 
  Sparkles,
  AlertTriangle,
  Award,
  BookOpen,
  Zap,
  Clock,
  TrendingUp,
  Flame,
  CheckCircle2
} from 'lucide-react';
import { ResetBankConfirmationModal } from '../questionBank/ResetBankConfirmationModal.tsx';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { questions } = useQuestionStore();
  const { t, isRtl } = useLocaleStore();
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
  const [showResetBankModal, setShowResetBankModal] = useState(false);
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
    <div className="relative min-h-[calc(100vh-4rem)] py-4 sm:py-8 px-2.5 sm:px-6 lg:px-8 space-y-6 sm:space-y-8 animate-apple-entrance">
      {/* Top Banner: Rich Glassmorphic Hub Card with Vivid Chromatic Gradients */}
      <div className="p-4 sm:p-6 md:p-8 rounded-3xl glass-surface space-y-5 sm:space-y-6 relative overflow-hidden">
        {/* Subtle Ambient Color Splash */}
        <div className="pointer-events-none absolute -right-16 -top-16 w-80 h-80 bg-gradient-to-br from-blue-500/20 via-indigo-500/15 to-purple-500/10 rounded-full blur-3xl -z-10" />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-blue-700 dark:text-blue-300 bg-blue-500/15 dark:bg-blue-400/15 px-2.5 py-0.5 rounded-full border border-blue-400/30 backdrop-blur-md">
                {t.dashboard.badgeExamPrep}
              </span>
              <span className="text-xs text-slate-300 dark:text-zinc-600">•</span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="hidden xs:inline sm:inline">{t.dashboard.engineBadge}</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-300 dark:to-purple-300 bg-clip-text text-transparent">
              {t.dashboard.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 max-w-xl leading-relaxed">
              {t.dashboard.subtitle}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowResetBankModal(true)}
                className="py-2.5 px-3 glass-pill-luxury text-slate-700 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400 rounded-2xl text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer apple-tap flex-1 sm:flex-none border hover:border-rose-300 dark:hover:border-rose-800 transition-all"
                title={t.bank.resetToGlobalBtn}
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
                <span className="hidden sm:inline">{t.bank.resetToGlobalBtn}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="py-2.5 px-3 glass-pill-luxury text-slate-600 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 rounded-2xl text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer apple-tap flex-1 sm:flex-none"
                title={t.dashboard.resetModalDesc}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t.dashboard.resetBtn}</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/test/mock')}
                className="py-2.5 px-4 bg-gradient-to-r from-slate-900 to-indigo-950 dark:from-zinc-800 dark:to-zinc-900 hover:from-slate-800 hover:to-indigo-900 text-white rounded-2xl text-xs sm:text-sm font-bold border border-indigo-500/30 dark:border-indigo-500/20 backdrop-blur-md shadow-md shadow-indigo-950/20 transition-all cursor-pointer flex items-center justify-center space-x-1.5 apple-tap flex-1 sm:flex-none"
              >
                <Clock className="w-4 h-4 text-amber-400" />
                <span>{t.dashboard.mockExamBtn}</span>
              </button>
            </div>
            <button
              onClick={() => navigate('/test/quick')}
              className="shimmer-active py-2.5 px-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-xs sm:text-sm font-extrabold flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/25 transition-all cursor-pointer apple-tap w-full sm:w-auto"
            >
              <Play className="w-4 h-4 fill-current text-white" />
              <span>{totalAttempts > 0 ? t.dashboard.continuePractice : t.dashboard.startPractice}</span>
            </button>
          </div>
        </div>

        {/* 5 Key Metric Cards with Apple-Caliber Distinct Vivid Tinting */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5 pt-4 border-t border-slate-200/60 dark:border-zinc-800/60">
          {/* Overall Mastery - Emerald Tinted Glass */}
          <div className="p-3.5 sm:p-4 rounded-2xl glass-card-interactive bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-400/30 dark:border-emerald-700/40 hover:border-emerald-400/60 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] text-emerald-800 dark:text-emerald-300 font-bold uppercase tracking-wider">{t.dashboard.masteryScore}</span>
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-900 dark:text-emerald-200 mt-1">
              {masteryPercentage}%
            </div>
            <div className="text-[10px] sm:text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
              {totalAttempts > 0 ? `${masteryPercentage}% ${t.dashboard.masterySub}` : t.review.notAttempted}
            </div>
          </div>

          {/* Active Bank - Sapphire Blue Tinted Glass */}
          <div className="p-3.5 sm:p-4 rounded-2xl glass-card-interactive bg-blue-500/5 dark:bg-blue-950/20 border-blue-400/30 dark:border-blue-700/40 hover:border-blue-400/60 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] text-blue-800 dark:text-blue-300 font-bold uppercase tracking-wider">{t.common.questions}</span>
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-blue-950 dark:text-blue-100 mt-1">
              {questions.length} <span className="text-xs font-normal text-slate-400 dark:text-zinc-500">{t.common.questions}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-semibold mt-1">
              <span onClick={() => navigate('/studio')} className="cursor-pointer text-blue-600 dark:text-blue-400 hover:underline">
                {t.nav.studio} →
              </span>
              <button
                type="button"
                onClick={() => setShowResetBankModal(true)}
                className="cursor-pointer text-slate-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 flex items-center space-x-1 rtl:space-x-reverse transition-colors"
                title={t.bank.resetToGlobalBtn}
              >
                <RotateCcw className="w-2.5 h-2.5 text-rose-500" />
                <span>{t.bank.resetToGlobalBtn}</span>
              </button>
            </div>
          </div>

          {/* Attempts Logged - Royal Indigo Tinted Glass */}
          <div className="p-3.5 sm:p-4 rounded-2xl glass-card-interactive bg-indigo-500/5 dark:bg-indigo-950/20 border-indigo-400/30 dark:border-indigo-700/40 hover:border-indigo-400/60 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] text-indigo-800 dark:text-indigo-300 font-bold uppercase tracking-wider">{t.dashboard.overallAccuracy}</span>
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-indigo-950 dark:text-indigo-100 mt-1">
              {totalAttempts}
            </div>
            <div className="text-[10px] sm:text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mt-1">
              {totalAttempts > 0 ? `${overallAccuracy}% ${t.common.accuracy}` : t.dashboard.accuracySub}
            </div>
          </div>

          {/* Weak Areas - Coral Rose Tinted Glass */}
          <div className="p-3.5 sm:p-4 rounded-2xl glass-card-interactive bg-rose-500/5 dark:bg-rose-950/20 border-rose-400/30 dark:border-rose-700/40 hover:border-rose-400/60 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] text-rose-800 dark:text-rose-300 font-bold uppercase tracking-wider">{t.dashboard.weakTopics}</span>
              <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
              {weakTopicsCount}
            </div>
            <div className="text-[10px] sm:text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-1">
              <span onClick={() => navigate('/review')} className="cursor-pointer hover:underline">
                {weakTopicsCount > 0 ? `${t.review.badge} →` : t.review.noWeakTitle}
              </span>
            </div>
          </div>

          {/* Due Reviews - Amber Gold Tinted Glass */}
          <div className="p-3.5 sm:p-4 rounded-2xl glass-card-interactive bg-amber-500/5 dark:bg-amber-950/20 border-amber-400/30 dark:border-amber-700/40 hover:border-amber-400/60 col-span-2 sm:col-span-1 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] text-amber-800 dark:text-amber-300 font-bold uppercase tracking-wider">{t.dashboard.dueReviews}</span>
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {dueReviewsCount}
            </div>
            <div className="text-[10px] sm:text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-1">
              <span onClick={() => navigate('/review')} className="cursor-pointer hover:underline">
                {t.nav.review} →
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Recommendation Banner: Electric Indigo to Cobalt Blue Gradient */}
      <div className="relative rounded-3xl p-5 sm:p-8 text-white shadow-xl overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 border border-white/20">
        <div className="absolute right-0 top-0 bottom-0 w-2/5 bg-gradient-to-l from-white/10 to-transparent pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-pink-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="max-w-2xl space-y-3 sm:space-y-4 relative z-10">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-extrabold tracking-wide uppercase border border-white/30 text-white">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>{t.dashboard.quickLaunchTitle}</span>
          </div>

          <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white leading-tight">
            {totalAttempts === 0
              ? t.dashboard.startPractice
              : weakTopicsCount > 0
              ? t.dashboard.weaknessCardTitle
              : t.dashboard.mockExamCardTitle}
          </h2>

          <p className="text-xs sm:text-sm text-blue-100 leading-relaxed max-w-xl">
            {totalAttempts === 0
              ? t.dashboard.quickLaunchSub
              : weakTopicsCount > 0
              ? t.dashboard.weaknessCardDesc
              : t.dashboard.mockExamCardDesc}
          </p>

          <div className="pt-2">
            <button
              onClick={() => navigate('/test/quick')}
              className="w-full sm:w-auto py-3 px-6 bg-white text-indigo-700 hover:bg-blue-50 font-extrabold rounded-2xl text-sm flex items-center justify-center space-x-2 shadow-lg transition-all apple-tap cursor-pointer"
            >
              <span>{totalAttempts === 0 ? t.dashboard.startPractice : t.dashboard.continuePractice}</span>
              <ArrowRight className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main 2-Column Launchers & Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Mode Action Launchpads */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 px-1">
            {t.dashboard.quickLaunchTitle}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Quick Practice Card - Vibrant Blue/Indigo Glow */}
            <div 
              onClick={() => navigate('/test/quick')}
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

            {/* Mock Exam Card - Vibrant Purple/Indigo Glow */}
            <div 
              onClick={() => navigate('/test/mock')}
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
              onClick={() => navigate('/curriculum')}
              className="w-full py-2.5 px-4 rounded-2xl glass-card-interactive text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center justify-between cursor-pointer"
            >
              <span>{t.curriculum.title}</span>
              <ArrowRight className={`w-3.5 h-3.5 text-blue-600 dark:text-blue-400 ${isRtl ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Section: Exam Readiness Subject Cards with Vibrant Subject Identity */}
      <div className="space-y-4">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 px-1">
          {t.dashboard.taxonomyBreakdownTitle}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Anatomy Card - Royal Blue Glow */}
          <div className="p-6 rounded-3xl glass-card-interactive space-y-3 border-blue-400/25 dark:border-blue-700/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
                <h3 className="font-extrabold text-slate-900 dark:text-zinc-100 text-sm">{t.dashboard.subjects.anatomy}</h3>
              </div>
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">3 Chapters</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
              Heart chambers, valves, coronaries, pericardium, cardiac looping, atrial & ventricular septation.
            </p>
            <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-100 dark:border-zinc-800">
              <span className="font-bold text-slate-700 dark:text-zinc-300">56 {t.common.questions}</span>
              <button
                onClick={() => navigate('/test?subject=anatomy')}
                className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer flex items-center space-x-1"
              >
                <span>{t.dashboard.startPractice} →</span>
              </button>
            </div>
          </div>

          {/* Histology Card - Violet / Purple Glow */}
          <div className="p-6 rounded-3xl glass-card-interactive space-y-3 border-purple-400/25 dark:border-purple-700/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-sm shadow-purple-500/50" />
                <h3 className="font-extrabold text-slate-900 dark:text-zinc-100 text-sm">{t.dashboard.subjects.histology}</h3>
              </div>
              <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md">2 Chapters</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
              Heart wall layers, intercalated discs, Purkinje fibers, elastic/muscular arteries, and capillary beds.
            </p>
            <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-100 dark:border-zinc-800">
              <span className="font-bold text-slate-700 dark:text-zinc-300">26 {t.common.questions}</span>
              <button
                onClick={() => navigate('/test?subject=histology')}
                className="text-purple-600 dark:text-purple-400 font-bold hover:underline cursor-pointer flex items-center space-x-1"
              >
                <span>{t.dashboard.startPractice} →</span>
              </button>
            </div>
          </div>

          {/* Microbiology Card - Emerald Green Glow */}
          <div className="p-6 rounded-3xl glass-card-interactive space-y-3 border-emerald-400/25 dark:border-emerald-700/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                <h3 className="font-extrabold text-slate-900 dark:text-zinc-100 text-sm">{t.dashboard.subjects.microbiology}</h3>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">3 Chapters</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
              Rheumatic fever (JONES criteria & M protein mimicry), infective endocarditis, and viral myocarditis.
            </p>
            <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-100 dark:border-zinc-800">
              <span className="font-bold text-slate-700 dark:text-zinc-300">24 {t.common.questions}</span>
              <button
                onClick={() => navigate('/test?subject=microbiology')}
                className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer flex items-center space-x-1"
              >
                <span>{t.dashboard.startPractice} →</span>
              </button>
            </div>
          </div>

          {/* Physiology Card - Amber / Gold Glow */}
          <div className="p-6 rounded-3xl glass-card-interactive space-y-3 border-amber-400/25 dark:border-amber-700/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
                <h3 className="font-extrabold text-slate-900 dark:text-zinc-100 text-sm">{t.dashboard.subjects.physiology}</h3>
              </div>
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">3 Chapters</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
              Cardiac electrophysiology, AP phases (0–4), cardiac cycle phases, heart sounds, and hemodynamics / BP regulation.
            </p>
            <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-100 dark:border-zinc-800">
              <span className="font-bold text-slate-700 dark:text-zinc-300">106 {t.common.questions}</span>
              <button
                onClick={() => navigate('/test?subject=physiology')}
                className="text-amber-600 dark:text-amber-400 font-bold hover:underline cursor-pointer flex items-center space-x-1"
              >
                <span>{t.dashboard.startPractice} →</span>
              </button>
            </div>
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
              <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-50">{t.dashboard.resetModalTitle}</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                {t.dashboard.resetModalDesc}
              </p>
            </div>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="py-2 px-4 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                {t.dashboard.resetCancelBtn}
              </button>
              <button
                onClick={handleResetConfirm}
                disabled={resetting}
                className="py-2 px-4 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer"
              >
                {resetting ? t.dashboard.resetting : t.dashboard.resetConfirmBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Question Bank Recovery Modal */}
      <ResetBankConfirmationModal
        isOpen={showResetBankModal}
        onClose={() => setShowResetBankModal(false)}
      />
    </div>
  );
};
