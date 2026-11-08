/**
 * Resilience Decorator: withTimeout
 * Wraps an async operation with a strict deadline budget.
 * Layer: Infrastructure (Resilience)
 */

import type { Result } from '../../../../domain/shared/result.ts';
import type { QddDegradationReason } from '../../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';

export async function withTimeout<T>(
  operation: (signal: AbortSignal) => Promise<Result<T, QddDegradationReason>>,
  timeoutMs: number,
  parentSignal?: AbortSignal
): Promise<Result<T, QddDegradationReason>> {
  if (parentSignal?.aborted) {
    return { ok: false, error: 'STAGE_TIMEOUT' };
  }

  const controller = new AbortController();
  const onParentAbort = () => controller.abort();
  if (parentSignal) {
    parentSignal.addEventListener('abort', onParentAbort, { once: true });
  }

  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<Result<T, QddDegradationReason>>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve({ ok: false, error: 'STAGE_TIMEOUT' });
    }, timeoutMs);
  });

  try {
    const opPromise = operation(controller.signal);
    return await Promise.race([opPromise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
    if (parentSignal) {
      parentSignal.removeEventListener('abort', onParentAbort);
    }
  }
}
