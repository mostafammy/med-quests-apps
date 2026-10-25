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
import { ThemeToggle } from '../../app/ThemeToggle.tsx';
import { useLocaleStore } from '../../../application/stores/useLocaleStore.ts';
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
  const { t, isRtl } = useLocaleStore();

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
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          <button
            onClick={() => navigate('/')}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 apple-tap cursor-pointer transition-all ${
              isExamMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
            title="Exit Session"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline font-bold">Exit</span>
          </button>
          <div className="h-4 w-px bg-slate-300 dark:bg-zinc-700" />
          
          {/* Apple Dynamic Capsule Pill */}
          <button
            onClick={() => setShowMatrixModal(true)}
            className={`group flex items-center space-x-1.5 sm:space-x-2.5 px-3 py-1.5 rounded-full transition-all border shadow-xs cursor-pointer apple-tap ${
              isExamMode
                ? 'bg-slate-800/90 hover:bg-slate-750 border-slate-700 text-slate-100 hover:border-slate-600'
                : 'glass-pill-luxury text-slate-900 dark:text-zinc-100'
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
            <div className="w-12 h-1.5 bg-slate-200/80 dark:bg-zinc-700/80 rounded-full overflow-hidden hidden sm:block">
              <div 
                className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 rounded-full transition-all duration-300"
                style={{ width: `${Math.round(((currentIndex + 1) / sessionQuestions.length) * 100)}%` }}
              />
            </div>

            <LayoutGrid className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
          </button>

          {currentQ.highYield && (
            <span className="hidden md:inline-flex items-center space-x-1 text-[10px] font-black px-2.5 py-0.5 bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-400/40 rounded-full shadow-xs">
              <span>⚡ HIGH YIELD</span>
            </span>
          )}
        </div>

        {/* Center / Right: Timer, Theme Toggle & Controls */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
          {isExamMode && (
            <div className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono font-bold text-amber-400 shadow-xs">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTime(timeLeftSeconds)}</span>
            </div>
          )}

          <button
            onClick={handleToggleFlag}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center space-x-1 transition-all apple-tap cursor-pointer ${
              flags[currentQ.id]
                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100/70 dark:hover:bg-zinc-800/70'
            }`}
            title="Flag question (F)"
          >
            <Flag className={`w-4 h-4 ${flags[currentQ.id] ? 'fill-current text-amber-500' : ''}`} />
            <span className="hidden md:inline font-bold">Flag</span>
          </button>

          <button
            onClick={handleToggleBookmark}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center space-x-1 transition-all apple-tap cursor-pointer ${
              bookmarks[currentQ.id]
                ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/40'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100/70 dark:hover:bg-zinc-800/70'
            }`}
            title="Bookmark (B)"
          >
            <Bookmark className={`w-4 h-4 ${bookmarks[currentQ.id] ? 'fill-current text-blue-500' : ''}`} />
          </button>

          {/* Theme Toggle (Apple Light / Dark Switcher) */}
          <ThemeToggle />

          {/* AI Cognitive Co-Pilot Trigger */}
          <CopilotTriggerButton />

          {Object.keys(answers).length > 0 && !isExamMode && (
            <button
              onClick={handleSubmitExam}
              className="hidden sm:inline-flex py-1.5 px-3.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 rounded-xl text-xs font-bold transition-all cursor-pointer apple-tap shadow-xs"
            >
              {t.common.finish}
            </button>
          )}

          {isExamMode && (
            <button
              onClick={handleSubmitExam}
              className="hidden sm:inline-flex py-1.5 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/25 cursor-pointer apple-tap"
            >
              {t.common.submit}
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
      <main className="max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex-1 flex flex-col justify-between space-y-6">
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
          </div>

          {/* Choices (A, B, C, D) - Apple Glassmorphism with High Contrast Answer Differentiation */}
          <div className="space-y-3.5 pt-1" role="radiogroup" aria-label="Question choices">
            {currentQ.choices.map((choice, idx) => {
              const isSelected = currentAnswer?.choiceId === choice.id;
              const isCorrect = choice.isCorrect;
              const choiceLetter = ['A', 'B', 'C', 'D'][idx] || String.fromCharCode(65 + idx);

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
                    Key {idx + 1}
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
                      <span>Your Answer • Correct</span>
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
                      <span>Your Choice • Incorrect</span>
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
                      <span>Correct Answer Key</span>
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
                  key={choice.id}
                  onClick={() => handleSelectAnswer(choice.id)}
                  disabled={!isExamMode && isAnswered}
                  className={`w-full text-left p-3.5 sm:p-4 rounded-2xl flex items-center justify-between gap-3 transition-all text-sm sm:text-base select-none apple-tap ${
                    !isExamMode && isAnswered ? '' : 'cursor-pointer'
                  } ${containerStyle}`}
                  role="radio"
                  aria-checked={isSelected}
                >
                  <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
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
                      <span>{t.test.player.incorrectChoice.replace('{key}', currentQ.choices.find((c) => c.isCorrect)?.id.toUpperCase() || '')}</span>
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

        {/* Bottom Navigation Toolbar - Apple Frosted Action Dock */}
        <div className={`sticky bottom-0 z-30 mt-6 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3.5 border-t backdrop-blur-2xl flex items-center justify-between text-xs pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_32px_rgba(0,0,0,0.06)] dark:shadow-[0_-8px_32px_rgba(0,0,0,0.5)] ${
          isExamMode 
            ? 'bg-slate-900/90 border-slate-800 text-slate-300' 
            : 'bg-white/85 dark:bg-zinc-900/85 border-t border-slate-200/80 dark:border-zinc-800/80 text-slate-700 dark:text-zinc-300'
        }`}>
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="py-2.5 px-4 rounded-xl border border-slate-200/90 dark:border-zinc-700/80 bg-white/70 dark:bg-zinc-800/70 hover:bg-white dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 disabled:opacity-30 font-bold flex items-center space-x-1.5 cursor-pointer apple-tap transition-all shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden xs:inline sm:inline">Previous</span>
          </button>

          {/* Apple Dynamic Island Keyboard Dock */}
          <div className="hidden sm:flex items-center space-x-3 px-4 sm:px-5 py-2 rounded-full bg-slate-900/90 dark:bg-black/90 text-white border border-white/15 dark:border-white/10 shadow-[0_8px_25px_rgba(0,0,0,0.25)] backdrop-blur-2xl transition-all duration-300">
            {!isExamMode && isAnswered ? (
              <div className="flex items-center space-x-2 animate-apple-entrance">
                <kbd className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-mono text-[10px] font-black shadow-xs border border-blue-400">
                  Enter ⏎
                </kbd>
                <span className="text-xs font-bold text-white tracking-tight">
                  {isLastQuestion ? 'Finish Test' : 'Next Question'}
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-600" />
                <div className="flex items-center space-x-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/15 text-slate-300 font-mono text-[10px] font-semibold border border-white/15">
                    ←
                  </kbd>
                  <span className="text-[11px] text-slate-400 font-medium">Review</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2.5">
                <div className="flex items-center space-x-1.5">
                  <kbd className="px-2 py-0.5 rounded-md bg-white/15 text-white font-mono text-[10px] font-black border border-white/20 shadow-xs">
                    1–4
                  </kbd>
                  <span className="text-xs font-semibold text-slate-200">{t.test.player.answerShortcut}</span>
                </div>
                <span className="w-1 h-1 rounded-full bg-slate-600" />
                <div className="flex items-center space-x-1.5">
                  <div className="flex items-center space-x-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-white/15 text-white font-mono text-[10px] font-black border border-white/20 shadow-xs">
                      ←
                    </kbd>
                    <kbd className="px-1.5 py-0.5 rounded bg-white/15 text-white font-mono text-[10px] font-black border border-white/20 shadow-xs">
                      →
                    </kbd>
                  </div>
                  <span className="text-xs font-semibold text-slate-200">{t.test.player.navigateShortcut}</span>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Question Pill indicator */}
          <span className="sm:hidden font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
            {currentIndex + 1} / {sessionQuestions.length}
          </span>

          {isLastQuestion ? (
            <button
              onClick={handleSubmitExam}
              className={`py-2.5 px-5 sm:px-6 rounded-xl font-extrabold flex items-center space-x-2 cursor-pointer shadow-lg transition-all apple-tap ${
                isExamMode
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/25'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-500/25'
              }`}
            >
              <span>{isExamMode ? t.test.player.submitExam : t.test.player.finishResults}</span>
              <CheckCircle2 className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="py-2.5 px-5 sm:px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold flex items-center space-x-1.5 cursor-pointer shadow-md shadow-blue-500/25 transition-all apple-tap"
            >
              <span>{t.common.next}</span>
              <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </main>

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
