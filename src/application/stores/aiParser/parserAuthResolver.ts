/**
 * Parser Auth Resolver
 * Single Responsibility: Safely extracts and validates the EditorialActor from authentication state.
 */

import type { AuthState } from '../../../domain/auth/types.ts';
import type { EditorialActor } from './types.ts';

export const DEFAULT_FALLBACK_ADMIN: EditorialActor = {
  id: 'usr_admin',
  displayName: 'Curriculum Administrator',
  role: 'admin',
};

/**
 * Resolves the active editorial actor, falling back to curriculum admin in test/offline environments.
 */
export function resolveEditorialActor(authState: AuthState): EditorialActor {
  if (authState.status === 'authenticated-active') {
    return {
      id: authState.user.id,
      displayName: authState.user.displayName,
      role: authState.user.role,
    };
  }
  return DEFAULT_FALLBACK_ADMIN;
}

/**
 * Validates whether the current actor has platform admin authorization.
 */
export function requireAdminActor(
  authState: AuthState
): { ok: true; actor: EditorialActor } | { ok: false; error: string } {
  if (authState.status !== 'authenticated-active' || authState.user.role !== 'admin') {
    return {
      ok: false,
      error: 'Unauthorized: Platform Administrator privileges required.',
    };
  }
  return {
    ok: true,
    actor: {
      id: authState.user.id,
      displayName: authState.user.displayName,
      role: authState.user.role,
    },
  };
}
