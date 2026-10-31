/**
 * Clean Architecture Domain Ports, OOP Contracts, Value Objects & Strategy Interfaces
 * Feature: 006-psychometric-choice-entropy-and-spatial-presentation
 * Target Stack: TypeScript 5.7 (strict: true), React 19, Zustand 5, Dexie 4, Cloudflare Workers + D1
 */

import type { Result } from '../../../src/domain/shared/result.ts';
import type {
  ChoiceId,
  Question,
  QuestionId,
} from '../../../src/domain/model/types.ts';
import type {
  Brand,
  ISpecification,
  QuestionBankDomainError,
} from '../../005-global-question-bank-governance/contracts/question-bank-governance-ports.ts';

// ==========================================
// 1. BRANDED NOMINAL PRIMITIVES & VALUE TYPES
// ==========================================

/**
 * Deterministic 32-bit unsigned integer seed used by pure PRNG algorithms
 * (e.g., Mulberry32 / FNV-1a hash of `${sessionId}:${questionId}`).
 */
export type DeterministicPrngSeed = Brand<number, 'DeterministicPrngSeed'>;

/**
 * Visual zero-based slot index (0 = top card 'A', 1 = 'B', 2 = 'C', 3 = 'D')
 * decoupled from the underlying ChoiceId ('a' | 'b' | 'c' | 'd').
 */
export type VisualSlotIndex = 0 | 1 | 2 | 3;

/**
 * Display badge label rendered on the visual card ('A' | 'B' | 'C' | 'D')
 * corresponding strictly to VisualSlotIndex (0 -> 'A', 1 -> 'B', 2 -> 'C', 3 -> 'D').
 */
export type VisualBadgeLetter = 'A' | 'B' | 'C' | 'D';

/**
 * Normalized Shannon entropy score in [0.0, 1.0] where 1.0 represents a
 * perfectly uniform 25% / 25% / 25% / 25% distribution across 4 choices (2.0 bits).
 */
export type NormalizedShannonEntropy = Brand<number, 'NormalizedShannonEntropy'>;

/**
 * Pearson's Chi-Squared (χ²) goodness-of-fit statistic against uniform 0.25 expectation.
 * For df = 3:
 *  - χ² < 7.815  => p > 0.05 (Statistically indistinguishable from uniform)
 *  - χ² >= 7.815 => p <= 0.05 (Significant positional bias)
 *  - χ² >= 11.345 => p <= 0.01 (Severe psychometric skew)
 */
export type ChiSquaredStatistic = Brand<number, 'ChiSquaredStatistic'>;

// ==========================================
// 2. VALUE OBJECTS & TELEMETRY DTOs
// ==========================================

export type ChoiceFrequencyMap = Readonly<Record<ChoiceId, number>>;

export type ChoiceProportionMap = Readonly<Record<ChoiceId, number>>;

export type PsychometricEntropySeverity =
  | 'optimal_uniform'      // Max slot <= 30%, χ² < 7.815
  | 'mild_drift'           // Max slot <= 35%, χ² < 11.345
  | 'critical_skew'        // Max slot > 35% or A+B > 65% or χ² >= 11.345
  | 'insufficient_sample'; // Total questions < minimum sample threshold (e.g., < 8)

/**
 * Immutable Value Object encapsulating the complete statistical & psychometric
 * distribution profile of a question batch or canonical curriculum bank.
 */
export interface ChoiceDistributionMetrics {
  readonly totalQuestions: number;
  readonly counts: ChoiceFrequencyMap;
  readonly proportions: ChoiceProportionMap;
  readonly expectedCountPerSlot: number;
  readonly chiSquared: ChiSquaredStatistic;
  readonly pValueApprox: number;
  readonly normalizedEntropy: NormalizedShannonEntropy;
  readonly dominantChoiceId: ChoiceId;
  readonly dominantProportion: number;
  readonly combinedAbProportion: number;
  readonly severity: PsychometricEntropySeverity;
  readonly isPsychometricallyBalanced: boolean;
  readonly diagnosticMessage: string;
}

/**
 * Audit record documenting a single question's canonical choice permutation
 * during deterministic bank rebalancing.
 */
export interface QuestionChoicePermutationDelta {
  readonly questionId: QuestionId;
  readonly previousCorrectChoiceId: ChoiceId;
  readonly nextCorrectChoiceId: ChoiceId;
  readonly wasPermuted: boolean;
}

/**
 * Result of running a canonical rebalancing strategy across a question bank.
 */
export interface BankRebalanceReport<T extends Question = Question> {
  readonly questions: readonly T[];
  readonly beforeMetrics: ChoiceDistributionMetrics;
  readonly afterMetrics: ChoiceDistributionMetrics;
  readonly deltas: readonly QuestionChoicePermutationDelta[];
  readonly totalPermutedCount: number;
  readonly UnsafeHardcodedReferenceQuestionIds: readonly QuestionId[];
}

