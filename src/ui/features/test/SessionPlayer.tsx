import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuestionStore } from '../../../application/stores/useQuestionStore.ts';
import { Question, ChoiceId } from '../../../domain/model/types.ts';
import { db } from '../../../infrastructure/storage/db.ts';
import { PostTestReport } from './PostTestReport.tsx';
import { QuestionNavigatorStrip } from './QuestionNavigatorStrip.tsx';
import { QuestionMatrixModal } from './QuestionMatrixModal.tsx';
import { useCopilotStore } from '../../../application/stores/useCopilotStore.ts';
import { questionTelemetryTracker } from '../../../domain/ai/telemetry.ts';
import { CopilotTriggerButton } from '../copilot/CopilotTriggerButton.tsx';
import { AiCopilotDrawer } from '../copilot/AiCopilotDrawer.tsx';
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
  LayoutGrid
} from 'lucide-react';

export const SessionPlayer: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { questions: allQuestions } = useQuestionStore();

  const sessionConfig = useMemo(() => {
    return (location.state as {
      mode?: 'practice' | 'mock' | 'rapid' | 'retest' | 'exam';
      subjectId?: string;
      chapterId?: string;
      questionCount?: number;
      timeLimitMinutes?: number;
      highYieldOnly?: boolean;
    }) || { mode: 'practice', questionCount: 20 };
  }, [location.state]);

  const mode = sessionConfig.mode || 'practice';
  const isExamMode = mode === 'mock' || mode === 'exam';

  // Filter questions according to session config
  const [sessionQuestions, setSessionQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { choiceId: ChoiceId; isCorrect: boolean }>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [bookmarks, setBookmarks] = useState<Record<string, boolean>>({});
  const [showExplanation, setShowExplanation] = useState(true);
  const [showMatrixModal, setShowMatrixModal] = useState(false);
  const [sessionStartTime] = useState<number>(() => Date.now());
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(
    (sessionConfig.timeLimitMinutes || 120) * 60
  );
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Initialize session questions
  useEffect(() => {
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
    const count = sessionConfig.questionCount || 20;
    setSessionQuestions(pool.slice(0, count));
  }, [allQuestions, sessionConfig]);

  const currentQ = sessionQuestions[currentIndex];
  const currentAnswer = currentQ ? answers[currentQ.id] : undefined;
  const isAnswered = !!currentAnswer;
  const isLastQuestion = sessionQuestions.length > 0 && currentIndex === sessionQuestions.length - 1;

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

  const handleSubmitExam = useCallback(async () => {
    try {
      // Record attempts in IndexedDB
      const records = Object.entries(answers).map(([qId, ans]) => ({
        id: `att-${Date.now()}-${qId}`,
        questionId: qId,
        blockId: 'cvs',
        sessionId: `sess-${Date.now()}`,
        mode,
        selectedChoiceId: ans.choiceId,
        isCorrect: ans.isCorrect,
        confidence: 'unsure' as const,
        responseTimeMs: 30000,
        answeredAt: new Date().toISOString(),
      }));
      if (records.length > 0) {
        await db.attempts.bulkPut(records);
      }
    } catch (err) {
      console.error('Failed to save exam attempts in DB:', err);
    } finally {
      setIsSubmitted(true);
    }
  }, [answers, mode]);

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
  const handleSelectAnswer = useCallback((choiceId: ChoiceId) => {
    if (!currentQ) return;
    questionTelemetryTracker.recordChoiceSelection(choiceId);

    // In practice mode, once committed, cannot change
    if (!isExamMode && isAnswered) return;

    const correctChoice = currentQ.choices.find((c) => c.isCorrect);
    const isCorrect = correctChoice?.id === choiceId;

    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: { choiceId, isCorrect },
    }));

    if (!isExamMode) {
      setShowExplanation(true);
      db.attempts.put({
        id: `att-${Date.now()}-${currentQ.id}`,
        questionId: currentQ.id,
        blockId: currentQ.blockId || 'cvs',
        sessionId: `practice-session`,
        mode: 'practice',
        selectedChoiceId: choiceId,
        isCorrect,
        confidence: 'unsure',
        responseTimeMs: 0,
        answeredAt: new Date().toISOString(),
      });
    }
  }, [currentQ, isExamMode, isAnswered]);

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
    setBookmarks((prev) => ({ ...prev, [currentQ.id]: !prev[currentQ.id] }));
  }, [currentQ]);

  // Keyboard Navigation: Spatial Model (1-4 for choices, arrows, F, B, E, Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === '1') handleSelectAnswer('a');
      else if (e.key === '2') handleSelectAnswer('b');
      else if (e.key === '3') handleSelectAnswer('c');
      else if (e.key === '4') handleSelectAnswer('d');
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
    <div className={`min-h-screen flex flex-col ${isExamMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Session Top Bar */}
      <header className={`sticky top-0 z-40 border-b px-2.5 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex items-center justify-between gap-1.5 sm:gap-3 backdrop-blur-2xl transition-all ${
        isExamMode ? 'bg-slate-900/90 border-slate-800 text-slate-100' : 'bg-white/85 dark:bg-zinc-900/85 border-slate-200/80 dark:border-zinc-800/80 text-slate-900 dark:text-zinc-100'
      }`}>
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          <button
            onClick={() => navigate('/')}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 apple-tap ${
              isExamMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
            title="Exit Session"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Exit</span>
          </button>
          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />
          
          {/* Apple Dynamic Capsule Pill */}
          <button
            onClick={() => setShowMatrixModal(true)}
            className={`group flex items-center space-x-1.5 sm:space-x-2.5 px-2.5 sm:px-3 py-1.5 rounded-full transition-all border shadow-xs cursor-pointer apple-tap ${
              isExamMode
                ? 'bg-slate-800/90 hover:bg-slate-750 border-slate-700 text-slate-100 hover:border-slate-600'
                : 'bg-slate-100/90 dark:bg-zinc-800/90 hover:bg-slate-200/80 dark:hover:bg-zinc-700/80 border-slate-200/80 dark:border-zinc-700/80 text-slate-900 dark:text-zinc-100'
            }`}
            title="Open Question Grid Overview (G)"
          >
            <div className="flex items-center space-x-1 text-xs font-bold tracking-tight">
              <span className="text-blue-600 dark:text-blue-400 font-mono font-extrabold text-xs sm:text-sm">
                {String(currentIndex + 1).padStart(2, '0')}
              </span>
              <span className="text-slate-400 font-normal">/</span>
              <span className="text-slate-500 font-mono font-semibold text-xs">
                {String(sessionQuestions.length).padStart(2, '0')}
              </span>
            </div>

            {/* Apple Micro Progress Bar inside capsule */}
            <div className="w-10 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden hidden sm:block">
              <div 
                className="h-full bg-blue-600 dark:bg-blue-400 rounded-full transition-all duration-300"
                style={{ width: `${Math.round(((currentIndex + 1) / sessionQuestions.length) * 100)}%` }}
              />
            </div>

            <LayoutGrid className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
          </button>

          {currentQ.highYield && (
            <span className="hidden md:inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 bg-amber-400/10 text-amber-500 border border-amber-400/20 rounded-md">
              <span>HIGH YIELD</span>
            </span>
          )}
        </div>

        {/* Center / Right: Timer & Controls */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
          {isExamMode && (
            <div className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono font-bold text-amber-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTime(timeLeftSeconds)}</span>
            </div>
          )}

          <button
            onClick={handleToggleFlag}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center space-x-1 transition-all apple-tap ${
              flags[currentQ.id]
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-zinc-800/50'
            }`}
            title="Flag question (F)"
          >
            <Flag className={`w-4 h-4 ${flags[currentQ.id] ? 'fill-current text-amber-500' : ''}`} />
            <span className="hidden md:inline">Flag</span>
          </button>

          <button
            onClick={handleToggleBookmark}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center space-x-1 transition-all apple-tap ${
              bookmarks[currentQ.id]
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-zinc-800/50'
            }`}
            title="Bookmark (B)"
          >
            <Bookmark className={`w-4 h-4 ${bookmarks[currentQ.id] ? 'fill-current text-blue-500' : ''}`} />
          </button>

          {/* AI Cognitive Co-Pilot Trigger */}
          <CopilotTriggerButton />

          {Object.keys(answers).length > 0 && !isExamMode && (
            <button
              onClick={handleSubmitExam}
              className="hidden sm:inline-flex py-1.5 px-3 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 rounded-xl text-xs font-bold transition-all cursor-pointer apple-tap"
            >
              Finish
            </button>
          )}

          {isExamMode && (
            <button
              onClick={handleSubmitExam}
              className="hidden sm:inline-flex py-1.5 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer apple-tap"
            >
              Submit
            </button>
          )}
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
      <div className="max-w-4xl w-full mx-auto p-4 sm:p-8 flex-1 flex flex-col justify-between space-y-6">
        <div className="space-y-6">
          {/* Question Meta & Pill Counter */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 font-mono font-bold text-[11px] border border-blue-200/60 dark:border-blue-800/60">
                Question {currentIndex + 1}
              </span>
              <span>•</span>
              <span className="text-slate-700 dark:text-slate-300">{currentQ.subjectId}</span>
              <span>•</span>
              <span className="text-slate-400">{currentQ.chapterId}</span>
            </div>

            <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono">
              <span className="hidden sm:inline">Pacing: Target &lt;60s</span>
              <span className="hidden sm:inline">•</span>
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                {Math.round(((currentIndex + 1) / sessionQuestions.length) * 100)}% Complete
              </span>
            </div>
          </div>

          {/* Question Stem */}
          <div className={`text-lg sm:text-xl font-medium leading-relaxed ${isExamMode ? 'text-slate-100' : 'text-slate-900'}`}>
            {currentQ.stem}
          </div>

          {/* 4 Choices (A, B, C, D) */}
          <div className="space-y-3 pt-2" role="radiogroup" aria-label="Question choices">
            {currentQ.choices.map((choice, idx) => {
              const isSelected = currentAnswer?.choiceId === choice.id;
              const isCorrect = choice.isCorrect;

              const choiceStyle = isExamMode
                ? isSelected
                  ? 'bg-blue-900/40 border-blue-500 text-white shadow-md shadow-blue-500/20'
                  : 'bg-slate-900 hover:bg-slate-800/90 border-slate-800 text-slate-200'
                : isAnswered
                  ? isCorrect
                    ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-500 text-emerald-950 dark:text-emerald-100 font-medium'
                    : isSelected
                      ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-500 text-rose-950 dark:text-rose-100'
                      : 'bg-white/80 dark:bg-zinc-900/60 opacity-60 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400'
                  : 'bg-white dark:bg-zinc-900/80 hover:bg-slate-50 dark:hover:bg-zinc-800/80 border-slate-200/90 dark:border-zinc-800 text-slate-800 dark:text-zinc-200 shadow-xs hover:border-blue-400/60 dark:hover:border-blue-500/60';

              const choiceLetter = ['A', 'B', 'C', 'D'][idx] || String.fromCharCode(65 + idx);

              return (
                <button
                  key={choice.id}
                  onClick={() => handleSelectAnswer(choice.id)}
                  className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border-2 flex items-start space-x-3 transition-all text-sm sm:text-base cursor-pointer relative overflow-hidden select-none apple-tap ${choiceStyle}`}
                  role="radio"
                  aria-checked={isSelected}
                >
                  <span className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 uppercase transition-all ${
                    isSelected 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' 
                      : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200/60 dark:border-zinc-700/60'
                  }`}>
                    {choiceLetter}
                  </span>
                  <div className="flex-1 leading-snug pt-0.5">{choice.text}</div>

                  {!isExamMode && isAnswered && isCorrect && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  )}
                  {!isExamMode && isAnswered && isSelected && !isCorrect && (
                    <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Immediate Evaluation Feedback in Practice Mode */}
          {!isExamMode && isAnswered && showExplanation && (
            <div className={`p-4 sm:p-5 rounded-2xl border space-y-3.5 backdrop-blur-md animate-apple-entrance ${
              currentAnswer.isCorrect 
                ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60' 
                : 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  {currentAnswer.isCorrect ? (
                    <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300 flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Correct Answer!</span>
                    </span>
                  ) : (
                    <span className="text-sm font-bold text-rose-800 dark:text-rose-300 flex items-center space-x-1.5">
                      <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      <span>Incorrect — Key: Option {currentQ.choices.find((c) => c.isCorrect)?.id.toUpperCase()}</span>
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
                  {isLastQuestion ? (
                    <>Press <strong>Enter ⏎</strong> or tap Next to finish</>
                  ) : (
                    <>Press <strong>Enter ⏎</strong> or tap Next for next</>
                  )}
                </div>
              </div>

              {/* Comprehensive Explanation */}
              <div className="text-xs sm:text-sm text-slate-800 dark:text-zinc-200 space-y-2 leading-relaxed">
                <p><strong>Explanation:</strong> {currentQ.explanation}</p>
                {currentQ.examTip && (
                  <p className="text-xs p-3 bg-white/80 dark:bg-zinc-900/80 rounded-xl border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 font-medium">
                    ⚡ <strong>Exam Tip:</strong> {currentQ.examTip}
                  </p>
                )}
              </div>

              {/* Curriculum Citation (Job 2: TEST -> REVIEW CURRICULUM -> RETEST) */}
              {currentQ.evidence && currentQ.evidence[0] && (
                <div className="pt-2 border-t border-slate-200/60 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                  <div className="flex items-center space-x-1.5 text-slate-700 dark:text-zinc-300">
                    <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>Source: <strong>{currentQ.evidence[0].sourceName}</strong> ({currentQ.evidence[0].location})</span>
                  </div>
                  <div className="italic text-slate-500 dark:text-zinc-400 truncate max-w-sm">
                    "{currentQ.evidence[0].quote}"
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Navigation Toolbar - Apple Sticky Action Bar */}
        <div className={`sticky bottom-0 z-30 mt-6 -mx-4 sm:-mx-8 px-4 sm:px-8 py-3.5 border-t backdrop-blur-2xl flex items-center justify-between text-xs pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.6)] ${
          isExamMode 
            ? 'bg-slate-900/90 border-slate-800 text-slate-300' 
            : 'bg-white/90 dark:bg-zinc-900/90 border-slate-200/80 dark:border-zinc-800/80 text-slate-600 dark:text-zinc-300'
        }`}>
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="py-2.5 px-3.5 rounded-xl border border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-30 font-bold flex items-center space-x-1.5 cursor-pointer apple-tap"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden xs:inline sm:inline">Previous</span>
          </button>

          {/* Keyboard hint */}
          <span className="hidden sm:inline font-mono text-[11px] opacity-75">
            {isLastQuestion ? (
              isExamMode ? (
                <span>Press <strong>Submit Exam</strong> when finished</span>
              ) : isAnswered ? (
                <span>Press <strong>Enter ⏎</strong> to view results</span>
              ) : (
                <span>Keys: <strong>1–4</strong> or tap choice</span>
              )
            ) : (
              <span>Keys: <strong>1–4</strong> to answer • <strong>← / →</strong> navigate</span>
            )}
          </span>

          {/* Mobile Question Pill indicator */}
          <span className="sm:hidden font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
            {currentIndex + 1} / {sessionQuestions.length}
          </span>

          {isLastQuestion ? (
            <button
              onClick={handleSubmitExam}
              className={`py-2.5 px-4 sm:px-5 rounded-xl font-extrabold flex items-center space-x-2 cursor-pointer shadow-md transition-all apple-tap ${
                isExamMode
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/25'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-500/25'
              }`}
            >
              <span>{isExamMode ? 'Submit Exam' : 'Finish & View Results'}</span>
              <CheckCircle2 className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="py-2.5 px-4 sm:px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold flex items-center space-x-1.5 cursor-pointer shadow-md shadow-blue-500/25 transition-all apple-tap"
            >
              <span>Next</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

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
      />

      {/* AI Cognitive Co-Pilot Sliding Drawer */}
      <AiCopilotDrawer />
    </div>
  );
};
