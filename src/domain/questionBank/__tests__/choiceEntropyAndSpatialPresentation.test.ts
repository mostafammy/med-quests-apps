/**
 * Comprehensive Vitest Suite: Psychometric Choice Entropy, Stratified Canonical Rebalancer & Spatial Choice Presenter
 * Feature: 006-psychometric-choice-entropy-and-spatial-presentation
 */

import { describe, it, expect } from 'vitest';
import type { Question, ChoiceId } from '../../model/types.ts';
import defaultCvsBank from '../../../../content/cvs/dist/bank.v1.json';
import {
  Mulberry32DeterministicPrng,
  ChoicePermutationSafetySpecification,
  ChoiceDistributionAnalyzer,
  StratifiedCanonicalRebalancingStrategy,
} from '../choiceEntropyEngine.ts';
import {
  SessionSeededSpatialPresentationStrategy,
  CanonicalOrderPresentationStrategy,
} from '../spatialChoicePresenter.ts';
import { QuestionQualityGatePipeline } from '../qualityGatePipeline.ts';

describe('Choice Entropy & Spatial Presentation Engine (SPEC-006)', () => {
  const prng = new Mulberry32DeterministicPrng();
  const safetySpec = new ChoicePermutationSafetySpecification();
  const rebalancingStrategy = new StratifiedCanonicalRebalancingStrategy(prng, safetySpec);

  describe('1. Deterministic PRNG & Hashing (Mulberry32 + FNV-1a)', () => {
    it('produces identical seeds for identical string inputs', () => {
      const seed1 = prng.hashStringToSeed('cvs-session-12345:q-001');
      const seed2 = prng.hashStringToSeed('cvs-session-12345:q-001');
      const seed3 = prng.hashStringToSeed('cvs-session-12345:q-002');

      expect(seed1).toBe(seed2);
      expect(seed1).not.toBe(seed3);
    });

    it('generates uniform floats in [0, 1) deterministically', () => {
      const seed = prng.hashStringToSeed('test-seed-42');
      const rng1 = prng.createGenerator(seed);
      const rng2 = prng.createGenerator(seed);

      const seq1 = [rng1(), rng1(), rng1(), rng1(), rng1()];
      const seq2 = [rng2(), rng2(), rng2(), rng2(), rng2()];

      expect(seq1).toEqual(seq2);
      seq1.forEach((val) => {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      });
    });

    it('performs an unbiased, pure Fisher-Yates shuffle without mutating source', () => {
      const source = Object.freeze(['a', 'b', 'c', 'd']);
      const shuffled1 = prng.shuffle(source, 'shuffle-seed-alpha');
      const shuffled2 = prng.shuffle(source, 'shuffle-seed-alpha');
      const shuffled3 = prng.shuffle(source, 'shuffle-seed-beta');

      expect(shuffled1).toEqual(shuffled2);
      expect(shuffled1).toHaveLength(4);
      expect(new Set(shuffled1)).toEqual(new Set(source));
      // Source remained unmutated
      expect(source).toEqual(['a', 'b', 'c', 'd']);
      // Different seed produces different permutation
      expect(shuffled1).not.toEqual(shuffled3);
    });
  });

  describe('2. Safety Specification (No Hardcoded Choice Letters)', () => {
    it('approves questions with conceptual, position-independent text', () => {
      const safeQuestion: Question = {
        id: 'q-safe-001',
        blockId: 'cvs',
        subjectId: 'anatomy',
        chapterId: 'cvs-ana-heart-dev',
        topicId: 'cvs-ana-congenital-heart-anomalies',
        concept: 'Atrial Septal Defect',
        type: 'single-best-answer',
        stem: 'A 4-year-old child presents with fixed splitting of S2.',
        choices: [
          { id: 'a', text: 'Ostium secundum defect', isCorrect: true, rationale: 'Most common interatrial communication.' },
          { id: 'b', text: 'Endocardial cushion defect', isCorrect: false, rationale: 'Associated with Trisomy 21 ostium primum.' },
          { id: 'c', text: 'Neural crest failure', isCorrect: false, rationale: 'Causes truncus arteriosus defects.' },
          { id: 'd', text: 'Premature foramen ovale closure', isCorrect: false, rationale: 'Leads to hypoplastic left heart.' },
        ],
        explanation: 'Ostium secundum is characterized by fixed splitting of S2.',
        examTip: null,
        mnemonic: null,
        difficulty: 2,
        cognitiveLevel: 'understanding',
        highYield: true,
        origin: 'authored-grounded',
        evidence: [{ chunkId: 'c1', sourceName: 'Langman', location: 'p.192', quote: 'Ostium secundum defect...', kind: 'text' }],
        status: 'active',
        bankVersion: 1,
      };

      expect(safetySpec.isSatisfiedBy(safeQuestion)).toBe(true);
      expect(safetySpec.inspectViolations(safeQuestion)).toHaveLength(0);
    });

    it('detects and rejects positional phrases like "Option A" or "All of the above"', () => {
      const unsafeQuestion: Question = {
        id: 'q-unsafe-001',
        blockId: 'cvs',
        subjectId: 'anatomy',
        chapterId: 'cvs-ana-heart-dev',
        topicId: 'cvs-ana-congenital-heart-anomalies',
        concept: 'Bad references',
        type: 'single-best-answer',
        stem: 'Which choice is correct as stated in Option A?',
        choices: [
          { id: 'a', text: 'Some text', isCorrect: true, rationale: 'Option A is correct because of physiology.' },
          { id: 'b', text: 'Other text', isCorrect: false, rationale: 'Incorrect choice.' },
          { id: 'c', text: 'Another text', isCorrect: false, rationale: 'Incorrect choice.' },
          { id: 'd', text: 'All of the above', isCorrect: false, rationale: 'Incorrect.' },
        ],
        explanation: 'As described in Choice B, physiology shows this.',
        examTip: null,
        mnemonic: null,
        difficulty: 2,
        cognitiveLevel: 'understanding',
        highYield: true,
        origin: 'authored-grounded',
        evidence: [{ chunkId: 'c1', sourceName: 'Langman', location: 'p.192', quote: 'Ostium secundum defect...', kind: 'text' }],
        status: 'active',
        bankVersion: 1,
      };

      expect(safetySpec.isSatisfiedBy(unsafeQuestion)).toBe(false);
      const violations = safetySpec.inspectViolations(unsafeQuestion);
      expect(violations.length).toBeGreaterThanOrEqual(3);
      expect(violations.some((v) => 'matchedToken' in v && v.matchedToken.toLowerCase().includes('option a'))).toBe(true);
      expect(violations.some((v) => 'matchedToken' in v && v.matchedToken.toLowerCase().includes('all of the above'))).toBe(true);
    });
  });

  describe('3. Choice Distribution Analyzer (Chi-Squared & Shannon Entropy)', () => {
    it('correctly classifies a balanced 1:1:1:1 bank as optimal uniform', () => {
      const mockBalanced: Pick<Question, 'choices'>[] = [];
      const slots: ChoiceId[] = ['a', 'b', 'c', 'd'];
      for (let i = 0; i < 40; i++) {
        const correctSlot = slots[i % 4]!;
        mockBalanced.push({
          choices: slots.map((s) => ({
            id: s,
            text: `Choice ${s}`,
            isCorrect: s === correctSlot,
            rationale: `Rationale ${s}`,
          })),
        });
      }

      const metrics = ChoiceDistributionAnalyzer.analyze(mockBalanced);
      expect(metrics.totalQuestions).toBe(40);
      expect(metrics.counts).toEqual({ a: 10, b: 10, c: 10, d: 10 });
      expect(metrics.proportions).toEqual({ a: 0.25, b: 0.25, c: 0.25, d: 0.25 });
      expect(metrics.chiSquared).toBe(0);
      expect(metrics.normalizedEntropy).toBeCloseTo(1.0, 4);
      expect(metrics.severity).toBe('optimal_uniform');
      expect(metrics.isPsychometricallyBalanced).toBe(true);
    });

    it('identifies critical skew when A and B dominate (like the pre-fix bank)', () => {
      const mockSkewed: Pick<Question, 'choices'>[] = [];
      const slots: ChoiceId[] = ['a', 'b', 'c', 'd'];
      // 50 'a', 30 'b', 10 'c', 10 'd' (total 100)
      const slotSequence: ChoiceId[] = [
        ...Array(50).fill('a'),
        ...Array(30).fill('b'),
        ...Array(10).fill('c'),
        ...Array(10).fill('d'),
      ];

      for (const correctSlot of slotSequence) {
        mockSkewed.push({
          choices: slots.map((s) => ({
            id: s,
            text: `Choice ${s}`,
            isCorrect: s === correctSlot,
            rationale: `Rationale ${s}`,
          })),
        });
      }

      const metrics = ChoiceDistributionAnalyzer.analyze(mockSkewed);
      expect(metrics.totalQuestions).toBe(100);
      expect(metrics.proportions.a).toBe(0.5);
      expect(metrics.combinedAbProportion).toBe(0.8);
      expect(metrics.chiSquared).toBeGreaterThan(11.345);
      expect(metrics.severity).toBe('critical_skew');
      expect(metrics.isPsychometricallyBalanced).toBe(false);
    });
  });

  describe('4. Stratified Canonical Rebalancing & Production Bank Verification', () => {
    it('verifies the canonical bank achieves exact 53 a / 53 b / 53 c / 53 d across chapters with bankVersion: 2', () => {
      const canonicalBank = defaultCvsBank as Question[];
      expect(canonicalBank.length).toBe(212);

      const metrics = ChoiceDistributionAnalyzer.analyze(canonicalBank);
      expect(metrics.totalQuestions).toBe(212);
      expect(metrics.counts).toEqual({ a: 53, b: 53, c: 53, d: 53 });
      expect(metrics.proportions).toEqual({ a: 0.25, b: 0.25, c: 0.25, d: 0.25 });
      expect(metrics.chiSquared).toBe(0);
      expect(metrics.normalizedEntropy).toBeCloseTo(1.0, 4);
      expect(metrics.severity).toBe('optimal_uniform');
      expect(metrics.isPsychometricallyBalanced).toBe(true);

      // Verify each individual question invariant:
      // Exactly 1 correct choice, IDs are 'a', 'b', 'c', 'd' in order, bankVersion is 2
      for (const q of canonicalBank) {
        expect(q.bankVersion).toBe(2);
        expect(q.choices).toHaveLength(4);
        expect(q.choices.map((c) => c.id)).toEqual(['a', 'b', 'c', 'd']);
        const correctChoices = q.choices.filter((c) => c.isCorrect);
        expect(correctChoices).toHaveLength(1);
        expect(correctChoices[0]!.rationale.length).toBeGreaterThanOrEqual(5);
      }

      // Check chapter-level stratification: every chapter has <= 2 variance between slots
      const chapterGroups = new Map<string, Question[]>();
      for (const q of canonicalBank) {
        const ch = q.chapterId;
        if (!chapterGroups.has(ch)) chapterGroups.set(ch, []);
        chapterGroups.get(ch)!.push(q);
      }

      for (const [ch, chQuestions] of chapterGroups.entries()) {
        const counts = { a: 0, b: 0, c: 0, d: 0 };
        for (const q of chQuestions) {
          const c = q.choices.find((chChoice) => chChoice.isCorrect)!;
          counts[c.id as ChoiceId]++;
        }
        const minCount = Math.min(...Object.values(counts));
        const maxCount = Math.max(...Object.values(counts));
        expect(maxCount - minCount, `Chapter ${ch} should be balanced`).toBeLessThanOrEqual(2);
      }
    });

    it('rebalances an arbitrary skewed batch into an exact uniform distribution', () => {
      const mockSkewed: Question[] = [];
      const slots: ChoiceId[] = ['a', 'b', 'c', 'd'];
      // 40 'a', 30 'b', 20 'c', 10 'd' (total 100 questions)
      const slotSequence: ChoiceId[] = [
        ...Array(40).fill('a'),
        ...Array(30).fill('b'),
        ...Array(20).fill('c'),
        ...Array(10).fill('d'),
      ];

      slotSequence.forEach((targetCorrect, index) => {
        mockSkewed.push({
          id: `q-mock-${index}`,
          blockId: 'cvs',
          subjectId: 'anatomy',
          chapterId: `chapter-${index % 4}`,
          topicId: 'topic-1',
          concept: 'Test concept',
          type: 'single-best-answer',
          stem: `Clinical stem for question ${index}`,
          choices: slots.map((s) => ({
            id: s,
            text: `Clinical distractor statement ${s} describing mechanism`,
            isCorrect: s === targetCorrect,
            rationale: `Detailed rationale for item ${s} explaining physiological mechanisms.`,
          })),
          explanation: `Clinical explanation for item ${index}.`,
          examTip: null,
          mnemonic: null,
          difficulty: 2,
          cognitiveLevel: 'understanding',
          highYield: true,
          origin: 'authored-grounded',
          evidence: [{ chunkId: 'c1', sourceName: 'Langman', location: 'p.1', quote: 'Evidence quote here', kind: 'text' }],
          status: 'active',
          bankVersion: 1,
        });
      });

      const rebalanceResult = rebalancingStrategy.rebalance(mockSkewed, 'seed-unit-test-100');
      expect(rebalanceResult.ok).toBe(true);
      if (!rebalanceResult.ok) return;

      const { beforeMetrics, afterMetrics, questions: balancedQuestions } = rebalanceResult.value;
      expect(beforeMetrics.counts.a).toBe(40);
      expect(beforeMetrics.severity).toBe('critical_skew');

      expect(afterMetrics.counts).toEqual({ a: 25, b: 25, c: 25, d: 25 });
      expect(afterMetrics.chiSquared).toBe(0);
      expect(afterMetrics.normalizedEntropy).toBeCloseTo(1.0, 4);
      expect(afterMetrics.severity).toBe('optimal_uniform');
      expect(balancedQuestions).toHaveLength(100);
    });
  });

  describe('5. Spatial Choice Presentation Strategy & Keyboard Decoupling', () => {
    const spatialPresenter = new SessionSeededSpatialPresentationStrategy(prng);
    const canonicalPresenter = new CanonicalOrderPresentationStrategy();

    const sampleQuestion: Question = {
      id: 'q-cvs-ana-001',
      blockId: 'cvs',
      subjectId: 'anatomy',
      chapterId: 'cvs-ana-heart-dev',
      topicId: 'cvs-ana-heart-tube-folding',
      concept: 'Primitive Heart Tube',
      type: 'single-best-answer',
      stem: 'Which sequence is craniocaudal?',
      choices: [
        { id: 'a', text: 'Option A (Wrong)', isCorrect: false, rationale: 'Wrong' },
        { id: 'b', text: 'Option B (Correct)', isCorrect: true, rationale: 'Correct' },
        { id: 'c', text: 'Option C (Wrong)', isCorrect: false, rationale: 'Wrong' },
        { id: 'd', text: 'Option D (Wrong)', isCorrect: false, rationale: 'Wrong' },
      ],
      explanation: 'Explanation text',
      examTip: null,
      mnemonic: null,
      difficulty: 2,
      cognitiveLevel: 'understanding',
      highYield: true,
      origin: 'authored-grounded',
      evidence: [{ chunkId: 'c1', sourceName: 'Langman', location: 'p.1', quote: 'Truncus...', kind: 'text' }],
      status: 'active',
      bankVersion: 2,
    };

    it('guarantees intra-session idempotence (0ms layout shifts on back/next)', () => {
      const sessionId = 'session-uuid-101';
      const presentation1 = spatialPresenter.projectChoices(sampleQuestion, sessionId);
      const presentation2 = spatialPresenter.projectChoices(sampleQuestion, sessionId);

      expect(presentation1).toEqual(presentation2);
      expect(presentation1).toHaveLength(4);
      expect(presentation1.map((p) => p.visualBadgeLetter)).toEqual(['A', 'B', 'C', 'D']);
      expect(presentation1.map((p) => p.keyboardShortcutDigit)).toEqual(['1', '2', '3', '4']);
    });

    it('provides different spatial orders across different test sessions', () => {
      const p1 = spatialPresenter.projectChoices(sampleQuestion, 'session-attempt-1');
      const p2 = spatialPresenter.projectChoices(sampleQuestion, 'session-attempt-2');

      const ids1 = p1.map((p) => p.canonicalChoiceId);
      const ids2 = p2.map((p) => p.canonicalChoiceId);

      // At least one choice is placed in a different slot across sessions
      const isIdentical = ids1.every((id, idx) => id === ids2[idx]);
      // Run over a few seeds if first is coincidentally same
      if (isIdentical) {
        const p3 = spatialPresenter.projectChoices(sampleQuestion, 'session-attempt-3');
        const ids3 = p3.map((p) => p.canonicalChoiceId);
        expect(ids1.every((id, idx) => id === ids3[idx])).toBe(false);
      } else {
        expect(isIdentical).toBe(false);
      }
    });

    it('correctly resolves spatial keyboard shortcuts (1..4) to underlying canonical ChoiceIds', () => {
      const presented = spatialPresenter.projectChoices(sampleQuestion, 'test-session-key-map');

      // Key '1' must select whatever choice is in visual slot 0
      const choiceForSlot0 = spatialPresenter.resolveCanonicalChoiceIdBySlot(presented, 0);
      expect(choiceForSlot0).toBe(presented[0]!.canonicalChoiceId);

      // Key '2' must select whatever choice is in visual slot 1
      const choiceForSlot1 = spatialPresenter.resolveCanonicalChoiceIdBySlot(presented, 1);
      expect(choiceForSlot1).toBe(presented[1]!.canonicalChoiceId);

      // Key '3' must select whatever choice is in visual slot 2
      const choiceForSlot2 = spatialPresenter.resolveCanonicalChoiceIdBySlot(presented, 2);
      expect(choiceForSlot2).toBe(presented[2]!.canonicalChoiceId);

      // Key '4' must select whatever choice is in visual slot 3
      const choiceForSlot3 = spatialPresenter.resolveCanonicalChoiceIdBySlot(presented, 3);
      expect(choiceForSlot3).toBe(presented[3]!.canonicalChoiceId);
    });

    it('supports canonical order mode without shuffling', () => {
      const canonicalPresentation = canonicalPresenter.projectChoices(sampleQuestion);
      expect(canonicalPresentation.map((p) => p.canonicalChoiceId)).toEqual(['a', 'b', 'c', 'd']);
      expect(canonicalPresentation.map((p) => p.visualBadgeLetter)).toEqual(['A', 'B', 'C', 'D']);
    });
  });

  describe('6. Quality Gate Pipeline Integration', () => {
    it('pipeline includes NoHardcodedChoiceLetterReferenceRule and returns choice distribution metrics', () => {
      const pipeline = new QuestionQualityGatePipeline();
      const rawBank = defaultCvsBank as Question[];

      const batchResult = pipeline.validateBatch(rawBank.slice(0, 10));
      expect(batchResult.errors).toHaveLength(0);
      expect(batchResult.validQuestions).toHaveLength(10);
      expect(batchResult.choiceMetrics).toBeDefined();
      expect(batchResult.choiceMetrics.totalQuestions).toBe(10);
    });
  });
});
