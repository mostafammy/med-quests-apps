/**
 * Component & Unit Test Suite: User Story 2 - In-Batch & Against-Bank Deduplication
 * Path: src/ui/features/qdd/__tests__/batchDeduplication.test.tsx
 *
 * Verifies:
 * - DuplicateBadge visual tokens rendering via SSR HTML
 * - DuplicateCompareSheet side-by-side token diff rendering via SSR HTML
 * - 40-item batch fixture with 6 planted duplicates (2 in-batch, 4 against bank):
 *   asserts 6/6 flagged, 0 false flags on remaining 34 unique items
 * - "Save all unique" exclusion logic in useAdminAiQuestionParserStore keeping only first occurrences and unique items
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { DuplicateBadge } from '../DuplicateBadge.tsx';
import { DuplicateCompareSheet } from '../DuplicateCompareSheet.tsx';
import { DuplicationDetectionEngine } from '../../../../domain/questionBank/duplication/DuplicationDetectionEngine.ts';
import { QuestionCanonicalizerV2 } from '../../../../domain/questionBank/duplication/QuestionCanonicalizerV2.ts';
import { EdgeGatePolicy } from '../../../../domain/questionBank/duplication/GatePolicy.ts';
import { InMemoryFingerprintRepository } from '../../../../infrastructure/questionBank/duplication/memory/InMemoryFingerprintRepository.ts';
import { MinHasher } from '../../../../domain/questionBank/duplication/MinHasher.ts';
import { S1ExactStage } from '../../../../domain/questionBank/duplication/stages/S1Exact.ts';
import { S2LexicalLshStage } from '../../../../domain/questionBank/duplication/stages/S2LexicalLsh.ts';
import { S4DiscriminatorsStage } from '../../../../domain/questionBank/duplication/stages/S4Discriminators.ts';
import { useAdminAiQuestionParserStore } from '../../../../application/stores/useAdminAiQuestionParserStore.ts';
import { useBankGovernanceStore } from '../../../../application/stores/useBankGovernanceStore.ts';
import { useAuthStore } from '../../../../application/stores/useAuthStore.ts';
import type { Question } from '../../../../domain/model/types.ts';
import type { DuplicationVerdict } from '../../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';

function createDummyQuestion(id: string, stem: string, correctChoice: 'a' | 'b' = 'a'): Question {
  return {
    id,
    blockId: 'cvs',
    subjectId: 'pharmacology',
    chapterId: 'heart-failure',
    topicId: 'heart-failure/pharmacology',
    concept: 'First-line heart failure pharmacology',
    type: 'single-best-answer',
    stem,
    choices: [
      {
        id: 'a',
        text: 'ACE inhibitors',
        isCorrect: correctChoice === 'a',
        rationale: 'First-line therapy reducing mortality.',
      },
      {
        id: 'b',
        text: 'Beta blockers',
        isCorrect: correctChoice === 'b',
        rationale: 'Second-line or adjunct therapy.',
      },
      {
        id: 'c',
        text: 'Calcium channel blockers',
        isCorrect: false,
        rationale: 'Contraindicated in systolic failure.',
      },
      {
        id: 'd',
        text: 'Digoxin',
        isCorrect: false,
        rationale: 'Symptomatic benefit only.',
      },
    ],
    explanation: 'Comprehensive medical rationale explaining why ACE inhibitors are first line in heart failure.',
    examTip: null,
    mnemonic: null,
    difficulty: 2,
    cognitiveLevel: 'understanding',
    highYield: true,
    origin: 'authored-grounded',
    evidence: [
      {
        chunkId: 'chk-cvs-01',
        sourceName: 'Robbins Pathologic Basis of Disease',
        location: 'Page 540',
        quote: 'ACE inhibitors improve hemodynamics and survival in systolic dysfunction.',
        kind: 'text',
      },
    ],
    status: 'active',
    bankVersion: 1,
  };
}

describe('US2: In-Batch & Against-Bank Deduplication Engine', () => {
  describe('DuplicateBadge Component', () => {
    it('renders shimmering loading state when isChecking is true', () => {
      const html = renderToString(<DuplicateBadge isChecking={true} />);
      expect(html).toContain('Checking duplicates…');
    });

    it('renders color-coded badge for EXACT relation', () => {
      const verdict: DuplicationVerdict = {
        questionId: 'q-1',
        tier: 'batch-audit',
        decision: 'BLOCK',
        relation: 'EXACT',
        candidates: [
          {
            matchedQuestionId: 'cvs-001',
            matchedStemPreview: 'A 55-year-old male...',
            relation: 'EXACT',
            decidedBy: 'S1_EXACT',
            signals: {
              lexicalJaccard: 1.0,
              semanticCosine: null,
              rerankScore: null,
              sameAnswerKey: true,
              discriminatorDelta: [],
              fusedScore: 1.0,
            },
            llm: null,
            explanationKey: 'qdd.explanation.exact',
            explanationParams: {},
          },
        ],
        stagesExecuted: ['S1_EXACT'],
        degraded: false,
        degradedReasons: [],
        latencyMs: 5,
        engineVersion: 'qdd-engine-v2',
        thresholdsVersion: 'v1',
      };

      const html = renderToString(<DuplicateBadge verdict={verdict} onInspect={() => {}} />);
      expect(html).toContain('Already in bank (cvs-001)');
      expect(html).toContain('bg-blue-500/10');
      expect(html).toContain('Compare');
    });

    it('renders color-coded badge for CONFLICT relation', () => {
      const verdict: DuplicationVerdict = {
        questionId: 'q-2',
        tier: 'batch-audit',
        decision: 'REVIEW',
        relation: 'CONFLICT',
        candidates: [
          {
            matchedQuestionId: 'cvs-002',
            matchedStemPreview: 'A 60-year-old female...',
            relation: 'CONFLICT',
            decidedBy: 'S4_DISCRIMINATORS',
            signals: {
              lexicalJaccard: 0.95,
              semanticCosine: null,
              rerankScore: null,
              sameAnswerKey: false,
              discriminatorDelta: [],
              fusedScore: 0.95,
            },
            llm: null,
            explanationKey: 'qdd.explanation.conflict',
            explanationParams: {},
          },
        ],
        stagesExecuted: ['S1_EXACT', 'S2_LEXICAL_LSH', 'S4_DISCRIMINATORS'],
        degraded: false,
        degradedReasons: [],
        latencyMs: 8,
        engineVersion: 'qdd-engine-v2',
        thresholdsVersion: 'v1',
      };

      const html = renderToString(<DuplicateBadge verdict={verdict} />);
      expect(html).toContain('Answer conflict (cvs-002)');
      expect(html).toContain('bg-rose-500/10');
    });

    it('renders color-coded badge for UNIQUE relation', () => {
      const verdict: DuplicationVerdict = {
        questionId: 'q-3',
        tier: 'batch-audit',
        decision: 'ALLOW',
        relation: 'UNIQUE',
        candidates: [],
        stagesExecuted: ['S1_EXACT', 'S2_LEXICAL_LSH', 'S4_DISCRIMINATORS'],
        degraded: false,
        degradedReasons: [],
        latencyMs: 3,
        engineVersion: 'qdd-engine-v2',
        thresholdsVersion: 'v1',
      };

      const html = renderToString(<DuplicateBadge verdict={verdict} showUnique={true} />);
      expect(html).toContain('Unique');
      expect(html).toContain('bg-emerald-500/10');
    });
  });

  describe('DuplicateCompareSheet Component', () => {
    it('renders side-by-side stem tokens and conflict warnings', () => {
      const subject = createDummyQuestion('sub-1', 'A 55-year-old male with acute systolic heart failure', 'a');
      const matched = createDummyQuestion('bank-1', 'A 55-year-old male with chronic systolic heart failure', 'b');

      const verdict: DuplicationVerdict = {
        questionId: 'sub-1',
        tier: 'batch-audit',
        decision: 'REVIEW',
        relation: 'CONFLICT',
        candidates: [
          {
            matchedQuestionId: 'bank-1',
            matchedStemPreview: matched.stem,
            relation: 'CONFLICT',
            decidedBy: 'S4_DISCRIMINATORS',
            signals: {
              lexicalJaccard: 0.88,
              semanticCosine: null,
              rerankScore: null,
              sameAnswerKey: false,
              discriminatorDelta: [{ kind: 'TEMPORAL', token: 'TEMPORAL:acute' }],
              fusedScore: 0.88,
            },
            llm: null,
            explanationKey: 'qdd.explanation.conflict',
            explanationParams: {},
          },
        ],
        stagesExecuted: ['S1_EXACT', 'S2_LEXICAL_LSH', 'S4_DISCRIMINATORS'],
        degraded: false,
        degradedReasons: [],
        latencyMs: 6,
        engineVersion: 'qdd-engine-v2',
        thresholdsVersion: 'v1',
      };

      const rawHtml = renderToString(
        <DuplicateCompareSheet
          isOpen={true}
          onClose={() => {}}
          subjectQuestion={subject}
          matchedQuestion={matched}
          verdict={verdict}
        />
      );
      const cleanHtml = rawHtml.replace(/<!--.*?-->/g, '');

      expect(cleanHtml).toContain('Duplicate Question Inspection');
      expect(cleanHtml).toContain('Answer Contradiction:');
      expect(cleanHtml).toContain('Clinical Discriminators detected:');
      expect(cleanHtml).toContain('TEMPORAL: TEMPORAL:acute');
      expect(cleanHtml).toContain('bank-1');
      expect(cleanHtml).toContain('sub-1');
    });
  });

  describe('40-Item Batch Deduplication Fixture', () => {
    it('flags all 6 planted duplicates (2 in-batch, 4 against bank) with 0 false flags on 34 unique items', async () => {
      const canonicalizer = new QuestionCanonicalizerV2();
      const repo = new InMemoryFingerprintRepository();
      const minhasher = new MinHasher();
      const stages = [
        new S1ExactStage(repo),
        new S2LexicalLshStage(repo, minhasher),
        new S4DiscriminatorsStage(),
      ];
      const engine = new DuplicationDetectionEngine(canonicalizer, stages, new EdgeGatePolicy());

      // 1. Seed bank with 4 existing items
      const bankItem1 = createDummyQuestion('bank-q1', 'A 45-year-old male with acute myocardial infarction and ST elevation in leads II, III, aVF.', 'a');
      const bankItem2 = createDummyQuestion('bank-q2', 'A 60-year-old female presents with progressive dyspnea on exertion and bilateral lower extremity edema.', 'a');
      const bankItem3 = createDummyQuestion('bank-q3', 'A 70-year-old male with refractory hypertension presents with severe flash pulmonary edema and bilateral renal artery bruits.', 'a');
      const bankItem4 = createDummyQuestion('bank-q4', 'A 30-year-old marathon runner collapses with hypertrophic obstructive cardiomyopathy and dynamic left ventricular outflow tract gradient.', 'a');

      for (const bq of [bankItem1, bankItem2, bankItem3, bankItem4]) {
        const canonical = await canonicalizer.canonicalize(bq);
        const sig = minhasher.signature(canonical.shingles);
        const bands = minhasher.bandKeys(sig);
        await repo.upsert({
          questionId: bq.id,
          blockId: bq.blockId,
          chapterId: bq.chapterId,
          normalizerVersion: canonical.normalizerVersion,
          stemHash: canonical.stemHash,
          itemHash: canonical.itemHash,
          answerKeyHash: canonical.answerKeyHash,
          minhash: sig,
          lshBands: bands,
          discriminators: canonical.discriminators,
          embeddingModel: null,
          embeddedAt: null,
          contentVersion: 1,
        });
      }

      // 2. Build 40-item batch
      const batchQuestions: Question[] = [];

      // Item 0: Unique item A
      batchQuestions.push(createDummyQuestion('batch-00', 'Unique clinical case #0 regarding pediatric coarctation of the aorta.', 'a'));

      // Item 1: Planted Bank Duplicate #1 (Exact match to bankItem1)
      batchQuestions.push(createDummyQuestion('batch-01', bankItem1.stem, 'a'));

      // Item 2: Planted Bank Duplicate #2 (Exact match to bankItem2)
      batchQuestions.push(createDummyQuestion('batch-02', bankItem2.stem, 'a'));

      // Item 3: Planted Bank Duplicate #3 (Near duplicate of bankItem3)
      batchQuestions.push(createDummyQuestion('batch-03', 'A 70-year-old male with refractory hypertension complains of severe flash pulmonary edema and bilateral renal artery bruits.', 'a'));

      // Item 4: Planted Bank Duplicate #4 (Answer conflict with bankItem4)
      batchQuestions.push(createDummyQuestion('batch-04', bankItem4.stem, 'b')); // Different correct choice!

      // Item 5: First occurrence of in-batch pair
      batchQuestions.push(createDummyQuestion('batch-05', 'A 50-year-old male with newly diagnosed diabetes mellitus presents for initial cardiovascular risk stratification.', 'a'));

      // Item 6: Planted In-Batch Duplicate #1 (Exact copy of batch-05)
      batchQuestions.push(createDummyQuestion('batch-06', 'A 50-year-old male with newly diagnosed diabetes mellitus presents for initial cardiovascular risk stratification.', 'a'));

      // Item 7: First occurrence of in-batch near pair
      batchQuestions.push(createDummyQuestion('batch-07', 'A 28-year-old pregnant patient presents with symptomatic palpitations and supraventricular tachycardia during third trimester.', 'a'));

      // Item 8: Planted In-Batch Duplicate #2 (Near copy of batch-07)
      batchQuestions.push(createDummyQuestion('batch-08', 'A 28-year-old pregnant patient presents with symptomatic palpitations and supraventricular tachycardia during third trimester of pregnancy.', 'a'));

      // Items 9 through 39: 31 completely unique questions
      for (let i = 9; i < 40; i++) {
        batchQuestions.push(
          createDummyQuestion(
            `batch-${i.toString().padStart(2, '0')}`,
            `Unique distinct clinical question vignette #${i} evaluating advanced pathophysiology topic ${i}.`,
            'a'
          )
        );
      }

      expect(batchQuestions.length).toBe(40);

      // 3. Execute checkBatch
      const result = await engine.checkBatch(batchQuestions, { kind: 'block', blockId: 'cvs' });
      expect(result.ok).toBe(true);

      if (!result.ok) return;
      const verdicts = result.value;
      expect(verdicts.length).toBe(40);

      // Verify Planted Duplicates
      // 1. batch-01 (bank duplicate 1) -> EXACT
      expect(verdicts[1].relation).toBe('EXACT');
      expect(verdicts[1].decision).toBe('BLOCK');

      // 2. batch-02 (bank duplicate 2) -> EXACT
      expect(verdicts[2].relation).toBe('EXACT');
      expect(verdicts[2].decision).toBe('BLOCK');

      // 3. batch-03 (bank duplicate 3) -> NEAR
      expect(['NEAR', 'EXACT']).toContain(verdicts[3].relation);

      // 4. batch-04 (bank duplicate 4) -> CONFLICT
      expect(verdicts[4].relation).toBe('CONFLICT');
      expect(verdicts[4].decision).toBe('REVIEW');

      // 5. batch-06 (in-batch duplicate of batch-05) -> EXACT
      expect(verdicts[6].relation).toBe('EXACT');
      expect(verdicts[6].candidates[0].matchedQuestionId).toBe('batch-05');

      // 6. batch-08 (in-batch duplicate of batch-07) -> NEAR
      expect(['NEAR', 'EXACT']).toContain(verdicts[8].relation);
      expect(verdicts[8].candidates[0].matchedQuestionId).toBe('batch-07');

      // Verify that batch-05 and batch-07 (first occurrences) remain UNIQUE!
      expect(verdicts[5].relation).toBe('UNIQUE');
      expect(verdicts[7].relation).toBe('UNIQUE');

      // Verify the other 32 items (0, 9-39) are all UNIQUE (0 false flags!)
      const uniqueIndices = [0, 5, 7, ...Array.from({ length: 31 }, (_, idx) => idx + 9)];
      expect(uniqueIndices.length).toBe(34);

      for (const uIdx of uniqueIndices) {
        expect(verdicts[uIdx].relation).toBe('UNIQUE');
        expect(verdicts[uIdx].decision).toBe('ALLOW');
      }
    });
  });

  describe('"Save all unique" Action in Store', () => {
    beforeEach(() => {
      // Mock admin auth
      useAuthStore.setState({
        authState: {
          status: 'authenticated-active',
          user: {
            id: 'admin-1',
            email: 'admin@medquests.edu',
            displayName: 'Chief Medical Editor',
            role: 'admin',
          } as any,
          session: null,
          error: null,
        } as any,
      });

      // Clear store state
      useAdminAiQuestionParserStore.getState().clearParsedQuestions();
    });

    it('filters out duplicates and commits only unique items', async () => {
      const q1 = createDummyQuestion('p-1', 'Stem 1 (Unique)');
      const q2 = createDummyQuestion('p-2', 'Stem 2 (Duplicate)');
      const q3 = createDummyQuestion('p-3', 'Stem 3 (Conflict)');
      const q4 = createDummyQuestion('p-4', 'Stem 4 (Unique)');

      // Mock createCanonicalQuestions on useBankGovernanceStore
      const createMock = vi.fn().mockResolvedValue(true);
      useBankGovernanceStore.setState({
        createCanonicalQuestions: createMock,
      } as any);

      // Set parsedQuestions with verdicts
      useAdminAiQuestionParserStore.setState({
        parsedQuestions: [
          {
            tempId: 't-1',
            rawInputExcerpt: '',
            question: q1,
            wasAnswerKeyProvidedInInput: true,
            aiGeneratedAnswerKey: false,
            selectedCorrectChoiceId: 'a',
            confidenceScore: 95,
            warnings: [],
            isApproved: true,
            qddVerdict: {
              questionId: 'p-1',
              tier: 'batch-audit',
              decision: 'ALLOW',
              relation: 'UNIQUE',
              candidates: [],
              stagesExecuted: [],
              degraded: false,
              degradedReasons: [],
              latencyMs: 1,
              engineVersion: 'qdd-engine-v2',
              thresholdsVersion: 'v1',
            },
          },
          {
            tempId: 't-2',
            rawInputExcerpt: '',
            question: q2,
            wasAnswerKeyProvidedInInput: true,
            aiGeneratedAnswerKey: false,
            selectedCorrectChoiceId: 'a',
            confidenceScore: 90,
            warnings: [],
            isApproved: true,
            qddVerdict: {
              questionId: 'p-2',
              tier: 'batch-audit',
              decision: 'BLOCK',
              relation: 'EXACT',
              candidates: [{ matchedQuestionId: 'p-1' } as any],
              stagesExecuted: [],
              degraded: false,
              degradedReasons: [],
              latencyMs: 1,
              engineVersion: 'qdd-engine-v2',
              thresholdsVersion: 'v1',
            },
          },
          {
            tempId: 't-3',
            rawInputExcerpt: '',
            question: q3,
            wasAnswerKeyProvidedInInput: true,
            aiGeneratedAnswerKey: false,
            selectedCorrectChoiceId: 'a',
            confidenceScore: 85,
            warnings: [],
            isApproved: true,
            qddVerdict: {
              questionId: 'p-3',
              tier: 'batch-audit',
              decision: 'REVIEW',
              relation: 'CONFLICT',
              candidates: [{ matchedQuestionId: 'bank-x' } as any],
              stagesExecuted: [],
              degraded: false,
              degradedReasons: [],
              latencyMs: 1,
              engineVersion: 'qdd-engine-v2',
              thresholdsVersion: 'v1',
            },
          },
          {
            tempId: 't-4',
            rawInputExcerpt: '',
            question: q4,
            wasAnswerKeyProvidedInInput: true,
            aiGeneratedAnswerKey: false,
            selectedCorrectChoiceId: 'a',
            confidenceScore: 98,
            warnings: [],
            isApproved: true,
            qddVerdict: {
              questionId: 'p-4',
              tier: 'batch-audit',
              decision: 'ALLOW',
              relation: 'UNIQUE',
              candidates: [],
              stagesExecuted: [],
              degraded: false,
              degradedReasons: [],
              latencyMs: 1,
              engineVersion: 'qdd-engine-v2',
              thresholdsVersion: 'v1',
            },
          },
        ],
      });

      const success = await useAdminAiQuestionParserStore.getState().saveAllUnique();
      expect(success).toBe(true);

      // Verify that createCanonicalQuestions was called ONLY with q1 and q4 (the 2 unique ones)
      expect(createMock).toHaveBeenCalledTimes(1);
      const committed = createMock.mock.calls[0][0];
      expect(committed.length).toBe(2);
      expect(committed.map((c: Question) => c.id)).toEqual(['p-1', 'p-4']);

      // Check feedback
      const feedback = useAdminAiQuestionParserStore.getState().commitFeedback;
      expect(feedback?.type).toBe('success');
      expect(feedback?.message).toContain('Successfully saved 2 unique questions (2 duplicate/conflict items skipped)');
    });
  });
});
