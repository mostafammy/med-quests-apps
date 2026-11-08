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

import React, { useState, useEffect, useTransition, useRef, useMemo } from 'react';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useAuthStore } from '../../../../application/stores/useAuthStore.ts';
import { useAdminAiQuestionParserStore } from '../../../../application/stores/useAdminAiQuestionParserStore.ts';
import { useQuestionStore } from '../../../../application/stores/useQuestionStore.ts';
import { useBankGovernanceStore } from '../../../../application/stores/useBankGovernanceStore.ts';
import { useActiveBlock } from '../../../../application/stores/useBlockContextStore.ts';
import { edgeQuestionBankGateway } from '../../../../infrastructure/questionBank/edgeQuestionBankGateway.ts';
import defaultCvsBank from '../../../../../content/cvs/dist/bank.v1.json';
import { compositionRoot } from '../../../../application/composition/clientCompositionRoot.ts';
import type { BlockId } from '../../../../domain/curriculum/ids.ts';
import { curriculumTaxonomyRegistry } from '../../../../domain/taxonomy/CurriculumTaxonomyRegistry.ts';
import { TaxonomyDisplayResolver } from '../../../../domain/taxonomy/TaxonomyDisplayResolver.ts';
import { StagingMasterRail } from './StagingMasterRail.tsx';
import { StagingDetailCanvas } from './StagingDetailCanvas.tsx';
import { FloatingBatchCommandBar } from './FloatingBatchCommandBar.tsx';
import { DuplicateCompareSheet } from '../../qdd/DuplicateCompareSheet.tsx';
import { isUniqueItem } from '../../../../application/stores/aiParser/parserSelectionHelper.ts';
import type { ParsedQuestionItem } from '../../../../domain/questionBank/aiQuestionParser/types.ts';
import type { Question } from '../../../../domain/model/types.ts';
import {
  MODEL_OPTIONS,
  ModelSelectionModal,
} from './components/ModelSelectionModal.tsx';
import { AdminPrivilegeGateCard } from './components/AdminPrivilegeGateCard.tsx';
import { CurriculumTaxonomyScopeDeck } from './components/CurriculumTaxonomyScopeDeck.tsx';
import { DirectTextInputChamber } from './components/DirectTextInputChamber.tsx';
import { PreApprovalQueueHeader } from './components/PreApprovalQueueHeader.tsx';

