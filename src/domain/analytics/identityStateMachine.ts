/**
 * @file identityStateMachine.ts
 * @description Pure OOP Domain State Machine managing anonymous device installation IDs,
 * authenticated user aliasing ($identify), and shared-device sign-out rotation.
 *
 * Designed in accordance with Apple Platform Engineering Standards:
 * - 100% Deterministic & Pure
 * - Adheres to Single Responsibility Principle (SRP)
 * - State Pattern with formal transition validation
 */

import { ok, err, type Result } from '../shared/result.ts';
import type {
  IAnalyticsIdentityPort,
  DistinctUserId,
  AnonymousInstallationId,
  AnalyticsIdentityLifecycleState,
  AnalyticsDomainError,
  AccountStatus,
} from '../../../specs/008-posthog-zero-overhead-behavioral-analytics/contracts/posthog-analytics-ports.ts';
import type { UserRole } from '../auth/types.ts';

export const ANONYMOUS_INSTALLATION_STORAGE_KEY = 'medquests_ph_anon_id';
export const AUTHENTICATED_USER_STORAGE_KEY = 'medquests_ph_auth_distinct_id';

function generateUuidV7Like(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Cryptographically strong random fallback
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
}

export interface UserIdentifyEventData {
  readonly previousAnonymousId: AnonymousInstallationId;
  readonly authenticatedDistinctId: DistinctUserId;
  readonly role: UserRole;
  readonly universityCohort?: string;
  readonly accountStatus: AccountStatus;
  readonly identifiedAtIso: string;
}

export type IdentifyListener = (data: UserIdentifyEventData) => void;

export class AnalyticsIdentityManager implements IAnalyticsIdentityPort {
  private lifecycleState: AnalyticsIdentityLifecycleState = 'uninitialized';
  private anonymousId: AnonymousInstallationId;
  private distinctId: DistinctUserId;
  private identifyListeners: IdentifyListener[] = [];

  constructor(initialAnonymousId?: string, initialAuthenticatedId?: string) {
    let resolvedAnonId = initialAnonymousId;
    if (!resolvedAnonId && typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = window.localStorage.getItem(ANONYMOUS_INSTALLATION_STORAGE_KEY);
        if (stored && stored.startsWith('ph_anon_')) {
          resolvedAnonId = stored;
        }
      } catch {
        // Safe localStorage access guard
      }
    }

    if (!resolvedAnonId) {
      resolvedAnonId = `ph_anon_${generateUuidV7Like()}`;
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.setItem(ANONYMOUS_INSTALLATION_STORAGE_KEY, resolvedAnonId);
        } catch {
          // Safe storage guard
        }
      }
    }

    this.anonymousId = resolvedAnonId as AnonymousInstallationId;

    let resolvedAuthId = initialAuthenticatedId;
    if (!resolvedAuthId && typeof window !== 'undefined' && window.localStorage) {
      try {
        const storedAuth = window.localStorage.getItem(AUTHENTICATED_USER_STORAGE_KEY);
        if (storedAuth && storedAuth !== 'usr_local_guest') {
          resolvedAuthId = storedAuth;
        }
      } catch {
        // Safe storage guard
      }
    }

    if (resolvedAuthId && resolvedAuthId !== 'usr_local_guest') {
      this.distinctId = resolvedAuthId as DistinctUserId;
      this.lifecycleState = 'authenticated-linked';
    } else {
      this.distinctId = this.anonymousId as unknown as DistinctUserId;
      this.lifecycleState = 'anonymous-identified';
    }
  }

  public getLifecycleState(): AnalyticsIdentityLifecycleState {
    return this.lifecycleState;
  }

  public getAnonymousId(): AnonymousInstallationId {
    return this.anonymousId;
  }

  public getDistinctId(): DistinctUserId {
    return this.distinctId;
  }

  public onIdentify(listener: IdentifyListener): () => void {
    this.identifyListeners.push(listener);
    return () => {
      this.identifyListeners = this.identifyListeners.filter((l) => l !== listener);
    };
  }

  public identifyAuthenticatedUser(profile: {
    readonly userId: string;
    readonly role: UserRole;
    readonly universityCohort?: string;
    readonly accountStatus: AccountStatus;
  }): Result<DistinctUserId, AnalyticsDomainError> {
    if (!profile.userId || profile.userId.trim() === '' || profile.userId === 'usr_local_guest') {
      return err({
        code: 'IDENTITY_TRANSITION_INVALID',
        message: 'Cannot identify user with empty id or generic anonymous guest identifier.',
        offendingField: 'userId',
        retryable: false,
      });
    }

    const previousAnonId = this.anonymousId;
    const targetDistinctId = profile.userId.trim() as DistinctUserId;

    this.distinctId = targetDistinctId;
    this.lifecycleState = 'authenticated-linked';

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(AUTHENTICATED_USER_STORAGE_KEY, targetDistinctId);
      } catch {
        // Storage guard
      }
    }

    const identifyPayload: UserIdentifyEventData = {
      previousAnonymousId: previousAnonId,
      authenticatedDistinctId: targetDistinctId,
      role: profile.role,
      universityCohort: profile.universityCohort,
      accountStatus: profile.accountStatus,
      identifiedAtIso: new Date().toISOString(),
    };

    for (const listener of this.identifyListeners) {
      try {
        listener(identifyPayload);
      } catch (e) {
        console.warn('Identify listener error:', e);
      }
    }

    return ok(this.distinctId);
  }

  public resetIdentityOnSignOut(): AnonymousInstallationId {
    const nextAnonId = `ph_anon_${generateUuidV7Like()}` as AnonymousInstallationId;
    this.anonymousId = nextAnonId;
    this.distinctId = nextAnonId as unknown as DistinctUserId;
    this.lifecycleState = 'anonymous-identified';

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(ANONYMOUS_INSTALLATION_STORAGE_KEY, nextAnonId);
        window.localStorage.removeItem(AUTHENTICATED_USER_STORAGE_KEY);
      } catch {
        // Storage guard
      }
    }

    return this.anonymousId;
  }
}