/**
 * Represents a single choice adapted for spatial UI rendering in SessionPlayer.
 * Decouples the visual slot (0..3, Badge A..D, Shortcut Key 1..4) from the
 * canonical ChoiceId ('a' | 'b' | 'c' | 'd') stored in persistence and telemetry.
 */
export interface SpatialPresentedChoice {
  readonly canonicalChoiceId: ChoiceId;
  readonly visualSlotIndex: VisualSlotIndex;
  readonly visualBadgeLetter: VisualBadgeLetter;
  readonly keyboardShortcutDigit: '1' | '2' | '3' | '4';
  readonly text: string;
  readonly rationale: string;
  readonly isCorrect: boolean;
}

// ==========================================
// 3. DOMAIN ERROR EXTENSIONS
// ==========================================

export type ChoiceEntropyDomainError =
  | QuestionBankDomainError
  | {
      readonly code: 'PSYCHOMETRIC_CHOICE_SKEW_DETECTED';
      readonly metrics: ChoiceDistributionMetrics;
      readonly message: string;
    }
  | {
      readonly code: 'HARDCODED_LETTER_REFERENCE_IN_TEXT';
      readonly questionId: QuestionId;
      readonly fieldPath: 'stem' | 'explanation' | 'examTip' | 'mnemonic' | `choices.${ChoiceId}.rationale`;
      readonly matchedToken: string;
      readonly message: string;
    };

// ==========================================
// 4. OOP STRATEGY & SERVICE INTERFACES (SOLID)
// ==========================================

/**
 * Strategy Pattern (OCP / DIP): Pure deterministic Pseudo-Random Number Generator port.
 */
export interface IDeterministicPrngPort {
  /**
   * Hashes an arbitrary string seed (e.g., `${sessionId}:${questionId}`) into a
   * deterministic 32-bit unsigned seed.
   */
  hashStringToSeed(seedInput: string): DeterministicPrngSeed;

  /**
   * Creates a stateful or functional uniform [0, 1) float generator from a 32-bit seed.
   */
  createGenerator(seed: DeterministicPrngSeed): () => number;

  /**
   * Executes an unbiased Fisher-Yates (Knuth) shuffle on a readonly array,
   * returning a new immutable permuted array without mutating the input.
   */
  shuffle<T>(items: readonly T[], seedInput: string): readonly T[];
}

/**
 * Specification / Guard Port: Detects hardcoded letter references (e.g., "Option A",
 * "Choice B is correct") in stems, explanations, mnemonics, or choice rationales
 * that would break clinical coherence if choices are permuted.
 */
export interface IChoicePermutationSafetySpecification extends ISpecification<Question> {
  inspectViolations(question: Question): readonly ChoiceEntropyDomainError[];
}

/**
 * Strategy Pattern (OCP / LSP): Defines an algorithm for rebalancing correct-choice
 * positions across a batch or canonical bank of questions.
 */
export interface IChoiceRebalancingStrategy {
  readonly strategyId: string;

  /**
   * Deterministically permutes choices within each question so the resulting
   * collection achieves a target psychometric distribution (e.g., exact 1:1:1:1
   * stratified across chapters/topics), while re-keying canonical choice IDs
   * ('a', 'b', 'c', 'd') in array order and preserving each choice's own rationale.
   */
  rebalance<T extends Question>(
    questions: readonly T[],
    seedInput?: string
  ): Result<BankRebalanceReport<T>, ChoiceEntropyDomainError>;
}

/**
 * Strategy Pattern (OCP / SRP): Controls how a question's choices are ordered
 * and mapped to spatial slots (0..3, A..D, Keys 1..4) during an active test session.
 */
export interface ISpatialChoicePresentationStrategy {
  readonly mode: 'canonical-order' | 'session-seeded-shuffle';

  /**
   * Projects a canonical Question's choices into SpatialPresentedChoice view-models
   * for a given sessionId. Guaranteed idempotent for the same (sessionId, questionId) pair.
   */
  projectChoices(
    question: Pick<Question, 'id' | 'choices'>,
    sessionId: string
  ): readonly SpatialPresentedChoice[];

  /**
   * Resolves a spatial keyboard shortcut ('1' | '2' | '3' | '4') or visual slot index (0..3)
   * to the underlying canonical ChoiceId ('a' | 'b' | 'c' | 'd').
   */
  resolveCanonicalChoiceIdBySlot(
    presentedChoices: readonly SpatialPresentedChoice[],
    slotIndex: VisualSlotIndex
  ): ChoiceId | null;
}

/**
 * Batch-level Quality Gate Rule Port (extends item-level IQuestionQualityRule philosophy
 * to evaluate macro-level batch properties like Shannon entropy and χ² uniformity).
 */
export interface IBatchQuestionQualityRule {
  readonly ruleId: string;
  readonly description: string;
  validateBatch(
    questions: readonly Question[]
  ): Result<ChoiceDistributionMetrics, ChoiceEntropyDomainError>;
}
