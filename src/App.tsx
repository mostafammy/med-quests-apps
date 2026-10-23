import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Shell } from './ui/app/Shell.tsx';
import { Dashboard } from './ui/features/dashboard/Dashboard.tsx';
import { QuickPractice } from './ui/features/test/QuickPractice.tsx';
import { MockExamSetup } from './ui/features/test/MockExamSetup.tsx';
import { SessionPlayer } from './ui/features/test/SessionPlayer.tsx';
import { ReviewHub } from './ui/features/review/ReviewHub.tsx';
import { CurriculumLibrary } from './ui/features/curriculum/CurriculumLibrary.tsx';
import { QuestionStudio } from './ui/features/studio/QuestionStudio.tsx';
import { useQuestionStore } from './application/stores/useQuestionStore.ts';

export const App: React.FC = () => {
  const { loadQuestions } = useQuestionStore();

  useEffect(() => {
    // Initialise and load stored questions for active block (CVS)
    loadQuestions('cvs');
  }, [loadQuestions]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Fullscreen Session Player (No Outer Shell during active testing) */}
        <Route path="/session/:id" element={<SessionPlayer />} />

        {/* Standard Web App Shell */}
        <Route path="/" element={<Shell />}>
          <Route index element={<Dashboard />} />
          <Route path="test" element={<QuickPractice />} />
          <Route path="test/quick" element={<QuickPractice />} />
          <Route path="test/mock" element={<MockExamSetup />} />
          <Route path="review" element={<ReviewHub />} />
          <Route path="curriculum" element={<CurriculumLibrary />} />
          <Route path="studio" element={<QuestionStudio />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
