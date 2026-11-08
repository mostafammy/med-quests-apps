/**
 * SessionPlayer
 *
 * Active interactive exam and practice session workspace.
 * Follows the Single Responsibility Principle: coordinates high-level visual presentation,
 * delegating all state machines, timers, keyboard navigation, and submission logic
 * to useSessionPlayerCoordinator.
 */

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { PostTestReport } from './PostTestReport.tsx';
import { QuestionNavigatorStrip } from './QuestionNavigatorStrip.tsx';
import { QuestionMatrixModal } from './QuestionMatrixModal.tsx';
import { AiCopilotDrawer } from '../copilot/AiCopilotDrawer.tsx';
import { SessionPlayerTopHeader } from './components/SessionPlayerTopHeader.tsx';
import { SessionQuestionChoicesAndRationale } from './components/SessionQuestionChoicesAndRationale.tsx';
import { SessionBottomCommandDock } from './components/SessionBottomCommandDock.tsx';
import { SessionFinishConfirmationSheet } from './components/SessionFinishConfirmationSheet.tsx';
import { useSessionPlayerCoordinator } from './hooks/useSessionPlayerCoordinator.ts';

export const SessionPlayer: React.FC = () => {
  const session = useSessionPlayerCoordinator();
  const { actions } = session;

  // 1. Guard against unseeded question banks
  if (session.sessionQuestions.length === 0 || !session.currentQ) {
    return (
      <div className="max-w-2xl mx-auto my-16 p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-4 shadow-xs">
        <div className="inline-flex p-3 bg-amber-50 text-amber-600 rounded-xl">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">No Questions in Question Bank</h2>
        <p className="text-sm text-slate-500">
          The question bank has not been populated with questions yet. Use the Question Studio to generate and paste your first batch of validated questions.
        </p>
        <button
          onClick={() => session.navigate('/studio')}
          className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-all"
        >
          Open Question Studio
        </button>
      </div>
    );
  }

  // 2. Post-Test Comprehensive Assessment Report View
  if (session.isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 py-4 pb-20 text-slate-900 dark:text-zinc-100">
        <PostTestReport
          result={{
            sessionQuestions: session.sessionQuestions,
            answers: session.answers,
            timeSpentSeconds: session.isExamMode
              ? (session.sessionConfig.timeLimitMinutes || 120) * 60 - session.timeLeftSeconds
              : Math.max(1, Math.round((Date.now() - session.sessionStartTime) / 1000)),
            mode: session.mode,
            questionTelemetry: session.questionTelemetryMap,
          }}
          onRetestMistakes={actions.handleRetestMistakes}
        />
      </div>
    );
  }

  // 3. Active Playing Canvas
  return (
    <div
      className={`min-h-screen flex flex-col relative overflow-x-hidden ${
        session.isExamMode
          ? 'bg-slate-950 text-slate-100'
          : 'bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100'
      }`}
    >
      {/* Universal Ambient Chromatic Glow Background Orbs for Apple Glassmorphism Depth */}
      <div className="fixed -top-12 left-1/4 w-[42rem] h-[42rem] bg-gradient-to-tr from-blue-400/20 via-indigo-400/15 to-transparent rounded-full blur-3xl pointer-events-none -z-10 animate-float-fluid opacity-80 dark:opacity-40" />
      <div className="fixed -bottom-16 right-1/4 w-[38rem] h-[38rem] bg-gradient-to-bl from-purple-400/20 via-pink-400/15 to-transparent rounded-full blur-3xl pointer-events-none -z-10 animate-float-fluid-reverse opacity-75 dark:opacity-35" />
      <div className="fixed top-1/3 right-10 w-96 h-96 bg-gradient-to-br from-cyan-400/15 to-emerald-400/15 rounded-full blur-3xl pointer-events-none -z-10 animate-float-fluid opacity-60 dark:opacity-30" />

      {/* Top Header with Progress, Timer & Action Pills */}
      <SessionPlayerTopHeader
        isExamMode={session.isExamMode}
        currentIndex={session.currentIndex}
        totalQuestions={session.sessionQuestions.length}
        currentQuestion={session.currentQ}
        questionFilter={session.sessionConfig.questionFilter}
        timeLeftSeconds={session.timeLeftSeconds}
        isFlagged={Boolean(session.flags[session.currentQ.id])}
        isBookmarked={Boolean(session.bookmarks[session.currentQ.id])}
        answeredCount={session.answeredCount}
        onExitSession={actions.handleExitSession}
        onOpenMatrix={() => session.setShowMatrixModal(true)}
        onToggleFlag={actions.handleToggleFlag}
        onToggleBookmark={actions.handleToggleBookmark}
        onRequestFinish={actions.handleRequestFinish}
      />

      {/* Interactive Question Navigator Strip */}
      <QuestionNavigatorStrip
        questions={session.sessionQuestions}
        currentIndex={session.currentIndex}
        answers={session.answers}
        flags={session.flags}
        bookmarks={session.bookmarks}
        isExamMode={session.isExamMode}
        onSelectIndex={actions.handleSelectIndex}
        onOpenMatrix={() => session.setShowMatrixModal(true)}
      />

      {/* Main Question Workspace */}
      <main className="max-w-4xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 pt-4 sm:pt-6 lg:pt-8 pb-28 sm:pb-32 flex-1 flex flex-col justify-between space-y-6">
        <SessionQuestionChoicesAndRationale
          currentQuestion={session.currentQ}
          currentIndex={session.currentIndex}
          totalQuestions={session.sessionQuestions.length}
          isExamMode={session.isExamMode}
          isAnswered={session.isAnswered}
          isLastQuestion={session.isLastQuestion}
          showExplanation={session.showExplanation}
          currentConfidence={session.currentConfidence}
          currentAnswer={session.currentAnswer}
          presentedChoices={session.presentedChoices}
          onSelectConfidence={actions.handleSelectConfidence}
          onSelectAnswer={actions.handleSelectAnswer}
        />

        <SessionBottomCommandDock
          isExamMode={session.isExamMode}
          isAnswered={session.isAnswered}
          isLastQuestion={session.isLastQuestion}
          currentIndex={session.currentIndex}
          totalQuestions={session.sessionQuestions.length}
          onPrev={actions.handlePrev}
          onNext={actions.handleNext}
          onRequestFinish={actions.handleRequestFinish}
          onSubmitExam={() => void actions.handleSubmitExam()}
          onOpenMatrix={() => session.setShowMatrixModal(true)}
        />
      </main>

      {/* Finish Confirmation Sheet */}
      <SessionFinishConfirmationSheet
        isOpen={session.showFinishModal}
        isExamMode={session.isExamMode}
        answeredCount={session.answeredCount}
        unansweredCount={session.unansweredCount}
        flaggedCount={session.flaggedCount}
        onClose={() => session.setShowFinishModal(false)}
        onConfirmFinish={() => void actions.handleSubmitExam()}
      />

      {/* Full Question Matrix Modal (G shortcut) */}
      <QuestionMatrixModal
        isOpen={session.showMatrixModal}
        onClose={() => session.setShowMatrixModal(false)}
        questions={session.sessionQuestions}
        currentIndex={session.currentIndex}
        answers={session.answers}
        flags={session.flags}
        bookmarks={session.bookmarks}
        isExamMode={session.isExamMode}
        onSelectIndex={actions.handleSelectIndex}
        onFinishSession={actions.handleRequestFinish}
      />

      {/* AI Cognitive Co-Pilot Sliding Drawer */}
      <AiCopilotDrawer />
    </div>
  );
};
