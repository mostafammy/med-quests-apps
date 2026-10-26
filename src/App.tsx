import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Shell } from './ui/app/Shell.tsx';
import { Dashboard } from './ui/features/dashboard/Dashboard.tsx';
import { TestHub } from './ui/features/test/TestHub.tsx';
import { QuickPractice } from './ui/features/test/QuickPractice.tsx';
import { MockExamSetup } from './ui/features/test/MockExamSetup.tsx';
import { SessionPlayer } from './ui/features/test/SessionPlayer.tsx';
import { ReviewHub } from './ui/features/review/ReviewHub.tsx';
import { CurriculumLibrary } from './ui/features/curriculum/CurriculumLibrary.tsx';
import { useQuestionStore } from './application/stores/useQuestionStore.ts';
import { useThemeStore } from './application/stores/useThemeStore.ts';
import { useAuthStore } from './application/stores/useAuthStore.ts';
import { useLocaleStore } from './application/stores/useLocaleStore.ts';

// Studio and the governance console are large, low-frequency routes. Keep them out of
// the initial learner bundle so first paint and offline practice stay fast.
const QuestionStudio = lazy(() =>
  import('./ui/features/studio/QuestionStudio.tsx').then((module) => ({
    default: module.QuestionStudio,
  }))
);
const AdminDashboardPage = lazy(() =>
  import('./ui/features/admin/AdminDashboardPage.tsx').then((module) => ({
    default: module.AdminDashboardPage,
  }))
);

const RouteLoader: React.FC = () => {
  const { t } = useLocaleStore();
  return (
    <div className="flex min-h-[45vh] items-center justify-center p-6">
      <div className="glass-surface flex items-center gap-3 rounded-2xl border border-slate-200/70 dark:border-zinc-800 px-5 py-3 text-xs font-semibold text-slate-600 dark:text-zinc-300">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-600" />
        <span>{t.common.loading}</span>
      </div>
    </div>
  );
};

const suspense = (node: React.ReactNode) => (
  <Suspense fallback={<RouteLoader />}>{node}</Suspense>
);

export const App: React.FC = () => {
  const { loadQuestions } = useQuestionStore();
  const { initTheme } = useThemeStore();
  const { init: initAuth } = useAuthStore();

  useEffect(() => {
    // Synchronize and initialize dynamic appearance listener
    const cleanupTheme = initTheme();
    // Synchronize hardware capability detector and background edge revalidation
    const cleanupAuth = initAuth();
    // Initialise and load stored questions for active block (CVS)
    loadQuestions('cvs');

    return () => {
      cleanupTheme?.();
      cleanupAuth?.();
    };
  }, [loadQuestions, initTheme, initAuth]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Fullscreen Session Player (No Outer Shell during active testing) */}
        <Route path="/session/:id" element={<SessionPlayer />} />

        {/* Standard Web App Shell */}
        <Route path="/" element={<Shell />}>
          <Route index element={<Dashboard />} />
          <Route path="test" element={<TestHub />} />
          <Route path="test/quick" element={<QuickPractice />} />
          <Route path="test/mock" element={<MockExamSetup />} />
          <Route path="review" element={<ReviewHub />} />
          <Route path="curriculum" element={<CurriculumLibrary />} />
          <Route path="studio" element={suspense(<QuestionStudio />)} />
          <Route path="admin" element={suspense(<AdminDashboardPage />)} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
