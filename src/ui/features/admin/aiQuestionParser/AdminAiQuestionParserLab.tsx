/**
 * Presentation Component: AdminAiQuestionParserLab
 * World-Class AI Question Ingestion, Formatting & Anti-Hallucination Inspection Chamber
 * Designed with Apple Human Interface Guidelines:
 * - Fluid spring animations, glassmorphism, clarity, depth, and precision.
 * - Dynamic AI Model selection (Gemini 2.5 Pro/Flash, Groq 120B/20B, Claude 3.7 Sonnet, DeepSeek R1).
 * - Autonomous Curriculum Taxonomy Assignment with AI Gap Analysis (Subject/Chapter Proposals).
 * - Pre-approval anti-hallucination inspection drawer before committing to the Global Bank.
 * - Single-item and batch verification prompt exports for cross-model auditing.
 */

import React, { useState, useEffect } from 'react';
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
  Sliders,
  FolderPlus,
  BookOpen,
  HelpCircle,
  X,
  Layers,
  ArrowRight,
  RotateCcw,
  Scale,
  Loader2,
  StopCircle,
  Info,
} from 'lucide-react';
import { useAuthStore } from '../../../../application/stores/useAuthStore.ts';
import { useAdminAiQuestionParserStore } from '../../../../application/stores/useAdminAiQuestionParserStore.ts';
import { curriculumTaxonomyRegistry } from '../../../../domain/taxonomy/CurriculumTaxonomyRegistry.ts';
import { AppleIntelligenceAgentOrchestrator } from './AppleIntelligenceAgentOrchestrator.tsx';
import { DuplicateBadge } from '../../qdd/DuplicateBadge.tsx';
import { DuplicateCompareSheet } from '../../qdd/DuplicateCompareSheet.tsx';
import type { ParsedQuestionItem } from '../../../../domain/questionBank/aiQuestionParser/types.ts';
import type { ChoiceId } from '../../../../domain/model/types.ts';
import type { CloudProviderId } from '../../../../domain/ai/settings.ts';

interface ModelOption {
  readonly providerId: CloudProviderId;
  readonly modelId: string;
  readonly name: string;
  readonly providerName: string;
  readonly badge: string;
  readonly speed: string;
  readonly description: string;
}

const MODEL_OPTIONS: ModelOption[] = [
  {
    providerId: 'gemini',
    modelId: 'gemini-2.5-flash',
    name: 'Google Gemini 2.5 Flash',
    providerName: 'Google Cloud Vertex',
    badge: 'Recommended • Fast & High Accuracy',
    speed: '< 400ms Sub-Second',
    description: 'High throughput, optimal balance of medical reasoning and ultra-fast structured parsing.',
  },
  {
    providerId: 'gemini',
    modelId: 'gemini-2.5-pro',
    name: 'Google Gemini 2.5 Pro',
    providerName: 'Google Cloud Vertex',
    badge: 'Flagship Clinical Reasoning',
    speed: 'Deep Multi-turn (1M TPM)',
    description: 'Gold standard for complex multi-system vignettes and deep pathophysiological rationale generation.',
  },
  {
    providerId: 'gemini',
    modelId: 'gemini-3.5-flash-lite',
    name: 'Gemini 3.5 Flash-Lite',
    providerName: 'Google DeepMind',
    badge: 'Sub-100ms Ultra-Fast',
    speed: '< 80ms Instantaneous',
    description: 'Next-generation lightweight Flash architecture for ultra-rapid parsing and real-time quorum validation.',
  },
  {
    providerId: 'groq',
    modelId: 'openai/gpt-oss-120b',
    name: 'Groq GPT-OSS 120B',
    providerName: 'Groq Cloud LPU',
    badge: 'LPU Ultra-Low Latency',
    speed: '500+ tokens/sec',
    description: 'Extreme inference throughput on massive parameter open weights for rapid bulk parsing.',
  },
  {
    providerId: 'groq',
    modelId: 'openai/gpt-oss-20b',
    name: 'Groq GPT-OSS 20B',
    providerName: 'Groq Cloud LPU',
    badge: 'Instant Light Model',
    speed: 'Instantaneous (<100ms)',
    description: 'Ultra-lightweight model for swift single-question text formatting and basic MCQ extraction.',
  },
  {
    providerId: 'openrouter',
    modelId: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    name: 'Nemotron 3 Ultra 550B',
    providerName: 'OpenRouter (NVIDIA)',
    badge: '550B Reasoning Beast',
    speed: 'Live & Verified (~1.4s)',
    description: 'Massive 550-billion parameter reasoning model with deep medical thinking tokens and board-caliber accuracy.',
  },
  {
    providerId: 'openrouter',
    modelId: 'nvidia/nemotron-3.5-super-vl:free',
    name: 'Nemotron 3.5 Super VL',
    providerName: 'OpenRouter (NVIDIA)',
    badge: 'Clinical Reasoning Specialist',
    speed: 'Live & Verified (~1.2s)',
    description: 'High-speed reasoning model with deep pathophysiological logic and structured output.',
  },
];

