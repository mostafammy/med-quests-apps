/**
 * Resilience Decorator: CircuitBreaker
 * Prevents cascading latency and exhaustion when remote AI services degrade.
 * Transitions: CLOSED -> OPEN (on N failures) -> HALF_OPEN (after reset cooldown).
 * Layer: Infrastructure (Resilience)
 */

import type { Result } from '../../../../domain/shared/result.ts';
import type { QddDegradationReason } from '../../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  readonly failureThreshold?: number;
  readonly resetTimeoutMs?: number;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private nextAttemptTime = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 30000;
  }

  public getState(): CircuitState {
    if (this.state === 'OPEN' && Date.now() >= this.nextAttemptTime) {
      this.state = 'HALF_OPEN';
    }
    return this.state;
  }

  public async execute<T>(
    operation: () => Promise<Result<T, QddDegradationReason>>
  ): Promise<Result<T, QddDegradationReason>> {
    const currentState = this.getState();

    if (currentState === 'OPEN') {
      return { ok: false, error: 'EMBEDDING_UNAVAILABLE' };
    }

    try {
      const result = await operation();
      if (result.ok) {
        this.onSuccess();
      } else {
        this.onFailure();
      }
      return result;
    } catch {
      this.onFailure();
      return { ok: false, error: 'EMBEDDING_UNAVAILABLE' };
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold || this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.nextAttemptTime = Date.now() + this.resetTimeoutMs;
    }
  }

  public reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.nextAttemptTime = 0;
  }
}
