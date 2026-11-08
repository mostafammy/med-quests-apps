/**
 * TestHub
 *
 * Primary testing & practice configuration hub for medical students.
 * Follows the Single Responsibility Principle: handles page layout and composition,
 * delegating all state, URL synchronization, and session launch orchestration
 * to useTestHubCoordinator.
 */

import React from 'react';
import { Sliders, Filter } from 'lucide-react';
import { ResetBankConfirmationModal } from '../questionBank/ResetBankConfirmationModal.tsx';
import { TestHubHeader } from './hub/TestHubHeader.tsx';
import { QuickLaunchPresetsDock } from './hub/QuickLaunchPresetsDock.tsx';
import { TestModeSegmentedSwitcher } from './hub/TestModeSegmentedSwitcher.tsx';
import { MockExamBlueprintCard } from './hub/MockExamBlueprintCard.tsx';
import { CurriculumScopeProgressCard } from './hub/CurriculumScopeProgressCard.tsx';
import { CurriculumScopeFilterControls } from './hub/CurriculumScopeFilterControls.tsx';
import { RepetitionFilterStrip } from './hub/RepetitionFilterStrip.tsx';
import { CategoryTestLauncherStrip } from './hub/CategoryTestLauncherStrip.tsx';
import { CommandDeckLaunchBar } from './hub/CommandDeckLaunchBar.tsx';
import { useTestHubCoordinator } from './hub/useTestHubCoordinator.ts';

export const TestHub: React.FC = () => {
  const {
    taxonomy,
    questions,
    t,
    selectedMode,
    setSelectedMode,
    repetitionFilter,
    setRepetitionFilter,
    selectedSubject,
    setSelectedSubject,
    selectedChapter,
    setSelectedChapter,
    questionCount,
    setQuestionCount,
    highYieldOnly,
    setHighYieldOnly,
    timedSprint,
    setTimedSprint,
    showResetBankModal,
    setShowResetBankModal,
    availableChapters,
    scopeCoverage,
    matchingQuestionCount,
    effectiveQuestionCount,
    selectedCategoryLabel,
    subjectCounts,
    handleLaunchSession,
    resetSubjectStats,
  } = useTestHubCoordinator();

  return (
    <div className="relative max-w-5xl mx-auto py-4 sm:py-6 px-3 sm:px-6 space-y-4 sm:space-y-5 animate-apple-entrance">
      {/* 1. Sleek Apple Header Banner with Inline Actions */}
      <TestHubHeader
        blockName={taxonomy.block.name}
        blockCode={taxonomy.block.code || 'BLOCK'}
        totalQuestions={questions.length}
        onResetBank={() => setShowResetBankModal(true)}
      />

      {/* 2. Apple Quick-Launch Presets Dock */}
      <QuickLaunchPresetsDock
        onLaunchPreset={(count, mode) => {
          setSelectedMode(mode);
          handleLaunchSession(count, mode);
        }}
      />

      {/* 3. High-Precision Apple Segmented Mode Switcher */}
      <TestModeSegmentedSwitcher
        selectedMode={selectedMode}
        onSelectMode={(mode) => setSelectedMode(mode)}
      />

      {/* 4. Streamlined Configuration Console */}
      {selectedMode === 'mock' ? (
        <MockExamBlueprintCard />
      ) : (
        <div className="glass-surface rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 sm:space-y-5 border border-slate-200/70 dark:border-zinc-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-zinc-800 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>{selectedMode === 'rapid' ? t.test.highYieldScope : t.test.curriculumScope}</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">{t.test.scopeSubtitle}</p>
            </div>

            <div className="glass-pill-luxury px-3 py-1 rounded-xl text-xs font-bold flex items-center space-x-1.5 rtl:space-x-reverse text-blue-700 dark:text-blue-300 self-start sm:self-auto border border-blue-500/20 dark:border-blue-400/30">
              <Filter className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              <span>
                {t.test.matchingQuestions}:{' '}
                <strong className="text-slate-900 dark:text-white font-black">{matchingQuestionCount}</strong>
              </span>
            </div>
          </div>

          {/* Curriculum Continuity & Mastery Progress Card */}
          <CurriculumScopeProgressCard
            selectedCategoryLabel={selectedCategoryLabel}
            scopeCoverage={scopeCoverage}
            selectedSubject={selectedSubject}
            onResetSubjectStats={() => resetSubjectStats(selectedSubject, questions)}
            onContinueBank={() => {
              setRepetitionFilter('unanswered');
              handleLaunchSession(Math.min(20, scopeCoverage.unanswered), 'practice', 'unanswered');
            }}
            onReviewMissed={() => {
              setRepetitionFilter('incorrect');
              handleLaunchSession(scopeCoverage.incorrect, 'practice', 'incorrect');
            }}
            onRestartCategory={() => {
              setRepetitionFilter('all');
              handleLaunchSession('all', 'practice', 'all');
            }}
          />

          {/* Subject & Chapter Filter Controls */}
          <CurriculumScopeFilterControls
            subjects={taxonomy.subjects}
            availableChapters={availableChapters}
            selectedSubject={selectedSubject}
            selectedChapter={selectedChapter}
            subjectCounts={subjectCounts}
            blockName={taxonomy.block.name}
            selectedCategoryLabel={selectedCategoryLabel}
            highYieldOnly={highYieldOnly}
            timedSprint={timedSprint}
            isPracticeMode={selectedMode === 'practice'}
            onSelectSubject={(subId) => {
              setSelectedSubject(subId);
              setSelectedChapter('all');
            }}
            onSelectChapter={(chapId) => setSelectedChapter(chapId)}
            onToggleHighYield={() => setHighYieldOnly(!highYieldOnly)}
            onToggleTimedSprint={() => setTimedSprint(!timedSprint)}
          />

          {/* Repetition Filter Strip */}
          {selectedMode === 'practice' && (
            <RepetitionFilterStrip
              repetitionFilter={repetitionFilter}
              scopeCoverage={scopeCoverage}
              onSelectFilter={(filter) => setRepetitionFilter(filter)}
            />
          )}

          {/* Category Test Launcher & Question Count Selector */}
          <CategoryTestLauncherStrip
            matchingQuestionCount={matchingQuestionCount}
            questionCount={questionCount}
            effectiveQuestionCount={effectiveQuestionCount}
            isPracticeMode={selectedMode === 'practice'}
            onToggleSelectAllCategory={() => {
              setQuestionCount((prev) => (prev === 'all' ? 20 : 'all'));
            }}
            onLaunchAllCategory={() => handleLaunchSession('all')}
            onSelectQuestionCount={(count) => setQuestionCount(count)}
          />
        </div>
      )}

      {/* 5. Apple Command Deck Launch Bar */}
      <CommandDeckLaunchBar
        selectedCategoryLabel={selectedCategoryLabel}
        matchingQuestionCount={matchingQuestionCount}
        effectiveQuestionCount={effectiveQuestionCount}
        selectedMode={selectedMode}
        questionCount={questionCount}
        repetitionFilter={repetitionFilter}
        onLaunch={() => handleLaunchSession()}
      />

      {/* Global Question Bank Recovery Modal */}
      <ResetBankConfirmationModal
        isOpen={showResetBankModal}
        onClose={() => setShowResetBankModal(false)}
      />
    </div>
  );
};
