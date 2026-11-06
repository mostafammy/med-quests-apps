import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuestionStore } from '../../../application/stores/useQuestionStore.ts';
import { useStatsStore, broadcastTelemetryUpdate } from '../../../application/stores/useStatsStore.ts';
import { Question, ChoiceId, Confidence, ReviewCard } from '../../../domain/model/types.ts';
import { db } from '../../../infrastructure/storage/db.ts';
import { PostTestReport, QuestionAttemptTelemetry } from './PostTestReport.tsx';
import { QuestionNavigatorStrip } from './QuestionNavigatorStrip.tsx';
import { QuestionMatrixModal } from './QuestionMatrixModal.tsx';
import { useCopilotStore } from '../../../application/stores/useCopilotStore.ts';
import { questionTelemetryTracker } from '../../../domain/ai/telemetry.ts';
import { edgeAuthGateway } from '../../../infrastructure/auth/edgeAuthGateway.ts';
import { CopilotTriggerButton } from '../copilot/CopilotTriggerButton.tsx';
import { AiCopilotDrawer } from '../copilot/AiCopilotDrawer.tsx';
import { ThemeToggle } from '../../app/ThemeToggle.tsx';
import { LocaleToggle } from '../../app/LocaleToggle.tsx';
import { useLocaleStore } from '../../../application/stores/useLocaleStore.ts';
import { useBlockContextStore } from '../../../application/stores/useBlockContextStore.ts';
import { DexieBlockScopedAttemptRepository } from '../../../infrastructure/storage/DexieBlockScopedRepositories.ts';
import type { BlockId } from '../../../domain/curriculum/ids.ts';
import { SessionSeededSpatialPresentationStrategy } from '../../../domain/questionBank/spatialChoicePresenter.ts';
import { analytics } from '../../../infrastructure/analytics/medQuestsAnalyticsFacade.ts';
import { compositionRoot } from '../../../application/composition/clientCompositionRoot.ts';
import {
  saveSessionMemento,
  clearSessionMemento,
  useSessionLeaveDialogStore,
  type SavedSessionMemento,
} from '../../../application/curriculum/SessionLeaveGuard.ts';
import type { VisualSlotIndex } from '../../../../specs/006-psychometric-choice-entropy-and-spatial-presentation/contracts/choice-entropy-ports.ts';
import { 
  ArrowLeft, 
  ArrowRight, 
  Flag, 
  Bookmark, 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  LayoutGrid,
  Sparkles
} from 'lucide-react';

async function upsertSm2ReviewCard(
  questionId: string,
  blockId: string,
  isCorrect: boolean,
  confidence: Confidence
): Promise<void> {
  try {
    const existing = await db.reviewCards.get(questionId);
    const now = new Date();
    let easeFactor = existing?.easeFactor ?? 2.5;
    let repetitions = existing?.repetitions ?? 0;
    let lapses = existing?.lapses ?? 0;
    let intervalDays = existing?.intervalDays ?? 0;

    if (isCorrect) {
      const quality = confidence === 'sure' ? 5 : confidence === 'unsure' ? 4 : 3;
      if (repetitions === 0) {
        intervalDays = confidence === 'sure' ? 3 : 1;
      } else if (repetitions === 1) {
        intervalDays = confidence === 'sure' ? 6 : 3;
      } else {
        intervalDays = Math.max(1, Math.round(intervalDays * easeFactor));
      }
      repetitions += 1;
      easeFactor = Math.max(
        1.3,
        easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
      );
    } else {
      repetitions = 0;
      lapses += 1;
      intervalDays = 0; // Due immediately for spaced repetition review
      easeFactor = Math.max(1.3, easeFactor - 0.2);
    }

    const dueAt = new Date(now.getTime() + intervalDays * 86_400_000).toISOString();
    const updatedCard: ReviewCard = {
      questionId,
      blockId,
      easeFactor: Number(easeFactor.toFixed(2)),
      intervalDays,
      repetitions,
      lapses,
      dueAt,
      lastReviewedAt: now.toISOString(),
    };
    await db.reviewCards.put(updatedCard);
  } catch (err) {
    console.warn('SM-2 review card update skipped:', err);
  }
}

