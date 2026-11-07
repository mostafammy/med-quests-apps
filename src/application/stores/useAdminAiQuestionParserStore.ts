/**
 * Application Store: useAdminAiQuestionParserStore
 * State Management: Zustand 5
 * Manages raw input text, AI model selection, parsing state, pre-approval anti-hallucination inspection,
 * per-question missing answer detection, verification prompt export, and canonical bank commits.
 *
 * Restricted to Administrators.
 */

import { create } from 'zustand';
import type { CloudProviderId } from '../../domain/ai/settings.ts';
import { QuestionSchema, type ChoiceId, type Question } from '../../domain/model/types.ts';
import { QuestionParsingAgent, normalizeBlockId } from '../../domain/questionBank/aiQuestionParser/QuestionParsingAgent.ts';
import { CrossModelVerificationPromptBuilder } from '../../domain/questionBank/aiQuestionParser/CrossModelVerificationPromptBuilder.ts';
import type { ParsedQuestionItem, QuestionStemMode, AgentExecutionTelemetry } from '../../domain/questionBank/aiQuestionParser/types.ts';
import { multiModelConsensusEngine } from '../../domain/questionBank/aiQuestionParser/MultiModelConsensusEngine.ts';
import { curriculumTaxonomyRegistry } from '../../domain/taxonomy/CurriculumTaxonomyRegistry.ts';
import { createClientQddEngine, loadAllClientBankQuestions } from '../../domain/questionBank/duplication/clientCompositionRoot.ts';
import { edgeQuestionBankGateway } from '../../infrastructure/questionBank/edgeQuestionBankGateway.ts';
import { db } from '../../infrastructure/storage/db.ts';
import { useAuthStore } from './useAuthStore.ts';
import { useBankGovernanceStore } from './useBankGovernanceStore.ts';
import { useQuestionStore } from './useQuestionStore.ts';
import { useBlockContextStoreBase } from './useBlockContextStore.ts';

import { LEGACY_DEFAULT_BLOCK_ID, type BlockId } from '../../domain/curriculum/ids.ts';
import { compositionRoot } from '../composition/clientCompositionRoot.ts';

interface AdminAiQuestionParserStoreState {
  // Input & Configuration
  rawInputText: string;
  selectedProvider: CloudProviderId;
  selectedModelId: string;
  targetBlockId: BlockId;
  targetSubjectId: string;
  targetChapterId: string;
  stemMode: QuestionStemMode;
  enableConsensusCheck: boolean;

  // Parsing & State
  isParsing: boolean;
  agentTelemetry: AgentExecutionTelemetry | null;
  isVerifyingConsensusIndex: number | null;
  abortController: AbortController | null;
  parsedQuestions: ParsedQuestionItem[];
  selectedTempIds: Set<string>;
  error: string | null;
  isCommitting: boolean;
  commitFeedback: { type: 'success' | 'error'; message: string } | null;
  isCheckingDuplication: boolean;

  // Actions
  setRawInputText: (text: string) => void;
  setSelectedModel: (provider: CloudProviderId, modelId: string) => void;
  setTargetBlockId: (blockId: BlockId) => void;
  setStemMode: (mode: QuestionStemMode) => void;
  setEnableConsensusCheck: (enable: boolean) => void;
  setTargetTaxonomy: (subjectId: string, chapterId: string) => void;
  parseRawQuestions: () => Promise<void>;
  abortCurrentExecution: () => void;
  runBatchDuplicationCheck: () => Promise<void>;
  saveAllUnique: () => Promise<boolean>;
  sendToApprovalQueue: (targetTempId?: string) => Promise<boolean>;
  runSingleQuestionConsensus: (index: number) => Promise<void>;
  toggleQuestionSelection: (tempId: string) => void;
  selectAll: (select: boolean) => void;
  updateQuestionStem: (index: number, stem: string) => void;
  toggleStemFormat: (index: number) => void;
  updateChoice: (index: number, choiceId: ChoiceId, text: string, rationale: string) => void;
  setKeyedCorrectChoice: (index: number, choiceId: ChoiceId) => void;
  updateExplanation: (index: number, explanation: string) => void;
  updateQuestionTaxonomy: (index: number, subjectId: string, chapterId: string) => void;
  approveTaxonomyProposal: (tempId: string, type: 'subject' | 'chapter') => void;
  removeParsedQuestion: (index: number) => void;
  clearParsedQuestions: () => void;
  commitToGlobalQuestionBank: (selectedOnly?: boolean) => Promise<boolean>;
  getSingleQuestionPrompt: (index: number) => string;
  getBatchVerificationPrompt: () => string;
}

