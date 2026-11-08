/**
 * SpacedRepetitionCalculator
 *
 * Pure domain calculator for SM-2 spaced repetition forecasts and retention tracking.
 */

import type { ReviewCard } from '../model/types.ts';

export interface RetentionForecastMetrics {
  dueNow: number;
  dueTomorrow: number;
  dueIn3Days: number;
  dueIn7Days: number;
  stabilizedCards: number;
  totalTrackedCards: number;
}

export interface SrsItemLike {
  nextReviewAt: string;
}

export function computeRetentionForecast(
  reviewCards: readonly ReviewCard[],
  srsCards: readonly SrsItemLike[],
  nowMs = Date.now()
): { retentionForecast: RetentionForecastMetrics; dueNow: number } {
  const dayMs = 24 * 60 * 60 * 1000;

  let dueNow = 0;
  let dueTomorrow = 0;
  let dueIn3Days = 0;
  let dueIn7Days = 0;
  let stabilizedCards = 0;

  for (const card of reviewCards) {
    const dueMs = new Date(card.dueAt).getTime();
    const diffMs = dueMs - nowMs;
    if (Number.isNaN(dueMs) || diffMs <= 0) {
      dueNow += 1;
    } else if (diffMs <= dayMs) {
      dueTomorrow += 1;
    } else if (diffMs <= 3 * dayMs) {
      dueIn3Days += 1;
    } else if (diffMs <= 7 * dayMs) {
      dueIn7Days += 1;
    } else {
      stabilizedCards += 1;
    }
  }

  for (const srs of srsCards) {
    const dueMs = new Date(srs.nextReviewAt).getTime();
    const diffMs = dueMs - nowMs;
    if (!Number.isNaN(dueMs) && diffMs <= 0) {
      dueNow += 1;
    }
  }

  const retentionForecast: RetentionForecastMetrics = {
    dueNow,
    dueTomorrow,
    dueIn3Days,
    dueIn7Days,
    stabilizedCards,
    totalTrackedCards: reviewCards.length + srsCards.length,
  };

  return { retentionForecast, dueNow };
}
