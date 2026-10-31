/**
 * Stratified Proportional Sampling Strategy
 * Strategy Pattern: Implements ISamplingStrategy
 * Partitions the question bank into homogenous strata (e.g., by Subject, Difficulty, or Cognitive Level)
 * and samples proportionally to eliminate representation bias in clinical audits.
 */

import type { Question } from '../../model/types.ts';
import type { ISamplingStrategy } from './ISamplingStrategy.ts';
import type { SamplingConfiguration, SampleExtractionResult, SamplingStrategyType } from '../types.ts';
import { createRandomGenerator } from './prng.ts';

export class StratifiedSamplingStrategy implements ISamplingStrategy {
  constructor(
    public readonly strategyType:
      | 'stratified_by_subject'
      | 'stratified_by_difficulty'
      | 'stratified_by_cognitive_level'
  ) {}

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

    // 1. Group into strata based on strategy
    const strataBuckets = new Map<string, Question[]>();

    for (const question of pool) {
      let stratumKey = 'unknown';
      if (this.strategyType === 'stratified_by_subject') {
        stratumKey = question.subjectId || 'general';
      } else if (this.strategyType === 'stratified_by_difficulty') {
        stratumKey = `difficulty_${question.difficulty || 2}`;
      } else if (this.strategyType === 'stratified_by_cognitive_level') {
        stratumKey = question.cognitiveLevel || 'understanding';
      }

      if (!strataBuckets.has(stratumKey)) {
        strataBuckets.set(stratumKey, []);
      }
      strataBuckets.get(stratumKey)!.push(question);
    }

    // 2. Compute proportional allocation per stratum
    const strataRepresentation: Record<string, { populationCount: number; sampleCount: number; percentage: number }> = {};
    const allocationPerStratum = new Map<string, number>();

    let totalAllocated = 0;
    for (const [key, questionsInStratum] of strataBuckets.entries()) {
      const proportion = questionsInStratum.length / totalPopulationSize;
      // Proportional allocation with floor, minimum 1 if quota allows
      let count = Math.floor(requestedSize * proportion);
      if (count === 0 && requestedSize > strataBuckets.size) {
        count = 1;
      }
      allocationPerStratum.set(key, Math.min(count, questionsInStratum.length));
      totalAllocated += allocationPerStratum.get(key)!;

      strataRepresentation[key] = {
        populationCount: questionsInStratum.length,
        sampleCount: 0,
        percentage: 0,
      };
    }

    // Adjust remainder up to requestedSize
    const stratumKeys = Array.from(strataBuckets.keys());
    let remainder = requestedSize - totalAllocated;
    let guard = 0;
    while (remainder > 0 && guard < 1000) {
      guard++;
      const candidateKey = stratumKeys[generator.nextInt(0, stratumKeys.length)];
      const currentAlloc = allocationPerStratum.get(candidateKey)!;
      const stratumTotal = strataBuckets.get(candidateKey)!.length;
      if (currentAlloc < stratumTotal) {
        allocationPerStratum.set(candidateKey, currentAlloc + 1);
        remainder--;
      }
    }

    // 3. Draw random samples within each stratum
    const sampledQuestions: Question[] = [];

    for (const [key, questionsInStratum] of strataBuckets.entries()) {
      const takeCount = allocationPerStratum.get(key) || 0;
      const bucketCopy = [...questionsInStratum];

      for (let i = 0; i < takeCount; i++) {
        if (bucketCopy.length === 0) break;
        const pick = generator.nextInt(0, bucketCopy.length);
        const [selected] = bucketCopy.splice(pick, 1);
        sampledQuestions.push(selected);
      }
    }

    // Update telemetry counts
    for (const q of sampledQuestions) {
      let stratumKey = 'unknown';
      if (this.strategyType === 'stratified_by_subject') {
        stratumKey = q.subjectId || 'general';
      } else if (this.strategyType === 'stratified_by_difficulty') {
        stratumKey = `difficulty_${q.difficulty || 2}`;
      } else if (this.strategyType === 'stratified_by_cognitive_level') {
        stratumKey = q.cognitiveLevel || 'understanding';
      }

      if (strataRepresentation[stratumKey]) {
        strataRepresentation[stratumKey].sampleCount++;
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
