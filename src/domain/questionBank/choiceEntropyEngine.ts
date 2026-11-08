/**
 * Domain Service: Psychometric Choice Entropy Engine & Stratified Canonical Rebalancer
 * Feature: 006-psychometric-choice-entropy-and-spatial-presentation
 * Layer: Domain (Pure OOP, Zero I/O, Deterministic PRNG, SOLID Principles)
 */

import { ok, err, type Result } from '../shared/result.ts';
import type {
  Choice,
  ChoiceId,
  Question,
  QuestionId,
} from '../model/types.ts';
import type {
  BankRebalanceReport,
  ChoiceEntropyDomainError,
  IChoicePermutationSafetySpecification,
  IChoiceRebalancingStrategy,
  IDeterministicPrngPort,
  QuestionChoicePermutationDelta,
} from '../../../specs/006-psychometric-choice-entropy-and-spatial-presentation/contracts/choice-entropy-ports.ts';

import { Mulberry32DeterministicPrng } from './entropy/Mulberry32DeterministicPrng.ts';
import { ChoicePermutationSafetySpecification } from './entropy/ChoicePermutationSafetySpecification.ts';
import {
  ChoiceDistributionAnalyzer,
  VALID_CHOICE_SLOTS,
} from './entropy/ChoiceDistributionAnalyzer.ts';

export type { IDeterministicPrngPort };
export { Mulberry32DeterministicPrng };
export { ChoicePermutationSafetySpecification };
export { ChoiceDistributionAnalyzer };

/**
 * Stratified Canonical Rebalancing Strategy:
 * Permutes choices within each question such that:
 *  - Global distribution reaches exact 1:1:1:1 (25% each for a, b, c, d).
 *  - Every chapter is stratified so its choices are balanced (<= 1 count difference).
 *  - Choice IDs ('a', 'b', 'c', 'd') are cleanly re-keyed in array order.
 *  - Each choice retains its own text, isCorrect flag, and rationale.
 */
export class StratifiedCanonicalRebalancingStrategy implements IChoiceRebalancingStrategy {
  public readonly strategyId = 'STRATIFIED_CHAPTER_ROUND_ROBIN';

  public constructor(
    private readonly prng: IDeterministicPrngPort = new Mulberry32DeterministicPrng(),
    private readonly safetySpec: IChoicePermutationSafetySpecification = new ChoicePermutationSafetySpecification()
  ) {}

