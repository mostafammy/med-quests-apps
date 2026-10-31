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
  ChiSquaredStatistic,
  ChoiceDistributionMetrics,
  ChoiceEntropyDomainError,
  ChoiceFrequencyMap,
  ChoiceProportionMap,
  DeterministicPrngSeed,
  IChoicePermutationSafetySpecification,
  IChoiceRebalancingStrategy,
  IDeterministicPrngPort,
  NormalizedShannonEntropy,
  PsychometricEntropySeverity,
  QuestionChoicePermutationDelta,
} from '../../../specs/006-psychometric-choice-entropy-and-spatial-presentation/contracts/choice-entropy-ports.ts';

export type { IDeterministicPrngPort };
import { CompositeSpecification } from './questionSpecifications.ts';

const VALID_CHOICE_SLOTS: readonly ChoiceId[] = ['a', 'b', 'c', 'd'] as const;

/**
 * 1. Pure Deterministic PRNG Implementation (Mulberry32 + 32-bit FNV-1a Hashing)
 * Honors Open/Closed and Liskov Substitution principles.
 */
export class Mulberry32DeterministicPrng implements IDeterministicPrngPort {
  /**
   * Hashes an arbitrary string into a deterministic 32-bit unsigned seed using FNV-1a.
   */
  public hashStringToSeed(seedInput: string): DeterministicPrngSeed {
    let hash = 0x811c9dc5;
    for (let i = 0; i < seedInput.length; i++) {
      hash ^= seedInput.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0) as DeterministicPrngSeed;
  }

  /**
   * Creates a stateful uniform [0, 1) float generator using the Mulberry32 algorithm.
   */
  public createGenerator(seed: DeterministicPrngSeed): () => number {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Executes an unbiased Fisher-Yates (Knuth) shuffle on an immutable array.
   */
  public shuffle<T>(items: readonly T[], seedInput: string): readonly T[] {
    const array = [...items];
    const rng = this.createGenerator(this.hashStringToSeed(seedInput));
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const temp = array[i]!;
      array[i] = array[j]!;
      array[j] = temp;
    }
    return array;
  }
}

/**
 * 2. Specification Pattern: Validates that questions do not contain hardcoded
 * option letters (e.g. "Option A", "Choice B") or positional phrases
 * ("All of the above", "None of the below") that break when permuted.
 */
export class ChoicePermutationSafetySpecification
  extends CompositeSpecification<Question>
  implements IChoicePermutationSafetySpecification
{
  private static readonly FORBIDDEN_LETTER_PATTERN =
    /\b(?:option|choice|letter)\s+[a-d]\b/i;

  private static readonly FORBIDDEN_POSITION_PATTERN =
    /\b(?:all|both|none)\s+of\s+the\s+(?:above|below)\b/i;

  public isSatisfiedBy(candidate: Question): boolean {
    return this.inspectViolations(candidate).length === 0;
  }

  public inspectViolations(question: Question): readonly ChoiceEntropyDomainError[] {
    const errors: ChoiceEntropyDomainError[] = [];

    const checkField = (
      text: string | null | undefined,
      fieldPath: 'stem' | 'explanation' | 'examTip' | 'mnemonic'
    ) => {
      if (!text) return;
      const match =
        text.match(ChoicePermutationSafetySpecification.FORBIDDEN_LETTER_PATTERN) ||
        text.match(ChoicePermutationSafetySpecification.FORBIDDEN_POSITION_PATTERN);
      if (match) {
        errors.push({
          code: 'HARDCODED_LETTER_REFERENCE_IN_TEXT',
          questionId: question.id,
          fieldPath,
          matchedToken: match[0],
          message: `Question '${question.id}' contains positional reference "${match[0]}" in ${fieldPath}.`,
        });
      }
    };

    checkField(question.stem, 'stem');
    checkField(question.explanation, 'explanation');
    checkField(question.examTip, 'examTip');
    checkField(question.mnemonic, 'mnemonic');

    for (const choice of question.choices || []) {
      if (choice.text) {
        const match =
          choice.text.match(ChoicePermutationSafetySpecification.FORBIDDEN_LETTER_PATTERN) ||
          choice.text.match(ChoicePermutationSafetySpecification.FORBIDDEN_POSITION_PATTERN);
        if (match) {
          errors.push({
            code: 'HARDCODED_LETTER_REFERENCE_IN_TEXT',
            questionId: question.id,
            fieldPath: `choices.${choice.id as ChoiceId}.rationale`,
            matchedToken: match[0],
            message: `Question '${question.id}' choice '${choice.id}' contains positional reference "${match[0]}" in text.`,
          });
        }
      }

      if (choice.rationale) {
        const match =
          choice.rationale.match(ChoicePermutationSafetySpecification.FORBIDDEN_LETTER_PATTERN) ||
          choice.rationale.match(ChoicePermutationSafetySpecification.FORBIDDEN_POSITION_PATTERN);
        if (match) {
          errors.push({
            code: 'HARDCODED_LETTER_REFERENCE_IN_TEXT',
            questionId: question.id,
            fieldPath: `choices.${choice.id as ChoiceId}.rationale`,
            matchedToken: match[0],
            message: `Question '${question.id}' choice '${choice.id}' contains positional reference "${match[0]}" in rationale.`,
          });
        }
      }
    }

    return errors;
  }
}

/**
 * 3. Domain Service / Value Object Factory: Computes Chi-Squared goodness-of-fit,
 * Shannon Entropy, proportions, and psychometric severity for question collections.
 */