const parsingAgent = new QuestionParsingAgent();

async function getMergedBankQuestions(): Promise<Question[]> {
  const storeQuestions = useQuestionStore.getState().questions || [];
  const govState = useBankGovernanceStore.getState();
  const govCatalog = govState.catalogQuestions || [];
  const govQueue = (govState.reviewQueue || []).map((r) => r.question).filter(Boolean);
  return loadAllClientBankQuestions([...storeQuestions, ...govCatalog, ...govQueue]);
}

/** Schema-valid copy for QDD: one malformed LLM item must never void the whole batch. */
function toQddProbe(q: Question, bankIdSet?: Set<string>, idx = 0, blockId: BlockId = LEGACY_DEFAULT_BLOCK_ID): Question {
  const valid = QuestionSchema.safeParse(q).success ? q : parsingAgent.repairQuestionToSchema(q, blockId);
  const safeId = bankIdSet?.has(valid.id) ? `${valid.id}-probe-${idx + 1}` : valid.id;
  return {
    ...valid,
    id: safeId,
    blockId,
  };
}

const VERDICT_RANK: Record<string, number> = {
  EXACT: 5,
  CONFLICT: 4,
  NEAR: 3,
  SIBLING: 2,
  UNIQUE: 1,
};

function pickStrongerVerdict(a: any, b: any): any {
  if (!a) return b;
  if (!b) return a;
  return (VERDICT_RANK[b.relation] || 0) >= (VERDICT_RANK[a.relation] || 0) ? b : a;
}

