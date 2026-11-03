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
import type { ChoiceId, Question } from '../../domain/model/types.ts';
import { QuestionParsingAgent } from '../../domain/questionBank/aiQuestionParser/QuestionParsingAgent.ts';
import { CrossModelVerificationPromptBuilder } from '../../domain/questionBank/aiQuestionParser/CrossModelVerificationPromptBuilder.ts';
import type { ParsedQuestionItem, QuestionStemMode, AgentExecutionTelemetry } from '../../domain/questionBank/aiQuestionParser/types.ts';
import { multiModelConsensusEngine } from '../../domain/questionBank/aiQuestionParser/MultiModelConsensusEngine.ts';
import { curriculumTaxonomyRegistry } from '../../domain/taxonomy/CurriculumTaxonomyRegistry.ts';
import { QuestionCanonicalizerV2 } from '../../domain/questionBank/duplication/QuestionCanonicalizerV2.ts';
import { MinHasher } from '../../domain/questionBank/duplication/MinHasher.ts';
import { ClinicalDiscriminatorExtractor } from '../../domain/questionBank/duplication/ClinicalDiscriminatorExtractor.ts';
import type {
  DuplicateRelation,
  DuplicateCandidate,
  DuplicationVerdict,
} from '../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';
import { useAuthStore } from './useAuthStore.ts';
import { useBankGovernanceStore } from './useBankGovernanceStore.ts';
import { useQuestionStore } from './useQuestionStore.ts';
import defaultCvsBank from '../../../content/cvs/dist/bank.v1.json';

