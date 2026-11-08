import type {
  HistoricalTelemetryCheckpoint,
  UnifiedEdgeObservabilitySnapshot,
} from '../../../../specs/007-cloudflare-live-observability-and-ai-telemetry-portal/contracts/observability-portal-ports.ts';

const LEDGER_STORAGE_KEY = 'med_quests_edge_observability_history_v1';
const MAX_LEDGER_CHECKPOINTS = 60;

/**
 * Baseline historical checkpoints from the 110-Scholar Batch Launch so longitudinal
 * trend analysis is immediately populated across Day 1, Day 2, and live syncs.
 */
export const SEED_HISTORICAL_CHECKPOINTS: readonly HistoricalTelemetryCheckpoint[] = [
  {
    checkpointId: 'chk-launch-day1-peak',
    recordedAtIso: '2026-10-31T18:00:00.000Z',
    timeframeWindow: '24h',
    dataSourceMode: 'hybrid-edge-d1-verified',
    targetBatchSize: 110,
    estimatedActiveScholars: 58,
    batchPenetrationPercent: 52.7,
    totalWorkerRequests: 1412,
    totalWorkerErrors: 0,
    totalD1ReadQueries: 2980,
    totalD1RowsRead: 412800,
    cacheHitRatioPercent: 98.1,
    globalCpuTimeP50Ms: 2.65,
    globalCpuTimeP99Ms: 7.38,
    topColoCode: 'MRS',
  },
  {
    checkpointId: 'chk-launch-day1-close',
    recordedAtIso: '2026-10-31T23:59:59.000Z',
    timeframeWindow: '24h',
    dataSourceMode: 'hybrid-edge-d1-verified',
    targetBatchSize: 110,
    estimatedActiveScholars: 62,
    batchPenetrationPercent: 56.4,
    totalWorkerRequests: 1728,
    totalWorkerErrors: 0,
    totalD1ReadQueries: 3699,
    totalD1RowsRead: 505839,
    cacheHitRatioPercent: 98.3,
    globalCpuTimeP50Ms: 2.68,
    globalCpuTimeP99Ms: 7.42,
    topColoCode: 'MRS',
  },
  {
    checkpointId: 'chk-launch-day2-morning',
    recordedAtIso: '2026-11-01T10:00:00.000Z',
    timeframeWindow: '48h',
    dataSourceMode: 'hybrid-edge-d1-verified',
    targetBatchSize: 110,
    estimatedActiveScholars: 65,
    batchPenetrationPercent: 59.1,
    totalWorkerRequests: 1896,
    totalWorkerErrors: 0,
    totalD1ReadQueries: 4059,
    totalD1RowsRead: 555039,
    cacheHitRatioPercent: 98.4,
    globalCpuTimeP50Ms: 2.7,
    globalCpuTimeP99Ms: 7.45,
    topColoCode: 'MRS',
  },
];

export class TelemetryLongitudinalLedger {
  public getCheckpoints(): readonly HistoricalTelemetryCheckpoint[] {
    if (typeof window === 'undefined' || !window.localStorage) {
      return SEED_HISTORICAL_CHECKPOINTS;
    }
    try {
      const raw = window.localStorage.getItem(LEDGER_STORAGE_KEY);
      if (!raw) {
        window.localStorage.setItem(
          LEDGER_STORAGE_KEY,
          JSON.stringify(SEED_HISTORICAL_CHECKPOINTS)
        );
        return SEED_HISTORICAL_CHECKPOINTS;
      }
      const parsed = JSON.parse(raw) as HistoricalTelemetryCheckpoint[];
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return SEED_HISTORICAL_CHECKPOINTS;
      }
      return parsed;
    } catch {
      return SEED_HISTORICAL_CHECKPOINTS;
    }
  }

  public recordSnapshotCheckpoint(
    snapshot: UnifiedEdgeObservabilitySnapshot
  ): readonly HistoricalTelemetryCheckpoint[] {
    const existing = [...this.getCheckpoints()];
    const topColo = snapshot.coloDistribution[0]?.coloCode ?? 'MRS';

    const newCheckpoint: HistoricalTelemetryCheckpoint = {
      checkpointId: `chk-${snapshot.timeframeWindow}-${Date.now()}`,
      recordedAtIso: snapshot.generatedAtIso,
      timeframeWindow: snapshot.timeframeWindow,
      dataSourceMode: snapshot.dataSourceMode,
      targetBatchSize: snapshot.cohortEstimate.targetBatchSize,
      estimatedActiveScholars: snapshot.cohortEstimate.estimatedUniqueScholarsActive,
      batchPenetrationPercent: snapshot.cohortEstimate.batchPenetrationPercent,
      totalWorkerRequests: snapshot.totalWorkerRequests,
      totalWorkerErrors: snapshot.totalWorkerErrors,
      totalD1ReadQueries: snapshot.d1Summary.totalReadQueries,
      totalD1RowsRead: snapshot.d1Summary.totalRowsRead,
      cacheHitRatioPercent: snapshot.assetCacheMetrics.cacheHitRatioPercent,
      globalCpuTimeP50Ms: snapshot.globalCpuTimeP50Ms,
      globalCpuTimeP99Ms: snapshot.globalCpuTimeP99Ms,
      topColoCode: topColo,
    };

    // Avoid duplicating identical consecutive checkpoints within 60 seconds
    const last = existing[existing.length - 1];
    if (
      last &&
      last.timeframeWindow === newCheckpoint.timeframeWindow &&
      last.totalWorkerRequests === newCheckpoint.totalWorkerRequests &&
      last.totalD1RowsRead === newCheckpoint.totalD1RowsRead &&
      last.targetBatchSize === newCheckpoint.targetBatchSize &&
      Math.abs(
        new Date(newCheckpoint.recordedAtIso).getTime() -
          new Date(last.recordedAtIso).getTime()
      ) < 60_000
    ) {
      return existing;
    }

    const updated = [...existing, newCheckpoint].slice(-MAX_LEDGER_CHECKPOINTS);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage quota errors
      }
    }
    return updated;
  }
}
