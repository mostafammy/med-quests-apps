/**
 * @file transportStrategies.ts
 * @description GoF Strategy Pattern implementations for Telemetry Transports.
 *
 * Implements IAnalyticsTransportStrategy. Provides:
 * 1. FirstPartyFetchTransportStrategy (Standard low-priority background fetch)
 * 2. SendBeaconTransportStrategy (Kernel-level transmission on pagehide/tab close)
 * 3. AdaptiveTelemetryTransportStrategy (Selects optimal transport based on network & visibility)
 * 4. InMemoryTestTransportStrategy (Deterministic in-memory sink for unit tests)
 */

import { ok, err, type Result } from '../../domain/shared/result.ts';
import type {
  IAnalyticsTransportStrategy,
  TelemetryTransportChannel,
  AnalyticsEventEnvelope,
  AnalyticsDomainError,
  IAnalyticsOfflineOutboxPort,
} from '../../../specs/008-posthog-zero-overhead-behavioral-analytics/contracts/posthog-analytics-ports.ts';

export class FirstPartyFetchTransportStrategy implements IAnalyticsTransportStrategy {
  public readonly channelId: TelemetryTransportChannel = 'cloudflare-first-party-proxy-fetch';

  public async sendBatch(
    endpointUrl: string,
    batch: readonly AnalyticsEventEnvelope[]
  ): Promise<Result<{ acceptedCount: number }, AnalyticsDomainError>> {
    if (!batch || batch.length === 0) {
      return ok({ acceptedCount: 0 });
    }

    try {
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ batch }),
        keepalive: true,
      });

      if (!response.ok) {
        return err({
          code: 'EDGE_PROXY_INGEST_FAILED',
          message: `Edge proxy rejected telemetry batch: HTTP ${response.status}`,
          retryable: response.status >= 500,
        });
      }

      return ok({ acceptedCount: batch.length });
    } catch (e) {
      return err({
        code: 'EDGE_PROXY_INGEST_FAILED',
        message: e instanceof Error ? e.message : 'Network fetch failure',
        retryable: true,
      });
    }
  }
}

export class SendBeaconTransportStrategy implements IAnalyticsTransportStrategy {
  public readonly channelId: TelemetryTransportChannel = 'navigator-send-beacon';

  public async sendBatch(
    endpointUrl: string,
    batch: readonly AnalyticsEventEnvelope[]
  ): Promise<Result<{ acceptedCount: number }, AnalyticsDomainError>> {
    if (!batch || batch.length === 0) {
      return ok({ acceptedCount: 0 });
    }

    const payload = JSON.stringify({ batch });

    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      try {
        const blob = new Blob([payload], { type: 'application/json' });
        const enqueued = navigator.sendBeacon(endpointUrl, blob);
        if (enqueued) {
          return ok({ acceptedCount: batch.length });
        }
      } catch {
        // Fallback to fetch keepalive
      }
    }

    // Fallback if sendBeacon fails or is not available
    const fetchTransport = new FirstPartyFetchTransportStrategy();
    return fetchTransport.sendBatch(endpointUrl, batch);
  }
}

export class InMemoryTestTransportStrategy implements IAnalyticsTransportStrategy {
  public readonly channelId: TelemetryTransportChannel = 'noop-memory-sink';
  public sentBatches: AnalyticsEventEnvelope[][] = [];

  public async sendBatch(
    _endpointUrl: string,
    batch: readonly AnalyticsEventEnvelope[]
  ): Promise<Result<{ acceptedCount: number }, AnalyticsDomainError>> {
    this.sentBatches.push([...batch]);
    return ok({ acceptedCount: batch.length });
  }

  public clear(): void {
    this.sentBatches = [];
  }
}

export class AdaptiveTelemetryTransportStrategy implements IAnalyticsTransportStrategy {
  public channelId: TelemetryTransportChannel = 'cloudflare-first-party-proxy-fetch';
  private fetchTransport = new FirstPartyFetchTransportStrategy();
  private beaconTransport = new SendBeaconTransportStrategy();

  constructor(private outbox: IAnalyticsOfflineOutboxPort) {}

  public async sendBatch(
    endpointUrl: string,
    batch: readonly AnalyticsEventEnvelope[]
  ): Promise<Result<{ acceptedCount: number }, AnalyticsDomainError>> {
    if (!batch || batch.length === 0) {
      return ok({ acceptedCount: 0 });
    }

    // 1. If client is known to be offline, write directly to outbox
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.channelId = 'indexeddb-offline-outbox';
      await this.outbox.enqueueBatch(batch);
      return ok({ acceptedCount: batch.length });
    }

    // 2. If page is being closed / hidden, prioritize beacon
    if (
      typeof document !== 'undefined' &&
      document.visibilityState === 'hidden'
    ) {
      this.channelId = 'navigator-send-beacon';
      return this.beaconTransport.sendBatch(endpointUrl, batch);
    }

    // 3. Normal foreground idle fetch
    this.channelId = 'cloudflare-first-party-proxy-fetch';
    const result = await this.fetchTransport.sendBatch(endpointUrl, batch);

    // If transient network failure occurred, stash in outbox for retry
    if (!result.ok && result.error.retryable) {
      await this.outbox.enqueueBatch(batch);
      this.channelId = 'indexeddb-offline-outbox';
    }

    return result;
  }
}
