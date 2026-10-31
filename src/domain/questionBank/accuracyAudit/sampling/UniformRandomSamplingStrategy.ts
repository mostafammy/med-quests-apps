/**
 * Uniform Random Sampling Strategy (Fisher-Yates / Knuth Modern Shuffle)
 * Strategy Pattern: Implements ISamplingStrategy
 * Guarantees that every question in the population has an equal, unbiased probability of selection.
 */

import type { Question } from '../../model/types.ts';
import type { ISamplingStrategy } from './ISamplingStrategy.ts';
import type { SamplingConfiguration, SampleExtractionResult } from '../types.ts';
import { createRandomGenerator } from './prng.ts';

export class UniformRandomSamplingStrategy implements ISamplingStrategy {
  public readonly strategyType = 'uniform_random' as const;

  public sample(
    population: readonly Question[],
    config: SamplingConfiguration
  ): SampleExtractionResult {
    let pool = [...population];

    if (config.highYieldOnly) {
      pool = pool.filter((q) => q.highYield);
    }
    if (config.blockId) {
      pool = pool.filter((q) => q.blockId === config.blockId);
    }

    const totalPopulationSize = pool.length;
    const requestedSize = Math.max(1, Math.min(config.sampleSize, totalPopulationSize));

    const { generator, effectiveSeed } = createRandomGenerator(config.seed);

    // Modern Fisher-Yates partial shuffle to extract requestedSize items without biasing
    const sampledIndices: number[] = [];
    const available = pool.map((_, i) => i);

    for (let i = 0; i < requestedSize; i++) {
      const pickIdx = generator.nextInt(i, available.length);
      const temp = available[i];
      available[i] = available[pickIdx];
      available[pickIdx] = temp;
      sampledIndices.push(available[i]);
    }

    const sampledQuestions = sampledIndices.map((idx) => pool[idx]);

    // Build strata representation telemetry (by subject)
    const strataRepresentation: Record<string, { populationCount: number; sampleCount: number; percentage: number }> = {};
    for (const q of pool) {
      const subject = q.subjectId || 'general';
      if (!strataRepresentation[subject]) {
        strataRepresentation[subject] = { populationCount: 0, sampleCount: 0, percentage: 0 };
      }
      strataRepresentation[subject].populationCount++;
    }

    for (const q of sampledQuestions) {
      const subject = q.subjectId || 'general';
      if (strataRepresentation[subject]) {
        strataRepresentation[subject].sampleCount++;
      }
    }

    for (const key of Object.keys(strataRepresentation)) {
      const item = strataRepresentation[key];
      item.percentage = sampledQuestions.length > 0
        ? Math.round((item.sampleCount / sampledQuestions.length) * 1000) / 10
        : 0;
    }

    return {
      sampledQuestions,
      totalPopulationSize,
      sampleSize: sampledQuestions.length,
      strategyType: this.strategyType,
      strataRepresentation,
      randomSeed: effectiveSeed,
    };
  }
}
