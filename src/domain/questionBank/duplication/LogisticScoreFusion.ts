/**
 * Domain Service: Calibrated Logistic Score Fusion
 * Fuses multi-modal similarity signals into a calibrated probability [0.0 .. 1.0].
 */

import fusionWeightsJson from './config/fusion-weights.v1.json' with { type: 'json' };

export interface ScoreFusionFeatures {
  readonly jaccard: number | null;
  readonly cosine: number | null;
  readonly rerank: number | null;
  readonly sameAnswerKey: boolean;
  readonly sameTopic: boolean;
  readonly lengthRatio: number; // 0.0 .. 1.0
  readonly discriminatorDeltaCount: number;
}

export class LogisticScoreFusion {
  private static readonly weights = fusionWeightsJson.weights;
  private static readonly bias = fusionWeightsJson.bias;

  /**
   * Sigmoid activation function
   */
  private static sigmoid(z: number): number {
    if (z > 20) return 1.0;
    if (z < -20) return 0.0;
    return 1.0 / (1.0 + Math.exp(-z));
  }

  /**
   * Computes calibrated probability that the pair is a near/exact pedagogical duplicate.
   */
  public static fuse(features: ScoreFusionFeatures): number {
    let z = this.bias;

    // Use available signals; missing signals default to 0
    if (features.jaccard !== null) {
      z += this.weights.jaccard * features.jaccard;
    }
    if (features.cosine !== null) {
      z += this.weights.cosine * features.cosine;
    }
    if (features.rerank !== null) {
      z += this.weights.rerank * features.rerank;
    }

    if (features.sameAnswerKey) {
      z += this.weights.sameAnswerKey;
    }
    if (features.sameTopic) {
      z += this.weights.sameTopic;
    }

    z += this.weights.lengthRatio * Math.max(0, Math.min(1, features.lengthRatio));

    // Strong negative weight penalty for any clinical discriminator delta
    if (features.discriminatorDeltaCount > 0) {
      z += this.weights.discriminatorDelta * features.discriminatorDeltaCount;
    }

    return this.sigmoid(z);
  }
}
