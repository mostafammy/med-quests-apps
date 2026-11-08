import { useEffect, useRef } from 'react';
import type { Question, ChoiceId, Confidence, SessionMode } from '../../../../domain/model/types.ts';
import { questionTelemetryTracker } from '../../../../domain/ai/telemetry.ts';
import { analytics } from '../../../../infrastructure/analytics/medQuestsAnalyticsFacade.ts';
import { useCopilotStore } from '../../../../application/stores/useCopilotStore.ts';
import { compositionRoot } from '../../../../application/composition/clientCompositionRoot.ts';
import {
  saveSessionMemento,
  useSessionLeaveDialogStore,
} from '../../../../application/curriculum/SessionLeaveGuard.ts';
import type { SessionConfig } from '../sessionPlayerHelpers.ts';

export interface UseSessionTelemetryParams {
  readonly activeSessionId: string;
  readonly mode: SessionMode;
  readonly isExamMode: boolean;
  readonly isSubmitted: boolean;
  readonly sessionStartTime: number;
  readonly sessionQuestions: readonly Question[];
  readonly currentIndex: number;
  readonly currentQ: Question | undefined;
  readonly currentAnswer: { choiceId: ChoiceId; isCorrect: boolean } | undefined;
  readonly answers: Record<string, { choiceId: ChoiceId; isCorrect: boolean }>;
  readonly confidences: Record<string, Confidence>;
  readonly flags: Record<string, boolean>;
  readonly bookmarks: Record<string, boolean>;
  readonly timeLeftSeconds: number;
  readonly sessionConfig: SessionConfig;
}

export function useSessionTelemetry({
  activeSessionId,
  mode,
  isExamMode,
  isSubmitted,
  sessionStartTime,
  sessionQuestions,
  currentIndex,
  currentQ,
  currentAnswer,
  answers,
  confidences,
  flags,
  bookmarks,
  timeLeftSeconds,
  sessionConfig,
}: UseSessionTelemetryParams): void {
  const { setSurface } = useCopilotStore();

  // 1. Session Leave Guard Registration
  useEffect(() => {
    if (isSubmitted || sessionQuestions.length === 0) {
      return;
    }

    const unregister = compositionRoot.leaveGuard.registerGuard(async (from, to) => {
      const answeredCount = Object.keys(answers).length;
      const confirmed = await useSessionLeaveDialogStore.getState().prompt({
        fromBlockId: from,
        toBlockId: to,
        answeredCount,
        totalCount: sessionQuestions.length,
      });

      if (confirmed) {
        saveSessionMemento({
          blockId: from,
          sessionId: activeSessionId,
          mode,
          currentIndex,
          questionIds: sessionQuestions.map((q) => q.id),
          answers,
          confidences,
          flags,
          timeLeftSeconds,
          savedAtIso: new Date().toISOString(),
        });
        return true;
      }
      return false;
    });

    return () => {
      unregister();
    };
  }, [
    isSubmitted,
    sessionQuestions,
    answers,
    confidences,
    flags,
    currentIndex,
    timeLeftSeconds,
    activeSessionId,
    mode,
  ]);

  // 2. Session Lifecycle Telemetry (study_session:started)
  const sessionStartedRef = useRef(false);
  useEffect(() => {
    if (sessionStartedRef.current || sessionQuestions.length === 0) return;
    sessionStartedRef.current = true;
    analytics.capture('study_session:started', {
      session_id: activeSessionId,
      session_mode: mode,
      target_question_count: sessionQuestions.length,
      time_limit_minutes: isExamMode ? Math.round(timeLeftSeconds / 60) : null,
      subject_filter_id: sessionConfig.subjectId ?? null,
      chapter_filter_id: sessionConfig.chapterId ?? null,
      question_filter: sessionConfig.questionFilter ?? 'all',
      high_yield_only: !!sessionConfig.highYieldOnly,
    });
  }, [
    sessionQuestions.length,
    activeSessionId,
    mode,
    isExamMode,
    timeLeftSeconds,
    sessionConfig,
  ]);

  // 3. Active Question Impression Telemetry (question:displayed)
  useEffect(() => {
    if (!currentQ || isSubmitted) return;
    questionTelemetryTracker.startQuestion(currentQ.id);

    analytics.capture('question:displayed', {
      session_id: activeSessionId,
      question_id: currentQ.id,
      sequence_index: currentIndex,
      subject_id: currentQ.subjectId,
      chapter_id: currentQ.chapterId,
      topic_id: currentQ.topicId,
      spatial_presentation_mode: 'session-seeded-shuffle',
    });
  }, [currentQ?.id, currentIndex, isSubmitted, activeSessionId]);

  // 4. Early Session Abandonment Telemetry (study_session:abandoned)
  const isSubmittedRef = useRef(isSubmitted);
  isSubmittedRef.current = isSubmitted;
  const answersCountRef = useRef(Object.keys(answers).length);
  answersCountRef.current = Object.keys(answers).length;
  const sessionQuestionsLenRef = useRef(sessionQuestions.length);
  sessionQuestionsLenRef.current = sessionQuestions.length;
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  useEffect(() => {
    return () => {
      if (
        sessionStartedRef.current &&
        !isSubmittedRef.current &&
        answersCountRef.current < sessionQuestionsLenRef.current
      ) {
        analytics.capture('study_session:abandoned', {
          session_id: activeSessionId,
          session_mode: mode,
          abandoned_at_question_index: currentIndexRef.current,
          total_questions_planned: sessionQuestionsLenRef.current,
          answered_before_abandon_count: answersCountRef.current,
          elapsed_duration_ms: Math.max(0, Date.now() - sessionStartTime),
        });
      }
    };
  }, [activeSessionId, mode, sessionStartTime]);

  // 5. AI Co-Pilot Viewport Integration
  useEffect(() => {
    if (!currentQ) return;
    const flaggedIndices = sessionQuestions
      .map((q, idx) => (flags[q.id] ? idx : -1))
      .filter((idx) => idx !== -1);
    const unansweredIndices = sessionQuestions
      .map((q, idx) => (answers[q.id] ? -1 : idx))
      .filter((idx) => idx !== -1);

    setSurface({
      kind: 'session',
      mode,
      isSubmitted,
      question: currentQ,
      questionIndex: currentIndex,
      totalQuestions: sessionQuestions.length,
      selectedChoiceId: currentAnswer?.choiceId ?? null,
      flaggedIndices,
      unansweredIndices,
      remainingMs: isExamMode ? timeLeftSeconds * 1000 : null,
      isBookmarked: !!bookmarks[currentQ.id],
    });
  }, [
    currentQ,
    currentIndex,
    sessionQuestions,
    flags,
    answers,
    mode,
    isSubmitted,
    currentAnswer,
    isExamMode,
    timeLeftSeconds,
    bookmarks,
    setSurface,
  ]);
}
