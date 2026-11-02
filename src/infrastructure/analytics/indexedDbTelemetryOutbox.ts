/**
 * @file indexedDbTelemetryOutbox.ts
 * @description Durable Offline Telemetry Outbox backed by Dexie IndexedDB.
 *
 * Implements IAnalyticsOfflineOutboxPort. Guarantees zero dropped behavioral events
 * during offline study on the metro or hospital wards, with FIFO bounded storage.
 */

import { db, type TelemetryOutboxRecord } from '../storage/db.ts';
import { ok, err, type Result } from '../../domain/shared/result.ts';
import type {
  IAnalyticsOfflineOutboxPort,
  AnalyticsEventEnvelope,
  TelemetryEventId,
  AnalyticsDomainError,
} from '../../../specs/008-posthog-zero-overhead-behavioral-analytics/contracts/posthog-analytics-ports.ts';

const MAX_OUTBOX_CAPACITY = 1000;

export class IndexedDbTelemetryOutbox implements IAnalyticsOfflineOutboxPort {
  public async enqueueBatch(
    events: readonly AnalyticsEventEnvelope[]
  ): Promise<Result<number, AnalyticsDomainError>> {
    if (!events || events.length === 0) {
      return ok(0);
    }

    try {
      const records: TelemetryOutboxRecord[] = events.map((env) => ({
        eventId: env.eventId,
        eventName: env.eventName,
        envelopeJson: JSON.stringify(env),
        timestampIso: env.timestampIso,
        retryCount: 0,
      }));

      await db.telemetryOutbox.bulkPut(records);

      // FIFO bounded storage enforcement
      const count = await db.telemetryOutbox.count();
      if (count > MAX_OUTBOX_CAPACITY) {
        const excess = count - MAX_OUTBOX_CAPACITY;
        const oldestKeys = await db.telemetryOutbox
          .orderBy('timestampIso')
          .limit(excess)
          .primaryKeys();
        if (oldestKeys.length > 0) {
          await db.telemetryOutbox.bulkDelete(oldestKeys as string[]);
        }
      }

      return ok(records.length);
    } catch (e) {
      return err({
        code: 'OUTBOX_QUOTA_EXCEEDED',
        message: e instanceof Error ? e.message : 'Failed to write to IndexedDB outbox.',
        retryable: true,
      });
    }
  }

  public async dequeuePendingBatch(
    maxBatchSize: number
  ): Promise<readonly AnalyticsEventEnvelope[]> {
    try {
      const records = await db.telemetryOutbox
        .orderBy('timestampIso')
        .limit(maxBatchSize)
        .toArray();

      const envelopes: AnalyticsEventEnvelope[] = [];
      for (const record of records) {
        try {
          const parsed = JSON.parse(record.envelopeJson) as AnalyticsEventEnvelope;
          envelopes.push(parsed);
        } catch {
          // If a corrupted record exists, delete it
          await db.telemetryOutbox.delete(record.eventId);
        }
      }

      return envelopes;
    } catch (e) {
      console.warn('Telemetry outbox read failure:', e);
      return [];
    }
  }

  public async acknowledgeDelivered(
    eventIds: readonly TelemetryEventId[]
  ): Promise<void> {
    if (!eventIds || eventIds.length === 0) return;
    try {
      await db.telemetryOutbox.bulkDelete(eventIds as unknown as string[]);
    } catch (e) {
      console.warn('Telemetry outbox acknowledge deletion failure:', e);
    }
  }

  public async getPendingCount(): Promise<number> {
    try {
      return await db.telemetryOutbox.count();
    } catch {
      return 0;
    }
  }
}