export const useAdminAiQuestionParserStore = create<AdminAiQuestionParserStoreState>((set, get) => ({
  rawInputText: '',
  selectedProvider: 'gemini',
  selectedModelId: 'gemini-2.5-flash',
  targetBlockId: (typeof useBlockContextStoreBase !== 'undefined'
    ? useBlockContextStoreBase.getState().activeBlockId
    : LEGACY_DEFAULT_BLOCK_ID) as BlockId,
  targetSubjectId: 'auto',
  targetChapterId: 'auto',
  stemMode: 'verbatim',
  enableConsensusCheck: false,

  isParsing: false,
  agentTelemetry: null,
  isVerifyingConsensusIndex: null,
  abortController: null,
  parsedQuestions: [],
  selectedTempIds: new Set(),
  error: null,
  isCommitting: false,
  commitFeedback: null,
  isCheckingDuplication: false,

  setRawInputText: (rawInputText) => {
    // Auto-detect target block from pasted structured JSON or content hints
    const cnsMatch =
      /"(?:blockId|id)"\s*:\s*"q?-(?:cns|cns-neuroscience)/i.test(rawInputText) ||
      /"blockId"\s*:\s*"(?:cns|cns-neuroscience)"/i.test(rawInputText);
    const cvsMatch =
      /"(?:blockId|id)"\s*:\s*"q?-(?:cvs)/i.test(rawInputText) ||
      /"blockId"\s*:\s*"(?:cvs|cardiovascular)"/i.test(rawInputText);

    if (cnsMatch && get().targetBlockId !== 'cns') {
      set({ rawInputText, targetBlockId: 'cns' as BlockId });
      void get().runBatchDuplicationCheck();
      return;
    }
    if (cvsMatch && get().targetBlockId !== LEGACY_DEFAULT_BLOCK_ID) {
      set({ rawInputText, targetBlockId: LEGACY_DEFAULT_BLOCK_ID });
      void get().runBatchDuplicationCheck();
      return;
    }
    set({ rawInputText });
  },

  setSelectedModel: (selectedProvider, selectedModelId) =>
    set({ selectedProvider, selectedModelId }),

  setTargetBlockId: (targetBlockId: BlockId) => {
    set({ targetBlockId, targetSubjectId: 'auto', targetChapterId: 'auto' });
    get().runBatchDuplicationCheck();
  },

  setStemMode: (stemMode) => set({ stemMode }),

  setEnableConsensusCheck: (enableConsensusCheck) => set({ enableConsensusCheck }),

  setTargetTaxonomy: (targetSubjectId, targetChapterId) =>
    set({ targetSubjectId, targetChapterId }),

  abortCurrentExecution: () => {
    const { abortController } = get();
    if (abortController) {
      abortController.abort();
      set({
        abortController: null,
        isParsing: false,
        error: 'Execution cancelled by administrator.',
      });
    }
  },

  runSingleQuestionConsensus: async (index: number) => {
    const list = [...get().parsedQuestions];
    const target = list[index];
    if (!target) return;

    set({ isVerifyingConsensusIndex: index });

    try {
      const consensus = await multiModelConsensusEngine.verifyConsensus(
        target.question,
        get().selectedModelId
      );
      list[index] = {
        ...target,
        consensusSummary: consensus,
      };
      set({ parsedQuestions: list, isVerifyingConsensusIndex: null });
    } catch {
      set({ isVerifyingConsensusIndex: null });
    }
  },

  parseRawQuestions: async () => {
    const {
      rawInputText,
      selectedProvider,
      selectedModelId,
      targetSubjectId,
      targetChapterId,
      stemMode,
      enableConsensusCheck,
    } = get();

    if (!rawInputText.trim()) {
      set({ error: 'Please enter or paste question text before initiating AI parsing.' });
      return;
    }

    const controller = new AbortController();
    set({ isParsing: true, error: null, commitFeedback: null, abortController: controller });

    try {
      const bankQuestions = await getMergedBankQuestions();
      const currentBlockId = get().targetBlockId || LEGACY_DEFAULT_BLOCK_ID;

      const result = await parsingAgent.parseRawQuestions(
        {
          rawText: rawInputText,
          providerId: selectedProvider,
          modelId: selectedModelId,
          targetBlockId: currentBlockId,
          stemMode,
          enableConsensusCheck,
          existingQuestions: bankQuestions,
          targetSubjectId: targetSubjectId === 'all' || targetSubjectId === 'auto' ? undefined : targetSubjectId,
          targetChapterId: targetChapterId === 'all' || targetChapterId === 'auto' ? undefined : targetChapterId,
          onTelemetryUpdate: (agentTelemetry) => set({ agentTelemetry }),
        },
        controller.signal
      );

      if (result.items.length === 0) {
        set({
          isParsing: false,
          abortController: null,
          error: 'Could not extract valid question structure from input. Check format and try again.',
        });
        return;
      }

      // Automatically synchronize targetBlockId if parsed questions belong to a detected block
      const detectedBlockId = result.items[0]?.question?.blockId;
      if (detectedBlockId && detectedBlockId !== currentBlockId) {
        set({ targetBlockId: detectedBlockId as BlockId });
      }

      // Pre-select ONLY safe non-duplicate questions by default (Stage 06 verdicts are already attached)
      const safeIds = new Set(
        result.items
          .filter((i) => {
            const rel = i.qddVerdict?.relation;
            return rel !== 'EXACT' && rel !== 'NEAR' && rel !== 'CONFLICT';
          })
          .map((i) => i.tempId)
      );
      set({
        isParsing: false,
        abortController: null,
        parsedQuestions: [...result.items],
        selectedTempIds: safeIds,
      });

      // Automatically trigger duplication detection across the batch and bank
      void get().runBatchDuplicationCheck();
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        set({ isParsing: false, abortController: null, error: 'Execution halted by administrator.' });
      } else {
        set({
          isParsing: false,
          abortController: null,
          error: `Parsing failed: ${err?.message || 'Unknown processing error'}`,
        });
      }
    }
  },

  runBatchDuplicationCheck: async () => {
    const { parsedQuestions } = get();
    if (parsedQuestions.length === 0) return;

    const hasAnyVerdict = parsedQuestions.some((q) => Boolean(q.qddVerdict));

    // Only set shimmering checking state if questions don't already have verdicts
    if (!hasAnyVerdict) {
      set({
        isCheckingDuplication: true,
        parsedQuestions: parsedQuestions.map((q) => ({
          ...q,
          isCheckingDuplication: true,
        })),
      });
    }

    const bankQuestions = await getMergedBankQuestions();
    const bankIdSet = new Set(bankQuestions.map((q) => q.id));
    const targetBlockId = get().targetBlockId || LEGACY_DEFAULT_BLOCK_ID;

    let edgeVerdicts: any[] = [];
    try {
      const questionsPayload = parsedQuestions.map((q, idx) => toQddProbe(q.question, bankIdSet, idx, targetBlockId));
      const res = await fetch('/api/qdd/check-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: questionsPayload,
          scope: { kind: 'block', blockId: targetBlockId },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.verdicts)) {
          edgeVerdicts = data.verdicts;
        }
      }
    } catch {
      // Network or offline fallback
    }

    // Launch prebuilt DuplicationDetectionEngine against merged local + governed bank
    try {
      const engine = await createClientQddEngine(bankQuestions);
      const current = get().parsedQuestions;
      const questionsPayload = current.map((q, idx) => toQddProbe(q.question, bankIdSet, idx, targetBlockId));
      const res = await engine.checkBatch(questionsPayload, { kind: 'block', blockId: targetBlockId });
      if (!res.ok) {
        console.error('[useAdminAiQuestionParserStore] QDD batch rejected input:', res.error);
      }
      const clientVerdicts = res.ok ? res.value : [];

      const updated = current.map((item, idx) => ({
        ...item,
        qddVerdict:
          pickStrongerVerdict(clientVerdicts[idx], edgeVerdicts[idx]) || item.qddVerdict,
        isCheckingDuplication: false,
      }));

      // Ensure any newly detected duplicates are unselected to delay/protect bank commits
      const filteredSelected = new Set(
        Array.from(get().selectedTempIds).filter((tempId) => {
          const item = updated.find((p) => p.tempId === tempId);
          const rel = item?.qddVerdict?.relation;
          return rel !== 'EXACT' && rel !== 'NEAR' && rel !== 'CONFLICT';
        })
      );
      set({ parsedQuestions: updated, selectedTempIds: filteredSelected, isCheckingDuplication: false });
    } catch (fallbackErr) {
      console.error('[useAdminAiQuestionParserStore] Prebuilt QDD check failed:', fallbackErr);
      const reset = get().parsedQuestions.map((q, idx) => ({
        ...q,
        qddVerdict: edgeVerdicts[idx] || q.qddVerdict,
        isCheckingDuplication: false,
      }));
      const filteredSelected = new Set(
        Array.from(get().selectedTempIds).filter((tempId) => {
          const item = reset.find((p) => p.tempId === tempId);
          const rel = item?.qddVerdict?.relation;
          return rel !== 'EXACT' && rel !== 'NEAR' && rel !== 'CONFLICT';
        })
      );
      set({ parsedQuestions: reset, selectedTempIds: filteredSelected, isCheckingDuplication: false });
    }
  },

  saveAllUnique: async () => {
    const { parsedQuestions, commitToGlobalQuestionBank } = get();

    // Unique ONLY if the engine actually returned UNIQUE or SIBLING.
    // A missing verdict means the check failed — never treat it as a pass.
    const uniqueItems = parsedQuestions.filter((item) => {
      const rel = item.qddVerdict?.relation;
      return rel === 'UNIQUE' || rel === 'SIBLING';
    });

    const duplicateItems = parsedQuestions.filter((item) => {
      const rel = item.qddVerdict?.relation;
      return rel === 'EXACT' || rel === 'NEAR' || rel === 'CONFLICT';
    });

    if (uniqueItems.length === 0) {
      set({
        commitFeedback: {
          type: 'error',
          message:
            'No unique questions found in the parsed batch. All questions were flagged as duplicates or conflicts.',
        },
      });
      return false;
    }

    // Select only unique items
    const uniqueIds = new Set(uniqueItems.map((i) => i.tempId));
    set({ selectedTempIds: uniqueIds });

    const success = await commitToGlobalQuestionBank(true);
    if (success) {
      const skippedNote =
        duplicateItems.length > 0
          ? ` (${duplicateItems.length} duplicate/conflict items skipped).`
          : '.';
      set({
        commitFeedback: {
          type: 'success',
          message: `Successfully saved ${uniqueItems.length} unique questions${skippedNote}`,
        },
      });
    }
    return success;
  },

  sendToApprovalQueue: async (targetTempId?: string) => {
    const { parsedQuestions, selectedTempIds } = get();
    const authState = useAuthStore.getState().authState;
    const actor =
      authState.status === 'authenticated-active'
        ? authState.user
        : { id: 'usr_admin', displayName: 'Curriculum Administrator', role: 'admin' as const };

    let itemsToRoute: ParsedQuestionItem[] = [];
    if (targetTempId) {
      const item = parsedQuestions.find((p) => p.tempId === targetTempId);
      if (item) itemsToRoute = [item];
    } else {
      const selectedDuplicates = parsedQuestions.filter(
        (p) =>
          selectedTempIds.has(p.tempId) &&
          (p.qddVerdict?.relation === 'EXACT' ||
            p.qddVerdict?.relation === 'NEAR' ||
            p.qddVerdict?.relation === 'CONFLICT')
      );
      if (selectedDuplicates.length > 0) {
        itemsToRoute = selectedDuplicates;
      } else {
        itemsToRoute = parsedQuestions.filter(
          (p) =>
            p.qddVerdict?.relation === 'EXACT' ||
            p.qddVerdict?.relation === 'NEAR' ||
            p.qddVerdict?.relation === 'CONFLICT'
        );
      }
    }

    if (itemsToRoute.length === 0) {
      set({
        commitFeedback: {
          type: 'error',
          message: 'No duplicate questions found to route for approval.',
        },
      });
      return false;
    }

    set({ isCommitting: true, commitFeedback: null });

    try {
      const questionsToSubmit = itemsToRoute.map((item) => {
        const q = toQddProbe(item.question);
        const cand = item.qddVerdict?.candidates[0];
        const collisionNote = cand
          ? `[QDD Auto-Triage: ${item.qddVerdict?.relation}] Matched against bank question ${cand.matchedQuestionId}`
          : `[QDD Auto-Triage: ${item.qddVerdict?.relation || 'DUPLICATE'}] Flagged by Prebuilt Duplication Engine`;
        return {
          ...q,
          evidence: [
            ...(q.evidence || []),
            {
              chunkId: `qdd-flag-${Date.now().toString(36)}`,
              sourceName: 'Duplication Detection Engine',
              location: 'Pre-Approval Triage',
              quote: collisionNote,
              kind: 'text' as const,
            },
          ],
        };
      });

      const res = await edgeQuestionBankGateway.submitQuestionsForGlobalReview({
        questions: questionsToSubmit,
        authorId: actor.id,
        authorDisplayName: actor.displayName,
        authorRole: actor.role,
        allowDuplicateStems: true,
        reviewerNotes: `Flagged duplicate/collision routed from AI Question Ingestion Lab for faculty editorial review.`,
      });

      if (res.ok) {
        await useBankGovernanceStore.getState().loadGovernanceData(get().targetBlockId || LEGACY_DEFAULT_BLOCK_ID);

        const routedIds = new Set(itemsToRoute.map((i) => i.tempId));
        const remaining = parsedQuestions.filter((item) => !routedIds.has(item.tempId));
        const remainingSelected = new Set(
          Array.from(get().selectedTempIds).filter((id) => !routedIds.has(id))
        );

        set({
          isCommitting: false,
          parsedQuestions: remaining,
          selectedTempIds: remainingSelected,
          rawInputText: remaining.length === 0 ? '' : get().rawInputText,
          commitFeedback: {
            type: 'success',
            message: `Successfully routed ${itemsToRoute.length} duplicate question(s) to the Faculty Approval Queue (Review Tickets created).`,
          },
        });
        return true;
      } else {
        set({
          isCommitting: false,
          commitFeedback: {
            type: 'error',
            message: `Could not route to approval queue: ${res.error.code}`,
          },
        });
        return false;
      }
    } catch (err: any) {
      set({
        isCommitting: false,
        commitFeedback: {
          type: 'error',
          message: `Routing failed: ${err?.message || 'Unknown processing error'}`,
        },
      });
      return false;
    }
  },

  toggleQuestionSelection: (tempId) => {
    const current = new Set(get().selectedTempIds);
    if (current.has(tempId)) {
      current.delete(tempId);
    } else {
      current.add(tempId);
    }
    set({ selectedTempIds: current });
  },

  selectAll: (select) => {
    if (select) {
      // By default, select only safe non-duplicate questions
      const uniqueIds = get()
        .parsedQuestions.filter((q) => {
          const rel = q.qddVerdict?.relation;
          return rel !== 'EXACT' && rel !== 'NEAR' && rel !== 'CONFLICT';
        })
        .map((i) => i.tempId);
      set({ selectedTempIds: new Set(uniqueIds) });
    } else {
      set({ selectedTempIds: new Set() });
    }
  },

  updateQuestionStem: (index, stem) => {
    const questions = [...get().parsedQuestions];
    if (!questions[index]) return;
    const updatedQ: Question = { ...questions[index].question, stem };
    questions[index] = { ...questions[index], question: updatedQ };
    set({ parsedQuestions: questions });
  },

  toggleStemFormat: (index) => {
    const questions = [...get().parsedQuestions];
    const target = questions[index];
    if (!target) return;

    const currentStem = target.question.stem;
    const rawStem = target.originalRawStem || target.rawInputExcerpt.split('\n')[0]?.replace(/^[0-9]+[.-]\s*/, '').trim() || '';
    const vignetteStem = target.enrichedVignetteStem;

    // Toggle between rawStem and vignetteStem
    let nextStem = currentStem;
    if (vignetteStem && currentStem === rawStem) {
      nextStem = vignetteStem;
    } else if (rawStem && currentStem !== rawStem) {
      nextStem = rawStem;
    } else if (vignetteStem) {
      nextStem = vignetteStem;
    }

    questions[index] = {
      ...target,
      question: {
        ...target.question,
        stem: nextStem,
      },
    };
    set({ parsedQuestions: questions });
  },

  updateChoice: (index, choiceId, text, rationale) => {
    const questions = [...get().parsedQuestions];
    if (!questions[index]) return;
    const currentChoices = questions[index].question.choices.map((c) => {
      if (c.id === choiceId) {
        return { ...c, text, rationale };
      }
      return c;
    });
    const updatedQ: Question = { ...questions[index].question, choices: currentChoices };
    questions[index] = { ...questions[index], question: updatedQ };
    set({ parsedQuestions: questions });
  },

  setKeyedCorrectChoice: (index, choiceId) => {
    const questions = [...get().parsedQuestions];
    if (!questions[index]) return;
    const currentChoices = questions[index].question.choices.map((c) => ({
      ...c,
      isCorrect: c.id === choiceId,
    }));
    const updatedQ: Question = { ...questions[index].question, choices: currentChoices };
    questions[index] = {
      ...questions[index],
      question: updatedQ,
      selectedCorrectChoiceId: choiceId,
      aiGeneratedAnswerKey: false, // Explicitly verified by admin
    };
    set({ parsedQuestions: questions });
  },

  updateExplanation: (index, explanation) => {
    const questions = [...get().parsedQuestions];
    if (!questions[index]) return;
    const updatedQ: Question = { ...questions[index].question, explanation };
    questions[index] = { ...questions[index], question: updatedQ };
    set({ parsedQuestions: questions });
  },

  updateQuestionTaxonomy: (index, subjectId, chapterId) => {
    const questions = [...get().parsedQuestions];
    if (!questions[index]) return;

    const subjects = curriculumTaxonomyRegistry.getSubjects();
    const chapters = curriculumTaxonomyRegistry.getChapters();
    const subjObj = subjects.find((s) => s.id === subjectId);
    const chapObj = chapters.find((c) => c.id === chapterId);

    const targetBlockId = get().targetBlockId || LEGACY_DEFAULT_BLOCK_ID;
    const pack = compositionRoot.catalog.get(targetBlockId);
    const blockName = pack
      ? `${pack.manifest.block.name.en} (${pack.manifest.block.shortName}) - ${pack.manifest.block.code}`
      : 'Cardiovascular System (CVS) - Block 206';

    const updatedQ: Question = {
      ...questions[index].question,
      blockId: targetBlockId,
      subjectId,
      chapterId,
      topicId: `${chapterId}/core-concepts`,
    };

    questions[index] = {
      ...questions[index],
      question: updatedQ,
      taxonomyClassification: {
        blockId: targetBlockId,
        blockName,
        subjectId,
        subjectName: subjObj?.name || subjectId,
        chapterId,
        chapterName: chapObj?.name || chapterId,
        confidenceScore: 100,
        rationale: 'Manually verified and assigned by Administrator.',
        isNewDomainSuggested: false,
      },
    };
    set({ parsedQuestions: questions });
  },

  approveTaxonomyProposal: (tempId, type) => {
    const questions = [...get().parsedQuestions];
    const itemIndex = questions.findIndex((q) => q.tempId === tempId);
    if (itemIndex === -1) return;

    const item = questions[itemIndex];
    const classification = item.taxonomyClassification;
    if (!classification) return;

    if (type === 'subject' && classification.newSubjectProposal) {
      const regSubject = curriculumTaxonomyRegistry.registerSubject({
        id: classification.newSubjectProposal.id,
        name: classification.newSubjectProposal.name,
      });

      if (classification.newChapterProposal) {
        curriculumTaxonomyRegistry.registerChapter({
          id: classification.newChapterProposal.id,
          subjectId: regSubject.id,
          name: classification.newChapterProposal.name,
        });
      }

      const updatedQ: Question = {
        ...item.question,
        subjectId: regSubject.id,
        chapterId: classification.newChapterProposal?.id || item.question.chapterId,
        topicId: `${classification.newChapterProposal?.id || item.question.chapterId}/core-concepts`,
      };

      questions[itemIndex] = {
        ...item,
        question: updatedQ,
        taxonomyClassification: {
          ...classification,
          subjectId: regSubject.id,
          subjectName: regSubject.name,
          isNewDomainSuggested: false,
          newSubjectProposal: undefined,
          newChapterProposal: undefined,
          rationale: `Approved and registered into active curriculum by Administrator.`,
        },
      };
      set({ parsedQuestions: questions });
    } else if (type === 'chapter' && classification.newChapterProposal) {
      const regChapter = curriculumTaxonomyRegistry.registerChapter({
        id: classification.newChapterProposal.id,
        subjectId: classification.newChapterProposal.subjectId,
        name: classification.newChapterProposal.name,
      });

      const updatedQ: Question = {
        ...item.question,
        chapterId: regChapter.id,
        topicId: `${regChapter.id}/core-concepts`,
      };

      questions[itemIndex] = {
        ...item,
        question: updatedQ,
        taxonomyClassification: {
          ...classification,
          chapterId: regChapter.id,
          chapterName: regChapter.name,
          isNewDomainSuggested: false,
          newChapterProposal: undefined,
          rationale: `Approved chapter registered into active curriculum by Administrator.`,
        },
      };
      set({ parsedQuestions: questions });
    }
  },

  removeParsedQuestion: (index) => {
    const questions = [...get().parsedQuestions];
    const removed = questions.splice(index, 1);
    const selected = new Set(get().selectedTempIds);
    if (removed[0]) selected.delete(removed[0].tempId);
    set({ parsedQuestions: questions, selectedTempIds: selected });
  },

  clearParsedQuestions: () => {
    set({ parsedQuestions: [], selectedTempIds: new Set(), commitFeedback: null, agentTelemetry: null });
  },

  commitToGlobalQuestionBank: async (selectedOnly = true) => {
    const { parsedQuestions, selectedTempIds } = get();
    const authState = useAuthStore.getState().authState;

    if (authState.status !== 'authenticated-active' || authState.user.role !== 'admin') {
      set({
        commitFeedback: {
          type: 'error',
          message: 'Unauthorized: Platform Administrator privileges required.',
        },
      });
      return false;
    }

    const itemsToCommit = selectedOnly
      ? parsedQuestions.filter((item) => selectedTempIds.has(item.tempId))
      : parsedQuestions;

    if (itemsToCommit.length === 0) {
      set({
        commitFeedback: {
          type: 'error',
          message: 'No questions selected for commit.',
        },
      });
      return false;
    }

    const duplicateItems = itemsToCommit.filter((item) => {
      const rel = item.qddVerdict?.relation;
      return rel === 'EXACT' || rel === 'NEAR' || rel === 'CONFLICT';
    });

    if (duplicateItems.length > 0) {
      set({
        isCommitting: false,
        commitFeedback: {
          type: 'error',
          message: `Direct commit blocked: ${duplicateItems.length} question(s) already exist in the bank or have collisions. Please send them to the Faculty Approval Queue or deselect them before committing.`,
        },
      });
      return false;
    }

    set({ isCommitting: true, commitFeedback: null });

    try {
      const globalActiveBlock = typeof useBlockContextStoreBase !== 'undefined'
        ? useBlockContextStoreBase.getState().activeBlockId
        : get().targetBlockId;
      const rawBlockId =
        itemsToCommit[0]?.question?.blockId ||
        get().targetBlockId ||
        globalActiveBlock ||
        LEGACY_DEFAULT_BLOCK_ID;
      const commitBlockId = normalizeBlockId(rawBlockId, globalActiveBlock) as BlockId;

      const canonicalQuestions = itemsToCommit.map((item) => ({
        ...item.question,
        blockId: commitBlockId,
      }));
      const { createCanonicalQuestions } = useBankGovernanceStore.getState();

      const success = await createCanonicalQuestions(canonicalQuestions, {
        id: authState.user.id,
        displayName: authState.user.displayName,
        role: authState.user.role,
      });

      if (success) {
        // Persist committed canonical questions directly into IndexedDB and refresh question store
        try {
          await db.questions.bulkPut(canonicalQuestions);
          const allCanonical = edgeQuestionBankGateway.getLocalCanonicalBank(commitBlockId);
          if (allCanonical.length > 0) {
            await db.questions.bulkPut(allCanonical as unknown as Question[]);
          }
        } catch {
          // Ignore IndexedDB write error in non-browser environment
        }
        await useQuestionStore.getState().loadQuestions(commitBlockId);

        // Clear committed items from list
        const remaining = parsedQuestions.filter(
          (item) => !itemsToCommit.some((c) => c.tempId === item.tempId)
        );

        set({
          isCommitting: false,
          parsedQuestions: remaining,
          selectedTempIds: new Set(remaining.map((r) => r.tempId)),
          rawInputText: remaining.length === 0 ? '' : get().rawInputText,
          commitFeedback: {
            type: 'success',
            message: `Successfully approved & committed ${itemsToCommit.length} canonical questions to the Global Bank!`,
          },
        });
        return true;
      } else {
        set({
          isCommitting: false,
          commitFeedback: {
            type: 'error',
            message: 'Failed to commit questions to Global Question Bank. Check console for logs.',
          },
        });
        return false;
      }
    } catch (err: any) {
      set({
        isCommitting: false,
        commitFeedback: {
          type: 'error',
          message: err.message || 'Error committing questions to bank.',
        },
      });
      return false;
    }
  },

  getSingleQuestionPrompt: (index: number) => {
    const item = get().parsedQuestions[index];
    if (!item) return '';
    return CrossModelVerificationPromptBuilder.buildSingleQuestionPrompt(item);
  },

  getBatchVerificationPrompt: () => {
    const { parsedQuestions, selectedTempIds } = get();
    const targetItems = parsedQuestions.filter((item) => selectedTempIds.has(item.tempId));
    const items = targetItems.length > 0 ? targetItems : parsedQuestions;
    return CrossModelVerificationPromptBuilder.buildBatchQuestionsPrompt(items);
  },
}));

// Reactive bridge: Automatically synchronize parser target block whenever the user switches curriculum blocks via the Navbar
useBlockContextStoreBase.subscribe((state, prevState) => {
  if (state.activeBlockId !== prevState.activeBlockId) {
    useAdminAiQuestionParserStore.getState().setTargetBlockId(state.activeBlockId);
  }
});