interface AdminAiQuestionParserStoreState {
  // Input & Configuration
  rawInputText: string;
  selectedProvider: CloudProviderId;
  selectedModelId: string;
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
  setStemMode: (mode: QuestionStemMode) => void;
  setEnableConsensusCheck: (enable: boolean) => void;
  setTargetTaxonomy: (subjectId: string, chapterId: string) => void;
  parseRawQuestions: () => Promise<void>;
  abortCurrentExecution: () => void;
  runBatchDuplicationCheck: () => Promise<void>;
  saveAllUnique: () => Promise<boolean>;
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

export const useAdminAiQuestionParserStore = create<AdminAiQuestionParserStoreState>((set, get) => ({
  rawInputText: '',
  selectedProvider: 'gemini',
  selectedModelId: 'gemini-2.5-flash',
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

  setRawInputText: (rawInputText) => set({ rawInputText }),

  setSelectedModel: (selectedProvider, selectedModelId) =>
    set({ selectedProvider, selectedModelId }),

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
      const storeQuestions = useQuestionStore.getState().questions;
      const bankQuestions: Question[] =
        storeQuestions.length > 0
          ? storeQuestions
          : Array.isArray(defaultCvsBank)
          ? (defaultCvsBank as Question[])
          : [];

      const result = await parsingAgent.parseRawQuestions(
        {
          rawText: rawInputText,
          providerId: selectedProvider,
          modelId: selectedModelId,
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

      const allIds = new Set(result.items.map((i) => i.tempId));
      set({
        isParsing: false,
        abortController: null,
        parsedQuestions: [...result.items],
        selectedTempIds: allIds,
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

    try {
      const questionsPayload = parsedQuestions.map((q) => q.question);
      const res = await fetch('/api/qdd/check-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: questionsPayload,
          scope: { kind: 'block', blockId: 'cvs' },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.verdicts)) {
          const updated = get().parsedQuestions.map((item, idx) => ({
            ...item,
            qddVerdict: data.verdicts[idx] || item.qddVerdict,
            isCheckingDuplication: false,
          }));
          set({ parsedQuestions: updated, isCheckingDuplication: false });
          return;
        }
      }
    } catch {
      // Network or offline fallback
    }

    // Graceful offline & in-browser fallback: check BOTH against existing bank AND in-batch
    try {
      const canonicalizer = new QuestionCanonicalizerV2();
      const minhasher = new MinHasher();
      const current = get().parsedQuestions;

      // 1. Canonicalize current batch items
      const canonicals = await Promise.all(
        current.map((item) => canonicalizer.canonicalize(item.question))
      );
      const signatures = canonicals.map((c) => minhasher.signature(c.shingles));

      // 2. Load and canonicalize bank questions
      const storeQuestions = useQuestionStore.getState().questions;
      const bankQuestions: Question[] =
        storeQuestions.length > 0
          ? storeQuestions
          : Array.isArray(defaultCvsBank)
          ? (defaultCvsBank as Question[])
          : [];

      const bankCanonicals = await Promise.all(
        bankQuestions.map((q) => canonicalizer.canonicalize(q))
      );
      const bankSignatures = bankCanonicals.map((c) => minhasher.signature(c.shingles));

      const updated = current.map((item, idx) => {
        const candidates: DuplicateCandidate[] = [];
        const seenMatchedIds = new Set<string>();

        const evaluateCandidate = (
          cA: typeof canonicals[0],
          cB: typeof canonicals[0],
          sigA: Uint32Array,
          sigB: Uint32Array,
          matchedQ: Question,
          stageTag: 'S1_EXACT' | 'S2_LEXICAL_LSH'
        ) => {
          if (seenMatchedIds.has(matchedQ.id) || matchedQ.id === item.question.id) return;

          let rel: DuplicateRelation | null = null;
          let jaccard: number | null = null;

          if (cA.itemHash === cB.itemHash) {
            rel = 'EXACT';
            jaccard = 1.0;
          } else if (cA.stemHash === cB.stemHash) {
            rel = cA.answerKeyHash === cB.answerKeyHash ? 'EXACT' : 'CONFLICT';
            jaccard = 1.0;
          } else {
            jaccard = MinHasher.estimateJaccard(sigA, sigB);
            if (jaccard >= 0.8) {
              const delta = ClinicalDiscriminatorExtractor.computeDelta(
                cB.discriminators,
                cA.discriminators
              );
              rel = delta.length > 0 ? 'SIBLING' : 'NEAR';
            } else if (jaccard >= 0.65) {
              const delta = ClinicalDiscriminatorExtractor.computeDelta(
                cB.discriminators,
                cA.discriminators
              );
              rel = delta.length > 0 ? 'SIBLING' : 'NEAR';
            } else if (jaccard >= 0.35) {
              const delta = ClinicalDiscriminatorExtractor.computeDelta(
                cB.discriminators,
                cA.discriminators
              );
              if (delta.length > 0) rel = 'SIBLING';
            }
          }

          if (rel) {
            seenMatchedIds.add(matchedQ.id);
            candidates.push({
              matchedQuestionId: matchedQ.id,
              matchedStemPreview: matchedQ.stem.slice(0, 100),
              relation: rel,
              decidedBy: stageTag,
              signals: {
                lexicalJaccard: jaccard,
                semanticCosine: null,
                rerankScore: null,
                sameAnswerKey: cA.answerKeyHash === cB.answerKeyHash,
                discriminatorDelta: [],
                fusedScore: jaccard ?? 1.0,
              },
              llm: null,
              explanationKey: `qdd.explanation.${rel.toLowerCase()}`,
              explanationParams: { matchedId: matchedQ.id },
            });
          }
        };

        // A. Compare against all canonical bank questions
        for (let bIdx = 0; bIdx < bankQuestions.length; bIdx++) {
          evaluateCandidate(
            bankCanonicals[bIdx],
            canonicals[idx],
            bankSignatures[bIdx],
            signatures[idx],
            bankQuestions[bIdx],
            'S1_EXACT'
          );
        }

        // B. Compare against earlier in-batch questions
        for (let prevIdx = 0; prevIdx < idx; prevIdx++) {
          evaluateCandidate(
            canonicals[prevIdx],
            canonicals[idx],
            signatures[prevIdx],
            signatures[idx],
            current[prevIdx].question,
            'S2_LEXICAL_LSH'
          );
        }

        const relSeverity: Record<DuplicateRelation, number> = {
          EXACT: 5,
          CONFLICT: 4,
          NEAR: 3,
          SIBLING: 2,
          UNIQUE: 1,
        };

        let highestRelation: DuplicateRelation = 'UNIQUE';
        for (const cand of candidates) {
          if (relSeverity[cand.relation] > relSeverity[highestRelation]) {
            highestRelation = cand.relation;
          }
        }

        const verdict: DuplicationVerdict = {
          questionId: item.question.id,
          tier: 'batch-audit',
          decision:
            highestRelation === 'EXACT'
              ? 'BLOCK'
              : highestRelation === 'UNIQUE'
              ? 'ALLOW'
              : 'REVIEW',
          relation: highestRelation,
          candidates,
          stagesExecuted: ['S0_CANONICALIZE', 'S1_EXACT', 'S2_LEXICAL_LSH'],
          degraded: false,
          degradedReasons: [],
          latencyMs: 1,
          engineVersion: 'qdd-engine-v2',
          thresholdsVersion: 'v1',
        };

        return {
          ...item,
          qddVerdict: verdict,
          isCheckingDuplication: false,
        };
      });

      set({ parsedQuestions: updated, isCheckingDuplication: false });
    } catch (fallbackErr) {
      console.error('[useAdminAiQuestionParserStore] Duplication check failed:', fallbackErr);
      const reset = get().parsedQuestions.map((q) => ({
        ...q,
        isCheckingDuplication: false,
      }));
      set({ parsedQuestions: reset, isCheckingDuplication: false });
    }
  },

  saveAllUnique: async () => {
    const { parsedQuestions, commitToGlobalQuestionBank } = get();

    // Unique if no verdict or verdict is UNIQUE or SIBLING (not EXACT, NEAR, or CONFLICT)
    const uniqueItems = parsedQuestions.filter((item) => {
      const rel = item.qddVerdict?.relation;
      return !rel || rel === 'UNIQUE' || rel === 'SIBLING';
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
      const allIds = new Set(get().parsedQuestions.map((i) => i.tempId));
      set({ selectedTempIds: allIds });
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

    const updatedQ: Question = {
      ...questions[index].question,
      subjectId,
      chapterId,
      topicId: `${chapterId}/core-concepts`,
    };

    questions[index] = {
      ...questions[index],
      question: updatedQ,
      taxonomyClassification: {
        blockId: 'cvs',
        blockName: 'Cardiovascular System (CVS) - Block 206',
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
    set({ parsedQuestions: [], selectedTempIds: new Set(), commitFeedback: null });
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

    set({ isCommitting: true, commitFeedback: null });

    try {
      const canonicalQuestions = itemsToCommit.map((item) => item.question);
      const { createCanonicalQuestions } = useBankGovernanceStore.getState();

      const success = await createCanonicalQuestions(canonicalQuestions, {
        id: authState.user.id,
        displayName: authState.user.displayName,
        role: authState.user.role,
      });

      if (success) {
        // Also refresh question store
        await useQuestionStore.getState().loadQuestions('cvs');

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
