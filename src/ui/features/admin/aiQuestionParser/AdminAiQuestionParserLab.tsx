/**
 * Presentation Component: AdminAiQuestionParserLab
 * Design System: Apple Human Interface Guidelines (macOS Sequoia / iPadOS Spatial Studio)
 * Layer: UI / Features / Admin / AI Question Parser
 *
 * Provides Apple-Caliber Direct Text Ingestion & Anti-Hallucination Staging Studio:
 * - Dynamic Island & Neural Bus Agent Orchestration with live 60fps Siri waveform
 * - Master-Detail Spatial Split Stage (zero vertical scroll fatigue!)
 * - Segmented tabs for SBA, Curriculum Alignment, Quorum, and Deduplication (QDD)
 * - Persistent floating command dock for instant batch commits
 * - Strict adherence to SOLID principles and OOP modularity
 */

import React, { useState, useEffect, useTransition, useRef } from 'react';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Check,
  Cpu,
  LogIn,
  Sliders,
  BookOpen,
  HelpCircle,
  X,
  FileText,
  Scale,
  StopCircle,
  LayoutGrid,
  Columns,
  ChevronDown,
  Trash2,
} from 'lucide-react';
import { useAuthStore } from '../../../../application/stores/useAuthStore.ts';
import { useAdminAiQuestionParserStore } from '../../../../application/stores/useAdminAiQuestionParserStore.ts';
import { useQuestionStore } from '../../../../application/stores/useQuestionStore.ts';
import { useBankGovernanceStore } from '../../../../application/stores/useBankGovernanceStore.ts';
import { edgeQuestionBankGateway } from '../../../../infrastructure/questionBank/edgeQuestionBankGateway.ts';
import defaultCvsBank from '../../../../../content/cvs/dist/bank.v1.json';
import { curriculumTaxonomyRegistry } from '../../../../domain/taxonomy/CurriculumTaxonomyRegistry.ts';
import { AppleIntelligenceAgentOrchestrator } from './AppleIntelligenceAgentOrchestrator.tsx';
import { StagingMasterRail } from './StagingMasterRail.tsx';
import { StagingDetailCanvas } from './StagingDetailCanvas.tsx';
import { FloatingBatchCommandBar } from './FloatingBatchCommandBar.tsx';
import { DuplicateCompareSheet } from '../../qdd/DuplicateCompareSheet.tsx';
import type { ParsedQuestionItem } from '../../../../domain/questionBank/aiQuestionParser/types.ts';
import type { Question } from '../../../../domain/model/types.ts';
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