  public rebalance<T extends Question>(
    questions: readonly T[],
    seedInput = 'medquests-canonical-stratified-v2'
  ): Result<BankRebalanceReport<T>, ChoiceEntropyDomainError> {
    const beforeMetrics = ChoiceDistributionAnalyzer.analyze(questions);
    const unsafeQuestionIds: QuestionId[] = [];

    // Pre-flight check: ensure no questions contain hardcoded letter references
    for (const q of questions) {
      if (!this.safetySpec.isSatisfiedBy(q)) {
        unsafeQuestionIds.push(q.id);
      }
    }

    if (unsafeQuestionIds.length > 0) {
      const firstUnsafe = questions.find((q) => q.id === unsafeQuestionIds[0])!;
      const violations = this.safetySpec.inspectViolations(firstUnsafe);
      return err(violations[0] || {
        code: 'SCHEMA_VALIDATION_FAILED',
        itemIndex: 0,
        fieldPath: 'choices',
        message: `Questions contain hardcoded choice letters preventing safe rebalancing.`,
      });
    }

    const totalQuestions = questions.length;
    if (totalQuestions === 0) {
      return ok({
        questions: [],
        beforeMetrics,
        afterMetrics: beforeMetrics,
        deltas: [],
        totalPermutedCount: 0,
        UnsafeHardcodedReferenceQuestionIds: [],
      });
    }

    // 1. Target global quotas
    const baseQuota = Math.floor(totalQuestions / 4);
    const remainder = totalQuestions % 4;
    const globalTargetQuota: Record<ChoiceId, number> = {
      a: baseQuota,
      b: baseQuota,
      c: baseQuota,
      d: baseQuota,
    };
    for (let i = 0; i < remainder; i++) {
      globalTargetQuota[VALID_CHOICE_SLOTS[i]!]++;
    }

    // 2. Group questions by chapterId (or subjectId)
    const chapterMap = new Map<string, T[]>();
    for (const q of questions) {
      const groupKey = q.chapterId || q.subjectId || 'default-chapter';
      if (!chapterMap.has(groupKey)) {
        chapterMap.set(groupKey, []);
      }
      chapterMap.get(groupKey)!.push(q);
    }

    // 3. Stratified allocation:
    // Pass 1: Give floor(chapterSize / 4) to each slot in the chapter
    const targetSlotAssignment = new Map<QuestionId, ChoiceId>();
    const allocatedCounts: Record<ChoiceId, number> = { a: 0, b: 0, c: 0, d: 0 };
    const remainderPool: { chapterKey: string; question: T }[] = [];

    for (const [groupKey, groupQuestions] of chapterMap.entries()) {
      const k = groupQuestions.length;
      const base = Math.floor(k / 4);

      // Deterministically shuffle slot distribution order for this chapter
      const shuffledBaseSlots = this.prng.shuffle(
        [...VALID_CHOICE_SLOTS],
        `${seedInput}:${groupKey}:base-slots`
      );

      for (let sIdx = 0; sIdx < VALID_CHOICE_SLOTS.length; sIdx++) {
        const slot = shuffledBaseSlots[sIdx]!;
        for (let b = 0; b < base; b++) {
          const q = groupQuestions[sIdx * base + b]!;
          targetSlotAssignment.set(q.id, slot);
          allocatedCounts[slot]++;
        }
      }

      // Remainder questions of this chapter
      for (let r = base * 4; r < k; r++) {
        remainderPool.push({ chapterKey: groupKey, question: groupQuestions[r]! });
      }
    }

    // Pass 2: Distribute deficit pool across remainder questions
    const deficitSlots: ChoiceId[] = [];
    for (const slot of VALID_CHOICE_SLOTS) {
      const deficit = globalTargetQuota[slot] - allocatedCounts[slot];
      for (let d = 0; d < deficit; d++) {
        deficitSlots.push(slot);
      }
    }

    const shuffledDeficit = this.prng.shuffle(
      deficitSlots,
      `${seedInput}:deficit-slots`
    );

    remainderPool.forEach((item, index) => {
      const assignedSlot = shuffledDeficit[index]!;
      targetSlotAssignment.set(item.question.id, assignedSlot);
    });

    // 4. Transform questions: place correct choice in assigned slot, re-key IDs 'a'..'d'
    const deltas: QuestionChoicePermutationDelta[] = [];
    let totalPermutedCount = 0;

    const rebalancedQuestions: T[] = questions.map((originalQuestion) => {
      const assignedSlot = targetSlotAssignment.get(originalQuestion.id) || 'a';
      const assignedIndex = VALID_CHOICE_SLOTS.indexOf(assignedSlot);

      const oldChoices = originalQuestion.choices || [];
      const previousCorrectChoice = oldChoices.find((c) => c.isCorrect);
      const previousCorrectSlot = (previousCorrectChoice?.id || 'a') as ChoiceId;

      const wasPermuted = previousCorrectSlot !== assignedSlot;
      if (wasPermuted) totalPermutedCount++;

      deltas.push({
        questionId: originalQuestion.id,
        previousCorrectChoiceId: previousCorrectSlot,
        nextCorrectChoiceId: assignedSlot,
        wasPermuted,
      });

      // Isolate correct choice and distractors
      const correctChoice = oldChoices.find((c) => c.isCorrect) || oldChoices[0]!;
      const distractors = oldChoices.filter((c) => c !== correctChoice);

      // Deterministically shuffle distractors so their relative order is stable
      const shuffledDistractors = this.prng.shuffle(
        distractors,
        `${seedInput}:${originalQuestion.id}:distractors`
      );

      // Build new choices array with correctChoice at assignedIndex
      const newChoices: Choice[] = [];
      let distractorIdx = 0;
      for (let i = 0; i < 4; i++) {
        const slotId = VALID_CHOICE_SLOTS[i]!;
        if (i === assignedIndex) {
          newChoices.push({
            id: slotId,
            text: correctChoice.text,
            isCorrect: true,
            rationale: correctChoice.rationale,
          });
        } else {
          const distractor = shuffledDistractors[distractorIdx++] || {
            text: 'Distractor',
            isCorrect: false,
            rationale: 'Distractor rationale',
          };
          newChoices.push({
            id: slotId,
            text: distractor.text,
            isCorrect: false,
            rationale: distractor.rationale,
          });
        }
      }

      return {
        ...originalQuestion,
        choices: newChoices,
      };
    });

    const afterMetrics = ChoiceDistributionAnalyzer.analyze(rebalancedQuestions);

    return ok({
      questions: rebalancedQuestions,
      beforeMetrics,
      afterMetrics,
      deltas,
      totalPermutedCount,
      UnsafeHardcodedReferenceQuestionIds: unsafeQuestionIds,
    });
  }
}
