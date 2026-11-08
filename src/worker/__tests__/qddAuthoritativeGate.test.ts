/**
 * Integration Test: Authoritative QDD Gate & Worker Routes (US1)
 * Tests exact blocking, conflict alarms, near-duplicate reviews, and Zero Auto-Acceptance.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { QuestionCanonicalizerV2 } from '../../domain/questionBank/duplication/QuestionCanonicalizerV2.ts';
import { MinHasher } from '../../domain/questionBank/duplication/MinHasher.ts';
import { S1ExactStage } from '../../domain/questionBank/duplication/stages/S1Exact.ts';
import { S2LexicalLshStage } from '../../domain/questionBank/duplication/stages/S2LexicalLsh.ts';
import { S4DiscriminatorsStage } from '../../domain/questionBank/duplication/stages/S4Discriminators.ts';
import { EdgeGatePolicy } from '../../domain/questionBank/duplication/GatePolicy.ts';
import { DuplicationDetectionEngine } from '../../domain/questionBank/duplication/DuplicationDetectionEngine.ts';
import { InMemoryFingerprintRepository } from '../../infrastructure/questionBank/duplication/memory/InMemoryFingerprintRepository.ts';
import { handleQddRoutes } from '../routes/qdd.ts';
import type { Question } from '../../domain/model/types.ts';

describe('Authoritative QDD Gate (US1)', () => {
  let repo: InMemoryFingerprintRepository;
  let canonicalizer: QuestionCanonicalizerV2;
  let minHasher: MinHasher;
  let engine: DuplicationDetectionEngine;

  const publishedQuestion: Question = {
    id: 'q-published-1',
    blockId: 'cvs',
    subjectId: 'anatomy',
    chapterId: 'cvs-ana-heart',
    topicId: 'cvs-ana-valves',
    concept: 'Mitral Valve',
    type: 'single-best-answer',
    stem: 'Which papillary muscle is supplied solely by the posterior descending artery?',
    choices: [
      { id: 'a', text: 'Posteromedial papillary muscle', isCorrect: true, rationale: 'Single blood supply from PDA' },
      { id: 'b', text: 'Anterolateral papillary muscle', isCorrect: false, rationale: 'Dual blood supply from LAD and LCx' },
      { id: 'c', text: 'Septal papillary muscle', isCorrect: false, rationale: 'Tricuspid component' },
      { id: 'd', text: 'Pectinate muscle', isCorrect: false, rationale: 'Atrial wall structure' },
    ],
    explanation: 'The posteromedial papillary muscle has a solitary blood supply from the posterior descending artery.',
    examTip: 'High yield for myocardial infarction complications.',
    mnemonic: null,
    difficulty: 2,
    cognitiveLevel: 'understanding',
    highYield: true,
    origin: 'authored-grounded',
    evidence: [
      {
        chunkId: 'ch-1',
        sourceName: 'Gross Anatomy',
        location: 'Page 10',
        quote: 'Posteromedial papillary muscle is supplied solely by PDA.',
        kind: 'text',
      },
    ],
    status: 'active',
    bankVersion: 1,
  };

  beforeEach(async () => {
    repo = new InMemoryFingerprintRepository();
    canonicalizer = new QuestionCanonicalizerV2();
    minHasher = new MinHasher();

    const stages = [
      new S1ExactStage(repo),
      new S2LexicalLshStage(repo, minHasher),
      new S4DiscriminatorsStage(),
    ];
    const policy = new EdgeGatePolicy();
    engine = new DuplicationDetectionEngine(canonicalizer, stages, policy);

    // Seed the published question into the repository
    const canon = await canonicalizer.canonicalize(publishedQuestion);
    const sig = minHasher.signature(canon.shingles);
    const bandKeys = minHasher.bandKeys(sig);

    await repo.upsert({
      questionId: canon.questionId,
      blockId: canon.blockId,
      chapterId: canon.chapterId,
      normalizerVersion: canon.normalizerVersion,
      stemHash: canon.stemHash,
      itemHash: canon.itemHash,
      answerKeyHash: canon.answerKeyHash,
      minhash: sig,
      lshBands: bandKeys,
      discriminators: canon.discriminators,
      embeddingModel: null,
      embeddedAt: null,
      contentVersion: 1,
    });
  });

  // 1. Exact Duplicate Submission -> BLOCK
  it('Scenario 1: Blocks exact copy with shuffled choices (409 / BLOCK)', async () => {
    const duplicateSubmission: Question = {
      ...publishedQuestion,
      id: 'sub-new-001',
      // Permuted choices order
      choices: [
        publishedQuestion.choices[1],
        publishedQuestion.choices[0], // correct answer now in slot B
        publishedQuestion.choices[3],
        publishedQuestion.choices[2],
      ],
    };

    const result = await engine.check(duplicateSubmission, { kind: 'block', blockId: 'cvs' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.decision).toBe('BLOCK');
    expect(result.value.relation).toBe('EXACT');
    expect(result.value.candidates[0].matchedQuestionId).toBe('q-published-1');
  });

  // 2. Paraphrased Question with same key -> REVIEW / NEAR
  it('Scenario 2: Accepts clinical paraphrase with REVIEW/NEAR flag', async () => {
    const paraphraseSubmission: Question = {
      ...publishedQuestion,
      id: 'sub-new-002',
      stem: 'Which papillary muscle is supplied exclusively by the posterior descending artery?',
    };

    const result = await engine.check(paraphraseSubmission, { kind: 'block', blockId: 'cvs' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.decision).toBe('REVIEW');
    expect(result.value.relation).toBe('NEAR');
    expect(result.value.candidates[0].matchedQuestionId).toBe('q-published-1');
  });

  // 3. Contradictory Answer Key -> REVIEW / CONFLICT
  it('Scenario 3: Flags contradictory answer key as high-severity CONFLICT', async () => {
    const conflictSubmission: Question = {
      ...publishedQuestion,
      id: 'sub-new-003',
      // Same stem, but incorrectly marks Anterolateral as correct!
      choices: [
        { ...publishedQuestion.choices[0], isCorrect: false },
        { ...publishedQuestion.choices[1], isCorrect: true },
        publishedQuestion.choices[2],
        publishedQuestion.choices[3],
      ],
    };

    const result = await engine.check(conflictSubmission, { kind: 'block', blockId: 'cvs' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.decision).toBe('REVIEW');
    expect(result.value.relation).toBe('CONFLICT');
    expect(result.value.candidates[0].matchedQuestionId).toBe('q-published-1');
  });

  // 4. Clinical Variant with Negation -> INFORM / SIBLING
  it('Scenario 4: Identifies negation-inverted variant as SIBLING (does not block)', async () => {
    const siblingSubmission: Question = {
      ...publishedQuestion,
      id: 'sub-new-004',
      stem: 'Which papillary muscle is NOT solely supplied by the posterior descending artery?',
    };

    const result = await engine.check(siblingSubmission, { kind: 'block', blockId: 'cvs' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.decision).toBe('INFORM');
    expect(result.value.relation).toBe('SIBLING');
  });

  // 5. Completely Unique Question -> ALLOW (Zero Auto-Acceptance)
  it('Scenario 5: Allows unique question with ALLOW (staged for human review)', async () => {
    const uniqueSubmission: Question = {
      id: 'sub-new-005',
      blockId: 'cvs',
      subjectId: 'pharmacology',
      chapterId: 'cvs-pha-antiarrhythmics',
      topicId: 'cvs-pha-class3',
      concept: 'Amiodarone Mechanism',
      type: 'single-best-answer',
      stem: 'What is the primary electrophysiological mechanism of Class III antiarrhythmic agents?',
      choices: [
        { id: 'a', text: 'Potassium channel blockade prolonging repolarization', isCorrect: true, rationale: 'Class III action' },
        { id: 'b', text: 'Sodium channel blockade slowing conduction', isCorrect: false, rationale: 'Class I' },
        { id: 'c', text: 'Beta-adrenergic blockade', isCorrect: false, rationale: 'Class II' },
        { id: 'd', text: 'Calcium channel blockade', isCorrect: false, rationale: 'Class IV' },
      ],
      explanation: 'Class III antiarrhythmics block potassium channels, prolonging the cardiac action potential duration.',
      examTip: null,
      mnemonic: null,
      difficulty: 2,
      cognitiveLevel: 'understanding',
      highYield: true,
      origin: 'authored-grounded',
      evidence: [
        {
          chunkId: 'ph-1',
          sourceName: 'Pharmacology',
          location: 'Page 50',
          quote: 'Class III antiarrhythmics prolong action potential via K+ block.',
          kind: 'text',
        },
      ],
      status: 'active',
      bankVersion: 1,
    };

    const result = await engine.check(uniqueSubmission, { kind: 'block', blockId: 'cvs' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.decision).toBe('ALLOW');
    expect(result.value.relation).toBe('UNIQUE');
    expect(result.value.candidates).toHaveLength(0);
  });

  // 6. Test HTTP Route Handling: /api/qdd/check
  it('Scenario 6: HTTP route POST /api/qdd/check returns structured DuplicationVerdict', async () => {
    const mockDb = {
      prepare: () => ({
        bind: () => ({
          run: async () => ({ success: true }),
          all: async () => ({ results: [] }),
          first: async () => null,
        }),
      }),
    };

    const req = new Request('http://localhost/api/qdd/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: publishedQuestion,
        scope: { kind: 'block', blockId: 'cvs' },
      }),
    });

    const res = await handleQddRoutes(req, { MED_QUESTS_DB: mockDb as any }, new URL(req.url));
    expect(res).not.toBeNull();
    expect(res?.status).toBe(200);

    const data = await res?.json();
    expect(data.questionId).toBe(publishedQuestion.id);
    expect(data.decision).toBeDefined();
    expect(data.relation).toBeDefined();
    expect(data.stagesExecuted).toContain('S1_EXACT');
  });
});