export const SessionPlayer: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { questions: allQuestions } = useQuestionStore();
  const { t, isRtl } = useLocaleStore();

  const sessionConfig = useMemo(() => {
    return (location.state as {
      mode?: 'practice' | 'mock' | 'rapid' | 'retest' | 'exam';
      subjectId?: string;
      chapterId?: string;
      questionCount?: number | 'all';
      timeLimitMinutes?: number;
      highYieldOnly?: boolean;
      questionFilter?: 'all' | 'unanswered' | 'incorrect';
      questionIds?: string[];
      blockId?: string;
      savedSession?: SavedSessionMemento;
    }) || { mode: 'practice', questionCount: 20 };
  }, [location.state]);

  const mode = sessionConfig.savedSession?.mode || sessionConfig.mode || 'practice';
  const isExamMode = mode === 'mock' || mode === 'exam';

  // Synchronously compute initial question slice to prevent 1-frame empty flash on first paint
  const initialSessionQuestions = useMemo(() => {
    const targetQIds = sessionConfig.savedSession?.questionIds || sessionConfig.questionIds;
    if (targetQIds && targetQIds.length > 0) {
      const idSet = new Set(targetQIds);
      const ordered = allQuestions.filter((q) => idSet.has(q.id));
      const rawCount = sessionConfig.questionCount;
      const count =
        rawCount === 'all'
          ? ordered.length
          : typeof rawCount === 'number'
          ? rawCount
          : ordered.length;
      return ordered.slice(0, count);
    }

    let pool = [...allQuestions];
    if (sessionConfig.subjectId && sessionConfig.subjectId !== 'all') {
      pool = pool.filter((q) => q.subjectId === sessionConfig.subjectId);
    }
    if (sessionConfig.chapterId && sessionConfig.chapterId !== 'all') {
      pool = pool.filter((q) => q.chapterId === sessionConfig.chapterId);
    }
    if (sessionConfig.highYieldOnly) {
      const hyPool = pool.filter((q) => q.highYield);
      if (hyPool.length > 0) {
        pool = hyPool;
      }
    }

    const rawCount = sessionConfig.questionCount;
    const count =
      rawCount === 'all'
        ? pool.length
        : typeof rawCount === 'number'
        ? rawCount
        : 20;
    return pool.slice(0, count);
  }, [allQuestions, sessionConfig]);

  // Filter questions according to session config
  const [sessionQuestions, setSessionQuestions] = useState<Question[]>(initialSessionQuestions);
  const [currentIndex, setCurrentIndex] = useState(() => sessionConfig.savedSession?.currentIndex ?? 0);
  const [answers, setAnswers] = useState<Record<string, { choiceId: ChoiceId; isCorrect: boolean }>>(
    () => (sessionConfig.savedSession?.answers as Record<string, { choiceId: ChoiceId; isCorrect: boolean }>) || {}
  );
  const [confidences, setConfidences] = useState<Record<string, Confidence>>(
    () => (sessionConfig.savedSession?.confidences as Record<string, Confidence>) || {}
  );
  const [questionTelemetryMap, setQuestionTelemetryMap] = useState<Record<string, QuestionAttemptTelemetry>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>(() => sessionConfig.savedSession?.flags || {});
  const [bookmarks, setBookmarks] = useState<Record<string, boolean>>({});
  const [showExplanation, setShowExplanation] = useState(true);
  const [showMatrixModal, setShowMatrixModal] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [sessionStartTime] = useState<number>(() => Date.now());
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(
    () => sessionConfig.savedSession?.timeLeftSeconds ?? ((sessionConfig.timeLimitMinutes || 120) * 60)
  );
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [activeSessionId] = useState<string>(
    () => sessionConfig.savedSession?.sessionId || `sess-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  );

  // Register Mid-Session Leave Guard with compositionRoot (US4)
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
  }, [isSubmitted, sessionQuestions, answers, confidences, flags, currentIndex, timeLeftSeconds, activeSessionId, mode]);

  // Load persisted bookmarks on mount
  useEffect(() => {
    let mounted = true;
    db.bookmarks.toArray().then((rows) => {
      if (!mounted) return;
      const map: Record<string, boolean> = {};
      rows.forEach((r) => {
        map[r.questionId] = true;
      });
      setBookmarks(map);
    }).catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Initialize session questions
  useEffect(() => {
    let isCancelled = false;

    const initQuestions = async () => {
      // 1. Explicit question IDs (e.g. from targeted practice or retest)
      if (sessionConfig.questionIds && sessionConfig.questionIds.length > 0) {
        const idSet = new Set(sessionConfig.questionIds);
        const ordered = allQuestions.filter((q) => idSet.has(q.id));
        if (!isCancelled) {
          const rawCount = sessionConfig.questionCount;
          const count =
            rawCount === 'all'
              ? ordered.length
              : typeof rawCount === 'number'
              ? rawCount
              : ordered.length;
          setSessionQuestions(ordered.slice(0, count));
        }
        return;
      }

      // 2. Standard Curriculum Filtering
      let pool = [...allQuestions];
      if (sessionConfig.subjectId && sessionConfig.subjectId !== 'all') {
        pool = pool.filter((q) => q.subjectId === sessionConfig.subjectId);
      }
      if (sessionConfig.chapterId && sessionConfig.chapterId !== 'all') {
        pool = pool.filter((q) => q.chapterId === sessionConfig.chapterId);
      }
      if (sessionConfig.highYieldOnly) {
        const hyPool = pool.filter((q) => q.highYield);
        if (hyPool.length > 0) {
          pool = hyPool;
        }
      }

      // 3. Question Repetition & Coverage Scope Filter
      const qFilter = sessionConfig.questionFilter || 'all';
      if (qFilter !== 'all') {
        const targetBlockId = (sessionConfig.blockId || useBlockContextStore.getState().activeBlockId || 'cvs') as BlockId;
        const attemptRepo = new DexieBlockScopedAttemptRepository(targetBlockId);
        const attempts = (await attemptRepo.all()) as any[];
        const attemptsByQ = new Map<string, typeof attempts>();
        attempts.forEach((a) => {
          const list = attemptsByQ.get(a.questionId) || [];
          list.push(a);
          attemptsByQ.set(a.questionId, list);
        });

        if (qFilter === 'unanswered') {
          pool = pool.filter((q) => !attemptsByQ.has(q.id));
        } else if (qFilter === 'incorrect') {
          pool = pool.filter((q) => {
            const atts = attemptsByQ.get(q.id);
            if (!atts || atts.length === 0) return false;
            const sorted = [...atts].sort(
              (a, b) => new Date(b.answeredAt).getTime() - new Date(a.answeredAt).getTime()
            );
            return sorted[0]?.isCorrect === false;
          });
        }
      }

      const rawCount = sessionConfig.questionCount;
      const count =
        rawCount === 'all'
          ? pool.length
          : typeof rawCount === 'number'
          ? rawCount
          : 20;

      if (!isCancelled) {
        setSessionQuestions(pool.slice(0, count));
      }
    };

    initQuestions();

    return () => {
      isCancelled = true;
    };
  }, [allQuestions, sessionConfig]);

  const currentQ = sessionQuestions[currentIndex];
  const spatialPresenter = useMemo(() => new SessionSeededSpatialPresentationStrategy(), []);
  const presentedChoices = useMemo(() => {
    if (!currentQ) return [];
    return spatialPresenter.projectChoices(currentQ, activeSessionId);
  }, [currentQ, activeSessionId, spatialPresenter]);
  const currentAnswer = currentQ ? answers[currentQ.id] : undefined;
  const currentConfidence: Confidence = currentQ ? confidences[currentQ.id] ?? 'unsure' : 'unsure';
  const isAnswered = !!currentAnswer;
  const isLastQuestion = sessionQuestions.length > 0 && currentIndex === sessionQuestions.length - 1;
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = Math.max(0, sessionQuestions.length - answeredCount);
  const flaggedCount = Object.values(flags).filter(Boolean).length;

  // 1. Session Lifecycle Telemetry (study_session:started)
  const sessionStartedRef = React.useRef(false);
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
  }, [sessionQuestions.length, activeSessionId, mode, isExamMode, timeLeftSeconds, sessionConfig]);

  // 2. Active Question Impression Telemetry (question:displayed)
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

  // 3. Early Session Abandonment Telemetry (study_session:abandoned)
  const isSubmittedRef = React.useRef(isSubmitted);
  isSubmittedRef.current = isSubmitted;
  const answersCountRef = React.useRef(Object.keys(answers).length);
  answersCountRef.current = Object.keys(answers).length;
  const sessionQuestionsLenRef = React.useRef(sessionQuestions.length);
  sessionQuestionsLenRef.current = sessionQuestions.length;
  const currentIndexRef = React.useRef(currentIndex);
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

  // AI Co-Pilot Viewport Integration
  const { setSurface } = useCopilotStore();

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
    [currentQ, activeSessionId]
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
        completion_reason: isExamMode && timeLeftSeconds <= 0 ? 'timer-expired' : 'user-submitted',
      });

      if (isExamMode) {
        const nowIso = new Date().toISOString();
        const nextTelemetryMap: Record<string, QuestionAttemptTelemetry> = { ...questionTelemetryMap };

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
          const blockId = (targetQ?.blockId || sessionConfig.blockId || useBlockContextStore.getState().activeBlockId || 'cvs') as BlockId;
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
      const targetBlockId = (sessionConfig.blockId || useBlockContextStore.getState().activeBlockId || 'cvs') as BlockId;
      clearSessionMemento(targetBlockId);
    }
  }, [answers, confidences, isExamMode, mode, questionTelemetryMap, activeSessionId, sessionQuestions.length, sessionStartTime, timeLeftSeconds]);

  const handleRequestFinish = useCallback(() => {
    if (unansweredCount === 0) {
      void handleSubmitExam();
    } else {
      setShowFinishModal(true);
    }
  }, [unansweredCount, handleSubmitExam]);

  // Countdown timer for Exam Mode
  useEffect(() => {
    if (!isExamMode || isSubmitted) return;
    const interval = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isExamMode, isSubmitted, handleSubmitExam]);

  // Immediate Commit Answer handler
  const handleSelectAnswer = useCallback((
    choiceId: ChoiceId,
    slotIdx: VisualSlotIndex = 0,
    modality: 'pointer-click' | 'keyboard-digit-shortcut' | 'touch-tap' = 'pointer-click'
  ) => {
    if (!currentQ) return;

    // In practice mode, once committed, cannot change
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
        ? (isCorrect ? 'fast-accurate' : 'fast-wrong')
        : (isCorrect ? 'slow-accurate' : 'slow-wrong');

      let instinctPivot: 'none' | 'wrong-to-right' | 'right-to-wrong' | 'wrong-to-wrong' = 'none';
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
      const blockId = (currentQ.blockId || sessionConfig.blockId || useBlockContextStore.getState().activeBlockId || 'cvs') as BlockId;
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
  }, [currentQ, isExamMode, isAnswered, activeSessionId, answers, confidences]);

  const handleNext = useCallback(() => {
    if (currentIndex < sessionQuestions.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      const nextQ = sessionQuestions[nextIndex];
      setShowExplanation(!!(nextQ && answers[nextQ.id]));
    } else {
      handleSubmitExam();
    }
  }, [currentIndex, sessionQuestions, answers, handleSubmitExam]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      const prevQ = sessionQuestions[prevIndex];
      setShowExplanation(!!(prevQ && answers[prevQ.id]));
    }
  }, [currentIndex, sessionQuestions, answers]);

  const handleToggleFlag = useCallback(() => {
    if (!currentQ) return;
    setFlags((prev) => ({ ...prev, [currentQ.id]: !prev[currentQ.id] }));
  }, [currentQ]);

  const handleToggleBookmark = useCallback(() => {
    if (!currentQ) return;
    setBookmarks((prev) => {
      const nextState = !prev[currentQ.id];
      if (nextState) {
        void db.bookmarks.put({
          questionId: currentQ.id,
          blockId: currentQ.blockId || 'cvs',
          bookmarkedAt: new Date().toISOString(),
        });
      } else {
        void db.bookmarks.delete(currentQ.id);
      }
      return { ...prev, [currentQ.id]: nextState };
    });
  }, [currentQ]);

  // Keyboard Navigation: Spatial Model (1-4 for choices, arrows, F, B, E, Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === 'Escape' && showFinishModal) {
        setShowFinishModal(false);
        return;
      }

      if (['1', '2', '3', '4'].includes(e.key)) {
        const slotIdx = (parseInt(e.key, 10) - 1) as VisualSlotIndex;
        const targetCanonicalId = spatialPresenter.resolveCanonicalChoiceIdBySlot(
          presentedChoices,
          slotIdx
        );
        if (targetCanonicalId) {
          handleSelectAnswer(targetCanonicalId, slotIdx, 'keyboard-digit-shortcut');
        }
      }
      else if (e.key === 'ArrowRight') {
        if (isLastQuestion) {
          if (!isExamMode && isAnswered) {
            handleSubmitExam();
          } else if (isExamMode) {
            handleSubmitExam();
          }
        } else {
          handleNext();
        }
      }
      else if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === 'Enter') {
        if (!isExamMode && isAnswered) {
          if (isLastQuestion) {
            handleSubmitExam();
          } else {
            handleNext();
          }
        } else if (isExamMode) {
          if (isLastQuestion) {
            handleSubmitExam();
          } else {
            handleNext();
          }
        }
      }
      else if (e.key.toLowerCase() === 'f') handleToggleFlag();
      else if (e.key.toLowerCase() === 'b') handleToggleBookmark();
      else if (e.key.toLowerCase() === 'e') setShowExplanation((prev) => !prev);
      else if (e.key.toLowerCase() === 'g') setShowMatrixModal((prev) => !prev);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleSelectAnswer,
    handleNext,
    handlePrev,
    handleSubmitExam,
    handleToggleFlag,
    handleToggleBookmark,
    isExamMode,
    isAnswered,
    isLastQuestion,
    presentedChoices,
    spatialPresenter,
    showFinishModal,
  ]);

  if (sessionQuestions.length === 0) {
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
          onClick={() => navigate('/studio')}
          className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-all"
        >
          Open Question Studio
        </button>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 py-4 pb-20 text-slate-900 dark:text-zinc-100">
        <PostTestReport
          result={{
            sessionQuestions,
            answers,
            timeSpentSeconds: isExamMode
              ? (sessionConfig.timeLimitMinutes || 120) * 60 - timeLeftSeconds
              : Math.max(1, Math.round((Date.now() - sessionStartTime) / 1000)),
            mode,
            questionTelemetry: questionTelemetryMap,
          }}
          onRetestMistakes={(mistakes) => {
            setSessionQuestions(mistakes);
            setCurrentIndex(0);
            setAnswers({});
            setShowExplanation(false);
            setIsSubmitted(false);
          }}
        />
      </div>
    );
  }

  // Format countdown mm:ss or hh:mm:ss
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className={`min-h-screen flex flex-col relative overflow-x-hidden ${
      isExamMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100'
    }`}>
      {/* Universal Ambient Chromatic Glow Background Orbs for Apple Glassmorphism Depth */}
      <div className="fixed -top-12 left-1/4 w-[42rem] h-[42rem] bg-gradient-to-tr from-blue-400/20 via-indigo-400/15 to-transparent rounded-full blur-3xl pointer-events-none -z-10 animate-float-fluid opacity-80 dark:opacity-40" />
      <div className="fixed -bottom-16 right-1/4 w-[38rem] h-[38rem] bg-gradient-to-bl from-purple-400/20 via-pink-400/15 to-transparent rounded-full blur-3xl pointer-events-none -z-10 animate-float-fluid-reverse opacity-75 dark:opacity-35" />
      <div className="fixed top-1/3 right-10 w-96 h-96 bg-gradient-to-br from-cyan-400/15 to-emerald-400/15 rounded-full blur-3xl pointer-events-none -z-10 animate-float-fluid opacity-60 dark:opacity-30" />

      {/* Session Top Bar - Apple Frosted Glass Header */}
      <header className={`sticky top-0 z-40 border-b px-2.5 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-1.5 sm:gap-3 backdrop-blur-2xl transition-all ${
        isExamMode 
          ? 'bg-slate-900/85 border-slate-800/80 text-slate-100 shadow-md' 
          : 'bg-white/75 dark:bg-zinc-900/75 border-white/60 dark:border-zinc-800/80 text-slate-900 dark:text-zinc-100 shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)]'
      }`}>
        <div className="flex items-center space-x-2 sm:space-x-3 rtl:space-x-reverse shrink-0">
          <button
            onClick={() => {
              void useStatsStore.getState().refreshStats();
              navigate('/');
            }}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 rtl:space-x-reverse apple-tap cursor-pointer transition-all ${
              isExamMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
            title={t.common.exitSession}
          >
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            <span className="hidden sm:inline font-bold">{t.common.exit}</span>
          </button>
          <div className="h-4 w-px bg-slate-300 dark:bg-zinc-700" />
          
          {/* Apple Dynamic Capsule Pill */}
          <button
            onClick={() => setShowMatrixModal(true)}
            className={`group flex items-center space-x-1.5 sm:space-x-2.5 rtl:space-x-reverse px-3 py-1.5 rounded-full transition-all border shadow-xs cursor-pointer apple-tap ${
              isExamMode
                ? 'bg-slate-800/90 hover:bg-slate-750 border-slate-700 text-slate-100 hover:border-slate-600'
                : 'glass-pill-luxury text-slate-900 dark:text-zinc-100'
            }`}
            title={t.test.matrix.title}
          >
            <div className="flex items-center space-x-1 rtl:space-x-reverse text-xs font-bold tracking-tight">
              <span className="text-blue-600 dark:text-blue-400 font-mono font-extrabold text-xs sm:text-sm">
                {String(currentIndex + 1).padStart(2, '0')}
              </span>
              <span className="text-slate-400 font-normal">/</span>
              <span className="text-slate-500 font-mono font-semibold text-xs">
                {String(sessionQuestions.length).padStart(2, '0')}
              </span>
            </div>

            {/* Apple Micro Progress Bar inside capsule */}
            <div className="w-12 h-1.5 bg-slate-200/80 dark:bg-zinc-700/80 rounded-full overflow-hidden hidden sm:block">
              <div 
                className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 rounded-full transition-all duration-300"
                style={{ width: `${Math.round(((currentIndex + 1) / sessionQuestions.length) * 100)}%` }}
              />
            </div>

            <LayoutGrid className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
          </button>

          {currentQ.highYield && (
            <span className="hidden md:inline-flex items-center space-x-1 rtl:space-x-reverse text-[10px] font-black px-2.5 py-0.5 bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-400/40 rounded-full shadow-xs">
              <span>⚡ {t.common.highYield}</span>
            </span>
          )}

          {sessionConfig.questionFilter === 'unanswered' && (
            <span className="hidden md:inline-flex items-center space-x-1.5 rtl:space-x-reverse text-[10px] font-black px-2.5 py-0.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-400/40 rounded-full shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{t.test.zeroDuplicatesBadge}</span>
            </span>
          )}
        </div>

        {/* Center / Right: Timer, Theme Toggle & Controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {isExamMode && (
            <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono font-bold text-amber-400 shadow-xs">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTime(timeLeftSeconds)}</span>
            </div>
          )}

          <button
            onClick={handleToggleFlag}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all apple-tap cursor-pointer ${
              flags[currentQ.id]
                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100/70 dark:hover:bg-zinc-800/70'
            }`}
            title={flags[currentQ.id] ? t.test.player.flagged : t.test.player.flagQuestion}
          >
            <Flag className={`w-4 h-4 ${flags[currentQ.id] ? 'fill-current text-amber-500' : ''}`} />
            <span className="hidden lg:inline font-bold">{flags[currentQ.id] ? t.test.player.flagged : t.test.player.flagQuestion}</span>
          </button>

          <button
            onClick={handleToggleBookmark}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all apple-tap cursor-pointer ${
              bookmarks[currentQ.id]
                ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/40'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100/70 dark:hover:bg-zinc-800/70'
            }`}
            title={bookmarks[currentQ.id] ? t.test.player.bookmarked : t.test.player.bookmarkQuestion}
          >
            <Bookmark className={`w-4 h-4 ${bookmarks[currentQ.id] ? 'fill-current text-blue-500' : ''}`} />
          </button>

          {/* Locale Toggle (Apple Bilingual EN / AR Switcher) */}
          <div className="hidden sm:inline-flex">
            <LocaleToggle />
          </div>

          {/* Theme Toggle (Apple Light / Dark Switcher) */}
          <ThemeToggle />

          {/* AI Cognitive Co-Pilot Trigger */}
          <CopilotTriggerButton />

          {/* Always-accessible Finish Practice / Submit Exam CTA across all viewports */}
          <button
            type="button"
            onClick={handleRequestFinish}
            data-testid="header-finish-session-btn"
            className={`inline-flex items-center gap-1.5 py-1.5 px-2.5 sm:px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer apple-tap shadow-xs shrink-0 ${
              isExamMode
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25'
                : answeredCount > 0
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/20'
                : 'bg-slate-100/90 dark:bg-zinc-800/90 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-zinc-200 hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200/80 dark:border-zinc-700/80'
            }`}
            title={isExamMode ? t.test.player.submitExam : t.test.player.finishPractice}
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline">
              {isExamMode ? t.test.player.submitExam : t.test.player.finishPractice}
            </span>
            <span className="md:hidden">
              {isExamMode ? t.common.submit : t.common.finish}
            </span>
          </button>
        </div>
      </header>

      {/* Apple Interactive Question Navigator Strip */}
      <QuestionNavigatorStrip
        questions={sessionQuestions}
        currentIndex={currentIndex}
        answers={answers}
        flags={flags}
        bookmarks={bookmarks}
        isExamMode={isExamMode}
        onSelectIndex={(newIdx) => {
          setCurrentIndex(newIdx);
          const targetQ = sessionQuestions[newIdx];
          setShowExplanation(!!(targetQ && answers[targetQ.id]));
        }}
        onOpenMatrix={() => setShowMatrixModal(true)}
      />

      {/* Main Question Workspace */}
      <main className="max-w-4xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 pt-4 sm:pt-6 lg:pt-8 pb-28 sm:pb-32 flex-1 flex flex-col justify-between space-y-6">
        <div className="space-y-6">
          {/* Question Card (Apple Glass Surface) */}
          <div className="glass-surface rounded-3xl p-5 sm:p-7 space-y-4 border border-white/80 dark:border-white/10 shadow-[0_8px_32px_rgba(15,23,42,0.06)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] animate-apple-entrance">
            {/* Question Meta & Pill Counter */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-slate-200/60 dark:border-zinc-800/60">
              <div className="flex items-center flex-wrap gap-2 text-xs font-semibold">
                <span className="glass-pill-luxury px-3 py-1 rounded-full text-blue-700 dark:text-blue-300 font-mono font-bold text-xs border border-blue-400/30">
                  {t.test.player.questionOf.replace('{current}', String(currentIndex + 1)).replace('{total}', String(sessionQuestions.length))}
                </span>
                <span className="glass-pill-luxury px-3 py-1 rounded-full text-slate-700 dark:text-zinc-300 text-xs">
                  {currentQ.subjectId}
                </span>
                <span className="glass-pill-luxury px-3 py-1 rounded-full text-slate-500 dark:text-zinc-400 text-xs">
                  {currentQ.chapterId}
                </span>
              </div>

              <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-zinc-400 font-mono">
                <span className="hidden sm:inline">{t.test.player.pacingTarget}</span>
                <span className="hidden sm:inline">•</span>
                <span className="font-bold text-slate-700 dark:text-zinc-300">
                  {t.test.player.complete.replace('{percent}', String(Math.round(((currentIndex + 1) / sessionQuestions.length) * 100)))}
                </span>
              </div>
            </div>

            {/* Question Stem */}
            <h1 className={`text-lg sm:text-xl lg:text-2xl font-bold leading-relaxed tracking-tight font-heading ${
              isExamMode ? 'text-slate-100' : 'text-slate-900 dark:text-zinc-50'
            }`}>
              {currentQ.stem}
            </h1>

            {/* Apple Confidence Calibration Pill Bar */}
            <div className="pt-2 border-t border-slate-200/50 dark:border-zinc-800/50 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-1.5 rtl:space-x-reverse text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>{t.test.player.confidenceLabel}</span>
              </div>
              <div className="inline-flex items-center p-1 rounded-full bg-slate-100/80 dark:bg-zinc-800/80 border border-slate-200/70 dark:border-zinc-700/70 gap-1">
                {(
                  [
                    { id: 'guess' as const, label: t.test.player.confidenceGuess },
                    { id: 'unsure' as const, label: t.test.player.confidenceUnsure },
                    { id: 'sure' as const, label: t.test.player.confidenceSure },
                  ]
                ).map((item) => {
                  const active = currentConfidence === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectConfidence(item.id)}
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-all cursor-pointer apple-tap ${
                        active
                          ? item.id === 'sure'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : item.id === 'guess'
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Choices (A, B, C, D) - Apple Glassmorphism with High Contrast Answer Differentiation */}
          <div className="space-y-3.5 pt-1" role="radiogroup" aria-label="Question choices">
            {presentedChoices.map((choice, idx) => {
              const isSelected = currentAnswer?.choiceId === choice.canonicalChoiceId;
              const isCorrect = choice.isCorrect;
              const choiceLetter = choice.visualBadgeLetter;

              // Apple Glassmorphism and High Contrast State Engine
              let containerStyle = '';
              let badgeStyle = '';
              let statusPill: React.ReactNode = null;

              if (isExamMode) {
                if (isSelected) {
                  containerStyle =
                    'bg-blue-500/15 dark:bg-blue-600/25 border-2 border-blue-500 dark:border-blue-400 text-slate-900 dark:text-white shadow-lg shadow-blue-500/15 ring-2 ring-blue-500/30';
                  badgeStyle =
                    'bg-blue-600 text-white shadow-md shadow-blue-500/40 ring-2 ring-blue-400/60 font-black';
                  statusPill = (
                    <span className="glass-pill-luxury px-2.5 py-1 rounded-full text-xs font-bold text-blue-600 dark:text-blue-400 border border-blue-400/40 shrink-0">
                      Selected
                    </span>
                  );
                } else {
                  containerStyle =
                    'glass-surface border border-slate-200/80 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-white/80 dark:hover:bg-zinc-800/80 hover:border-slate-300 dark:hover:border-zinc-700';
                  badgeStyle =
                    'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200/80 dark:border-zinc-700/80 font-bold';
                }
              } else if (!isAnswered) {
                // Practice mode - Unanswered: Apple Glass Interactive Card
                containerStyle =
                  'bg-white/85 dark:bg-zinc-900/60 border border-slate-200/90 dark:border-zinc-800 text-slate-800 dark:text-zinc-100 hover:border-blue-500/80 dark:hover:border-blue-400/80 hover:bg-white dark:hover:bg-zinc-800/80 hover:shadow-[0_8px_25px_rgba(59,130,246,0.12)] group shadow-2xs backdrop-blur-xl';
                badgeStyle =
                  'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200/80 dark:border-zinc-700/80 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-colors shadow-2xs font-bold';
                statusPill = (
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity font-mono text-[11px] text-blue-600 dark:text-blue-400 font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 shrink-0 hidden sm:inline-block">
                    {t.test.player.keyShortcut.replace('{num}', String(idx + 1))}
                  </span>
                );
              } else {
                // Practice mode - Answered:
                if (isSelected && isCorrect) {
                  // User chose this and it is CORRECT
                  containerStyle =
                    'bg-emerald-500/15 dark:bg-emerald-500/20 border-2 border-emerald-600 dark:border-emerald-400 text-emerald-950 dark:text-emerald-50 shadow-[0_8px_30px_rgba(16,185,129,0.22)] ring-2 ring-emerald-500/30 backdrop-blur-xl';
                  badgeStyle =
                    'bg-emerald-600 text-white shadow-md shadow-emerald-500/40 ring-2 ring-emerald-400/60 font-black';
                  statusPill = (
                    <div className="shrink-0 flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white font-bold text-xs shadow-sm shadow-emerald-600/30 animate-apple-entrance">
                      <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{t.test.player.yourAnswerCorrect}</span>
                    </div>
                  );
                } else if (isSelected && !isCorrect) {
                  // User chose this and it is WRONG
                  containerStyle =
                    'bg-rose-500/15 dark:bg-rose-500/20 border-2 border-rose-600 dark:border-rose-400 text-rose-950 dark:text-rose-50 shadow-[0_8px_30px_rgba(244,63,94,0.22)] ring-2 ring-rose-500/30 backdrop-blur-xl';
                  badgeStyle =
                    'bg-rose-600 text-white shadow-md shadow-rose-500/40 ring-2 ring-rose-400/60 font-black';
                  statusPill = (
                    <div className="shrink-0 flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-600 text-white font-bold text-xs shadow-sm shadow-rose-600/30 animate-apple-entrance">
                      <XCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{t.test.player.yourChoiceIncorrect}</span>
                    </div>
                  );
                } else if (!isSelected && isCorrect) {
                  // The actual correct answer (User missed it)
                  containerStyle =
                    'bg-emerald-500/10 dark:bg-emerald-500/15 border-2 border-dashed border-emerald-600 dark:border-emerald-400 text-emerald-950 dark:text-emerald-50 shadow-[0_4px_24px_rgba(16,185,129,0.16)] ring-1 ring-emerald-500/20 backdrop-blur-xl';
                  badgeStyle =
                    'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-200 border-2 border-emerald-600 dark:border-emerald-400 font-black';
                  statusPill = (
                    <div className="shrink-0 flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/15 dark:bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 border border-emerald-600/30 dark:border-emerald-400/40 font-bold text-xs backdrop-blur-md animate-apple-entrance">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                      <span>{t.test.player.correctAnswerKey}</span>
                    </div>
                  );
                } else {
                  // Other choices (Neither chosen nor correct)
                  containerStyle =
                    'bg-slate-100/40 dark:bg-zinc-900/40 border border-slate-200/60 dark:border-zinc-800/60 text-slate-400 dark:text-zinc-500 opacity-60 backdrop-blur-xs cursor-not-allowed';
                  badgeStyle =
                    'bg-slate-200/60 dark:bg-zinc-800/60 text-slate-400 dark:text-zinc-500 border border-slate-200/80 dark:border-zinc-700/80 font-bold';
                  statusPill = null;
                }
              }

              return (
                <button
                  key={choice.canonicalChoiceId}
                  onClick={() => handleSelectAnswer(choice.canonicalChoiceId, idx as VisualSlotIndex, 'pointer-click')}
                  disabled={!isExamMode && isAnswered}
                  className={`w-full text-left p-3.5 sm:p-4 rounded-2xl flex items-center justify-between gap-3 transition-all text-sm sm:text-base select-none apple-tap ${
                    !isExamMode && isAnswered ? '' : 'cursor-pointer'
                  } ${containerStyle}`}
                  role="radio"
                  aria-checked={isSelected}
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1 text-start">
                    <span className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl text-xs flex items-center justify-center shrink-0 uppercase transition-all ${badgeStyle}`}>
                      {choiceLetter}
                    </span>
                    <span className="leading-snug pt-0.5 break-words font-medium">
                      {choice.text}
                    </span>
                  </div>

                  {statusPill}
                </button>
              );
            })}
          </div>

          {/* Immediate Evaluation Feedback in Practice Mode - Apple Frosted Glass Panel */}
          {!isExamMode && isAnswered && showExplanation && (
            <div className="p-5 sm:p-7 rounded-3xl border border-white/80 dark:border-white/10 glass-surface space-y-4 animate-apple-entrance shadow-[0_8px_32px_rgba(15,23,42,0.06)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              {/* Top Verdict Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-zinc-800/60">
                <div className="flex items-center space-x-2.5">
                  {currentAnswer.isCorrect ? (
                    <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs sm:text-sm border border-emerald-500/30 shadow-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                      <span>{t.test.player.correctAnswer}</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-rose-500/15 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 font-extrabold text-xs sm:text-sm border border-rose-500/30 shadow-xs">
                      <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 stroke-[2.5]" />
                      <span>
                        {t.test.player.incorrectChoice.replace(
                          '{key}',
                          presentedChoices.find((c) => c.isCorrect)?.visualBadgeLetter || ''
                        )}
                      </span>
                    </div>
                  )}
                </div>

                <div className="glass-pill-luxury px-3 py-1 rounded-full text-xs font-semibold text-slate-600 dark:text-zinc-300 flex items-center space-x-1.5 self-start sm:self-auto">
                  <span>{t.test.player.press}</span>
                  <kbd className="px-1.5 py-0.5 rounded-md bg-slate-200/80 dark:bg-zinc-800 font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400 border border-slate-300/80 dark:border-zinc-700 shadow-2xs">
                    Enter ⏎
                  </kbd>
                  <span>{isLastQuestion ? t.test.player.toFinish : t.test.player.forNextQuestion}</span>
                </div>
              </div>

              {/* Comprehensive Explanation & Rationale */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  {t.test.player.explanationTitle}
                </div>
                <p className="text-slate-900 dark:text-zinc-100 text-sm sm:text-base leading-relaxed font-normal">
                  {currentQ.explanation}
                </p>
              </div>

              {/* High-Yield Exam Tip - Apple Callout Capsule */}
              {currentQ.examTip && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/25 flex items-start space-x-3 text-slate-900 dark:text-zinc-100">
                  <span className="text-amber-500 text-base select-none shrink-0 mt-0.5">⚡</span>
                  <div className="text-xs sm:text-sm leading-relaxed">
                    <strong className="font-extrabold text-amber-800 dark:text-amber-300 mr-1.5">{t.test.player.examTipTitle}</strong>
                    <span className="text-slate-800 dark:text-zinc-200 font-medium">{currentQ.examTip}</span>
                  </div>
                </div>
              )}

              {/* Curriculum Citation (Job 2: TEST -> REVIEW CURRICULUM -> RETEST) */}
              {currentQ.evidence && currentQ.evidence[0] && (
                <div className="pt-3 border-t border-slate-200/60 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center space-x-2 text-slate-600 dark:text-zinc-300">
                    <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>Source: <strong className="text-slate-900 dark:text-zinc-100 font-semibold">{currentQ.evidence[0].sourceName}</strong> ({currentQ.evidence[0].location})</span>
                  </div>
                  <div className="italic text-slate-500 dark:text-zinc-400 truncate max-w-sm">
                    "{currentQ.evidence[0].quote}"
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Navigation Toolbar - Apple VisionOS Floating Glass Command Dock */}
        <div className="fixed bottom-0 inset-x-0 z-30 pointer-events-none px-3 sm:px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
          <div
            data-testid="session-bottom-dock"
            className={`pointer-events-auto max-w-4xl mx-auto rounded-2xl sm:rounded-full px-2.5 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-3 border backdrop-blur-2xl transition-all duration-300 ${
              isExamMode
                ? 'bg-slate-900/90 border-slate-700/80 text-slate-200 shadow-[0_16px_48px_rgba(0,0,0,0.65)]'
                : 'glass-surface border-white/90 dark:border-zinc-700/80 text-slate-800 dark:text-zinc-100 shadow-[0_12px_40px_rgba(15,23,42,0.12)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.65)]'
            }`}
          >
            {/* Left Slot: Tactile Back Pill */}
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className={`h-10 sm:h-11 px-3.5 sm:px-4 rounded-xl sm:rounded-full border font-bold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer apple-tap transition-all shrink-0 disabled:opacity-35 disabled:pointer-events-none ${
                isExamMode
                  ? 'border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200'
                  : 'border-slate-200/90 dark:border-zinc-700/80 bg-white/80 dark:bg-zinc-800/80 hover:bg-white dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-100 shadow-2xs'
              }`}
            >
              <ArrowLeft className="w-4 h-4 rtl:rotate-180 shrink-0" />
              <span>{t.common.back}</span>
            </button>

            {/* Center Slot: Apple Dynamic HUD & Keyboard Command Bar */}
            <div className="flex items-center justify-center min-w-0 flex-1">
              {/* Desktop / Tablet: Refined Tactile Keycap Command Capsule */}
              <div
                className={`hidden md:inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border transition-all duration-300 ${
                  isExamMode
                    ? 'bg-slate-950/80 border-slate-800 text-slate-300'
                    : 'bg-slate-100/85 dark:bg-zinc-900/90 border-slate-200/80 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 shadow-inner'
                }`}
              >
                {!isExamMode && isAnswered ? (
                  <div className="flex items-center gap-2.5 animate-apple-entrance">
                    <button
                      type="button"
                      onClick={isLastQuestion ? handleRequestFinish : handleNext}
                      className="inline-flex items-center gap-1.5 group cursor-pointer"
                    >
                      <kbd className="ltr-isolate px-2 py-0.5 rounded-md bg-blue-600 text-white font-mono text-[10px] font-extrabold shadow-2xs border border-blue-500">
                        Enter ⏎
                      </kbd>
                      <span className="text-xs font-bold text-slate-800 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {isLastQuestion ? t.test.player.finishResults : t.test.player.next}
                      </span>
                    </button>

                    <span className="h-3.5 w-px bg-slate-300/80 dark:bg-zinc-700" />

                    <div className="inline-flex items-center gap-1.5">
                      <kbd className="ltr-isolate px-1.5 py-0.5 rounded-md bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-mono text-[10px] font-bold border border-slate-300/80 dark:border-zinc-700 shadow-2xs">
                        ←
                      </kbd>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                        {t.nav.review}
                      </span>
                    </div>

                    <span className="h-3.5 w-px bg-slate-300/80 dark:bg-zinc-700" />

                    <button
                      type="button"
                      onClick={() => setShowMatrixModal(true)}
                      className="inline-flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                      title={t.test.player.questionMatrixShortcut}
                    >
                      <kbd className="ltr-isolate px-1.5 py-0.5 rounded-md bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-mono text-[10px] font-bold border border-slate-300/80 dark:border-zinc-700 shadow-2xs">
                        G
                      </kbd>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                        {t.test.player.gridShortcut}
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5">
                    {/* 1-4 Answer Keycaps */}
                    <div className="inline-flex items-center gap-1.5">
                      <div className="ltr-isolate inline-flex items-center gap-0.5">
                        {(['1', '2', '3', '4'] as const).map((k) => (
                          <kbd
                            key={k}
                            className="w-5 h-5 inline-flex items-center justify-center rounded-md bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 font-mono text-[10px] font-extrabold border border-slate-300/90 dark:border-zinc-700 shadow-[0_1px_0_rgba(0,0,0,0.08)]"
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300">
                        {t.test.player.answerShortcut}
                      </span>
                    </div>

                    <span className="h-3.5 w-px bg-slate-300/80 dark:bg-zinc-700" />

                    {/* Arrow Keycaps */}
                    <div className="inline-flex items-center gap-1.5">
                      <div className="ltr-isolate inline-flex items-center gap-0.5">
                        <kbd className="w-5 h-5 inline-flex items-center justify-center rounded-md bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 font-mono text-[10px] font-extrabold border border-slate-300/90 dark:border-zinc-700 shadow-[0_1px_0_rgba(0,0,0,0.08)]">
                          ←
                        </kbd>
                        <kbd className="w-5 h-5 inline-flex items-center justify-center rounded-md bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 font-mono text-[10px] font-extrabold border border-slate-300/90 dark:border-zinc-700 shadow-[0_1px_0_rgba(0,0,0,0.08)]">
                          →
                        </kbd>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300">
                        {t.test.player.navigateShortcut}
                      </span>
                    </div>

                    <span className="h-3.5 w-px bg-slate-300/80 dark:bg-zinc-700" />

                    {/* Matrix Grid Shortcut */}
                    <button
                      type="button"
                      onClick={() => setShowMatrixModal(true)}
                      className="inline-flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                      title={t.test.player.questionMatrixShortcut}
                    >
                      <kbd className="ltr-isolate w-5 h-5 inline-flex items-center justify-center rounded-md bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 font-mono text-[10px] font-extrabold border border-slate-300/90 dark:border-zinc-700 shadow-[0_1px_0_rgba(0,0,0,0.08)]">
                        G
                      </kbd>
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300">
                        {t.test.player.gridShortcut}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile / Compact Tablet: Interactive Matrix Progress Pill */}
              <button
                type="button"
                onClick={() => setShowMatrixModal(true)}
                className={`md:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer apple-tap ${
                  isExamMode
                    ? 'bg-slate-800 border-slate-700 text-slate-200'
                    : 'bg-slate-100/90 dark:bg-zinc-800/90 border-slate-200/80 dark:border-zinc-700 text-slate-700 dark:text-zinc-200'
                }`}
                title={t.test.matrix.title}
              >
                <LayoutGrid className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="ltr-isolate font-mono font-extrabold text-blue-600 dark:text-blue-400">
                  {currentIndex + 1}
                </span>
                <span className="text-slate-400">/</span>
                <span className="ltr-isolate font-mono text-slate-500 dark:text-zinc-400">
                  {sessionQuestions.length}
                </span>
              </button>
            </div>

            {/* Right Slot: Finish Practice CTA + Next Action */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {!isLastQuestion && (
                <button
                  type="button"
                  onClick={handleRequestFinish}
                  data-testid="dock-finish-session-btn"
                  title={isExamMode ? t.test.player.submitExam : t.test.player.finishPractice}
                  className={`h-10 sm:h-11 px-3 sm:px-4 rounded-xl sm:rounded-full font-bold text-xs sm:text-sm flex items-center gap-1.5 border cursor-pointer transition-all apple-tap ${
                    isExamMode
                      ? 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border-emerald-700/60'
                      : 'bg-emerald-50/90 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/90 dark:border-emerald-800/70 shadow-2xs'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span className="hidden sm:inline">
                    {isExamMode ? t.test.player.submitExam : t.test.player.finishPractice}
                  </span>
                  <span className="sm:hidden">
                    {isExamMode ? t.common.submit : t.common.finish}
                  </span>
                </button>
              )}

              {isLastQuestion ? (
                <button
                  type="button"
                  onClick={handleSubmitExam}
                  data-testid="dock-primary-finish-btn"
                  className={`h-10 sm:h-11 px-4 sm:px-6 rounded-xl sm:rounded-full font-extrabold text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-lg transition-all apple-tap ${
                    isExamMode
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/25'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/25'
                  }`}
                >
                  <span>{isExamMode ? t.test.player.submitExam : t.test.player.finishResults}</span>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  className="h-10 sm:h-11 px-4 sm:px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl sm:rounded-full font-bold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/25 transition-all apple-tap"
                >
                  <span>{t.common.next}</span>
                  <ArrowRight className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${isRtl ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Apple Confirmation Sheet when finishing early with unanswered questions */}
      {showFinishModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-xl"
          onClick={() => setShowFinishModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="finish-session-modal-title"
            className="w-full max-w-md glass-surface rounded-t-[28px] sm:rounded-3xl p-5 sm:p-6 shadow-2xl border border-white/80 dark:border-white/10 space-y-5 animate-sheet-slide-up sm:animate-spring-modal-in pb-[max(1.5rem,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-zinc-700 rounded-full mx-auto -mt-1 sm:hidden" />

            <div className="space-y-1.5 text-center sm:text-start">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isExamMode ? t.test.player.submitExam : t.test.player.finishPractice}</span>
              </div>
              <h2
                id="finish-session-modal-title"
                className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight font-heading"
              >
                {t.test.player.finishModalTitle}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
                {t.test.player.finishModalSubtitle}
              </p>
            </div>

            {/* Session Telemetry Summary Counters */}
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-3 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/25">
                <div className="text-lg sm:text-xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
                  {answeredCount}
                </div>
                <div className="text-[11px] font-semibold text-emerald-800/80 dark:text-emerald-400">
                  {t.test.player.finishModalAnswered}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-100/80 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700/80">
                <div className="text-lg sm:text-xl font-black text-slate-800 dark:text-zinc-100 font-mono">
                  {unansweredCount}
                </div>
                <div className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                  {t.test.player.finishModalUnanswered}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/25">
                <div className="text-lg sm:text-xl font-black text-amber-700 dark:text-amber-300 font-mono">
                  {flaggedCount}
                </div>
                <div className="text-[11px] font-semibold text-amber-800/80 dark:text-amber-400">
                  {t.test.player.finishModalFlagged}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowFinishModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs sm:text-sm font-bold transition-all cursor-pointer apple-tap"
              >
                {t.test.player.finishModalKeepPracticing}
              </button>
              <button
                type="button"
                onClick={handleSubmitExam}
                data-testid="confirm-finish-session-btn"
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/25 transition-all cursor-pointer apple-tap"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{t.test.player.finishModalConfirm}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Question Matrix Modal (G shortcut) */}
      <QuestionMatrixModal
        isOpen={showMatrixModal}
        onClose={() => setShowMatrixModal(false)}
        questions={sessionQuestions}
        currentIndex={currentIndex}
        answers={answers}
        flags={flags}
        bookmarks={bookmarks}
        isExamMode={isExamMode}
        onSelectIndex={(idx: number) => {
          setCurrentIndex(idx);
          const targetQ = sessionQuestions[idx];
          setShowExplanation(!!(targetQ && answers[targetQ.id]));
        }}
        onFinishSession={handleRequestFinish}
      />

      {/* AI Cognitive Co-Pilot Sliding Drawer */}
      <AiCopilotDrawer />
    </div>
  );
};
