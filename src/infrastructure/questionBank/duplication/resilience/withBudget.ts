/**
 * Resilience Decorator: withBudget
 * Wraps an AI operation with budget guard protection.
 * Layer: Infrastructure (Resilience)
 */

import type { Result } from '../../../../domain/shared/result.ts';
import type {
  IAiBudgetGuard,
  QddDegradationReason,
} from '../../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';

export async function withBudget<T>(
  guard: IAiBudgetGuard,
  resource: 'embedding' | 'rerank' | 'llm',
  units: number,
  operation: () => Promise<Result<T, QddDegradationReason>>
): Promise<Result<T, QddDegradationReason>> {
  const allowed = await guard.tryConsume(resource, units);
  if (!allowed) {
    return { ok: false, error: 'DAILY_AI_BUDGET_EXHAUSTED' };
  }
  return operation();
}
