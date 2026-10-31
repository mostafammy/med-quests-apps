/**
 * Strategy Pattern Interface: Question Bank Random Sampling
 * Adheres to SOLID: Interface Segregation (ISP) & Open/Closed Principle (OCP)
 */

import type { Question } from '../../../model/types.ts';
import type { SamplingConfiguration, SampleExtractionResult } from '../types.ts';

export interface ISamplingStrategy {
  readonly strategyType: SamplingConfiguration['strategyType'];

  /**
   * Samples a statistically valid subset of questions from the provided question population.
   */
  sample(
    population: readonly Question[],
    config: SamplingConfiguration
  ): SampleExtractionResult;
}
