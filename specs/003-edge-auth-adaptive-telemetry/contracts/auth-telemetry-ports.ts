/**
 * Clean Architecture Domain Ports, Contracts & Fluid Motion Tokens
 * Feature: 003-edge-auth-adaptive-telemetry
 */

import type { Result } from '../../../src/domain/shared/result.ts';
import type {
  AuthState,
  UserProfile,
  UserRole,
  FeatureFlagKey,
  ActiveDeviceSession,
  EdgeNetworkTelemetry,
  ParsedDeviceProfile,
  ClientCapabilityProfile,
  PerformanceOverrideMode,
  AccountRestriction,
} from '../../../src/domain/auth/types.ts';

// ==========================================
// 1. DOMAIN ERROR DISCRIMINATED UNION
// ==========================================
export type AuthDomainError =
  | { readonly code: 'INVALID_CREDENTIALS'; readonly message: string }
  | { readonly code: 'ACCOUNT_BLOCKED'; readonly restriction: AccountRestriction }
  | { readonly code: 'SESSION_EXPIRED_OR_REVOKED'; readonly sessionId: string }
  | { readonly code: 'INSUFFICIENT_ROLE_PERMISSION'; readonly requiredRole: UserRole; readonly currentRole: UserRole }
  | { readonly code: 'CONCURRENT_DEVICE_LIMIT_EXCEEDED'; readonly maxAllowed: number }
  | { readonly code: 'NETWORK_OFFLINE_QUEUED'; readonly message: string };

// ==========================================
// 2. HEXAGONAL PORT: AUTHENTICATION & SESSION GATEWAY
// ==========================================
export interface SignInCredentials {
  readonly email: string;
  readonly password?: string;
  readonly provider?: 'email' | 'google' | 'apple' | 'github' | 'passkey';
  readonly idToken?: string;
  readonly displayName?: string;
  readonly avatarUrl?: string | null;
  readonly phoneNumber?: string | null;
  readonly claims?: Record<string, unknown>;
  readonly clientProfile: ClientCapabilityProfile;
}

export interface SignUpPayload extends SignInCredentials {
  readonly displayName: string;
  readonly universityName?: string;
  readonly academicYear?: number;
}

export interface ProgressSyncSummary {
  readonly mergedAttemptsCount: number;
  readonly mergedReviewCardsCount: number;
  readonly mergedBookmarksCount: number;
  readonly mergedNotesCount: number;
  readonly syncedAt: string;
}

export interface AuthGatewayPort {
  /**
   * Optimistically hydrates the current AuthState in < 1ms from local cache,
   * then asynchronously revalidates against the Cloudflare KV Edge endpoint.
   */
  getInitialOptimisticState(): AuthState;

  revalidateEdgeSession(signal?: AbortSignal): Promise<Result<AuthState, AuthDomainError>>;

  signIn(credentials: SignInCredentials): Promise<Result<{
    readonly state: AuthState;
    readonly syncSummary: ProgressSyncSummary;
  }, AuthDomainError>>;

  signUp(payload: SignUpPayload): Promise<Result<{
    readonly state: AuthState;
    readonly syncSummary: ProgressSyncSummary;
  }, AuthDomainError>>;

  signOut(scope?: 'current-device' | 'all-devices'): Promise<Result<AuthState, AuthDomainError>>;

  revokeDeviceSession(sessionId: string): Promise<Result<readonly ActiveDeviceSession[], AuthDomainError>>;
}

// ==========================================
// 3. HEXAGONAL PORT: EDGE TELEMETRY & KV SESSION CACHE (WORKER SIDE)
// ==========================================
export interface CloudflareRequestLike {
  readonly headers: { get(name: string): string | null };
  readonly cf?: Readonly<Record<string, unknown>>;
}

export interface EdgeTelemetryExtractorPort {
  /**
   * Pure 0ms extraction of geographical, ASN/ISP, TLS, and colocation metadata
   * from Cloudflare's incoming request.cf object and HTTP headers.
   */
  extractEdgeNetworkTelemetry(request: CloudflareRequestLike, nowIso: string): EdgeNetworkTelemetry;

