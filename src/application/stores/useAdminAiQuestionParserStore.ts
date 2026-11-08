/**
 * Application Store: useAdminAiQuestionParserStore
 * State Management: Zustand 5
 * Manages raw input text, AI model selection, parsing state, pre-approval anti-hallucination inspection,
 * per-question missing answer detection, verification prompt export, and canonical bank commits.
 *
 * Decomposed via Apple Architecture Standards into specialized domain services:
 * - ParserExecutionService: LLM parsing orchestration & consensus quorum
 * - QddVerificationService: Batch duplicate detection & probe normalizers
 * - BankCommitService: Faculty review queue routing & global bank commits
 *
 * Restricted to Administrators.
 */

import { create } from 'zustand';
import type { CloudProviderId } from '../../domain/ai/settings.ts';
import type { ChoiceId, Question } from '../../domain/model/types.ts';
import { CrossModelVerificationPromptBuilder } from '../../domain/questionBank/aiQuestionParser/CrossModelVerificationPromptBuilder.ts';
import type {
  ParsedQuestionItem,
  QuestionStemMode,
  AgentExecutionTelemetry,
} from '../../domain/questionBank/aiQuestionParser/types.ts';
import { curriculumTaxonomyRegistry } from '../../domain/taxonomy/CurriculumTaxonomyRegistry.ts';
import { TaxonomyDisplayResolver } from '../../domain/taxonomy/TaxonomyDisplayResolver.ts';
import { LEGACY_DEFAULT_BLOCK_ID, type BlockId } from '../../domain/curriculum/ids.ts';
import { compositionRoot } from '../composition/clientCompositionRoot.ts';
import { useBlockContextStoreBase } from './useBlockContextStore.ts';
import {
  executeBatchDuplicationAudit,
} from './aiParser/qddVerificationService.ts';
import {
  executeSendToApprovalQueue,
  executeCommitToGlobalQuestionBank,
} from './aiParser/bankCommitService.ts';
import {
  executeParseRawQuestions,
  executeSingleQuestionConsensus,
} from './aiParser/parserExecutionService.ts';
import { isDuplicateItem, isUniqueItem } from './aiParser/parserSelectionHelper.ts';

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
    const cnsMatch =
      /\b(?:Block\s*:\s*CNS|CNS\s+Anatomy|Neuroanatomy)\b/i.test(rawInputText) ||
      /"(?:blockId|id|subjectId)"\s*:\s*"q?-(?:cns|cns-neuroscience|neuro|supratentorial|infratentorial)/i.test(rawInputText) ||
      /"blockId"\s*:\s*"(?:cns|cns-neuroscience|.*(?:supratentorial|infratentorial|neuro|brain).*)"/i.test(rawInputText);
    const cvsMatch =
      /\b(?:Block\s*:\s*CVS|Cardiovascular)\b/i.test(rawInputText) ||
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
    const { parsedQuestions, selectedModelId } = get();
    set({ isVerifyingConsensusIndex: index });
    try {
      const updated = await executeSingleQuestionConsensus(
        parsedQuestions,
        index,
        selectedModelId
      );
      set({ parsedQuestions: updated, isVerifyingConsensusIndex: null });
    } catch {
      set({ isVerifyingConsensusIndex: null });
    }
  },

  parseRawQuestions: async () => {
    const {
      rawInputText,
      selectedProvider,
      selectedModelId,
      targetBlockId,
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
      const currentBlockId = targetBlockId || LEGACY_DEFAULT_BLOCK_ID;
      const result = await executeParseRawQuestions(
        {
          rawInputText,
          selectedProvider,
          selectedModelId,
          targetBlockId: currentBlockId,
          targetSubjectId,
          targetChapterId,
          stemMode,
          enableConsensusCheck,
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

      if (result.detectedBlockId && result.detectedBlockId !== currentBlockId) {
        set({ targetBlockId: result.detectedBlockId });
      }

      set({
        isParsing: false,
        abortController: null,
        parsedQuestions: [...result.items],
        selectedTempIds: result.safeIds,
      });

      void get().runBatchDuplicationCheck();
    } catch (err: unknown) {
      const errObj = err as { name?: string; message?: string };
      if (errObj?.name === 'AbortError') {
        set({ isParsing: false, abortController: null, error: 'Execution halted by administrator.' });
      } else {
        set({
          isParsing: false,
          abortController: null,
          error: `Parsing failed: ${errObj?.message || 'Unknown processing error'}`,
        });
      }
    }
  },

  runBatchDuplicationCheck: async () => {
    const { parsedQuestions, targetBlockId, selectedTempIds } = get();
    if (parsedQuestions.length === 0) return;

    const hasAnyVerdict = parsedQuestions.some((q) => Boolean(q.qddVerdict));
    if (!hasAnyVerdict) {
      set({
        isCheckingDuplication: true,
        parsedQuestions: parsedQuestions.map((q) => ({
          ...q,
          isCheckingDuplication: true,
        })),
      });
    }

    const result = await executeBatchDuplicationAudit(
      parsedQuestions,
      targetBlockId || LEGACY_DEFAULT_BLOCK_ID,
      selectedTempIds
    );

    set({
      parsedQuestions: result.updatedQuestions,
      selectedTempIds: result.filteredSelectedIds,
      isCheckingDuplication: false,
    });
  },

  saveAllUnique: async () => {
    const { parsedQuestions, commitToGlobalQuestionBank } = get();

    const uniqueItems = parsedQuestions.filter(isUniqueItem);
    const duplicateItems = parsedQuestions.filter(isDuplicateItem);

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
    const { parsedQuestions, selectedTempIds, targetBlockId } = get();
    set({ isCommitting: true, commitFeedback: null });

    const result = await executeSendToApprovalQueue(
      parsedQuestions,
      selectedTempIds,
      targetBlockId || LEGACY_DEFAULT_BLOCK_ID,
      targetTempId
    );

    set({
      isCommitting: false,
      parsedQuestions: result.remainingQuestions,
      selectedTempIds: result.remainingSelectedIds,
      rawInputText: result.remainingQuestions.length === 0 ? '' : get().rawInputText,
      commitFeedback: result.feedback,
    });

    return result.ok;
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
    const rawStem =
      target.originalRawStem ||
      target.rawInputExcerpt.split('\n')[0]?.replace(/^[0-9]+[.-]\s*/, '').trim() ||
      '';
    const vignetteStem = target.enrichedVignetteStem;

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
      aiGeneratedAnswerKey: false,
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
        blockName: blockName || TaxonomyDisplayResolver.humanizeTaxonomySlug(targetBlockId),
        subjectId,
        subjectName:
          subjObj?.name ||
          TaxonomyDisplayResolver.resolveSubjectName(subjectId, undefined, targetBlockId),
        chapterId,
        chapterName:
          chapObj?.name ||
          TaxonomyDisplayResolver.resolveChapterName(chapterId, undefined, targetBlockId),
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

    const itemBlockId = item.question.blockId || get().targetBlockId || 'cvs';

    if (type === 'subject' && classification.newSubjectProposal) {
      const regSubject = curriculumTaxonomyRegistry.registerSubject({
        id: classification.newSubjectProposal.id,
        name: classification.newSubjectProposal.name,
        blockId: itemBlockId,
      });

      if (classification.newChapterProposal) {
        curriculumTaxonomyRegistry.registerChapter({
          id: classification.newChapterProposal.id,
          subjectId: regSubject.id,
          name: classification.newChapterProposal.name,
          blockId: itemBlockId,
        });
      }

      const updatedQ: Question = {
        ...item.question,
        blockId: itemBlockId,
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
        blockId: itemBlockId,
      });

      const updatedQ: Question = {
        ...item.question,
        blockId: itemBlockId,
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
    const { parsedQuestions, selectedTempIds, targetBlockId } = get();
    set({ isCommitting: true, commitFeedback: null });

    const result = await executeCommitToGlobalQuestionBank(
      parsedQuestions,
      selectedTempIds,
      targetBlockId || LEGACY_DEFAULT_BLOCK_ID,
      selectedOnly
    );

    set({
      isCommitting: false,
      parsedQuestions: result.remainingQuestions,
      selectedTempIds: result.remainingSelectedIds,
      rawInputText: result.remainingQuestions.length === 0 ? '' : get().rawInputText,
      commitFeedback: result.feedback,
    });

    return result.ok;
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
