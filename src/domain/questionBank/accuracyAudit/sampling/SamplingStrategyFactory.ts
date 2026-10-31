/**
 * Factory Pattern: SamplingStrategyFactory
 * Encapsulates the instantiation and selection of ISamplingStrategy implementations.
 * Adheres to Open/Closed Principle by allowing dynamic strategy registration.
 */

import type { ISamplingStrategy } from './ISamplingStrategy.ts';
import type { SamplingStrategyType } from '../types.ts';
import { UniformRandomSamplingStrategy } from './UniformRandomSamplingStrategy.ts';
import { StratifiedSamplingStrategy } from './StratifiedSamplingStrategy.ts';

export class SamplingStrategyFactory {
  private static registry: Map<SamplingStrategyType, () => ISamplingStrategy> = new Map([
    ['uniform_random', () => new UniformRandomSamplingStrategy()],
    ['stratified_by_subject', () => new StratifiedSamplingStrategy('stratified_by_subject')],
    ['stratified_by_difficulty', () => new StratifiedSamplingStrategy('stratified_by_difficulty')],
    ['stratified_by_cognitive_level', () => new StratifiedSamplingStrategy('stratified_by_cognitive_level')],
  ]);

  public static create(type: SamplingStrategyType): ISamplingStrategy {
    const factory = this.registry.get(type);
    if (!factory) {
      // Default fallback
      return new UniformRandomSamplingStrategy();
    }
    return factory();
  }

  public static registerCustomStrategy(
    type: SamplingStrategyType,
    factory: () => ISamplingStrategy
  ): void {
    this.registry.set(type, factory);
  }
}