  /**
   * Parses User-Agent, Sec-CH-UA client hints, and Accept-Language into a typed profile.
   */
  parseDeviceHeaderProfile(request: CloudflareRequestLike): ParsedDeviceProfile;
}

export interface EdgeKvCachePort {
  /**
   * Checks Workers KV (`sess:{tokenHash}` + `usr_guard:{userId}`) in ~2ms.
   */
  getCachedSession(tokenHash: string): Promise<ActiveDeviceSession | null>;

  setCachedSession(tokenHash: string, session: ActiveDeviceSession, ttlSeconds: number): Promise<void>;

  /**
   * Immediately purges session cache and writes user guard state on block or role change.
   */
  invalidateUserSessionsImmediately(userId: string, activeTokenHashes: readonly string[]): Promise<void>;
}

// ==========================================
// 4. HEXAGONAL PORT: ADMIN GOVERNANCE & SECURITY COMMANDS
// ==========================================
export interface UpdateUserRoleCommand {
  readonly actorUserId: string;
  readonly targetUserId: string;
  readonly newRole: UserRole;
  readonly customFeatureOverrides?: Partial<Record<FeatureFlagKey, boolean>>;
}

export interface BlockUserAccountCommand {
  readonly actorUserId: string;
  readonly targetUserId: string;
  readonly status: 'active' | 'blocked' | 'suspended';
  readonly reason: string | null;
  readonly blockedUntilIso: string | null;
}

export interface AdminGovernancePort {
  listUsers(): Promise<Result<readonly UserProfile[], AuthDomainError>>;
  updateUserRoleAndEntitlements(cmd: UpdateUserRoleCommand): Promise<Result<UserProfile, AuthDomainError>>;
  setUserAccountRestriction(cmd: BlockUserAccountCommand): Promise<Result<UserProfile, AuthDomainError>>;
}

// ==========================================
// 5. HEXAGONAL PORT: CLIENT HARDWARE PROBE & ADAPTIVE UX ENGINE
// ==========================================
export interface ClientCapabilityDetectorPort {
  /**
   * Synchronous < 0.5ms probe of safe Web APIs (Intl timezone, CPU cores, RAM,
   * Network Information API, DPR, prefers-reduced-motion).
   * Never calls deprecated or main-thread-blocking fingerprinting APIs.
   */
  probeCapabilities(overrideMode?: PerformanceOverrideMode): ClientCapabilityProfile;

  /**
   * Applies `data-perf-tier="ultra|balanced|low-spec"` to `document.documentElement`
   * and returns a cleanup callback for media/network change listeners.
   */
  bindAdaptiveCompositorAttributes(profile: ClientCapabilityProfile): void;
}

// ==========================================
// 6. FLUID 60/120FPS MOTION & COMPOSITOR TOKENS
// ==========================================
export const FLUID_MOTION_TOKENS = {
  springOpen: 'cubic-bezier(0.22, 1, 0.36, 1)',      // Apple fluid spring response
  sheetSlide: 'cubic-bezier(0.32, 0.72, 0, 1)',       // iOS native sheet curve
  crispExit: 'cubic-bezier(0.4, 0, 1, 1)',            // Fast clean dismissal
  durationsByTier: {
    ultra: {
      modalOpenMs: 240,
      modalCloseMs: 160,
      staggerStepMs: 35,
      microHoverMs: 200,
    },
    balanced: {
      modalOpenMs: 180,
      modalCloseMs: 130,
      staggerStepMs: 20,
      microHoverMs: 150,
    },
    'low-spec': {
      modalOpenMs: 70,
      modalCloseMs: 50,
      staggerStepMs: 0,
      microHoverMs: 0,
    },
  },
} as const;

// ==========================================
// 7. PURE ENTITLEMENT EVALUATION CONTRACT
// ==========================================
export type EntitlementCheckFn = (
  role: UserRole,
  customOverrides: Partial<Record<FeatureFlagKey, boolean>>,
  flag: FeatureFlagKey
) => boolean;
