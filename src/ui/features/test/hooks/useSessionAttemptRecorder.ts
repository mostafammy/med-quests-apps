import { useCallback } from 'react';
import type { Question, ChoiceId, Confidence, SessionMode } from '../../../../domain/model/types.ts';
import type { BlockId } from '../../../../domain/curriculum/ids.ts';
import type { QuestionAttemptTelemetry } from '../PostTestReport.tsx';
import type { SessionConfig } from '../sessionPlayerHelpers.ts';
import type { VisualSlotIndex } from '../../../../../specs/006-psychometric-choice-entropy-and-spatial-presentation/contracts/choice-entropy-ports.ts';
import { questionTelemetryTracker } from '../../../../domain/ai/telemetry.ts';
import { analytics } from '../../../../infrastructure/analytics/medQuestsAnalyticsFacade.ts';
import { db } from '../../../../infrastructure/storage/db.ts';
import { upsertSm2ReviewCard } from '../sessionPlayerHelpers.ts';
import { useStatsStore, broadcastTelemetryUpdate } from '../../../../application/stores/useStatsStore.ts';
import { edgeAuthGateway } from '../../../../infrastructure/auth/edgeAuthGateway.ts';
import { useBlockContextStore } from '../../../../application/stores/useBlockContextStore.ts';
import { clearSessionMemento } from '../../../../application/curriculum/SessionLeaveGuard.ts';

