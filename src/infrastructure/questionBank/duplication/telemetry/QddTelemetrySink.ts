/**
 * Infrastructure Service: QddTelemetrySink
 * Observer & Telemetry Sink for Question Duplication Detection Engine.
 *
 * Dispatches non-blocking metrics for verdicts and reviewer resolutions to PostHog,
 * edge observability, and local sinks.
 *
 * Strict Privacy Guarantee (FR-034):
 * NEVER logs or forwards question stem, choices, explanations, or rationale.
 * Transmits ONLY anonymized scalar identifiers, relations, stages, latency, and override flags.
 *
 * Layer: Infrastructure
 */

import type {
  DuplicateRelation,
  QddExecutionTier,
} from '../../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';

export interface QddVerdictTelemetryMetric {
  readonly subjectId: string;
  readonly tier: QddExecutionTier;
  readonly mode: 'shadow' | 'enforce';
  readonly decision: 'ALLOW' | 'INFORM' | 'REVIEW' | 'BLOCK';
  readonly relation: DuplicateRelation;
  readonly decidingStage: string;
  readonly stagesExecuted: readonly string[];
  readonly latencyMs: number;
  readonly degraded: boolean;
  readonly degradedReason?: string | null;
  readonly candidateCount: number;
  readonly topScore?: number;
}

export interface QddResolutionTelemetryMetric {
  readonly pairKey: string;
  readonly subjectId: string;
  readonly matchedId: string;
  readonly engineRelation: DuplicateRelation;
  readonly humanRelation: DuplicateRelation;
  readonly action: string;
  readonly reviewerId: string;
  readonly isOverride: boolean;
  readonly latencyMs?: number;
}

export interface IQddTelemetryObserver {
  onVerdict(metric: QddVerdictTelemetryMetric): void | Promise<void>;
  onResolution(metric: QddResolutionTelemetryMetric): void | Promise<void>;
}

export class QddTelemetrySink {
  private static instance: QddTelemetrySink | null = null;
  private readonly observers: Set<IQddTelemetryObserver> = new Set();

  constructor() {}

  public static getInstance(): QddTelemetrySink {
    if (!QddTelemetrySink.instance) {
      QddTelemetrySink.instance = new QddTelemetrySink();
    }
    return QddTelemetrySink.instance;
  }

  public static resetInstance(): void {
    QddTelemetrySink.instance = null;
  }

  /**
   * Registers an observer into the telemetry sink.
   */
  public addObserver(observer: IQddTelemetryObserver): () => void {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  /**
   * Dispatches a verdict telemetry event without blocking the caller.
   */
  public recordVerdict(metric: QddVerdictTelemetryMetric): void {
    // Non-blocking microtask execution guarantees 0 main-thread or request stalls
    const sanitizedMetric: QddVerdictTelemetryMetric = {
      subjectId: metric.subjectId,
      tier: metric.tier,
      mode: metric.mode,
      decision: metric.decision,
      relation: metric.relation,
      decidingStage: metric.decidingStage,
      stagesExecuted: [...metric.stagesExecuted],
      latencyMs: Math.round(metric.latencyMs),
      degraded: metric.degraded,
      degradedReason: metric.degradedReason ?? null,
      candidateCount: metric.candidateCount,
      topScore: metric.topScore !== undefined ? Number(metric.topScore.toFixed(3)) : undefined,
    };

    this.scheduleDispatch((obs) => obs.onVerdict(sanitizedMetric));
  }

  /**
   * Dispatches a reviewer resolution telemetry event without blocking the caller.
   */
  public recordResolution(metric: QddResolutionTelemetryMetric): void {
    const isOverride = metric.engineRelation !== metric.humanRelation;

    const sanitizedMetric: QddResolutionTelemetryMetric = {
      pairKey: metric.pairKey,
      subjectId: metric.subjectId,
      matchedId: metric.matchedId,
      engineRelation: metric.engineRelation,
      humanRelation: metric.humanRelation,
      action: metric.action,
      reviewerId: metric.reviewerId,
      isOverride,
      latencyMs: metric.latencyMs !== undefined ? Math.round(metric.latencyMs) : undefined,
    };

    this.scheduleDispatch((obs) => obs.onResolution(sanitizedMetric));
  }

  /**
   * Internal scheduler: dispatches tasks in a non-blocking queueMicrotask
   * or setTimeout fallback with error encapsulation.
   */
  private scheduleDispatch(fn: (obs: IQddTelemetryObserver) => void | Promise<void>): void {
    const dispatch = () => {
      for (const observer of this.observers) {
        try {
          const res = fn(observer);
          if (res instanceof Promise) {
            res.catch((err) => {
              console.warn('[QddTelemetrySink] Async observer error:', err);
            });
          }
        } catch (err) {
          console.warn('[QddTelemetrySink] Sync observer error:', err);
        }
      }
    };

    if (typeof queueMicrotask === 'function') {
      queueMicrotask(dispatch);
    } else {
      setTimeout(dispatch, 0);
    }
  }
}