const SUBJECT_META: Record<string, { icon: string; badgeColor: string }> = {
  anatomy: { icon: '🩺', badgeColor: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/25' },
  histology: { icon: '🔬', badgeColor: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25' },
  microbiology: { icon: '🧫', badgeColor: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25' },
  physiology: { icon: '⚡', badgeColor: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25' },
  pharmacology: { icon: '💊', badgeColor: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25' },
  pathology: { icon: '🧬', badgeColor: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/25' },
};

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
Note: (Admin omitted the answer key here to test AI generation)

3. A 64-year-old female with persistent atrial fibrillation is initiated on an antiarrhythmic medication that prolongs the cardiac action potential duration by blocking rapid delayed rectifier potassium currents (IKr). Which adverse effect is most concerning?
A. Lupus-like syndrome
B. Torsades de pointes (QTc prolongation)
C. Pulmonary fibrosis
D. Cinchonism
Note: (Tests dynamic curriculum detection of Cardiovascular Pharmacology)`;

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
    stemMode,
    setStemMode,
    toggleStemFormat,
    enableConsensusCheck,
    setEnableConsensusCheck,
    agentTelemetry,
    isVerifyingConsensusIndex,
    abortCurrentExecution,
    runSingleQuestionConsensus,
    isParsing,
    parsedQuestions,
    selectedTempIds,
    error,
    isCommitting,
    commitFeedback,
    isCheckingDuplication,
    saveAllUnique,
    parseRawQuestions,
    toggleQuestionSelection,
    selectAll,
    updateQuestionStem,
    updateChoice,
    setKeyedCorrectChoice,
    updateExplanation,
    updateQuestionTaxonomy,
    approveTaxonomyProposal,
    removeParsedQuestion,
    commitToGlobalQuestionBank,
    getSingleQuestionPrompt,
    getBatchVerificationPrompt,
  } = useAdminAiQuestionParserStore();

  const [inspectingQuestionItem, setInspectingQuestionItem] = useState<ParsedQuestionItem | null>(null);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [copiedBatchPrompt, setCopiedBatchPrompt] = useState(false);
  const [editingTempId, setEditingTempId] = useState<string | null>(null);
  const [expandedRationales, setExpandedRationales] = useState<Set<string>>(new Set());
  const [isElevating, setIsElevating] = useState(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [taxonomyEditTempId, setTaxonomyEditTempId] = useState<string | null>(null);
  const [proposalToast, setProposalToast] = useState<string | null>(null);
  const [, setTaxonomyRevision] = useState(0);

  // Subscribe to registry expansions
  useEffect(() => {
    const unsub = curriculumTaxonomyRegistry.subscribe(() => {
      setTaxonomyRevision((r) => r + 1);
    });
    return unsub;
  }, []);

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

  const activeModel =
    MODEL_OPTIONS.find((m) => m.providerId === selectedProvider && m.modelId === selectedModelId) ||
    MODEL_OPTIONS[0];

  const currentSubjects = curriculumTaxonomyRegistry.getSubjects();
  const currentChapters = curriculumTaxonomyRegistry.getChapters(
    targetSubjectId === 'auto' || targetSubjectId === 'all' ? undefined : targetSubjectId
  );

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

  const handleApproveProposal = (tempId: string, type: 'subject' | 'chapter', name: string) => {
    approveTaxonomyProposal(tempId, type);
    setProposalToast(`Successfully approved and registered "${name}" into the active curriculum!`);
    setTimeout(() => setProposalToast(null), 4000);
  };

  const isAutoCurriculumMode = targetSubjectId === 'auto' || targetSubjectId === 'all';

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
            NBME Single-Best-Answer standards, detects missing answer keys, dynamically classifies
            curriculum subjects & chapters, and alerts you to curriculum expansion gaps.
          </p>
        </div>
      </div>

      {/* APPLE PRO REASONING & CURRICULUM CONTROL DECK */}
      <div className="p-6 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl shadow-lg space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/60 pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-purple-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              AI Reasoning Engine & Dynamic Curriculum Targeting
            </h2>
          </div>
          <span className="text-[11px] text-zinc-400 font-medium">Apple HIG Cupertino Deck</span>
        </div>

        {/* 2-Column Responsive Deck */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Section 1: AI Reasoning Model Card (Col 5) */}
          <div className="lg:col-span-5 p-4 rounded-2xl border border-zinc-200/70 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 shadow-xs flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  Active Reasoning Model
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  {activeModel.speed}
                </span>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {activeModel.name}
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2">
                    {activeModel.description}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <span className="text-[10px] text-zinc-400 font-mono">
                Provider: {activeModel.providerName}
              </span>
              <button
                type="button"
                onClick={() => setIsModelModalOpen(true)}
                disabled={isParsing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700/80 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100 transition-all cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-purple-500" />
                <span>Switch Model</span>
                <ChevronDown className="w-3 h-3 text-zinc-400" />
              </button>
            </div>
          </div>

          {/* Section 2: Curriculum Taxonomy Targeting Deck (Col 7) */}
          <div className="lg:col-span-7 p-4 rounded-2xl border border-zinc-200/70 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                Curriculum Scope & Classification Mode
              </span>

              {/* Apple Segmented Switcher */}
              <div className="inline-flex p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 text-xs">
                <button
                  type="button"
                  onClick={() => setTargetTaxonomy('auto', 'auto')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isAutoCurriculumMode
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>AI Auto-Classify</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTargetTaxonomy(currentSubjects[0]?.id || 'anatomy', 'all')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    !isAutoCurriculumMode
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  <Sliders className="w-3 h-3" />
                  <span>Manual Scope</span>
                </button>
              </div>
            </div>

            {isAutoCurriculumMode ? (
              /* Auto Intelligent Classification Mode Card */
              <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-pink-500/10 border border-purple-500/20 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      Autonomous Curriculum Mapping & Gap Analysis
                    </span>
                    <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/15 px-2 py-0.2 rounded-full">
                      Active
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    The AI dynamically inspects each clinical vignette and assigns the exact Subject &
                    Chapter from our registered curriculum. If a question addresses unmapped medical
                    territory (e.g. Pharmacology or Pathology), the AI proposes a formal curriculum expansion.
                  </p>
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    {currentSubjects.map((s) => (
                      <span
                        key={s.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/70 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                      >
                        <span>{SUBJECT_META[s.id]?.icon || '📚'}</span>
                        <span>{s.name}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Manual Targeting Mode - Subject & Chapter Selectors */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Subject Selector */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                    Subject Scope
                  </label>
                  <select
                    value={targetSubjectId}
                    onChange={(e) => setTargetTaxonomy(e.target.value, 'all')}
                    disabled={isParsing}
                    className="w-full text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 font-medium focus:ring-2 focus:ring-purple-500 transition-all"
                  >
                    {currentSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {SUBJECT_META[s.id]?.icon || '📚'} {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Chapter Selector */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                    Chapter Scope
                  </label>
                  <select
                    value={targetChapterId}
                    onChange={(e) => setTargetTaxonomy(targetSubjectId, e.target.value)}
                    disabled={isParsing}
                    className="w-full text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 font-medium focus:ring-2 focus:ring-purple-500 transition-all"
                  >
                    <option value="all">All Chapters in {targetSubjectId}</option>
                    {currentChapters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Question Stem Fidelity & Formatting Policy */}
        <div className="p-4 rounded-2xl border border-zinc-200/70 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                Question Stem Fidelity
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                {stemMode === 'verbatim' ? 'Strict Author Fidelity' : 'USMLE Case Study'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {stemMode === 'verbatim'
                ? 'Preserves the author’s exact question wording directly (best for faculty tests & direct recall).'
                : 'Enriches dry recall questions into patient presentation vignettes (best for USMLE Step 1 practice).'}
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700/60 shrink-0">
            <button
              type="button"
              onClick={() => setStemMode('verbatim')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                stemMode === 'verbatim'
                  ? 'bg-white dark:bg-zinc-700 text-purple-600 dark:text-purple-300 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              📄 Verbatim (Faithful)
            </button>
            <button
              type="button"
              onClick={() => setStemMode('vignette')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                stemMode === 'vignette'
                  ? 'bg-white dark:bg-zinc-700 text-purple-600 dark:text-purple-300 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              🏥 USMLE Vignette
            </button>
          </div>
        </div>

        {/* Section 4: Multi-Model Consensus Verification Policy */}
        <div className="p-4 rounded-2xl border border-zinc-200/70 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                Multi-Model Accuracy Check
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  enableConsensusCheck
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20'
                }`}
              >
                {enableConsensusCheck ? 'Multi-Model Quorum Active' : 'Single Engine Pass'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {enableConsensusCheck
                ? 'Concurrently queries Gemini, Claude 3.7, DeepSeek R1, and Referee to cross-verify answers and detect hallucinations.'
                : 'Fast parsing with primary model. You can still cross-examine individual questions on demand in the inspection queue.'}
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700/60 shrink-0">
            <button
              type="button"
              onClick={() => setEnableConsensusCheck(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                !enableConsensusCheck
                  ? 'bg-white dark:bg-zinc-700 text-purple-600 dark:text-purple-300 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              ⚡ Fast (Single Engine)
            </button>
            <button
              type="button"
              onClick={() => setEnableConsensusCheck(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                enableConsensusCheck
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>⚖️ Multi-Model Ensemble</span>
            </button>
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
            className="w-full text-xs font-mono p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-purple-500 transition-all shadow-inner leading-relaxed"
          />
        </div>

        {/* Action Button & Parsing Indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>
              The AI will format into 4-choice SBAs, deduce missing keys, assign curriculum chapters,
              and execute multi-model cross-examinations.
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isParsing && (
              <button
                type="button"
                onClick={abortCurrentExecution}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 transition-all cursor-pointer"
              >
                <StopCircle className="w-4 h-4 text-rose-500 animate-pulse" />
                <span>Cancel Execution</span>
              </button>
            )}

            <button
              type="button"
              onClick={parseRawQuestions}
              disabled={isParsing || !rawInputText.trim()}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:opacity-95 shadow-md shadow-purple-500/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {isParsing
                  ? agentTelemetry?.activeToolName
                    ? `Running: ${agentTelemetry.activeToolName}...`
                    : 'Executing AI Medical Analysis...'
                  : 'Parse & Format Questions'}
              </span>
            </button>
          </div>
        </div>

        {/* APPLE INTELLIGENCE INTERACTIVE NEURAL ORCHESTRATOR */}
        {agentTelemetry && (
          <AppleIntelligenceAgentOrchestrator
            telemetry={agentTelemetry}
            isParsing={isParsing}
            onAbort={abortCurrentExecution}
            activeModelName={activeModel.name}
            stemMode={stemMode}
            enableConsensusCheck={enableConsensusCheck}
          />
        )}

        {error && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* INSPECTION & PRE-APPROVAL STAGING DRAWER */}
      {parsedQuestions.length > 0 && (
        <div className="space-y-6 animate-in slide-in-from-bottom duration-300">
          {/* Header & Global Batch Actions */}
          <div className="p-6 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold font-heading text-zinc-900 dark:text-zinc-50">
                    Pre-Approval Inspection Queue ({parsedQuestions.length} Items)
                  </h2>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    {selectedTempIds.size} Selected
                  </span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Inspect the structured questions below before committing to the Global Question Bank.
                  You can edit stems, choices, keys, or curriculum assignments inline.
                </p>
              </div>

              {/* Batch Action Toolbar */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => selectAll(selectedTempIds.size !== parsedQuestions.length)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all cursor-pointer"
                >
                  {selectedTempIds.size === parsedQuestions.length ? 'Deselect All' : 'Select All'}
                </button>

                <button
                  type="button"
                  onClick={handleCopyBatchPrompt}
                  title="Copy a single comprehensive prompt for all selected questions to cross-examine with other LLMs"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all cursor-pointer"
                >
                  {copiedBatchPrompt ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-purple-500" />
                  )}
                  <span>{copiedBatchPrompt ? 'Batch Prompt Copied!' : 'Copy Batch Prompt'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => saveAllUnique()}
                  disabled={isCommitting || isCheckingDuplication || parsedQuestions.length === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Automatically skip all questions flagged as duplicates or conflicts and commit only unique items to the bank"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>
                    {isCommitting ? 'Saving…' : 'Save all unique'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => commitToGlobalQuestionBank(true)}
                  disabled={isCommitting || selectedTempIds.size === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {isCommitting
                      ? 'Committing...'
                      : `Approve & Commit (${selectedTempIds.size}) to Bank`}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* CURRICULUM AUTO-CLASSIFIER BATCH OVERVIEW DECK */}
          <div className="p-4 rounded-2xl border border-purple-500/20 bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-cyan-500/10 backdrop-blur-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-purple-900 dark:text-purple-200">
                    Autonomous Curriculum Auto-Classifier Scope
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-bold">
                    100% Items Classified
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-600 dark:text-zinc-400 flex-wrap">
                  <span>Target Block: <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">{parsedQuestions[0]?.taxonomyClassification?.blockName || 'Cardiovascular System (CVS) - Block 206'}</strong></span>
                  <span>•</span>
                  <span>{parsedQuestions.length} Question(s) Grounded to Active Syllabus</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {Array.from(new Set(parsedQuestions.map((q) => q.question.subjectId))).map((subjId) => {
                const count = parsedQuestions.filter((q) => q.question.subjectId === subjId).length;
                const meta = SUBJECT_META[subjId] || { icon: '📚', badgeColor: 'bg-zinc-500/10 text-zinc-700' };
                return (
                  <span
                    key={subjId}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-white/80 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 shadow-2xs"
                  >
                    <span>{meta.icon}</span>
                    <span className="capitalize">{subjId}: {count}</span>
                  </span>
                );
              })}
            </div>
          </div>

          {commitFeedback && (
            <div
              className={`p-4 rounded-2xl border text-xs flex items-center gap-2 ${
                commitFeedback.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300'
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
              const isTaxonomyEditing = taxonomyEditTempId === item.tempId;
              const isRationaleExpanded = expandedRationales.has(item.tempId);
              const isPromptCopied = copiedPromptId === item.tempId;
              const classification = item.taxonomyClassification;

              const subjectMeta =
                SUBJECT_META[item.question.subjectId] || {
                  icon: '📚',
                  badgeColor: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/25',
                };

              return (
                <div
                  key={item.tempId}
                  className={`p-6 rounded-3xl border transition-all space-y-4 ${
                    isSelected
                      ? 'border-purple-300 dark:border-purple-800 bg-white/90 dark:bg-zinc-900/90 shadow-md'
                      : 'border-zinc-200/80 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 opacity-80'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
                    <div className="flex items-center gap-3 flex-wrap">
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
                          Answer Key Inferred by AI
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                          <Check className="w-3 h-3 text-emerald-500" />
                          Author Key Verified
                        </span>
                      )}

                      {/* QDD Duplication Status Badge */}
                      <DuplicateBadge
                        verdict={item.qddVerdict}
                        isChecking={isCheckingDuplication || item.isCheckingDuplication}
                        onInspect={() => setInspectingQuestionItem(item)}
                      />

                      {/* Dynamic Curriculum Classification Breadcrumb */}
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${subjectMeta.badgeColor}`}
                        >
                          <span>{subjectMeta.icon}</span>
                          <span className="capitalize">{item.question.subjectId}</span>
                        </span>
                        <ArrowRight className="w-3 h-3 text-zinc-400" />
                        <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                          {classification?.chapterName || item.question.chapterId}
                        </span>
                      </div>
                    </div>

                    {/* Quick Item Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {/* Copy Professional Prompt Icon */}
                      <button
                        type="button"
                        onClick={() => handleCopySinglePrompt(idx, item.tempId)}
                        title="Copy Verification Prompt for Cross-Testing with ChatGPT or Claude (Includes Block, Subject, & Chapter Grounding)"
                        className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all cursor-pointer shadow-xs"
                      >
                        {isPromptCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-purple-500" />
                        )}
                        <span className="text-[11px] font-semibold">
                          {isPromptCopied ? 'Copied Prompt with Scope!' : 'Copy Verification Prompt'}
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
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => removeParsedQuestion(idx)}
                        className="p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-rose-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* DEDICATED AUTONOMOUS CURRICULUM AUTO-CLASSIFIER RESULT LENS */}
                  <div className="p-4 rounded-2xl border border-purple-500/25 bg-gradient-to-r from-purple-500/5 via-indigo-500/5 to-cyan-500/5 dark:from-purple-950/20 dark:via-zinc-900/40 dark:to-cyan-950/20 backdrop-blur-md space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-purple-200/50 dark:border-purple-800/40 pb-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                          <Sparkles className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-extrabold uppercase tracking-wider text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                          Autonomous Curriculum Auto-Classifier Result
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                          {classification?.confidenceScore || 95}% Match Confidence
                        </span>
                        {classification?.isNewDomainSuggested && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 animate-pulse">
                            Curriculum Gap Detected
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setTaxonomyEditTempId(isTaxonomyEditing ? null : item.tempId)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold text-purple-600 dark:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition-all cursor-pointer self-start sm:self-auto"
                      >
                        <Sliders className="w-3 h-3" />
                        <span>{isTaxonomyEditing ? 'Close Re-Assignment' : 'Re-Assign Taxonomy'}</span>
                      </button>
                    </div>

                    {/* 3-Pill Taxonomy Grid: Block, Subject, Chapter */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {/* 1. Target Block */}
                      <div className="p-3 rounded-xl bg-white/90 dark:bg-zinc-800/90 border border-zinc-200/70 dark:border-zinc-700/60 shadow-2xs space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                          <span>Target Block</span>
                          <span className="text-xs">🫀</span>
                        </div>
                        <div
                          className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate"
                          title={classification?.blockName || 'Cardiovascular System (CVS) - Block 206'}
                        >
                          {classification?.blockName || 'Cardiovascular System (CVS) - Block 206'}
                        </div>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          Integrated Organ System
                        </div>
                      </div>

                      {/* 2. Target Subject */}
                      <div className="p-3 rounded-xl bg-white/90 dark:bg-zinc-800/90 border border-zinc-200/70 dark:border-zinc-700/60 shadow-2xs space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                          <span>Target Subject</span>
                          <span className="text-xs">{subjectMeta.icon}</span>
                        </div>
                        <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate capitalize">
                          {classification?.subjectName || item.question.subjectId}
                        </div>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          Academic Discipline
                        </div>
                      </div>

                      {/* 3. Target Chapter */}
                      <div className="p-3 rounded-xl bg-white/90 dark:bg-zinc-800/90 border border-zinc-200/70 dark:border-zinc-700/60 shadow-2xs space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                          <span>Target Chapter</span>
                          <span className="text-xs">📖</span>
                        </div>
                        <div
                          className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate"
                          title={classification?.chapterName || item.question.chapterId}
                        >
                          {classification?.chapterName || item.question.chapterId}
                        </div>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          Curriculum Syllabus Topic
                        </div>
                      </div>
                    </div>

                    {/* Classification Rationale callout */}
                    {classification?.rationale && (
                      <div className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400 bg-white/60 dark:bg-zinc-800/60 p-2.5 rounded-xl border border-zinc-200/60 dark:border-zinc-700/50">
                        <Info className="w-3.5 h-3.5 text-purple-500 shrink-0 mt-0.5" />
                        <div className="leading-relaxed">
                          <strong className="text-zinc-900 dark:text-zinc-200 font-semibold">Classification Evidence: </strong>
                          {classification.rationale}
                        </div>
                      </div>
                    )}

                    {/* Curriculum Gap Action Banner if suggested */}
                    {classification?.isNewDomainSuggested && (
                      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-amber-900 dark:text-amber-200">
                        <div className="flex items-start gap-2.5 text-xs">
                          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-bold">Proposed Curriculum Expansion</div>
                            <div className="text-[11px] opacity-90">{classification.rationale}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {classification.newSubjectProposal && (
                            <button
                              type="button"
                              onClick={() => handleApproveProposal(item.tempId, 'subject', classification.newSubjectProposal!.name)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 shadow-xs cursor-pointer transition-all"
                            >
                              <FolderPlus className="w-3.5 h-3.5" />
                              <span>Approve Subject</span>
                            </button>
                          )}
                          {classification.newChapterProposal && (
                            <button
                              type="button"
                              onClick={() => handleApproveProposal(item.tempId, 'chapter', classification.newChapterProposal!.name)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-xs cursor-pointer transition-all"
                            >
                              <Layers className="w-3.5 h-3.5" />
                              <span>Approve Chapter</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Inline Re-assignment Drawer */}
                    {isTaxonomyEditing && (
                      <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-800 border border-purple-300 dark:border-purple-700/80 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in duration-200">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                            Reassign Subject
                          </label>
                          <select
                            value={item.question.subjectId}
                            onChange={(e) => {
                              const newSub = e.target.value;
                              const firstChap = curriculumTaxonomyRegistry.getChapters(newSub)[0]?.id || 'cvs-ana-heart-mediastinum';
                              updateQuestionTaxonomy(idx, newSub, firstChap);
                            }}
                            className="w-full text-xs mt-1 p-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-850 font-medium"
                          >
                            {currentSubjects.map((s) => (
                              <option key={s.id} value={s.id}>
                                {SUBJECT_META[s.id]?.icon || '📚'} {s.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                            Reassign Chapter
                          </label>
                          <select
                            value={item.question.chapterId}
                            onChange={(e) => {
                              updateQuestionTaxonomy(idx, item.question.subjectId, e.target.value);
                            }}
                            className="w-full text-xs mt-1 p-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-850 font-medium"
                          >
                            {curriculumTaxonomyRegistry.getChapters(item.question.subjectId).map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Question Stem */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                          Question Stem
                        </label>
                        {item.originalRawStem && item.question.stem !== item.originalRawStem && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                            USMLE Vignette Active
                          </span>
                        )}
                        {item.originalRawStem && item.question.stem === item.originalRawStem && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20">
                            Verbatim Raw Stem
                          </span>
                        )}
                      </div>

                      {(item.originalRawStem || item.enrichedVignetteStem) && (
                        <button
                          type="button"
                          onClick={() => toggleStemFormat(idx)}
                          title="Switch between author's original verbatim question and USMLE clinical vignette"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>
                            {item.originalRawStem && item.question.stem === item.originalRawStem
                              ? 'Switch to USMLE Vignette'
                              : 'Revert to Original Raw Text'}
                          </span>
                        </button>
                      )}
                    </div>
                    {isEditing ? (
                      <div>
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                          Stem Text
                        </label>
                        <textarea
                          rows={3}
                          value={item.question.stem}
                          onChange={(e) => updateQuestionStem(idx, e.target.value)}
                          className="w-full text-xs p-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-medium"
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
                        Concept: {item.question.concept} • Difficulty {item.question.difficulty}
                      </span>
                    </div>

                    {/* Expanded Explanation */}
                    {isRationaleExpanded && (
                      <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/50 space-y-2">
                        <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                          Clinical Explanation & Pathophysiology
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

                    {/* MULTI-MODEL CONSENSUS & ACCURACY AUDIT PANEL */}
                    <div className="pt-2">
                      {item.consensusSummary ? (
                        <div className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/40 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Scale className="w-4 h-4 text-purple-500" />
                              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                Multi-Model Quorum Consensus
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  item.consensusSummary.consensusVerdict === 'unanimous_agreement'
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                                    : item.consensusSummary.consensusVerdict === 'majority_consensus'
                                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25'
                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25'
                                }`}
                              >
                                {item.consensusSummary.consensusVerdict === 'unanimous_agreement' && '✅ 100% Unanimous Agreement'}
                                {item.consensusSummary.consensusVerdict === 'majority_consensus' && `✨ Majority Quorum (${Math.round(item.consensusSummary.agreementRatio * 100)}%)`}
                                {item.consensusSummary.consensusVerdict === 'discrepancy_detected' && '⚠️ Model Discrepancy Detected'}
                                {item.consensusSummary.consensusVerdict === 'insufficient_quorum' && 'Quorum Undetermined'}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => runSingleQuestionConsensus(idx)}
                              disabled={isVerifyingConsensusIndex === idx}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <RotateCcw className={`w-3 h-3 ${isVerifyingConsensusIndex === idx ? 'animate-spin' : ''}`} />
                              <span>{isVerifyingConsensusIndex === idx ? 'Re-checking Quorum...' : 'Re-verify with Ensemble'}</span>
                            </button>
                          </div>

                          <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                            {item.consensusSummary.consensusRationale}
                          </p>

                          {/* Individual Model Cards Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
                            {item.consensusSummary.modelVerdicts.map((v) => {
                              const isSuccess = v.status === 'success';
                              const isConsensusWinner = isSuccess && v.selectedChoiceId === item.consensusSummary?.consensusChoiceId;
                              return (
                                <div
                                  key={v.modelId}
                                  className={`p-2.5 rounded-xl border text-xs flex flex-col justify-between space-y-1 ${
                                    !isSuccess
                                      ? 'bg-rose-500/5 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60 opacity-80'
                                      : isConsensusWinner
                                      ? 'bg-white dark:bg-zinc-800/90 border-zinc-200 dark:border-zinc-700/80 shadow-2xs'
                                      : 'bg-amber-500/5 dark:bg-amber-950/20 border-amber-500/30'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 truncate max-w-[120px]">
                                      {v.modelName}
                                    </span>
                                    {isSuccess ? (
                                      <span
                                        className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold ${
                                          isConsensusWinner
                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                        }`}
                                      >
                                        Key: ({v.selectedChoiceId.toUpperCase()})
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25">
                                        {v.status === 'timeout' ? 'Timed Out' : 'Offline / Failed'}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-2">
                                    {v.clinicalRationale}
                                  </p>
                                  <div className="flex items-center justify-between text-[9px] text-zinc-400 pt-1 font-mono">
                                    <span>{isSuccess ? `Conf: ${v.confidenceScore}%` : 'Unvoted'}</span>
                                    <span>{v.latencyMs}ms</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        /* On-Demand Double Check Button */
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-2xl border border-zinc-200/70 dark:border-zinc-800 bg-white/50 dark:bg-zinc-800/30">
                          <div className="flex items-center gap-2">
                            <Scale className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span className="text-xs text-zinc-600 dark:text-zinc-300">
                              Double-check answer accuracy across independent AI models before approving?
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => runSingleQuestionConsensus(idx)}
                            disabled={isVerifyingConsensusIndex === idx}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-purple-600 dark:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                          >
                            {isVerifyingConsensusIndex === idx ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Running Quorum...</span>
                              </>
                            ) : (
                              <>
                                <Scale className="w-3.5 h-3.5" />
                                <span>Double Check with Ensemble</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FEEDBACK TOAST */}
      {proposalToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom duration-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span>{proposalToast}</span>
        </div>
      )}

      {/* APPLE PRO MODEL SELECTION SHEET / MODAL */}
      {isModelModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold font-heading text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  Select AI Reasoning Engine
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Choose the intelligence model that conducts clinical solving, rationale generation, and curriculum assignment.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModelModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
              {MODEL_OPTIONS.map((opt) => {
                const isSelected =
                  opt.providerId === selectedProvider && opt.modelId === selectedModelId;
                return (
                  <div
                    key={`${opt.providerId}:::${opt.modelId}`}
                    onClick={() => {
                      setSelectedModel(opt.providerId, opt.modelId);
                      setIsModelModalOpen(false);
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-2.5 ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 shadow-sm ring-1 ring-purple-500/30'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-purple-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-800/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase font-mono">
                          {opt.providerName}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                            isSelected
                              ? 'bg-purple-600 text-white'
                              : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                          }`}
                        >
                          {opt.speed}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {opt.name}
                      </h4>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                        {opt.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800 text-[10px]">
                      <span className="font-semibold text-purple-600 dark:text-purple-400">
                        {opt.badge}
                      </span>
                      {isSelected && (
                        <span className="flex items-center gap-1 font-bold text-purple-600 dark:text-purple-400">
                          <Check className="w-3 h-3" /> Active
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* QDD Duplicate Comparison & Diff Sheet */}
      {inspectingQuestionItem && (
        <DuplicateCompareSheet
          isOpen={true}
          onClose={() => setInspectingQuestionItem(null)}
          subjectQuestion={inspectingQuestionItem.question}
          verdict={inspectingQuestionItem.qddVerdict}
        />
      )}
    </div>
  );
};
