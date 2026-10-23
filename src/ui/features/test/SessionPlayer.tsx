import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuestionStore } from '../../../application/stores/useQuestionStore.ts';
import { Question, ChoiceId } from '../../../domain/model/types.ts';
import { db } from '../../../infrastructure/storage/db.ts';
import { PostTestReport } from './PostTestReport.tsx';
import { 
  ArrowLeft, 
  ArrowRight, 
  Flag, 
  Bookmark, 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle
} from 'lucide-react';

export const SessionPlayer: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { questions: allQuestions } = useQuestionStore();

  const sessionConfig = (location.state as {
    mode?: 'practice' | 'mock' | 'rapid' | 'retest' | 'exam';
    subjectId?: string;
    chapterId?: string;
    questionCount?: number;
    timeLimitMinutes?: number;
  }) || { mode: 'practice', questionCount: 20 };

  const mode = sessionConfig.mode || 'practice';
  const isExamMode = mode === 'mock' || mode === 'exam';

  // Filter questions according to session config
  const [sessionQuestions, setSessionQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { choiceId: ChoiceId; isCorrect: boolean }>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [bookmarks, setBookmarks] = useState<Record<string, boolean>>({});
  const [showExplanation, setShowExplanation] = useState(true);
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
    const count = sessionConfig.questionCount || 20;
    setSessionQuestions(pool.slice(0, count));
  }, [allQuestions, sessionConfig]);

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
  }, [isExamMode, isSubmitted]);

  const currentQ = sessionQuestions[currentIndex];
  const currentAnswer = currentQ ? answers[currentQ.id] : undefined;
  const isAnswered = !!currentAnswer;

  // Immediate Commit Answer handler
  const handleSelectAnswer = useCallback((choiceId: ChoiceId) => {
    if (!currentQ) return;
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
    }
  }, [currentQ, isExamMode, isAnswered]);

  const handleNext = useCallback(() => {
    if (currentIndex < sessionQuestions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setShowExplanation(false);
    }
  }, [currentIndex, sessionQuestions.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setShowExplanation(false);
    }
  }, [currentIndex]);

  const handleToggleFlag = useCallback(() => {
    if (!currentQ) return;
    setFlags((prev) => ({ ...prev, [currentQ.id]: !prev[currentQ.id] }));
  }, [currentQ]);

  const handleToggleBookmark = useCallback(() => {
    if (!currentQ) return;
    setBookmarks((prev) => ({ ...prev, [currentQ.id]: !prev[currentQ.id] }));
  }, [currentQ]);

  const handleSubmitExam = async () => {
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
    setIsSubmitted(true);
  };

  // Keyboard Navigation: Spatial Model (1-4 for choices, arrows, F, B, E, Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === '1') handleSelectAnswer('a');
      else if (e.key === '2') handleSelectAnswer('b');
      else if (e.key === '3') handleSelectAnswer('c');
      else if (e.key === '4') handleSelectAnswer('d');
      else if (e.key === 'ArrowRight') handleNext();
      else if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === 'Enter') {
        if (!isExamMode && isAnswered) handleNext();
      }
      else if (e.key.toLowerCase() === 'f') handleToggleFlag();
      else if (e.key.toLowerCase() === 'b') handleToggleBookmark();
      else if (e.key.toLowerCase() === 'e') setShowExplanation((prev) => !prev);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSelectAnswer, handleNext, handlePrev, handleToggleFlag, handleToggleBookmark, isExamMode, isAnswered]);

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
      <div className="min-h-screen bg-slate-50 py-4">
        <PostTestReport
          result={{
            sessionQuestions,
            answers,
            timeSpentSeconds: (sessionConfig.timeLimitMinutes || 120) * 60 - timeLeftSeconds,
            mode,
          }}
          onRetestMistakes={(mistakes) => {
            setSessionQuestions(mistakes);
            setCurrentIndex(0);
            setAnswers({});
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
      <div className={`border-b px-4 sm:px-8 py-3.5 flex items-center justify-between ${
        isExamMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/')}
            className={`p-2 rounded-lg text-xs font-semibold flex items-center space-x-1 ${
              isExamMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Exit Session</span>
          </button>
          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />
          <span className="text-sm font-bold tracking-tight">
            Question {currentIndex + 1} of {sessionQuestions.length}
          </span>
          {currentQ.highYield && (
            <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 bg-amber-400/10 text-amber-500 border border-amber-400/20 rounded-md">
              HIGH YIELD
            </span>
          )}
        </div>

        {/* Center / Right: Timer & Controls */}
        <div className="flex items-center space-x-3">
          {isExamMode && (
            <div className="flex items-center space-x-1.5 px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono font-bold text-amber-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTime(timeLeftSeconds)}</span>
            </div>
          )}

          <button
            onClick={handleToggleFlag}
            className={`p-2 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
              flags[currentQ.id]
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Flag question (F)"
          >
            <Flag className={`w-4 h-4 ${flags[currentQ.id] ? 'fill-current' : ''}`} />
            <span className="hidden sm:inline">Flag (F)</span>
          </button>

          <button
            onClick={handleToggleBookmark}
            className={`p-2 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
              bookmarks[currentQ.id]
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Bookmark (B)"
          >
            <Bookmark className={`w-4 h-4 ${bookmarks[currentQ.id] ? 'fill-current' : ''}`} />
          </button>

          {Object.keys(answers).length > 0 && !isExamMode && (
            <button
              onClick={handleSubmitExam}
              className="py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition-all cursor-pointer"
            >
              Finish & View Report
            </button>
          )}

          {isExamMode && (
            <button
              onClick={handleSubmitExam}
              className="py-1.5 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              Submit Exam
            </button>
          )}
        </div>
      </div>

      {/* Main Question Workspace */}
      <div className="max-w-4xl w-full mx-auto p-4 sm:p-8 flex-1 flex flex-col justify-between space-y-6">
        <div className="space-y-6">
          {/* Question Meta */}
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span>{currentQ.subjectId}</span>
            <span>•</span>
            <span className="text-slate-400">{currentQ.chapterId}</span>
          </div>

          {/* Question Stem */}
          <div className={`text-lg sm:text-xl font-medium leading-relaxed ${isExamMode ? 'text-slate-100' : 'text-slate-900'}`}>
            {currentQ.stem}
          </div>

          {/* 4 Choices (A, B, C, D) - Immediate Selection on 1, 2, 3, 4 */}
          <div className="space-y-3 pt-2">
            {currentQ.choices.map((choice, idx) => {
              const isSelected = currentAnswer?.choiceId === choice.id;
              const isCorrect = choice.isCorrect;

              let choiceStyle = isExamMode
                ? isSelected
                  ? 'bg-blue-900/40 border-blue-500 text-white'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200'
                : isAnswered
                  ? isCorrect
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-medium'
                    : isSelected
                      ? 'bg-red-50 border-red-500 text-red-950'
                      : 'bg-white opacity-60 border-slate-200 text-slate-600'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800';

              return (
                <button
                  key={choice.id}
                  onClick={() => handleSelectAnswer(choice.id)}
                  className={`w-full text-left p-4 rounded-xl border-2 flex items-start space-x-3.5 transition-all text-sm sm:text-base cursor-pointer ${choiceStyle}`}
                >
                  <span className={`w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 uppercase ${
                    isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    {idx + 1}
                  </span>
                  <div className="flex-1 leading-snug">{choice.text}</div>

                  {!isExamMode && isAnswered && isCorrect && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  )}
                  {!isExamMode && isAnswered && isSelected && !isCorrect && (
                    <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Immediate Evaluation Feedback in Practice Mode */}
          {!isExamMode && isAnswered && showExplanation && (
            <div className={`p-5 rounded-2xl border space-y-4 ${
              currentAnswer.isCorrect ? 'bg-emerald-50/70 border-emerald-200' : 'bg-amber-50/70 border-amber-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {currentAnswer.isCorrect ? (
                    <span className="text-sm font-bold text-emerald-800 flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Correct Answer!</span>
                    </span>
                  ) : (
                    <span className="text-sm font-bold text-red-800 flex items-center space-x-1.5">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span>Incorrect — Key: Option {currentQ.choices.find((c) => c.isCorrect)?.id.toUpperCase()}</span>
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-500 font-mono">
                  Press <strong>Enter ⏎</strong> for next question
                </div>
              </div>

              {/* Comprehensive Explanation */}
              <div className="text-sm text-slate-800 space-y-2 leading-relaxed">
                <p><strong>Explanation:</strong> {currentQ.explanation}</p>
                {currentQ.examTip && (
                  <p className="text-xs p-2.5 bg-white/80 rounded-lg border border-amber-200 text-amber-900 font-medium">
                    ⚡ <strong>Exam Tip:</strong> {currentQ.examTip}
                  </p>
                )}
              </div>

              {/* Curriculum Citation (Job 2: TEST -> REVIEW CURRICULUM -> RETEST) */}
              {currentQ.evidence && currentQ.evidence[0] && (
                <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center space-x-1.5 text-slate-700">
                    <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Source: <strong>{currentQ.evidence[0].sourceName}</strong> ({currentQ.evidence[0].location})</span>
                  </div>
                  <div className="italic text-slate-500 truncate max-w-sm">
                    "{currentQ.evidence[0].quote}"
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Navigation Toolbar */}
        <div className={`pt-4 border-t flex items-center justify-between text-xs ${
          isExamMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'
        }`}>
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="py-2 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 font-semibold flex items-center space-x-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous (←)</span>
          </button>

          {/* Keyboard hint */}
          <span className="hidden sm:inline font-mono text-[11px]">
            Keys: <strong>1, 2, 3, 4</strong> to answer • <strong>← / →</strong> navigate
          </span>

          <button
            onClick={handleNext}
            disabled={currentIndex === sessionQuestions.length - 1}
            className="py-2 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center space-x-1 cursor-pointer"
          >
            <span>Next (→)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
