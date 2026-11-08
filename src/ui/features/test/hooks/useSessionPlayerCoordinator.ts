/**
 * useSessionPlayerCoordinator
 *
 * Dedicated custom hook encapsulating all session state machines, countdown timers,
 * keyboard shortcut integration, spatial choice presentation, bookmark persistence,
 * and exam submission workflows for SessionPlayer.
 *
 * Follows the Single Responsibility Principle: Separation of Intent from Mechanism.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuestionStore } from '../../../../application/stores/useQuestionStore.ts';
import { useStatsStore } from '../../../../application/stores/useStatsStore.ts';
import type { Question, ChoiceId, Confidence } from '../../../../domain/model/types.ts';
import { db } from '../../../../infrastructure/storage/db.ts';
import type { QuestionAttemptTelemetry } from '../PostTestReport.tsx';
import { SessionSeededSpatialPresentationStrategy } from '../../../../domain/questionBank/spatialChoicePresenter.ts';
import {
  computeInitialSessionQuestions,
  resolveAsyncFilteredSessionQuestions,
  type SessionConfig,
} from '../sessionPlayerHelpers.ts';
import { useSessionTelemetry } from './useSessionTelemetry.ts';
import { useSessionKeyboardShortcuts } from './useSessionKeyboardShortcuts.ts';
import { useSessionAttemptRecorder } from './useSessionAttemptRecorder.ts';

export function useSessionPlayerCoordinator() {
  const location = useLocation();
  const navigate = useNavigate();
  const { questions: allQuestions } = useQuestionStore();

  const sessionConfig = useMemo<SessionConfig>(() => {
    return (location.state as SessionConfig) || { mode: 'practice', questionCount: 20 };
  }, [location.state]);

  const mode = sessionConfig.savedSession?.mode || sessionConfig.mode || 'practice';
  const isExamMode = mode === 'mock' || mode === 'exam';

  const initialSessionQuestions = useMemo(
    () => computeInitialSessionQuestions(allQuestions, sessionConfig),
    [allQuestions, sessionConfig]
  );

  const [sessionQuestions, setSessionQuestions] = useState<Question[]>(initialSessionQuestions);
  const [currentIndex, setCurrentIndex] = useState(
    () => sessionConfig.savedSession?.currentIndex ?? 0
  );
  const [answers, setAnswers] = useState<Record<string, { choiceId: ChoiceId; isCorrect: boolean }>>(
    () =>
      (sessionConfig.savedSession?.answers as Record<
        string,
        { choiceId: ChoiceId; isCorrect: boolean }
      >) || {}
  );
  const [confidences, setConfidences] = useState<Record<string, Confidence>>(
    () => (sessionConfig.savedSession?.confidences as Record<string, Confidence>) || {}
  );
  const [questionTelemetryMap, setQuestionTelemetryMap] = useState<
    Record<string, QuestionAttemptTelemetry>
  >({});
  const [flags, setFlags] = useState<Record<string, boolean>>(
    () => sessionConfig.savedSession?.flags || {}
  );
  const [bookmarks, setBookmarks] = useState<Record<string, boolean>>({});
  const [showExplanation, setShowExplanation] = useState(true);
  const [showMatrixModal, setShowMatrixModal] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [sessionStartTime] = useState<number>(() => Date.now());
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(
    () =>
      sessionConfig.savedSession?.timeLeftSeconds ??
      (sessionConfig.timeLimitMinutes || 120) * 60
  );
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [activeSessionId] = useState<string>(
    () =>
      sessionConfig.savedSession?.sessionId ||
      `sess-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  );

  // Load persisted bookmarks on mount
  useEffect(() => {
    let mounted = true;
    db.bookmarks
      .toArray()
      .then((rows) => {
        if (!mounted) return;
        const map: Record<string, boolean> = {};
        rows.forEach((r) => {
          map[r.questionId] = true;
        });
        setBookmarks(map);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Initialize session questions asynchronously
  useEffect(() => {
    let isCancelled = false;
    resolveAsyncFilteredSessionQuestions(allQuestions, sessionConfig).then((resolved) => {
      if (!isCancelled) {
        setSessionQuestions(resolved);
      }
    });
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
  const currentConfidence: Confidence = currentQ
    ? confidences[currentQ.id] ?? 'unsure'
    : 'unsure';
  const isAnswered = !!currentAnswer;
  const isLastQuestion =
    sessionQuestions.length > 0 && currentIndex === sessionQuestions.length - 1;
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = Math.max(0, sessionQuestions.length - answeredCount);
  const flaggedCount = Object.values(flags).filter(Boolean).length;

  // Session Telemetry & Mid-Session Leave Guard
  useSessionTelemetry({
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
  });

  // Attempt Recording, Confidence Rating, and Exam Submission
  const {
    handleSelectConfidence,
    handleSubmitExam,
    handleRequestFinish,
    handleSelectAnswer,
  } = useSessionAttemptRecorder({
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
  });

  // Countdown timer for Exam Mode
  useEffect(() => {
    if (!isExamMode || isSubmitted) return;
    const interval = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          void handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isExamMode, isSubmitted, handleSubmitExam]);

  const handleNext = useCallback(() => {
    if (currentIndex < sessionQuestions.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      const nextQ = sessionQuestions[nextIndex];
      setShowExplanation(!!(nextQ && answers[nextQ.id]));
    } else {
      void handleSubmitExam();
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

  const handleSelectIndex = useCallback((newIdx: number) => {
    setCurrentIndex(newIdx);
    const targetQ = sessionQuestions[newIdx];
    setShowExplanation(!!(targetQ && answers[targetQ.id]));
  }, [sessionQuestions, answers]);

  const handleRetestMistakes = useCallback((mistakes: Question[]) => {
    setSessionQuestions(mistakes);
    setCurrentIndex(0);
    setAnswers({});
    setShowExplanation(false);
    setIsSubmitted(false);
  }, []);

  const handleExitSession = useCallback(() => {
    void useStatsStore.getState().refreshStats();
    navigate('/');
  }, [navigate]);

  // Spatial & Command Keyboard Shortcuts
  useSessionKeyboardShortcuts({
    isExamMode,
    isAnswered,
    isLastQuestion,
    presentedChoices,
    spatialPresenter,
    showFinishModal,
    onSelectAnswer: handleSelectAnswer,
    onNext: handleNext,
    onPrev: handlePrev,
    onSubmitExam: () => void handleSubmitExam(),
    onToggleFlag: handleToggleFlag,
    onToggleBookmark: handleToggleBookmark,
    onToggleExplanation: () => setShowExplanation((prev) => !prev),
    onToggleMatrix: () => setShowMatrixModal((prev) => !prev),
    onCloseFinishModal: () => setShowFinishModal(false),
  });

  return {
    navigate,
    sessionConfig,
    mode,
    isExamMode,
    sessionQuestions,
    currentIndex,
    currentQ,
    answers,
    confidences,
    questionTelemetryMap,
    flags,
    bookmarks,
    showExplanation,
    setShowExplanation,
    showMatrixModal,
    setShowMatrixModal,
    showFinishModal,
    setShowFinishModal,
    sessionStartTime,
    timeLeftSeconds,
    isSubmitted,
    activeSessionId,
    presentedChoices,
    currentAnswer,
    currentConfidence,
    isAnswered,
    isLastQuestion,
    answeredCount,
    unansweredCount,
    flaggedCount,
    actions: {
      handleNext,
      handlePrev,
      handleSelectAnswer,
      handleSelectConfidence,
      handleToggleFlag,
      handleToggleBookmark,
      handleSelectIndex,
      handleRequestFinish,
      handleSubmitExam,
      handleRetestMistakes,
      handleExitSession,
    },
  };
}
