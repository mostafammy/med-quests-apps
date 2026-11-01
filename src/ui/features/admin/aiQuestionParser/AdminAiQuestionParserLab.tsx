/**
 * Presentation Component: AdminAiQuestionParserLab
 * World-Class AI Question Ingestion, Formatting & Anti-Hallucination Inspection Chamber
 *
 * Exclusively for Platform Administrators:
 * - Direct unstructured raw text input.
 * - Dynamic AI Model selection (Gemini, Groq, OpenRouter).
 * - Automatic missing answer key detection with per-question warning flags.
 * - Pre-approval inspection drawer to certify clinical factuality before global commit.
 * - Dedicated per-question and batch Copy Verification Prompt buttons for cross-model auditing.
 */

import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Trash2,
  Edit3,
  Lock,
  ChevronDown,
  ChevronUp,
  FileText,
  CheckSquare,
  Square,
  Cpu,
  LogIn,
} from 'lucide-react';
import { useAuthStore } from '../../../../application/stores/useAuthStore.ts';
import { useAdminAiQuestionParserStore } from '../../../../application/stores/useAdminAiQuestionParserStore.ts';
import { CVS_TAXONOMY } from '../../../../domain/taxonomy/cvsTaxonomy.ts';
import type { ChoiceId } from '../../../../domain/model/types.ts';
import type { CloudProviderId } from '../../../../domain/ai/settings.ts';

const MODEL_OPTIONS: Array<{
  providerId: CloudProviderId;
  modelId: string;
  name: string;
  badge: string;
}> = [
  {
    providerId: 'gemini',
    modelId: 'gemini-2.5-flash',
    name: 'Google Gemini 2.5 Flash',
    badge: 'Recommended • Fast & High Accuracy',
  },
  {
    providerId: 'gemini',
    modelId: 'gemini-2.5-pro',
    name: 'Google Gemini 2.5 Pro',
    badge: 'Deep Clinical Reasoning',
  },
  {
    providerId: 'groq',
    modelId: 'openai/gpt-oss-120b',
    name: 'Groq GPT-OSS (120B)',
    badge: 'Ultra-Fast Complex Analysis',
  },
  {
    providerId: 'groq',
    modelId: 'openai/gpt-oss-20b',
    name: 'Groq GPT-OSS (20B)',
    badge: 'Instant Parsing (<100ms)',
  },
  {
    providerId: 'openrouter',
    modelId: 'anthropic/claude-3.7-sonnet',
    name: 'Claude 3.7 Sonnet (via OpenRouter)',
    badge: 'Supreme Clinical Nuance',
  },
  {
    providerId: 'openrouter',
    modelId: 'deepseek/deepseek-r1',
    name: 'DeepSeek R1 Reasoning (via OpenRouter)',
    badge: 'Extended Chain-of-Thought',
  },
];

const SAMPLE_RAW_TEXT = `1. A 55-year-old man presents with progressive dyspnea on exertion and syncope. Cardiac auscultation reveals a harsh, crescendo-decrescendo systolic murmur heard loudest at the right second intercostal space, radiating to the carotids. Which valve pathology is most likely?
A. Mitral regurgitation
B. Aortic stenosis
C. Tricuspid regurgitation
D. Pulmonary regurgitation
Answer: B
Explanation: Aortic stenosis classically presents with a crescendo-decrescendo systolic murmur at the right upper sternal border with carotid radiation and the triad of SAD (Syncope, Angina, Dyspnea).

2. During cardiac embryogenesis, which structure is primarily responsible for the development of the smooth part of the right ventricle (conus arteriosus)?
A. Truncus arteriosus
B. Bulbus cordis
C. Primitive ventricle
D. Sinus venosus
Note: (Admin omitted the answer key here to test AI generation)`;