export interface UseSessionAttemptRecorderParams {
  readonly activeSessionId: string;
  readonly mode: SessionMode;
  readonly isExamMode: boolean;
  readonly sessionStartTime: number;
  readonly timeLeftSeconds: number;
  readonly sessionQuestions: readonly Question[];
  readonly sessionConfig: SessionConfig;
  readonly answers: Record<string, { choiceId: ChoiceId; isCorrect: boolean }>;
  readonly confidences: Record<string, Confidence>;
  readonly questionTelemetryMap: Record<string, QuestionAttemptTelemetry>;
  readonly currentQ: Question | undefined;
  readonly isAnswered: boolean;
  readonly unansweredCount: number;
  readonly setAnswers: React.Dispatch<React.SetStateAction<Record<string, { choiceId: ChoiceId; isCorrect: boolean }>>>;
  readonly setConfidences: React.Dispatch<React.SetStateAction<Record<string, Confidence>>>;
  readonly setQuestionTelemetryMap: React.Dispatch<React.SetStateAction<Record<string, QuestionAttemptTelemetry>>>;
  readonly setShowExplanation: React.Dispatch<React.SetStateAction<boolean>>;
  readonly setShowFinishModal: React.Dispatch<React.SetStateAction<boolean>>;
  readonly setIsSubmitted: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useSessionAttemptRecorder({
  activeSessionId,
  mode,
  isExamMode,
  sessionStartTime,
  timeLeftSeconds,
  sessionQuestions,
  sessionConfig,
  answers,
  confidences,
  questionTelemetryMap,
  currentQ,
  isAnswered,
  unansweredCount,
  setAnswers,
  setConfidences,
  setQuestionTelemetryMap,
  setShowExplanation,
  setShowFinishModal,
  setIsSubmitted,
}: UseSessionAttemptRecorderParams) {
  const handleSelectConfidence = useCallback(
    (level: Confidence) => {
      if (!currentQ) return;
      questionTelemetryTracker.recordConfidence(level, currentQ.id);
      setConfidences((prev) => ({ ...prev, [currentQ.id]: level }));
      setQuestionTelemetryMap((prev) => ({
        ...prev,
        [currentQ.id]: {
          ...(prev[currentQ.id] ?? { responseTimeMs: 0 }),
          confidence: level,
        },
      }));

      analytics.capture('question:confidence_rated', {
        session_id: activeSessionId,
        question_id: currentQ.id,
        confidence_level: level,
        input_modality: 'pointer-click',
      });
    },
    [currentQ, activeSessionId, setConfidences, setQuestionTelemetryMap]
  );

  const handleSubmitExam = useCallback(async () => {
    try {
      const totalAnswered = Object.keys(answers).length;
      const totalCorrect = Object.values(answers).filter((a) => a.isCorrect).length;
      const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
      const totalDuration = Math.max(1000, Date.now() - sessionStartTime);

      analytics.capture('study_session:completed', {
        session_id: activeSessionId,
        session_mode: mode,
        total_questions: sessionQuestions.length,
        answered_questions: totalAnswered,
        correct_count: totalCorrect,
        accuracy_percent: accuracy,
        total_duration_ms: totalDuration,
        avg_pace_ms_per_question: Math.round(totalDuration / Math.max(1, totalAnswered)),
        completion_reason:
          isExamMode && timeLeftSeconds <= 0 ? 'timer-expired' : 'user-submitted',
      });

      if (isExamMode) {
        const nowIso = new Date().toISOString();
        const nextTelemetryMap: Record<string, QuestionAttemptTelemetry> = {
          ...questionTelemetryMap,
        };

        const records = Object.entries(answers).map(([qId, ans]) => {
          const snap = questionTelemetryTracker.getQuestionSnapshot(qId);
          const conf = confidences[qId] ?? snap.confidence ?? 'unsure';
          const responseTimeMs = Math.max(1000, snap.activeTimeSpentMs ?? 15000);
          nextTelemetryMap[qId] = {
            responseTimeMs,
            firstSelectedChoiceId: snap.firstSelectedChoiceId,
            choiceChangesCount: snap.choiceChangesCount,
            confidence: conf,
          };
          const targetQ = sessionQuestions.find((sq) => sq.id === qId);
          const blockId = (targetQ?.blockId ||
            sessionConfig.blockId ||
            useBlockContextStore.getState().activeBlockId ||
            'cvs') as BlockId;
          return {
            id: `att-${Date.now()}-${qId}`,
            questionId: qId,
            blockId,
            sessionId: activeSessionId,
            mode,
            selectedChoiceId: ans.choiceId,
            isCorrect: ans.isCorrect,
            confidence: conf,
            responseTimeMs,
            answeredAt: nowIso,
            firstSelectedChoiceId: snap.firstSelectedChoiceId ?? null,
            choiceChangesCount: snap.choiceChangesCount ?? 0,
            eliminatedChoiceIds: [...(snap.eliminatedChoiceIds ?? [])],
            aiCopilotConsulted: Boolean(snap.aiCopilotConsulted),
          };
        });

        setQuestionTelemetryMap(nextTelemetryMap);
        if (records.length > 0) {
          await db.attempts.bulkPut(records);
          for (const rec of records) {
            await upsertSm2ReviewCard(
              rec.questionId,
              rec.blockId,
              Boolean(rec.isCorrect),
              rec.confidence
            );
          }
          await useStatsStore.getState().refreshStats();
          broadcastTelemetryUpdate();
        }
      }
      void edgeAuthGateway.syncLocalStudyTelemetryToEdge();
    } catch (err) {
      console.error('Failed to save exam attempts in DB:', err);
    } finally {
      setShowFinishModal(false);
      setIsSubmitted(true);
      const targetBlockId = (sessionConfig.blockId ||
        useBlockContextStore.getState().activeBlockId ||
        'cvs') as BlockId;
      clearSessionMemento(targetBlockId);
    }
  }, [
    answers,
    confidences,
    isExamMode,
    mode,
    questionTelemetryMap,
    activeSessionId,
    sessionQuestions,
    sessionConfig.blockId,
    sessionStartTime,
    timeLeftSeconds,
    setQuestionTelemetryMap,
    setShowFinishModal,
    setIsSubmitted,
  ]);

  const handleRequestFinish = useCallback(() => {
    if (unansweredCount === 0) {
      void handleSubmitExam();
    } else {
      setShowFinishModal(true);
    }
  }, [unansweredCount, handleSubmitExam, setShowFinishModal]);

  const handleSelectAnswer = useCallback(
    (
      choiceId: ChoiceId,
      slotIdx: VisualSlotIndex = 0,
      modality: 'pointer-click' | 'keyboard-digit-shortcut' | 'touch-tap' = 'pointer-click'
    ) => {
      if (!currentQ) return;
      if (!isExamMode && isAnswered) return;

      const hadPriorAnswer = !!answers[currentQ.id];
      questionTelemetryTracker.recordChoiceSelection(choiceId);
      const snap = questionTelemetryTracker.getQuestionSnapshot(currentQ.id);
      const selectedConf = confidences[currentQ.id] ?? snap.confidence ?? 'unsure';
      const responseTimeMs = Math.max(500, snap.activeTimeSpentMs ?? 1500);

      const correctChoice = currentQ.choices.find((c) => c.isCorrect);
      const isCorrect = correctChoice?.id === choiceId;

      analytics.capture('question:choice_interacted', {
        session_id: activeSessionId,
        question_id: currentQ.id,
        interaction_type: hadPriorAnswer ? 'change_choice' : 'select_choice',
        canonical_choice_id: choiceId,
        visual_slot_index: slotIdx,
        input_modality: modality,
        time_since_question_displayed_ms: responseTimeMs,
        choice_changes_so_far: snap.choiceChangesCount ?? 0,
      });

      setAnswers((prev) => ({
        ...prev,
        [currentQ.id]: { choiceId, isCorrect },
      }));

      setQuestionTelemetryMap((prev) => ({
        ...prev,
        [currentQ.id]: {
          responseTimeMs,
          firstSelectedChoiceId: snap.firstSelectedChoiceId,
          choiceChangesCount: snap.choiceChangesCount,
          confidence: selectedConf,
        },
      }));

      if (!isExamMode) {
        const isFast = responseTimeMs <= 45000;
        const pacingQuadrant = isFast
          ? isCorrect
            ? 'fast-accurate'
            : 'fast-wrong'
          : isCorrect
          ? 'slow-accurate'
          : 'slow-wrong';

        let instinctPivot: 'none' | 'wrong-to-right' | 'right-to-wrong' | 'wrong-to-wrong' =
          'none';
        if (snap.firstSelectedChoiceId && snap.firstSelectedChoiceId !== choiceId) {
          const wasFirstCorrect = snap.firstSelectedChoiceId === correctChoice?.id;
          if (!wasFirstCorrect && isCorrect) instinctPivot = 'wrong-to-right';
          else if (wasFirstCorrect && !isCorrect) instinctPivot = 'right-to-wrong';
          else if (!wasFirstCorrect && !isCorrect) instinctPivot = 'wrong-to-wrong';
        }

        analytics.capture('question:attempt_committed', {
          session_id: activeSessionId,
          question_id: currentQ.id,
          subject_id: currentQ.subjectId,
          chapter_id: currentQ.chapterId,
          topic_id: currentQ.topicId,
          selected_canonical_choice_id: choiceId,
          first_instinct_choice_id: snap.firstSelectedChoiceId ?? null,
          selected_visual_slot_index: slotIdx,
          is_correct: isCorrect,
          confidence_level: selectedConf,
          active_dwell_ms: responseTimeMs,
          pacing_quadrant: pacingQuadrant,
          choice_changes_count: snap.choiceChangesCount ?? 0,
          instinct_pivot_outcome: instinctPivot,
          eliminated_choices_count: snap.eliminatedChoiceIds?.length ?? 0,
          ai_copilot_consulted: !!snap.aiCopilotConsulted,
          sm2_resulting_interval_days: isCorrect ? (selectedConf === 'sure' ? 3 : 1) : 0,
        });

        setShowExplanation(true);
        const blockId = (currentQ.blockId ||
          sessionConfig.blockId ||
          useBlockContextStore.getState().activeBlockId ||
          'cvs') as BlockId;
        void db.attempts
          .put({
            id: `att-${Date.now()}-${currentQ.id}`,
            questionId: currentQ.id,
            blockId,
            sessionId: activeSessionId,
            mode: 'practice',
            selectedChoiceId: choiceId,
            isCorrect,
            confidence: selectedConf,
            responseTimeMs,
            answeredAt: new Date().toISOString(),
            firstSelectedChoiceId: snap.firstSelectedChoiceId ?? null,
            choiceChangesCount: snap.choiceChangesCount ?? 0,
            eliminatedChoiceIds: [...(snap.eliminatedChoiceIds ?? [])],
            aiCopilotConsulted: Boolean(snap.aiCopilotConsulted),
          })
          .then(async () => {
            await upsertSm2ReviewCard(currentQ.id, blockId, isCorrect, selectedConf);
            await useStatsStore.getState().refreshStats();
            broadcastTelemetryUpdate();
            void edgeAuthGateway.syncLocalStudyTelemetryToEdge();
          });
      }
    },
    [
      currentQ,
      isExamMode,
      isAnswered,
      activeSessionId,
      answers,
      confidences,
      sessionConfig.blockId,
      setAnswers,
      setQuestionTelemetryMap,
      setShowExplanation,
    ]
  );

  return {
    handleSelectConfidence,
    handleSubmitExam,
    handleRequestFinish,
    handleSelectAnswer,
  };
}
