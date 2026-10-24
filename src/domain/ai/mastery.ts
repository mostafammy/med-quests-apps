/**
 * Learner mastery banding (BRD §9.2).
 *
 * Bands: critical < 0.50 ≤ weak < 0.70 ≤ developing < 0.85 ≤ strong.
 * Fewer than 3 attempts → 'insufficient-data' (sample guard).
 */
import type { Ratio } from '../model/types.ts';

export type MasteryBand = 'critical' | 'weak' | 'developing' | 'strong' | 'insufficient-data';

export const MASTERY_THRESHOLDS = {
  /** BRD §9.2 — below this ratio a topic is critical. */
  critical: 0.5,
  /** BRD §9.2 — below this ratio a topic is weak. */
  weak: 0.7,
  /** BRD §9.2 — below this ratio a topic is developing; at or above is strong. */
  developing: 0.85,
  /** BRD §9.2 sample guard — minimum attempts before a band is meaningful. */
  minimumAttempts: 3,
} as const;

export function toMasteryBand(accuracy: Ratio, attempts: number): MasteryBand {
  if (attempts < MASTERY_THRESHOLDS.minimumAttempts) return 'insufficient-data';
  if (accuracy < MASTERY_THRESHOLDS.critical) return 'critical';
  if (accuracy < MASTERY_THRESHOLDS.weak) return 'weak';
  if (accuracy < MASTERY_THRESHOLDS.developing) return 'developing';
  return 'strong';
}
