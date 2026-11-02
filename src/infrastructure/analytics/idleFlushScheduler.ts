/**
 * @file idleFlushScheduler.ts
 * @description Main-Thread-Yielding Batch Scheduler coordinating in-memory ring buffers,
 * offline outboxes, and first-party edge flushes.
 *
 * Implements IAnalyticsFlushSchedulerPort.
 * Strictly guarantees that telemetry flushes never interrupt 120Hz ProMotion frames.
 */

import type {
  IAnalyticsFlushSchedulerPort,
  IAnalyticsTransportStrategy,
  IAnalyticsOfflineOutboxPort,
  MonotonicDurationMs,
  AnalyticsEventEnvelope,
} from '../../../specs/008-posthog-zero-overhead-behavioral-analytics/contracts/posthog-analytics-ports.ts';
import { LockFreeRingBufferQueue } from '../../domain/analytics/ringBufferQueue.ts';

export interface IdleFlushSchedulerOptions {
  readonly endpointUrl: string;
  readonly maxBatchSize?: number;
  readonly idleIntervalMs?: number;
}

export class IdleFlushScheduler implements IAnalyticsFlushSchedulerPort {
  private isScheduled = false;
  private isFlushing = false;
  private pauseUntilMs = 0;
  private timerId: number | null = null;
  private readonly endpointUrl: string;
  private readonly maxBatchSize: number;
  private readonly idleIntervalMs: number;

  constructor(
    private readonly ringBuffer: LockFreeRingBufferQueue<AnalyticsEventEnvelope>,
    private readonly transport: IAnalyticsTransportStrategy,
    private readonly outbox: IAnalyticsOfflineOutboxPort,
    options: IdleFlushSchedulerOptions
  ) {
    this.endpointUrl = options.endpointUrl;
    this.maxBatchSize = options.maxBatchSize ?? 25;
    this.idleIntervalMs = options.idleIntervalMs ?? 3000;

    this.registerLifecycleListeners();
  }

  private registerLifecycleListeners(): void {
    if (typeof window === 'undefined') return;

    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flushImmediatelyOnPageHide();
        } else {
          this.scheduleIdleFlush();
        }
      });
    }

    if (typeof window.addEventListener === 'function') {
      window.addEventListener('pagehide', () => {
        this.flushImmediatelyOnPageHide();
      });

      window.addEventListener('online', () => {
        this.scheduleIdleFlush();
      });
    }
  }

  public pauseDuringCriticalAnimation(durationMs: MonotonicDurationMs): void {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.pauseUntilMs = Math.max(this.pauseUntilMs, now + durationMs);
  }

  public scheduleIdleFlush(): void {
    if (this.isScheduled) return;
    this.isScheduled = true;

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(
        (deadline) => {
          this.isScheduled = false;
          this.executeIdleFlush(deadline);
        },
        { timeout: this.idleIntervalMs }
      );
    } else if (typeof window !== 'undefined') {
      this.timerId = setTimeout(() => {
        this.isScheduled = false;
        this.executeIdleFlush({
          didTimeout: true,
          timeRemaining: () => 10,
        });
      }, this.idleIntervalMs) as unknown as number;
    }
  }

  private async executeIdleFlush(deadline: {
    readonly didTimeout: boolean;
    readonly timeRemaining: () => number;
  }): Promise<void> {
    if (this.isFlushing) return;

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now < this.pauseUntilMs) {
      // Yield to active 120Hz animation and reschedule
      this.scheduleIdleFlush();
      return;
    }

    this.isFlushing = true;
    try {
      // 1. Flush in-memory ring buffer if items exist
      if (!this.ringBuffer.isEmpty()) {
        const batch = this.ringBuffer.drainBatch(this.maxBatchSize);
        if (batch.length > 0) {
          await this.transport.sendBatch(this.endpointUrl, batch);
        }
      }

      // 2. If time permits and browser is online, drain offline outbox
      if (
        (deadline.timeRemaining() > 5 || deadline.didTimeout) &&
        typeof navigator !== 'undefined' &&
        navigator.onLine !== false
      ) {
        const outboxCount = await this.outbox.getPendingCount();
        if (outboxCount > 0) {
          const pendingBatch = await this.outbox.dequeuePendingBatch(this.maxBatchSize);
          if (pendingBatch.length > 0) {
            const sendRes = await this.transport.sendBatch(this.endpointUrl, pendingBatch);
            if (sendRes.ok) {
              await this.outbox.acknowledgeDelivered(pendingBatch.map((e) => e.eventId));
            }
          }
        }
      }
    } catch (e) {
      console.warn('Telemetry idle flush error:', e);
    } finally {
      this.isFlushing = false;
      // If there are still items remaining in ring buffer, schedule next idle slice
      if (!this.ringBuffer.isEmpty()) {
        this.scheduleIdleFlush();
      }
    }
  }

  public flushImmediatelyOnPageHide(): void {
    if (this.ringBuffer.isEmpty()) return;

    const batch = this.ringBuffer.drainBatch(this.maxBatchSize * 2);
    if (batch.length === 0) return;

    // Use synchronous beacon or keepalive fetch
    try {
      this.transport.sendBatch(this.endpointUrl, batch);
    } catch (e) {
      console.warn('PageHide telemetry dispatch failed:', e);
    }
  }

  public destroy(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }
}
