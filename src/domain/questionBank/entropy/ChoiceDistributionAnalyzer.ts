import type { Question, ChoiceId } from '../../model/types.ts';
import type {
  ChiSquaredStatistic,
  ChoiceDistributionMetrics,
  ChoiceFrequencyMap,
  ChoiceProportionMap,
  NormalizedShannonEntropy,
  PsychometricEntropySeverity,
} from '../../../../specs/006-psychometric-choice-entropy-and-spatial-presentation/contracts/choice-entropy-ports.ts';

export const VALID_CHOICE_SLOTS: readonly ChoiceId[] = ['a', 'b', 'c', 'd'] as const;

/**
 * Domain Service / Value Object Factory: Computes Chi-Squared goodness-of-fit,
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
