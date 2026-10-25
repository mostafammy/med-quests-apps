import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  X,
  FileCode,
  HelpCircle,
  ExternalLink,
  Code2,
} from 'lucide-react';
import {
  QuestionAiPromptBuilder,
  type AiPromptMode,
  GOLD_STANDARD_EXAMPLE_QUESTION,
} from '../../../domain/questionBank/questionAiPromptBuilder.ts';
import { CVS_TAXONOMY } from '../../../domain/taxonomy/cvsTaxonomy.ts';

interface AiPromptStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertExample?: (exampleJson: string) => void;
}

export const AiPromptStudioModal: React.FC<AiPromptStudioModalProps> = ({
  isOpen,
  onClose,
  onInsertExample,
}) => {
  const [mode, setMode] = useState<AiPromptMode>('format_existing');
  const [subjectId, setSubjectId] = useState<string>('all');
  const [chapterId, setChapterId] = useState<string>('all');
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(2);
  const [questionCount, setQuestionCount] = useState<number>(3);
  const [customFocus, setCustomFocus] = useState<string>('');
  const [copiedType, setCopiedType] = useState<'prompt' | 'json' | null>(null);

  // Filter chapters based on selected subject
  const availableChapters = useMemo(() => {
    if (subjectId === 'all') {
      return CVS_TAXONOMY.chapters;
    }
    return CVS_TAXONOMY.chapters.filter((c) => c.subjectId === subjectId);
  }, [subjectId]);

  // Reset chapterId when subject changes if current chapter doesn't belong to subject
  const handleSubjectChange = (newSubjectId: string) => {
    setSubjectId(newSubjectId);
    if (newSubjectId !== 'all') {
      const match = CVS_TAXONOMY.chapters.find((c) => c.subjectId === newSubjectId);
      setChapterId(match ? match.id : 'all');
    } else {
      setChapterId('all');
    }
  };

  // Build the live prompt
  const generatedPrompt = useMemo(() => {
    return QuestionAiPromptBuilder.buildPrompt({
      mode,
      subjectId,
      chapterId,
      difficulty,
      questionCount,
      customFocus,
    });
  }, [mode, subjectId, chapterId, difficulty, questionCount, customFocus]);

  const exampleJson = useMemo(() => {
    return JSON.stringify([GOLD_STANDARD_EXAMPLE_QUESTION], null, 2);
  }, []);

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopiedType('prompt');
      setTimeout(() => setCopiedType(null), 2500);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  const handleCopyExampleJson = async () => {
    try {
      await navigator.clipboard.writeText(exampleJson);
      setCopiedType('json');
      setTimeout(() => setCopiedType(null), 2500);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* 1. Modal Header (Apple Glassmorphic Style) */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80 backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/25">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  AI Question Authoring & Schema Studio
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800">
                  Universal LLM
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Generate tailored prompts for ChatGPT, Claude, or Gemini to convert raw questions into strictly validated MedQuests JSON.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* A. Mode Selector (Segmented Control) */}
          <div className="p-1 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 grid grid-cols-1 sm:grid-cols-3 gap-1">
            <button
              onClick={() => setMode('format_existing')}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                mode === 'format_existing'
                  ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Reformat Raw Questions</span>
            </button>

            <button
              onClick={() => setMode('generate_new')}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                mode === 'generate_new'
                  ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate New Board Vignettes</span>
            </button>

            <button
              onClick={() => setMode('schema_only')}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                mode === 'schema_only'
                  ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>JSON Schema Reference</span>
            </button>
          </div>

          {/* B. Parameters Configuration Form (Only if not schema_only) */}
          {mode !== 'schema_only' && (
            <div className="p-4 rounded-2xl bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Subject Selector */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1 block">
                    Curriculum Subject
                  </label>
                  <select
                    value={subjectId}
                    onChange={(e) => handleSubjectChange(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="all">All CVS Subjects</option>
                    {CVS_TAXONOMY.subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Chapter Selector */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1 block">
                    Chapter / Block Module
                  </label>
                  <select
                    value={chapterId}
                    onChange={(e) => setChapterId(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="all">All Chapters</option>
                    {availableChapters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target Difficulty */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1 block">
                    Target Difficulty
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(Number(e.target.value) as 1 | 2 | 3)}
                    className="w-full py-2 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value={1}>Level 1: Foundational Recall</option>
                    <option value={2}>Level 2: Board-Style Vignette (Standard)</option>
                    <option value={3}>Level 3: Multi-step Pathophysiology</option>
                  </select>
                </div>
              </div>

              {/* Extra row for generate mode */}
              {mode === 'generate_new' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1 block">
                      Question Count
                    </label>
                    <div className="flex items-center space-x-2">
                      {[1, 3, 5, 10].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setQuestionCount(num)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                            questionCount === num
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1 block">
                      Custom Clinical Focus (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Focus on auscultation, murmurs, and differential diagnosis of cyanosis"
                      value={customFocus}
                      onChange={(e) => setCustomFocus(e.target.value)}
                      className="w-full py-2 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* C. Interactive Prompt Display Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  {mode === 'schema_only' ? 'Validated Schema JSON' : 'Ready-to-Use AI Master Prompt'}
                </span>
                <span className="text-[11px] font-mono text-zinc-400">
                  ({generatedPrompt.length} chars)
                </span>
              </div>

              <div className="flex items-center space-x-2">
                {onInsertExample && (
                  <button
                    onClick={() => {
                      onInsertExample(exampleJson);
                      onClose();
                    }}
                    className="py-1 px-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold hover:bg-indigo-100/60 dark:hover:bg-indigo-900/60 transition-all cursor-pointer"
                  >
                    Insert Example Directly
                  </button>
                )}

                <button
                  onClick={handleCopyExampleJson}
                  className="py-1 px-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px] font-semibold flex items-center space-x-1 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all cursor-pointer"
                >
                  {copiedType === 'json' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">Example Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Schema JSON</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleCopyPrompt}
                  className="py-1.5 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-indigo-500/20 transition-all cursor-pointer apple-tap"
                >
                  {copiedType === 'prompt' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Prompt Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Full Prompt</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="relative rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden shadow-inner">
              <pre className="p-4 text-xs font-mono text-zinc-200 overflow-x-auto max-h-[300px] leading-relaxed whitespace-pre-wrap select-all">
                {generatedPrompt}
              </pre>
            </div>
          </div>

          {/* D. 3-Step Guided Workflow Walkthrough */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/25 border border-indigo-200/70 dark:border-indigo-800/60 space-y-3">
            <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center space-x-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
              <span>How Faculty & Curators Use This Prompt:</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white/80 dark:bg-zinc-900/80 border border-indigo-100 dark:border-indigo-900/50 space-y-1">
                <span className="font-bold text-indigo-600 dark:text-indigo-400">Step 1: Copy Prompt</span>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                  Click <strong>Copy Full Prompt</strong> above with your selected subject and difficulty.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/80 dark:bg-zinc-900/80 border border-indigo-100 dark:border-indigo-900/50 space-y-1">
                <span className="font-bold text-indigo-600 dark:text-indigo-400">Step 2: Paste in LLM</span>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                  Paste into ChatGPT, Claude, or Gemini along with your raw questions or lecture slides.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/80 dark:bg-zinc-900/80 border border-indigo-100 dark:border-indigo-900/50 space-y-1">
                <span className="font-bold text-indigo-600 dark:text-indigo-400">Step 3: Import to Bank</span>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                  Copy the returned JSON and paste into <strong>Create Canonical Question</strong> or the Question Studio!
                </p>
              </div>
            </div>

            {/* Quick LLM Web Links */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-indigo-200/50 dark:border-indigo-900/40 text-[11px]">
              <span className="text-zinc-500 dark:text-zinc-400">Quick Links:</span>
              <a
                href="https://chatgpt.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-indigo-600"
              >
                <span>ChatGPT</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
              <a
                href="https://claude.ai"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-indigo-600"
              >
                <span>Claude</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
              <a
                href="https://aistudio.google.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-indigo-600"
              >
                <span>Google AI Studio</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
        </div>

        {/* 3. Modal Footer */}
        <div className="p-4 border-t border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80 flex items-center justify-between">
          <div className="text-[11px] text-zinc-500">
            Compliant with MedQuests Clinical Quality Gate & Zod Schema v1.
          </div>
          <button
            onClick={onClose}
            className="py-2 px-4 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold transition-colors cursor-pointer"
          >
            Close Studio
          </button>
        </div>
      </div>
    </div>
  );
};
