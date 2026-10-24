/**
 * Shared functional primitives for the domain layer.
 * Zero runtime dependencies — safe to import from anywhere.
 */

/** Discriminated success/failure container. Prefer over throwing in domain code. */
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

/**
 * Exhaustiveness guard for discriminated unions.
 * A compile error here means a union member is not handled.
 */
export function assertNever(value: never, context = 'Unhandled union member'): never {
  throw new Error(`${context}: ${JSON.stringify(value)}`);
}