export class ChoiceDistributionAnalyzer {
  /**
   * Analyzes a collection of questions and computes full distribution metrics.
   */
  public static analyze(
    questions: readonly Pick<Question, 'choices'>[]
  ): ChoiceDistributionMetrics {
    const counts: Record<ChoiceId, number> = { a: 0, b: 0, c: 0, d: 0 };
    let totalQuestions = 0;

    for (const q of questions) {
      const correctChoice = (q.choices || []).find((c) => c.isCorrect);
      if (correctChoice && counts[correctChoice.id as ChoiceId] !== undefined) {
        counts[correctChoice.id as ChoiceId]++;
        totalQuestions++;
      }
    }

    const expectedCountPerSlot = totalQuestions > 0 ? totalQuestions / 4 : 0;
    const proportions: Record<ChoiceId, number> = { a: 0, b: 0, c: 0, d: 0 };

    for (const slot of VALID_CHOICE_SLOTS) {
      proportions[slot] = totalQuestions > 0 ? counts[slot] / totalQuestions : 0;
    }

    // Pearson's Chi-Squared (df = 3)
    let chiSquaredSum = 0;
    if (expectedCountPerSlot > 0) {
      for (const slot of VALID_CHOICE_SLOTS) {
        const diff = counts[slot] - expectedCountPerSlot;
        chiSquaredSum += (diff * diff) / expectedCountPerSlot;
      }
    }
    const chiSquared = chiSquaredSum as ChiSquaredStatistic;

    // Approximate p-value for df = 3 using regularized chi-squared CDF
    const pValueApprox = this.approximateChiSquaredPValue(chiSquaredSum, 3);

    // Normalized Shannon Entropy (H_norm in [0, 1] relative to max 2.0 bits)
    let entropyBits = 0;
    for (const slot of VALID_CHOICE_SLOTS) {
      const p = proportions[slot];
      if (p > 0) {
        entropyBits -= p * Math.log2(p);
      }
    }
    const normalizedEntropy = Math.min(
      1.0,
      Math.max(0.0, entropyBits / 2.0)
    ) as NormalizedShannonEntropy;

    // Identify dominant choice
    let dominantChoiceId: ChoiceId = 'a';
    let dominantProportion = 0;
    for (const slot of VALID_CHOICE_SLOTS) {
      if (proportions[slot] > dominantProportion) {
        dominantProportion = proportions[slot];
        dominantChoiceId = slot;
      }
    }

    const combinedAbProportion = proportions.a + proportions.b;

    // Severity assessment
    let severity: PsychometricEntropySeverity = 'optimal_uniform';
    let diagnosticMessage = 'Choice distribution conforms to optimal uniform psychometric standards.';

    if (totalQuestions < 8) {
      severity = 'insufficient_sample';
      diagnosticMessage = `Sample size (${totalQuestions}) is too small for statistical significance.`;
    } else if (dominantProportion > 0.35 || combinedAbProportion > 0.65 || chiSquaredSum >= 11.345) {
      severity = 'critical_skew';
      diagnosticMessage = `Severe choice skew detected: Choice '${dominantChoiceId.toUpperCase()}' represents ${(dominantProportion * 100).toFixed(1)}% (A+B combined: ${(combinedAbProportion * 100).toFixed(1)}%, χ²=${chiSquaredSum.toFixed(2)}, p=${pValueApprox.toExponential(2)}).`;
    } else if (dominantProportion > 0.30 || chiSquaredSum >= 7.815) {
      severity = 'mild_drift';
      diagnosticMessage = `Mild choice position drift detected: Choice '${dominantChoiceId.toUpperCase()}' represents ${(dominantProportion * 100).toFixed(1)}% (χ²=${chiSquaredSum.toFixed(2)}).`;
    }

    const isPsychometricallyBalanced =
      severity === 'optimal_uniform' || (severity === 'insufficient_sample' && dominantProportion <= 0.4);

    return {
      totalQuestions,
      counts: counts as ChoiceFrequencyMap,
      proportions: proportions as ChoiceProportionMap,
      expectedCountPerSlot,
      chiSquared,
      pValueApprox,
      normalizedEntropy,
      dominantChoiceId,
      dominantProportion,
      combinedAbProportion,
      severity,
      isPsychometricallyBalanced,
      diagnosticMessage,
    };
  }

  /**
   * Calculates an approximate p-value for the chi-squared distribution with degrees of freedom df.
   * For df = 3: p = 2 * (1 - normalCdf(sqrt(x))) + sqrt(2/pi) * sqrt(x) * exp(-x/2)
   */
  private static approximateChiSquaredPValue(chiSq: number, df: number): number {
    if (chiSq <= 0) return 1.0;
    if (df === 3) {
      const z = Math.sqrt(chiSq);
      const normalCdf = (t: number) => {
        // Abramowitz and Stegun approximation
        const p = 0.2316419;
        const b1 = 0.31938153;
        const b2 = -0.356563782;
        const b3 = 1.781477937;
        const b4 = -1.821255978;
        const b5 = 1.330274429;
        const x = Math.abs(t);
        const k = 1.0 / (1.0 + p * x);
        const poly = k * (b1 + k * (b2 + k * (b3 + k * (b4 + k * b5))));
        const pdf = (1.0 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
        const cdf = 1.0 - pdf * poly;
        return t >= 0 ? cdf : 1.0 - cdf;
      };

      const tailProb =
        2.0 * (1.0 - normalCdf(z)) +
        Math.sqrt(2.0 / Math.PI) * z * Math.exp(-0.5 * chiSq);
      return Math.min(1.0, Math.max(0.0, tailProb));
    }

    // Fallback exponential approximation
    return Math.exp(-0.5 * chiSq);
  }
}

/**
 * 4. Stratified Canonical Rebalancing Strategy:
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
