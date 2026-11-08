import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuestionStore } from '../../../application/stores/useQuestionStore.ts';
import { useStatsStore } from '../../../application/stores/useStatsStore.ts';
import { ResetBankConfirmationModal } from '../questionBank/ResetBankConfirmationModal.tsx';
import { useActiveBlock, useActiveTaxonomy, useBlockContextStore } from '../../../application/stores/useBlockContextStore.ts';
import { BlockSwitcherSheet } from '../../app/navigation/BlockSwitcherSheet.tsx';
import {
  loadSessionMemento,
  clearSessionMemento,
  type SavedSessionMemento,
} from '../../../application/curriculum/SessionLeaveGuard.ts';
import { ResumeSessionBanner } from './components/ResumeSessionBanner.tsx';
import { DashboardHeaderHub } from './components/DashboardHeaderHub.tsx';
import { MasteryKpiCards } from './components/MasteryKpiCards.tsx';
import { CognitiveTelemetryRingsCockpit } from './components/CognitiveTelemetryRingsCockpit.tsx';
import { DynamicRecommendationBanner } from './components/DynamicRecommendationBanner.tsx';
import { QuickLaunchersGrid } from './components/QuickLaunchersGrid.tsx';
import { SubjectReadinessGrid } from './components/SubjectReadinessGrid.tsx';
import { ResetStatsConfirmationModal } from './components/ResetStatsConfirmationModal.tsx';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { questions } = useQuestionStore();
  const { block, visibleBlocks } = useActiveBlock();
  const { activeBlockId } = useBlockContextStore();
  const taxonomy = useActiveTaxonomy();
  const [showMobileBlockSheet, setShowMobileBlockSheet] = useState(false);
  const [savedSession, setSavedSession] = useState<SavedSessionMemento | null>(() => loadSessionMemento(activeBlockId));

  useEffect(() => {
    setSavedSession(loadSessionMemento(activeBlockId));
  }, [activeBlockId]);

  const stats = useStatsStore();
  const currentStats = typeof window === 'undefined' ? useStatsStore.getState() : stats;
  const { 
    totalAttempts, 
    overallAccuracy, 
    masteryPercentage, 
    weakTopicsCount, 
    dueReviewsCount,
    subjectReadiness,
    avgPaceSeconds,
    streakDays,
    todayAttempts,
    dailyGoalTarget,
    pacingQuadrants,
    confidenceCalibration,
    refreshStats,
    resetStats
  } = currentStats;

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showResetBankModal, setShowResetBankModal] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    refreshStats(questions, activeBlockId);

    const handleRevalidate = () => {
      refreshStats(questions, activeBlockId);
    };

    window.addEventListener('focus', handleRevalidate);
    window.addEventListener('pageshow', handleRevalidate);
    window.addEventListener('medquests:telemetry-updated', handleRevalidate);

    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel('medquests_study_telemetry');
        bc.onmessage = () => {
          refreshStats(questions, activeBlockId);
        };
      } catch {
        // Fallback for non-supporting environments
      }
    }

    return () => {
      window.removeEventListener('focus', handleRevalidate);
      window.removeEventListener('pageshow', handleRevalidate);
      window.removeEventListener('medquests:telemetry-updated', handleRevalidate);
      if (bc) {
        bc.close();
      }
    };
  }, [questions, refreshStats, activeBlockId]);

  const handleResetConfirm = async () => {
    setResetting(true);
    await resetStats(questions);
    setResetting(false);
    setShowResetConfirm(false);
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] py-4 sm:py-8 px-2.5 sm:px-6 lg:px-8 space-y-6 sm:space-y-8 animate-apple-entrance">
      {/* 1. Resume In-Progress Session Card */}
      {savedSession && (
        <ResumeSessionBanner
          savedSession={savedSession}
          onDiscard={() => {
            clearSessionMemento(activeBlockId);
            setSavedSession(null);
          }}
          onResume={() => {
            navigate(`/session/${savedSession.sessionId}`, {
              state: { savedSession },
            });
          }}
        />
      )}

      {/* 2. Top Banner: Rich Glassmorphic Hub Card */}
      <div className="p-4 sm:p-6 md:p-8 rounded-3xl glass-surface space-y-5 sm:space-y-6 relative overflow-hidden">
        <div className="pointer-events-none absolute -right-16 -top-16 w-80 h-80 bg-gradient-to-br from-blue-500/20 via-indigo-500/15 to-purple-500/10 rounded-full blur-3xl -z-10" />

        <DashboardHeaderHub
          block={block}
          defaultBlockName={taxonomy.block.name}
          visibleBlocksCount={visibleBlocks.length}
          totalAttempts={totalAttempts}
          onOpenBlockSheet={() => setShowMobileBlockSheet(true)}
          onResetBank={() => setShowResetBankModal(true)}
          onResetStats={() => setShowResetConfirm(true)}
          onLaunchMockExam={() => navigate('/test/mock')}
          onLaunchPractice={() => navigate('/test/quick')}
        />

        {/* 5 Key Metric Cards */}
        <MasteryKpiCards
          masteryPercentage={masteryPercentage}
          totalAttempts={totalAttempts}
          questionsCount={questions.length}
          overallAccuracy={overallAccuracy}
          weakTopicsCount={weakTopicsCount}
          dueReviewsCount={dueReviewsCount}
          onOpenStudio={() => navigate('/studio')}
          onOpenReview={() => navigate('/review')}
          onResetBank={() => setShowResetBankModal(true)}
        />
      </div>

      {/* 3. Triple Mastery Rings & Telemetry Cockpit */}
      <CognitiveTelemetryRingsCockpit
        masteryPercentage={masteryPercentage}
        overallAccuracy={overallAccuracy}
        streakDays={streakDays}
        todayAttempts={todayAttempts}
        dailyGoalTarget={dailyGoalTarget}
        pacingQuadrants={pacingQuadrants}
        confidenceCalibration={confidenceCalibration}
        avgPaceSeconds={avgPaceSeconds}
      />

      {/* 4. Dynamic Recommendation Banner */}
      <DynamicRecommendationBanner
        totalAttempts={totalAttempts}
        weakTopicsCount={weakTopicsCount}
        onLaunchPractice={() => navigate('/test/quick')}
      />

      {/* 5. Main 2-Column Launchers Grid */}
      <QuickLaunchersGrid
        onQuickPractice={() => navigate('/test/quick')}
        onMockExam={() => navigate('/test/mock')}
        onCurriculum={() => navigate('/curriculum')}
      />

      {/* 6. Exam Readiness Subject Breakdown */}
      <SubjectReadinessGrid
        subjects={taxonomy.subjects}
        chapters={taxonomy.chapters}
        subjectReadiness={subjectReadiness}
        questions={questions}
        onPracticeSubject={(subjectId) => navigate(`/test?subject=${subjectId}`)}
      />

      {/* 7. Confirmation Modal for Resetting Stats */}
      <ResetStatsConfirmationModal
        isOpen={showResetConfirm}
        resetting={resetting}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleResetConfirm}
      />

      {/* 8. Global Question Bank Recovery Modal */}
      <ResetBankConfirmationModal
        isOpen={showResetBankModal}
        onClose={() => setShowResetBankModal(false)}
      />

      {/* 9. Mobile Bottom Sheet Switcher */}
      <BlockSwitcherSheet
        isOpen={showMobileBlockSheet}
        onClose={() => setShowMobileBlockSheet(false)}
      />
    </div>
  );
};