export const AdminAiQuestionParserLab: React.FC = () => {
  const { authState, elevateToPlatformOwner } = useAuthStore();
  const {
    rawInputText,
    setRawInputText,
    selectedProvider,
    selectedModelId,
    setSelectedModel,
    targetSubjectId,
    targetChapterId,
    setTargetTaxonomy,
    isParsing,
    parsedQuestions,
    selectedTempIds,
    error,
    isCommitting,
    commitFeedback,
    parseRawQuestions,
    toggleQuestionSelection,
    selectAll,
    updateQuestionStem,
    updateChoice,
    setKeyedCorrectChoice,
    updateExplanation,
    removeParsedQuestion,
    commitToGlobalQuestionBank,
    getSingleQuestionPrompt,
    getBatchVerificationPrompt,
  } = useAdminAiQuestionParserStore();

  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [copiedBatchPrompt, setCopiedBatchPrompt] = useState(false);
  const [editingTempId, setEditingTempId] = useState<string | null>(null);
  const [expandedRationales, setExpandedRationales] = useState<Set<string>>(new Set());
  const [isElevating, setIsElevating] = useState(false);

  const isAdmin = authState.status === 'authenticated-active' && authState.user.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] p-8 text-center rounded-3xl border border-zinc-200/80 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl shadow-lg">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4 ring-1 ring-amber-500/20">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold font-heading text-zinc-900 dark:text-zinc-100">
          Administrator Privilege Required
        </h2>
        <p className="mt-2 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
          The AI Question Ingestion & Anti-Hallucination Studio is restricted to Platform Administrators.
        </p>
        <button
          type="button"
          disabled={isElevating}
          onClick={async () => {
            setIsElevating(true);
            try {
              await elevateToPlatformOwner();
            } finally {
              setIsElevating(false);
            }
          }}
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>{isElevating ? 'Elevating Account...' : 'Elevate to Platform Administrator (Demo/Dev)'}</span>
        </button>
      </div>
    );
  }

  const handleCopySinglePrompt = async (index: number, tempId: string) => {
    const prompt = getSingleQuestionPrompt(index);
    await navigator.clipboard.writeText(prompt);
    setCopiedPromptId(tempId);
    setTimeout(() => setCopiedPromptId(null), 2500);
  };

  const handleCopyBatchPrompt = async () => {
    const prompt = getBatchVerificationPrompt();
    await navigator.clipboard.writeText(prompt);
    setCopiedBatchPrompt(true);
    setTimeout(() => setCopiedBatchPrompt(false), 2500);
  };

  const toggleRationaleExpand = (tempId: string) => {
    const next = new Set(expandedRationales);
    if (next.has(tempId)) next.delete(tempId);
    else next.add(tempId);
    setExpandedRationales(next);
  };

  const availableChapters =
    targetSubjectId === 'all'
      ? CVS_TAXONOMY.chapters
      : CVS_TAXONOMY.chapters.filter((c) => c.subjectId === targetSubjectId);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* HEADER BANNER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-6 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 bg-gradient-to-br from-white/90 via-white/50 to-zinc-50/80 dark:from-zinc-900/80 dark:via-zinc-900/50 dark:to-zinc-950/80 backdrop-blur-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Sparkles className="w-3 h-3" />
              AI Ingestion & Anti-Hallucination Studio
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <ShieldCheck className="w-3 h-3" />
              Admin Only
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-heading text-zinc-900 dark:text-zinc-50">
            AI Question Ingestion & Format Lab
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-2xl">
            Directly input unstructured clinical text or lecture MCQs. The AI agent formats items to
            NBME Single-Best-Answer standards, detects missing answer keys, generates authoritative
            rationales, and lets you verify accuracy before committing to the Global Question Bank.
          </p>
        </div>
      </div>

      {/* MODEL SELECTION & TAXONOMY BAR */}
      <div className="p-6 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/60 pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-purple-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              AI Model & Curriculum Targeting
            </h2>
          </div>
          <span className="text-[11px] text-zinc-400">Zero Main-Thread Latency</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* AI Model Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Reasoning Engine (Model Selection)
            </label>
            <select
              value={`${selectedProvider}:::${selectedModelId}`}
              onChange={(e) => {
                const [provider, model] = e.target.value.split(':::') as [CloudProviderId, string];
                setSelectedModel(provider, model);
              }}
              disabled={isParsing}
              className="w-full text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-purple-500 transition-all font-medium"
            >
              {MODEL_OPTIONS.map((opt) => (
                <option key={`${opt.providerId}:::${opt.modelId}`} value={`${opt.providerId}:::${opt.modelId}`}>
                  {opt.name} — ({opt.badge})
                </option>
              ))}
            </select>
          </div>

          {/* Subject Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Target Curriculum Subject
            </label>
            <select
              value={targetSubjectId}
              onChange={(e) => setTargetTaxonomy(e.target.value, 'all')}
              disabled={isParsing}
              className="w-full text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-purple-500 transition-all"
            >
              <option value="all">Auto-Infer from Stem Content</option>
              {CVS_TAXONOMY.subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          {/* Chapter Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Target Chapter
            </label>
            <select
              value={targetChapterId}
              onChange={(e) => setTargetTaxonomy(targetSubjectId, e.target.value)}
              disabled={isParsing}
              className="w-full text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-purple-500 transition-all"
            >
              <option value="all">Auto-Assign to High-Yield Chapter</option>
              {availableChapters.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* DIRECT RAW TEXT INPUT CHAMBER */}
      <div className="p-6 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              Direct Text Ingestion
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setRawInputText(SAMPLE_RAW_TEXT)}
            className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
          >
            Load Sample Unformatted Questions
          </button>
        </div>

        <div className="relative">
          <textarea
            rows={8}
            placeholder={`Paste raw clinical questions here in any format (e.g. from Word, PDF, or unformatted notes)...\n\nExample:\n1. A 62-year-old male presents with exertional chest pain...\nA. Stable angina\nB. Unstable angina\nC. GERD\nD. Costochondritis\n(Answer key can be included or omitted; AI will detect and deduce if missing)`}
            value={rawInputText}
            onChange={(e) => setRawInputText(e.target.value)}
            disabled={isParsing}
            className="w-full text-xs font-mono p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all resize-y"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
          <div className="text-[11px] text-zinc-500">
            {rawInputText.trim().length} characters • Accepts multiple numbered or unnumbered items
          </div>

          <div className="flex items-center gap-2">
            {rawInputText && (
              <button
                type="button"
                onClick={() => setRawInputText('')}
                className="px-3 py-2 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                Clear
              </button>
            )}

            <button
              type="button"
              onClick={parseRawQuestions}
              disabled={isParsing || !rawInputText.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500 hover:opacity-95 shadow-lg shadow-purple-500/25 transition-all disabled:opacity-50 cursor-pointer active:scale-98"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isParsing ? 'animate-spin' : ''}`} />
              <span>{isParsing ? 'Parsing & Structuring with AI...' : 'Parse & Format Questions with AI'}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* ANTI-HALLUCINATION INSPECTION & APPROVAL CHAMBER */}
      {parsedQuestions.length > 0 && (
        <div className="space-y-6 animate-in slide-in-from-bottom duration-300">
          {/* Summary & Batch Actions Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Pre-Approval Inspection ({parsedQuestions.length} Items)
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold">
                  {selectedTempIds.size} Selected
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Inspect AI-parsed questions before committing. Verify the AI did not hallucinate.
              </p>
            </div>

            {/* Batch Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => selectAll(selectedTempIds.size < parsedQuestions.length)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all cursor-pointer"
              >
                {selectedTempIds.size === parsedQuestions.length ? (
                  <CheckSquare className="w-3.5 h-3.5 text-purple-600" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-zinc-400" />
                )}
                <span>Select All</span>
              </button>

              <button
                type="button"
                onClick={handleCopyBatchPrompt}
                title="Copy cross-examination prompt for all selected questions to paste into ChatGPT/Claude"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-purple-200 dark:border-purple-800 bg-purple-50/60 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-all cursor-pointer shadow-xs"
              >
                {copiedBatchPrompt ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>Copy Group Verification Prompt ({selectedTempIds.size})</span>
              </button>

              <button
                type="button"
                onClick={() => commitToGlobalQuestionBank(true)}
                disabled={isCommitting || selectedTempIds.size === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {isCommitting ? 'Committing...' : `Approve & Add (${selectedTempIds.size}) to Global Bank`}
                </span>
              </button>
            </div>
          </div>

          {/* Toast feedback */}
          {commitFeedback && (
            <div
              className={`p-4 rounded-2xl border text-xs flex items-center gap-2 animate-in fade-in duration-300 ${
                commitFeedback.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
              }`}
            >
              {commitFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              )}
              <span className="font-medium">{commitFeedback.message}</span>
            </div>
          )}

          {/* QUESTIONS LIST */}
          <div className="space-y-4">
            {parsedQuestions.map((item, idx) => {
              const isSelected = selectedTempIds.has(item.tempId);
              const isEditing = editingTempId === item.tempId;
              const isRationaleExpanded = expandedRationales.has(item.tempId);
              const isPromptCopied = copiedPromptId === item.tempId;

              return (
                <div
                  key={item.tempId}
                  className={`p-6 rounded-3xl border transition-all ${
                    isSelected
                      ? 'border-purple-300 dark:border-purple-800 bg-white/90 dark:bg-zinc-900/90 shadow-md'
                      : 'border-zinc-200/80 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 opacity-80'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleQuestionSelection(item.tempId)}
                        className="cursor-pointer text-purple-600 dark:text-purple-400"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4 text-zinc-400" />
                        )}
                      </button>

                      <span className="text-xs font-mono font-bold text-zinc-400">#{idx + 1}</span>

                      {/* Missing Answer Badge / Verification Badge */}
                      {item.aiGeneratedAnswerKey ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                          <AlertTriangle className="w-3 h-3 text-amber-500" />
                          Answer Key Inferred by AI (Original input lacked key)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                          <Check className="w-3 h-3 text-emerald-500" />
                          Author Key Verified
                        </span>
                      )}

                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        {item.question.concept}
                      </span>
                    </div>

                    {/* Quick Item Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {/* Copy Professional Prompt Icon */}
                      <button
                        type="button"
                        onClick={() => handleCopySinglePrompt(idx, item.tempId)}
                        title="Copy Professional Verification Prompt (to cross-test with external models like ChatGPT or Claude)"
                        className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all cursor-pointer shadow-xs"
                      >
                        {isPromptCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-purple-500" />
                        )}
                        <span className="text-[11px] font-semibold">
                          {isPromptCopied ? 'Copied Audit Prompt!' : 'Copy Verification Prompt'}
                        </span>
                      </button>

                      {/* Inline Edit Toggle */}
                      <button
                        type="button"
                        onClick={() => setEditingTempId(isEditing ? null : item.tempId)}
                        className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                          isEditing
                            ? 'bg-purple-100 dark:bg-purple-950 border-purple-300 dark:border-purple-700 text-purple-600'
                            : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                        }`}
                        title="Edit question text and rationales"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* Remove from batch */}
                      <button
                        type="button"
                        onClick={() => removeParsedQuestion(idx)}
                        className="p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer"
                        title="Remove question from batch"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Card Body: Stem & Choices */}
                  <div className="mt-4 space-y-4">
                    {/* Stem */}
                    {isEditing ? (
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-zinc-500 uppercase">Stem</label>
                        <textarea
                          rows={3}
                          value={item.question.stem}
                          onChange={(e) => updateQuestionStem(idx, e.target.value)}
                          className="w-full text-xs p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                        />
                      </div>
                    ) : (
                      <p className="text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200 leading-relaxed">
                        {item.question.stem}
                      </p>
                    )}

                    {/* Choices Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {item.question.choices.map((c) => {
                        const isCorrect = c.isCorrect;
                        return (
                          <div
                            key={c.id}
                            className={`p-3 rounded-2xl border transition-all ${
                              isCorrect
                                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-950 dark:text-emerald-200'
                                : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200/60 dark:border-zinc-700/60 text-zinc-800 dark:text-zinc-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                    isCorrect
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                                  }`}
                                >
                                  {c.id.toUpperCase()}
                                </span>

                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={c.text}
                                    onChange={(e) => updateChoice(idx, c.id as ChoiceId, e.target.value, c.rationale)}
                                    className="text-xs p-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                                  />
                                ) : (
                                  <span className="text-xs font-semibold">{c.text}</span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {isEditing ? (
                                  <button
                                    type="button"
                                    onClick={() => setKeyedCorrectChoice(idx, c.id as ChoiceId)}
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                                      isCorrect
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                                    }`}
                                  >
                                    {isCorrect ? 'Correct Key' : 'Set as Key'}
                                  </button>
                                ) : (
                                  isCorrect && (
                                    <span className="text-[10px] font-extrabold uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                      Keyed Answer
                                    </span>
                                  )
                                )}
                              </div>
                            </div>

                            {/* Rationale Display */}
                            {isRationaleExpanded && (
                              <div className="mt-2 pt-2 border-t border-zinc-200/50 dark:border-zinc-700/40 text-[11px] text-zinc-600 dark:text-zinc-400">
                                <span className="font-semibold text-zinc-900 dark:text-zinc-200">
                                  Rationale:
                                </span>{' '}
                                {isEditing ? (
                                  <textarea
                                    rows={2}
                                    value={c.rationale}
                                    onChange={(e) => updateChoice(idx, c.id as ChoiceId, c.text, e.target.value)}
                                    className="w-full text-xs p-1.5 mt-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                                  />
                                ) : (
                                  c.rationale || 'No rationale available.'
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Toggle Rationales & Explanation */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <button
                        type="button"
                        onClick={() => toggleRationaleExpand(item.tempId)}
                        className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {isRationaleExpanded ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" />
                            Hide Distractor Rationales & Explanation
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5" />
                            Inspect Distractor Rationales & Explanation
                          </>
                        )}
                      </button>

                      <span className="text-[11px] text-zinc-400 font-mono">
                        Taxonomy: {item.question.subjectId} • diff {item.question.difficulty}
                      </span>
                    </div>

                    {/* Expanded Explanation */}
                    {isRationaleExpanded && (
                      <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/50 space-y-2">
                        <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                          Clinical Explanation
                        </div>
                        {isEditing ? (
                          <textarea
                            rows={3}
                            value={item.question.explanation}
                            onChange={(e) => updateExplanation(idx, e.target.value)}
                            className="w-full text-xs p-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                          />
                        ) : (
                          <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                            {item.question.explanation}
                          </p>
                        )}
                        {item.question.evidence && item.question.evidence[0] && (
                          <div className="text-[10px] text-zinc-400 italic pt-1">
                            Grounding: {item.question.evidence[0].sourceName} ({item.question.evidence[0].location})
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