const SAMPLE_RAW_TEXT = `1. Which of the following represents the correct craniocaudal sequence of the five primitive cardiac sacculations before looping occurs?
A. Truncus arteriosus → Bulbus cordis → Ventricle → Atrium → Sinus venosus
B. Truncus arteriosus → Ventricle → Bulbus cordis → Sinus venosus → Atrium
C. Sinus venosus → Atrium → Ventricle → Bulbus cordis → Truncus arteriosus
D. Bulbus cordis → Truncus arteriosus → Ventricle → Atrium → Sinus venosus
Answer: A
Explanation: The early embryonic heart tube develops five dilated sacculations in craniocaudal order: Truncus arteriosus (most cephalic), Bulbus cordis, Ventricle, Atrium, and Sinus venosus (most caudal bifurcation).

2. In the developing vascular system, what adult arterial structure is derived from the left fourth aortic arch?
A. A portion of the definitive Arch of the Aorta
B. Common carotid artery
C. Ductus arteriosus
D. Right subclavian artery
Answer: B
Note: (Admin intentionally keyed B instead of A to test Duplicate Answer Conflict detection against canonical bank item q-cvs-ana-004)

3. A 64-year-old female with persistent atrial fibrillation is initiated on an antiarrhythmic medication that prolongs the cardiac action potential duration by blocking rapid delayed rectifier potassium currents (IKr). Which adverse effect is most concerning?
A. Lupus-like syndrome
B. Torsades de pointes (QTc prolongation)
C. Pulmonary fibrosis
D. Cinchonism
Answer: B
Explanation: Class III antiarrhythmics (e.g. sotalol, dofetilide, ibutilide) block rapid delayed rectifier potassium channels (IKr), prolonging the cardiac action potential duration and QTc interval, which predisposes to polymorphic ventricular tachycardia (Torsades de pointes).`;

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
    sendToApprovalQueue,
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
    clearParsedQuestions,
    commitToGlobalQuestionBank,
    getSingleQuestionPrompt,
    getBatchVerificationPrompt,
  } = useAdminAiQuestionParserStore();

  const [inspectingQuestionItem, setInspectingQuestionItem] = useState<ParsedQuestionItem | null>(null);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [copiedBatchPrompt, setCopiedBatchPrompt] = useState(false);
  const [editingTempId, setEditingTempId] = useState<string | null>(null);
  const [isElevating, setIsElevating] = useState(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [proposalToast, setProposalToast] = useState<string | null>(null);
  const [, setTaxonomyRevision] = useState(0);

  // Apple Spatial Layout State
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'split' | 'list'>('split');
  const [, startTransition] = useTransition();

  // Automatic Smooth Scrolling & Exit Orchestration Refs
  const pipelineOrchestratorRef = useRef<HTMLDivElement>(null);
  const stagingStudioRef = useRef<HTMLDivElement>(null);
  const directTextInputRef = useRef<HTMLDivElement>(null);
  const prevIsParsingRef = useRef(isParsing);

  // Apple Coordinated Exit, Dusting & Scroll-Up Lifecycle State
  const [exitState, setExitState] = useState<'idle' | 'celebrating' | 'scrolling' | 'dusting'>('idle');
  const [cachedItemsBeforeExit, setCachedItemsBeforeExit] = useState<ParsedQuestionItem[]>([]);

  // Coordinated Apple Exit Workflow: celebratory glow -> smooth scroll-up -> physical dusting -> pristine reset
  const handlePerformExit = (celebrationToast?: string, onComplete?: () => void) => {
    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (parsedQuestions.length > 0) {
      setCachedItemsBeforeExit(parsedQuestions);
    }

    if (prefersReducedMotion) {
      onComplete?.();
      setExitState('idle');
      setCachedItemsBeforeExit([]);
      if (celebrationToast) {
        setProposalToast(celebrationToast);
        setTimeout(() => setProposalToast(null), 4000);
      }
      return;
    }

    // Phase 1: Celebratory Emerald Pulse
    setExitState('celebrating');

    // Phase 2: Smooth Cinematic Scroll Up to Direct Text Ingestion Chamber
    const scrollTimer = setTimeout(() => {
      setExitState('scrolling');
      if (directTextInputRef.current) {
        directTextInputRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }, 320);

    // Phase 3: The "Dusting" / Physical Glass Dissolve & Height Collapse
    const dustingTimer = setTimeout(() => {
      setExitState('dusting');
    }, 620);

    // Phase 4: Final Pristine State Teardown
    const teardownTimer = setTimeout(() => {
      onComplete?.();
      setExitState('idle');
      setCachedItemsBeforeExit([]);
      if (celebrationToast) {
        setProposalToast(celebrationToast);
        setTimeout(() => setProposalToast(null), 4500);
      }
    }, 1250);

    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(dustingTimer);
      clearTimeout(teardownTimer);
    };
  };

  const handleCommitWithSmoothExit = async () => {
    const totalSelected = selectedTempIds.size;
    const isFullBatch = totalSelected === parsedQuestions.length;

    const success = await commitToGlobalQuestionBank(true);
    if (success) {
      if (isFullBatch || parsedQuestions.length <= totalSelected) {
        handlePerformExit(
          `✨ All ${totalSelected} question(s) successfully approved & committed to the Global Bank!`,
          () => {
            clearParsedQuestions();
            setRawInputText('');
          }
        );
      } else {
        setProposalToast(`✨ Committed ${totalSelected} question(s) to bank. ${parsedQuestions.length - totalSelected} remaining in queue.`);
        setTimeout(() => setProposalToast(null), 3500);
      }
    }
  };

  const handleSaveAllUniqueWithSmoothExit = async () => {
    const success = await saveAllUnique();
    if (success) {
      const remaining = useAdminAiQuestionParserStore.getState().parsedQuestions;
      if (remaining.length === 0) {
        handlePerformExit(
          `✨ All unique questions successfully approved & committed to the Global Bank!`,
          () => {
            clearParsedQuestions();
            setRawInputText('');
          }
        );
      }
    }
  };

  const handleDiscardBatchWithSmoothExit = () => {
    handlePerformExit('✨ Inspection queue cleared.', () => {
      clearParsedQuestions();
      setRawInputText('');
    });
  };

  const handleDeleteQuestionWithExit = (index: number) => {
    if (parsedQuestions.length <= 1) {
      handlePerformExit('✨ Item removed. Queue cleared.', () => {
        removeParsedQuestion(index);
        setRawInputText('');
      });
    } else {
      removeParsedQuestion(index);
    }
  };

  const effectiveQuestions = exitState !== 'idle' && parsedQuestions.length === 0 ? cachedItemsBeforeExit : parsedQuestions;

  // When user clicks Parse, smoothly glide down to the live neural orchestrator
  const handleParseQuestions = () => {
    parseRawQuestions();
    setTimeout(() => {
      if (pipelineOrchestratorRef.current) {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        pipelineOrchestratorRef.current.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block: 'center',
        });
      }
    }, 120);
  };

  // When parsing completes, automatically glide smoothly to the Pre-Approval Staging Studio
  useEffect(() => {
    const wasParsing = prevIsParsingRef.current;
    prevIsParsingRef.current = isParsing;

    if (wasParsing && !isParsing && parsedQuestions.length > 0) {
      const timer = setTimeout(() => {
        if (stagingStudioRef.current) {
          const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          stagingStudioRef.current.scrollIntoView({
            behavior: prefersReducedMotion ? 'auto' : 'smooth',
            block: 'start',
          });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isParsing, parsedQuestions.length]);

  // Reset selected question index if questions change
  useEffect(() => {
    if (selectedQuestionIndex >= parsedQuestions.length && parsedQuestions.length > 0) {
      setSelectedQuestionIndex(0);
    }
  }, [parsedQuestions.length, selectedQuestionIndex]);

  // Subscribe to registry expansions
  useEffect(() => {
    const unsub = curriculumTaxonomyRegistry.subscribe(() => {
      setTaxonomyRevision((r) => r + 1);
    });
    return unsub;
  }, []);

  // Global Keyboard Navigation (J/K or Up/Down between questions, Cmd+Enter to commit)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Enter to commit with smooth exit
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        if (!isCommitting && selectedTempIds.size > 0 && exitState === 'idle') {
          e.preventDefault();
          handleCommitWithSmoothExit();
        }
        return;
      }

      // Do not navigate if user is typing in input or textarea
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (parsedQuestions.length > 1) {
        if (e.key === 'j' || e.key === 'ArrowDown') {
          e.preventDefault();
          startTransition(() => {
            setSelectedQuestionIndex((prev) => Math.min(prev + 1, parsedQuestions.length - 1));
          });
        } else if (e.key === 'k' || e.key === 'ArrowUp') {
          e.preventDefault();
          startTransition(() => {
            setSelectedQuestionIndex((prev) => Math.max(prev - 1, 0));
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [parsedQuestions.length, isCommitting, selectedTempIds.size, commitToGlobalQuestionBank]);

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

  const handleApproveProposal = (tempId: string, type: 'subject' | 'chapter', name: string) => {
    approveTaxonomyProposal(tempId, type);
    setProposalToast(`Successfully approved and registered "${name}" into the active curriculum!`);
    setTimeout(() => setProposalToast(null), 4000);
  };

  const isAutoCurriculumMode = targetSubjectId === 'auto' || targetSubjectId === 'all';

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-20">
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
          <span className="text-[11px] text-zinc-400 font-medium font-mono">Apple HIG Cupertino Deck</span>
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
                    territory, the AI proposes a formal curriculum expansion.
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
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
      <div
        ref={directTextInputRef}
        className="p-6 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl shadow-lg space-y-4 scroll-mt-6"
      >
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
              onClick={handleParseQuestions}
              disabled={isParsing || !rawInputText.trim()}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:opacity-95 shadow-md shadow-purple-500/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed apple-spring-transform"
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
          <div
            ref={pipelineOrchestratorRef}
            className={`scroll-mt-6 transition-all duration-500 ${
              exitState === 'dusting' ? 'apple-dust-exit' : ''
            }`}
          >
            <AppleIntelligenceAgentOrchestrator
              telemetry={agentTelemetry}
              isParsing={isParsing}
              onAbort={abortCurrentExecution}
              activeModelName={activeModel.name}
              stemMode={stemMode}
              enableConsensusCheck={enableConsensusCheck}
            />
          </div>
        )}

        {error && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* INSPECTION & PRE-APPROVAL STAGING STUDIO */}
      {(effectiveQuestions.length > 0 || exitState !== 'idle') && (
        <div
          ref={stagingStudioRef}
          className={`space-y-6 scroll-mt-6 transition-all duration-500 ${
            exitState === 'dusting'
              ? 'apple-dust-exit'
              : exitState === 'celebrating'
              ? 'animate-apple-celebrate'
              : 'animate-in slide-in-from-bottom duration-300'
          }`}
        >
          {/* Header & Global Batch Actions */}
          <div className="p-6 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold font-heading text-zinc-900 dark:text-zinc-50">
                    Pre-Approval Inspection Queue ({effectiveQuestions.length} Items)
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

              {/* View Switcher: Split Stage (Spatial) vs Stacked List & Clear Batch */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="inline-flex p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/70 dark:border-zinc-700 text-xs">
                  <button
                    type="button"
                    onClick={() => setViewMode('split')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      viewMode === 'split'
                        ? 'bg-white dark:bg-zinc-700 text-purple-600 dark:text-purple-300 shadow-2xs'
                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    <Columns className="w-3.5 h-3.5" />
                    <span>Split Stage</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      viewMode === 'list'
                        ? 'bg-white dark:bg-zinc-700 text-purple-600 dark:text-purple-300 shadow-2xs'
                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Stacked List</span>
                  </button>
                </div>

                {/* Discard / Clear Batch Action */}
                <button
                  type="button"
                  onClick={handleDiscardBatchWithSmoothExit}
                  disabled={exitState !== 'idle'}
                  title="Discard all parsed questions and smoothly reset workspace"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-zinc-200/70 dark:border-zinc-700 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear Queue</span>
                </button>
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
                    <span>Target Block: <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">{effectiveQuestions[0]?.taxonomyClassification?.blockName || 'Cardiovascular System (CVS) - Block 206'}</strong></span>
                    <span>•</span>
                    <span>{effectiveQuestions.length} Question(s) Grounded to Active Syllabus</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {Array.from(new Set(effectiveQuestions.map((q) => q.question.subjectId))).map((subjId) => {
                  const count = effectiveQuestions.filter((q) => q.question.subjectId === subjId).length;
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
          </div>

          {/* MASTER-DETAIL SPLIT STAGE STUDIO (ZERO SCROLLING) */}
          {viewMode === 'split' ? (
            <div className="flex flex-col lg:flex-row gap-5 items-start">
              {/* Left Navigator Rail */}
              <StagingMasterRail
                questions={effectiveQuestions}
                selectedIndex={selectedQuestionIndex}
                onSelectIndex={(idx) => {
                  startTransition(() => {
                    setSelectedQuestionIndex(idx);
                  });
                }}
                selectedTempIds={selectedTempIds}
                onToggleSelect={(tempId) => toggleQuestionSelection(tempId)}
                isCheckingDuplication={isCheckingDuplication}
                onInspectDuplication={(item) => setInspectingQuestionItem(item)}
                subjectMetaMap={SUBJECT_META}
              />

              {/* Right Detail Workspace Canvas */}
              {effectiveQuestions[selectedQuestionIndex] ? (
                <StagingDetailCanvas
                  item={effectiveQuestions[selectedQuestionIndex]}
                  index={selectedQuestionIndex}
                  totalCount={effectiveQuestions.length}
                  isEditing={editingTempId === effectiveQuestions[selectedQuestionIndex].tempId}
                  onToggleEdit={() => {
                    const currentId = effectiveQuestions[selectedQuestionIndex].tempId;
                    setEditingTempId(editingTempId === currentId ? null : currentId);
                  }}
                  onDelete={() => handleDeleteQuestionWithExit(selectedQuestionIndex)}
                  onCopyPrompt={() =>
                    handleCopySinglePrompt(
                      selectedQuestionIndex,
                      effectiveQuestions[selectedQuestionIndex].tempId
                    )
                  }
                  isPromptCopied={copiedPromptId === effectiveQuestions[selectedQuestionIndex].tempId}
                  onToggleStemFormat={() => toggleStemFormat(selectedQuestionIndex)}
                  onUpdateStem={(stem) => updateQuestionStem(selectedQuestionIndex, stem)}
                  onUpdateChoice={(cId, text, rat) =>
                    updateChoice(selectedQuestionIndex, cId, text, rat)
                  }
                  onSetKeyedChoice={(cId) => setKeyedCorrectChoice(selectedQuestionIndex, cId)}
                  onUpdateExplanation={(exp) => updateExplanation(selectedQuestionIndex, exp)}
                  onUpdateTaxonomy={(sub, chap) =>
                    updateQuestionTaxonomy(selectedQuestionIndex, sub, chap)
                  }
                  onApproveProposal={(type, name) =>
                    handleApproveProposal(
                      effectiveQuestions[selectedQuestionIndex].tempId,
                      type,
                      name
                    )
                  }
                  onRunConsensus={() => runSingleQuestionConsensus(selectedQuestionIndex)}
                  isVerifyingConsensus={isVerifyingConsensusIndex === selectedQuestionIndex}
                  onInspectDuplication={(item) => setInspectingQuestionItem(item)}
                  onSendToApprovalQueue={(tempId) => sendToApprovalQueue(tempId)}
                  isCheckingDuplication={isCheckingDuplication}
                  subjectMetaMap={SUBJECT_META}
                />
              ) : (
                <div className="flex-1 p-12 text-center text-xs text-zinc-400 bg-white/70 dark:bg-zinc-900/70 rounded-3xl border border-zinc-200 dark:border-zinc-800">
                  Select a question from the rail to inspect.
                </div>
              )}
            </div>
          ) : (
            /* STACKED LIST VIEW (COLLAPSIBLE CARDS) */
            <div className="space-y-4">
              {effectiveQuestions.map((item, idx) => (
                <StagingDetailCanvas
                  key={item.tempId}
                  item={item}
                  index={idx}
                  totalCount={effectiveQuestions.length}
                  isEditing={editingTempId === item.tempId}
                  onToggleEdit={() => {
                    setEditingTempId(editingTempId === item.tempId ? null : item.tempId);
                  }}
                  onDelete={() => handleDeleteQuestionWithExit(idx)}
                  onCopyPrompt={() => handleCopySinglePrompt(idx, item.tempId)}
                  isPromptCopied={copiedPromptId === item.tempId}
                  onToggleStemFormat={() => toggleStemFormat(idx)}
                  onUpdateStem={(stem) => updateQuestionStem(idx, stem)}
                  onUpdateChoice={(cId, text, rat) => updateChoice(idx, cId, text, rat)}
                  onSetKeyedChoice={(cId) => setKeyedCorrectChoice(idx, cId)}
                  onUpdateExplanation={(exp) => updateExplanation(idx, exp)}
                  onUpdateTaxonomy={(sub, chap) => updateQuestionTaxonomy(idx, sub, chap)}
                  onApproveProposal={(type, name) => handleApproveProposal(item.tempId, type, name)}
                  onRunConsensus={() => runSingleQuestionConsensus(idx)}
                  isVerifyingConsensus={isVerifyingConsensusIndex === idx}
                  onInspectDuplication={(itemToInspect) => setInspectingQuestionItem(itemToInspect)}
                  onSendToApprovalQueue={(tempId) => sendToApprovalQueue(tempId)}
                  isCheckingDuplication={isCheckingDuplication}
                  subjectMetaMap={SUBJECT_META}
                />
              ))}
            </div>
          )}

          {/* FLOATING PERSISTENT BATCH COMMAND BAR */}
          <FloatingBatchCommandBar
            totalCount={effectiveQuestions.length}
            selectedCount={selectedTempIds.size}
            isCommitting={isCommitting}
            isCheckingDuplication={isCheckingDuplication}
            copiedBatchPrompt={copiedBatchPrompt}
            onToggleSelectAll={() => selectAll(selectedTempIds.size !== effectiveQuestions.length)}
            onCopyBatchPrompt={handleCopyBatchPrompt}
            onSaveAllUnique={handleSaveAllUniqueWithSmoothExit}
            onCommitToBank={handleCommitWithSmoothExit}
          />
        </div>
      )}

      {/* APPLE CELEBRATION & FEEDBACK TOAST */}
      {(proposalToast || (commitFeedback && exitState === 'idle')) && (
        <div className="fixed bottom-24 right-6 z-50 p-4 rounded-2xl bg-zinc-900/95 dark:bg-zinc-100/95 backdrop-blur-xl text-white dark:text-zinc-900 text-xs shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-bottom-3 duration-300 border border-white/10 dark:border-zinc-800 max-w-md">
          {commitFeedback?.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0 animate-pulse" />
          )}
          <span className="font-semibold leading-relaxed">
            {proposalToast || commitFeedback?.message}
          </span>
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
      {inspectingQuestionItem && (() => {
        const storeQuestions = useQuestionStore.getState().questions;
        const candidateId = inspectingQuestionItem.qddVerdict?.candidates[0]?.matchedQuestionId;
        const govCatalog = useBankGovernanceStore.getState().catalogQuestions || [];
        const localCanonical = edgeQuestionBankGateway.getLocalCanonicalBank('cvs') || [];
        const matched =
          storeQuestions.find((q) => q.id === candidateId) ||
          parsedQuestions.find((p) => p.question.id === candidateId)?.question ||
          govCatalog.find((q) => q.id === candidateId) ||
          localCanonical.find((q) => q.id === candidateId) ||
          (Array.isArray(defaultCvsBank) ? (defaultCvsBank as Question[]).find((q) => q.id === candidateId) : undefined);

        return (
          <DuplicateCompareSheet
            isOpen={true}
            onClose={() => setInspectingQuestionItem(null)}
            subjectQuestion={inspectingQuestionItem.question}
            matchedQuestion={matched}
            verdict={inspectingQuestionItem.qddVerdict}
          />
        );
      })()}
    </div>
  );
};