const SUBJECT_META: Record<string, { icon: string; badgeColor: string }> = {
  anatomy: {
    icon: '🩺',
    badgeColor:
      'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/25',
  },
  histology: {
    icon: '🔬',
    badgeColor:
      'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25',
  },
  microbiology: {
    icon: '🧫',
    badgeColor:
      'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
  },
  physiology: {
    icon: '⚡',
    badgeColor:
      'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25',
  },
  pharmacology: {
    icon: '💊',
    badgeColor:
      'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25',
  },
  pathology: {
    icon: '🧬',
    badgeColor:
      'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/25',
  },
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
  const { activeBlockId: globalActiveBlockId, block: activeBlock } =
    useActiveBlock();
  const {
    rawInputText,
    setRawInputText,
    selectedProvider,
    selectedModelId,
    setSelectedModel,
    targetBlockId,
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

  const [inspectingQuestionItem, setInspectingQuestionItem] =
    useState<ParsedQuestionItem | null>(null);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [copiedBatchPrompt, setCopiedBatchPrompt] = useState(false);
  const [editingTempId, setEditingTempId] = useState<string | null>(null);
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [proposalToast, setProposalToast] = useState<string | null>(null);

  // Apple Spatial Layout State
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'split' | 'list'>('split');
  const [, startTransition] = useTransition();

  // Automatic Smooth Scrolling & Exit Orchestration Refs
  const pipelineOrchestratorRef = useRef<HTMLDivElement>(null);
  const stagingStudioRef = useRef<HTMLDivElement>(null);
  const directTextInputRef = useRef<HTMLDivElement>(null);
  const prevIsParsingRef = useRef(isParsing);

  // Apple Coordinated Exit State
  const [exitState, setExitState] = useState<
    'idle' | 'celebrating' | 'scrolling' | 'dusting'
  >('idle');
  const [cachedItemsBeforeExit, setCachedItemsBeforeExit] = useState<
    ParsedQuestionItem[]
  >([]);

  const handlePerformExit = (
    celebrationToast?: string,
    onComplete?: () => void
  ) => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

    setExitState('celebrating');

    const scrollTimer = setTimeout(() => {
      setExitState('scrolling');
      if (directTextInputRef.current) {
        directTextInputRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }, 320);

    const dustingTimer = setTimeout(() => {
      setExitState('dusting');
    }, 620);

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
        setProposalToast(
          `✨ Committed ${totalSelected} question(s) to bank. ${parsedQuestions.length - totalSelected} remaining in queue.`
        );
        setTimeout(() => setProposalToast(null), 3500);
      }
    }
  };

  const handleSaveAllUniqueWithSmoothExit = async () => {
    const success = await saveAllUnique();
    if (success) {
      const remaining =
        useAdminAiQuestionParserStore.getState().parsedQuestions;
      if (remaining.length === 0) {
        handlePerformExit(
          '✨ All unique questions successfully approved & committed to the Global Bank!',
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

  const effectiveQuestions =
    exitState !== 'idle' && parsedQuestions.length === 0
      ? cachedItemsBeforeExit
      : parsedQuestions;

  const uniqueCount = useMemo(
    () => effectiveQuestions.filter(isUniqueItem).length,
    [effectiveQuestions]
  );

  const handleParseQuestions = () => {
    parseRawQuestions();
    setTimeout(() => {
      if (pipelineOrchestratorRef.current) {
        pipelineOrchestratorRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }, 150);
  };

  useEffect(() => {
    if (prevIsParsingRef.current && !isParsing && parsedQuestions.length > 0) {
      const timer = setTimeout(() => {
        if (stagingStudioRef.current) {
          stagingStudioRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }
      }, 250);
      return () => clearTimeout(timer);
    }
    prevIsParsingRef.current = isParsing;
  }, [isParsing, parsedQuestions.length]);

  useEffect(() => {
    if (selectedQuestionIndex >= effectiveQuestions.length) {
      setSelectedQuestionIndex(Math.max(0, effectiveQuestions.length - 1));
    }
  }, [effectiveQuestions.length, selectedQuestionIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key === 'Enter' &&
        parsedQuestions.length > 0 &&
        !isCommitting
      ) {
        e.preventDefault();
        if (selectedTempIds.size > 0) {
          commitToGlobalQuestionBank(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    parsedQuestions.length,
    isCommitting,
    selectedTempIds.size,
    commitToGlobalQuestionBank,
  ]);

  const isAdmin =
    authState.status === 'authenticated-active' &&
    authState.user.role === 'admin';

  if (!isAdmin) {
    return (
      <AdminPrivilegeGateCard
        onElevate={async () => {
          await elevateToPlatformOwner();
        }}
      />
    );
  }

  const activeModel =
    MODEL_OPTIONS.find(
      (m) =>
        m.providerId === selectedProvider && m.modelId === selectedModelId
    ) || MODEL_OPTIONS[0];

  const currentBlockPack = compositionRoot.catalog.get(targetBlockId);

  const currentSubjects = currentBlockPack
    ? currentBlockPack.manifest.subjects.map((s) => ({
        id: s.id,
        name:
          typeof s.name === 'string'
            ? s.name
            : (s.name as { en?: string })?.en ||
              TaxonomyDisplayResolver.resolveSubjectName(s.id, undefined, targetBlockId),
      }))
    : curriculumTaxonomyRegistry.getSubjects().map((s) => ({
        id: s.id,
        name:
          typeof s.name === 'string'
            ? s.name
            : (s.name as { en?: string })?.en ||
              TaxonomyDisplayResolver.resolveSubjectName(s.id, undefined, targetBlockId),
      }));

  const currentChapters = currentBlockPack
    ? (targetSubjectId === 'auto' || targetSubjectId === 'all'
        ? currentBlockPack.manifest.chapters
        : currentBlockPack.manifest.chapters.filter(
            (c) => c.subjectId === targetSubjectId
          )
      ).map((c) => ({
        id: c.id,
        name:
          typeof c.name === 'string'
            ? c.name
            : (c.name as { en?: string })?.en ||
              TaxonomyDisplayResolver.resolveChapterName(c.id, undefined, targetBlockId),
      }))
    : curriculumTaxonomyRegistry
        .getChapters(
          targetSubjectId === 'auto' || targetSubjectId === 'all'
            ? undefined
            : targetSubjectId
        )
        .map((c) => ({
          id: c.id,
          name:
            typeof c.name === 'string'
              ? c.name
              : (c.name as { en?: string })?.en ||
                TaxonomyDisplayResolver.resolveChapterName(c.id, undefined, targetBlockId),
        }));

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

  const handleApproveProposal = (
    tempId: string,
    type: 'subject' | 'chapter',
    name: string
  ) => {
    approveTaxonomyProposal(tempId, type);
    setProposalToast(
      `Successfully approved and registered "${name}" into the active curriculum!`
    );
    setTimeout(() => setProposalToast(null), 4000);
  };

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
            Directly input unstructured clinical text or lecture MCQs. The AI
            agent formats items to NBME Single-Best-Answer standards, detects
            missing answer keys, dynamically classifies curriculum subjects &
            chapters, and alerts you to curriculum expansion gaps.
          </p>
        </div>
      </div>

      {/* REASONING & CURRICULUM CONTROL DECK */}
      <CurriculumTaxonomyScopeDeck
        activeModel={activeModel}
        onOpenModelModal={() => setIsModelModalOpen(true)}
        isParsing={isParsing}
        targetBlockId={targetBlockId}
        targetSubjectId={targetSubjectId}
        targetChapterId={targetChapterId}
        setTargetTaxonomy={setTargetTaxonomy}
        activeBlock={activeBlock}
        globalActiveBlockId={globalActiveBlockId}
        currentSubjects={currentSubjects}
        currentChapters={currentChapters}
        stemMode={stemMode}
        setStemMode={setStemMode}
        enableConsensusCheck={enableConsensusCheck}
        setEnableConsensusCheck={setEnableConsensusCheck}
        subjectMetaMap={SUBJECT_META}
      />

      {/* DIRECT RAW TEXT INPUT CHAMBER */}
      <DirectTextInputChamber
        chamberRef={directTextInputRef}
        orchestratorRef={pipelineOrchestratorRef}
        rawInputText={rawInputText}
        setRawInputText={setRawInputText}
        isParsing={isParsing}
        onLoadSample={() => setRawInputText(SAMPLE_RAW_TEXT)}
        onAbort={abortCurrentExecution}
        onParse={handleParseQuestions}
        agentTelemetry={agentTelemetry}
        activeModelName={activeModel.name}
        stemMode={stemMode}
        enableConsensusCheck={enableConsensusCheck}
        exitState={exitState}
        error={error}
      />

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
          <PreApprovalQueueHeader
            totalCount={effectiveQuestions.length}
            selectedCount={selectedTempIds.size}
            viewMode={viewMode}
            onSetViewMode={setViewMode}
            onDiscardBatch={handleDiscardBatchWithSmoothExit}
            exitState={exitState}
            effectiveQuestions={effectiveQuestions}
            currentBlockPackName={
              currentBlockPack
                ? `${currentBlockPack.manifest.block.name.en} (${currentBlockPack.manifest.block.shortName}) - ${currentBlockPack.manifest.block.code}`
                : undefined
            }
            commitFeedback={commitFeedback}
            subjectMetaMap={SUBJECT_META}
          />

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
                onInspectDuplication={(item) =>
                  setInspectingQuestionItem(item)
                }
                subjectMetaMap={SUBJECT_META}
              />

              {/* Right Detail Workspace Canvas */}
              {effectiveQuestions[selectedQuestionIndex] ? (
                <StagingDetailCanvas
                  item={effectiveQuestions[selectedQuestionIndex]}
                  index={selectedQuestionIndex}
                  totalCount={effectiveQuestions.length}
                  isEditing={
                    editingTempId ===
                    effectiveQuestions[selectedQuestionIndex].tempId
                  }
                  onToggleEdit={() => {
                    const currentId =
                      effectiveQuestions[selectedQuestionIndex].tempId;
                    setEditingTempId(
                      editingTempId === currentId ? null : currentId
                    );
                  }}
                  onDelete={() =>
                    handleDeleteQuestionWithExit(selectedQuestionIndex)
                  }
                  onCopyPrompt={() =>
                    handleCopySinglePrompt(
                      selectedQuestionIndex,
                      effectiveQuestions[selectedQuestionIndex].tempId
                    )
                  }
                  isPromptCopied={
                    copiedPromptId ===
                    effectiveQuestions[selectedQuestionIndex].tempId
                  }
                  onToggleStemFormat={() =>
                    toggleStemFormat(selectedQuestionIndex)
                  }
                  onUpdateStem={(stem) =>
                    updateQuestionStem(selectedQuestionIndex, stem)
                  }
                  onUpdateChoice={(cId, text, rat) =>
                    updateChoice(selectedQuestionIndex, cId, text, rat)
                  }
                  onSetKeyedChoice={(cId) =>
                    setKeyedCorrectChoice(selectedQuestionIndex, cId)
                  }
                  onUpdateExplanation={(exp) =>
                    updateExplanation(selectedQuestionIndex, exp)
                  }
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
                  onRunConsensus={() =>
                    runSingleQuestionConsensus(selectedQuestionIndex)
                  }
                  isVerifyingConsensus={
                    isVerifyingConsensusIndex === selectedQuestionIndex
                  }
                  onInspectDuplication={(item) =>
                    setInspectingQuestionItem(item)
                  }
                  onSendToApprovalQueue={(tempId) =>
                    sendToApprovalQueue(tempId)
                  }
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
                    setEditingTempId(
                      editingTempId === item.tempId ? null : item.tempId
                    );
                  }}
                  onDelete={() => handleDeleteQuestionWithExit(idx)}
                  onCopyPrompt={() => handleCopySinglePrompt(idx, item.tempId)}
                  isPromptCopied={copiedPromptId === item.tempId}
                  onToggleStemFormat={() => toggleStemFormat(idx)}
                  onUpdateStem={(stem) => updateQuestionStem(idx, stem)}
                  onUpdateChoice={(cId, text, rat) =>
                    updateChoice(idx, cId, text, rat)
                  }
                  onSetKeyedChoice={(cId) => setKeyedCorrectChoice(idx, cId)}
                  onUpdateExplanation={(exp) => updateExplanation(idx, exp)}
                  onUpdateTaxonomy={(sub, chap) =>
                    updateQuestionTaxonomy(idx, sub, chap)
                  }
                  onApproveProposal={(type, name) =>
                    handleApproveProposal(item.tempId, type, name)
                  }
                  onRunConsensus={() => runSingleQuestionConsensus(idx)}
                  isVerifyingConsensus={isVerifyingConsensusIndex === idx}
                  onInspectDuplication={(itemToInspect) =>
                    setInspectingQuestionItem(itemToInspect)
                  }
                  onSendToApprovalQueue={(tempId) =>
                    sendToApprovalQueue(tempId)
                  }
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
            uniqueCount={uniqueCount}
            isCommitting={isCommitting}
            isCheckingDuplication={isCheckingDuplication}
            copiedBatchPrompt={copiedBatchPrompt}
            onToggleSelectAll={() =>
              selectAll(selectedTempIds.size !== effectiveQuestions.length)
            }
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

      {/* MODEL SELECTION MODAL */}
      <ModelSelectionModal
        isOpen={isModelModalOpen}
        selectedProvider={selectedProvider}
        selectedModelId={selectedModelId}
        onSelectModel={setSelectedModel}
        onClose={() => setIsModelModalOpen(false)}
      />

      {/* QDD Duplicate Comparison & Diff Sheet */}
      {inspectingQuestionItem && (() => {
        const storeQuestions = useQuestionStore.getState().questions;
        const candidateId =
          inspectingQuestionItem.qddVerdict?.candidates[0]?.matchedQuestionId;
        const govCatalog =
          useBankGovernanceStore.getState().catalogQuestions || [];
        const activeBlock = (inspectingQuestionItem.question.blockId ||
          targetBlockId ||
          'cvs') as BlockId;
        const localCanonical =
          edgeQuestionBankGateway.getLocalCanonicalBank(activeBlock) || [];
        const matched =
          storeQuestions.find((q) => q.id === candidateId) ||
          parsedQuestions.find((p) => p.question.id === candidateId)?.question ||
          govCatalog.find((q) => q.id === candidateId) ||
          localCanonical.find((q) => q.id === candidateId) ||
          (Array.isArray(defaultCvsBank)
            ? (defaultCvsBank as Question[]).find((q) => q.id === candidateId)
            : undefined);

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
