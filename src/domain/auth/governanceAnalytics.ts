import { z } from 'zod';
import type {
  UserId,
  UserRole,
  UserProfile,
  FeatureFlagKey,
  FeatureEntitlementMap,
  ActiveDeviceSession,
  SecurityAnomalyFlag,
  PerformanceTier,
  DeviceMarketTier,
} from './types.ts';
import { ROLE_ENTITLEMENT_POLICIES, rolePolicyEvaluator } from './entitlements.ts';

// ==========================================
// 1. DOMAIN MODELS FOR USER TELEMETRY & GOVERNANCE
// ==========================================

export const UserStudyTelemetrySchema = z.object({
  totalAttempts: z.number().int().min(0),
  overallAccuracy: z.number().min(0).max(100),
  masteryPercentage: z.number().min(0).max(100),
  weakTopicsCount: z.number().int().min(0),
  dueReviewsCount: z.number().int().min(0),
  dailyAiRequestsUsed: z.number().int().min(0),
  favoriteSubspecialty: z.string(),
  avgPaceSeconds: z.number().min(0).optional(),
  streakDays: z.number().int().min(0).optional(),
});
export type UserStudyTelemetry = z.infer<typeof UserStudyTelemetrySchema>;

export interface ManagedUserRecord {
  readonly profile: UserProfile;
  readonly entitlements: FeatureEntitlementMap;
  readonly studyTelemetry: UserStudyTelemetry;
  readonly activeSessions: readonly ActiveDeviceSession[];
  readonly dailyAiRequestsLimit: number;
}

export const SecurityAuditActionSchema = z.enum([
  'ROLE_UPDATED',
  'FEATURE_FLAG_OVERRIDDEN',
  'ACCOUNT_BLOCKED',
  'ACCOUNT_SUSPENDED',
  'ACCOUNT_UNBLOCKED',
  'SESSION_REVOKED',
  'ANOMALY_QUARANTINED',
  'KV_CACHE_HYDRATED',
  'QUESTION_BANK_EXPORTED',
]);
export type SecurityAuditAction = z.infer<typeof SecurityAuditActionSchema>;

export interface SecurityAuditLogEntry {
  readonly id: string;
  readonly actorUserId: UserId;
  readonly actorDisplayName: string;
  readonly targetUserId: UserId;
  readonly targetDisplayName: string;
  readonly action: SecurityAuditAction;
  readonly summary: string;
  readonly edgeColo: string;
  readonly latencyMs: number;
  readonly createdAt: string;
}

// ==========================================
// 2. SPECIFICATION PATTERN: USER DIRECTORY FILTERING
// ==========================================

export type AiFeatureFilterMode = 'all' | 'ai-enabled' | 'ai-excluded';
export type RestrictionFilterMode = 'all' | 'active' | 'restricted' | 'anomalous';

export interface UserDirectoryFilterSpec {
  readonly searchQuery: string;
  readonly roleFilter: UserRole | 'all';
  readonly restrictionFilter: RestrictionFilterMode;
  readonly aiFeatureFilter: AiFeatureFilterMode;
}

export interface IUserSpecification {
  isSatisfiedBy(record: ManagedUserRecord): boolean;
}

/**
 * Composite Specification Pattern (Open/Closed & Single Responsibility Principles).
 * Evaluates whether a ManagedUserRecord matches the active administrative filter criteria.
 */
export class UserDirectoryFilterSpecification implements IUserSpecification {
  private readonly spec: UserDirectoryFilterSpec;

  public constructor(spec: UserDirectoryFilterSpec) {
    this.spec = spec;
  }

  public isSatisfiedBy(record: ManagedUserRecord): boolean {
    const { profile, entitlements, activeSessions } = record;
    const query = this.spec.searchQuery.trim().toLowerCase();

    if (query.length > 0) {
      const matchesName = profile.displayName.toLowerCase().includes(query);
      const matchesEmail = profile.email.toLowerCase().includes(query);
      const matchesUni = (profile.universityName ?? '').toLowerCase().includes(query);
      const matchesColo = activeSessions.some((s) =>
        s.edgeNetwork.colo.toLowerCase().includes(query) ||
        s.edgeNetwork.countryName.toLowerCase().includes(query)
      );
      if (!matchesName && !matchesEmail && !matchesUni && !matchesColo) {
        return false;
      }
    }

    if (this.spec.roleFilter !== 'all' && profile.role !== this.spec.roleFilter) {
      return false;
    }

    if (this.spec.restrictionFilter === 'active' && profile.restriction.status !== 'active') {
      return false;
    }

    if (
      this.spec.restrictionFilter === 'restricted' &&
      profile.restriction.status === 'active'
    ) {
      return false;
    }

    if (this.spec.restrictionFilter === 'anomalous') {
      const hasAnomaly = activeSessions.some((s) => s.anomalyFlags.length > 0);
      if (!hasAnomaly) return false;
    }

    if (
      this.spec.aiFeatureFilter === 'ai-enabled' &&
      !entitlements.ai_cloud_streaming_quota
    ) {
      return false;
    }

    if (
      this.spec.aiFeatureFilter === 'ai-excluded' &&
      entitlements.ai_cloud_streaming_quota
    ) {
      return false;
    }

    return true;
  }
}

export function filterManagedUsers(
  users: readonly ManagedUserRecord[],
  filterSpec: UserDirectoryFilterSpec
): readonly ManagedUserRecord[] {
  const specification = new UserDirectoryFilterSpecification(filterSpec);
  return users.filter((u) => specification.isSatisfiedBy(u));
}

// ==========================================
// 3. PLATFORM COHORT & TELEMETRY ANALYTICS MODELS
// ==========================================

export interface ColoTrafficStat {
  readonly colo: string;
  readonly countryCode: string;
  readonly city: string | null;
  readonly activeSessionsCount: number;
  readonly avgLatencyMs: number;
  readonly kvHitRatioPercent: number;
}

export interface UniversityCohortStat {
  readonly universityName: string;
  readonly scholarsCount: number;
  readonly totalAttempts: number;
  readonly avgAccuracy: number;
  readonly avgMastery: number;
  readonly aiEnabledCount: number;
}

export interface PlatformAnalyticsSnapshot {
  readonly totalUsers: number;
  readonly activeUsersCount: number;
  readonly blockedOrSuspendedCount: number;
  readonly totalActiveSessions: number;
  readonly anomalousUsersCount: number;

  // Academic & Study Stats Across All Users
  readonly globalTotalAttempts: number;
  readonly globalAverageAccuracy: number;
  readonly globalAverageMastery: number;
  readonly globalDueReviews: number;

  // AI Feature Activation & Quota Stats
  readonly aiCloudEnabledUsersCount: number;
  readonly aiCloudExcludedUsersCount: number;
  readonly totalDailyAiRequestsUsed: number;
  readonly totalDailyAiRequestsCapacity: number;

  // Edge KV & Latency Stats
  readonly globalAvgEdgeLatencyMs: number;
  readonly globalKvHitRatePercent: number;

  // Breakdowns
  readonly roleBreakdown: Readonly<Record<UserRole, number>>;
  readonly tierBreakdown: Readonly<Record<PerformanceTier, number>>;
  readonly marketTierBreakdown: Readonly<Record<DeviceMarketTier, number>>;
  readonly anomalyBreakdown: Readonly<Record<SecurityAnomalyFlag, number>>;
  readonly coloDistribution: readonly ColoTrafficStat[];
  readonly universityCohorts: readonly UniversityCohortStat[];
}

export interface IPlatformAnalyticsAggregator {
  aggregate(users: readonly ManagedUserRecord[]): PlatformAnalyticsSnapshot;
}

/**
 * Pure Domain Service: Aggregates cross-user study metrics, AI entitlements,
 * hardware tiers, and Cloudflare Edge telemetry into an immutable snapshot.
 */
export class PlatformAnalyticsAggregator implements IPlatformAnalyticsAggregator {
  public aggregate(users: readonly ManagedUserRecord[]): PlatformAnalyticsSnapshot {
    const roleBreakdown: Record<UserRole, number> = {
      anonymous: 0,
      'student-free': 0,
      'student-pro': 0,
      'faculty-reviewer': 0,
      admin: 0,
    };

    const tierBreakdown: Record<PerformanceTier, number> = {
      ultra: 0,
      balanced: 0,
      'low-spec': 0,
    };

    const marketTierBreakdown: Record<DeviceMarketTier, number> = {
      'flagship-luxury': 0,
      'upper-midrange': 0,
      'mid-range': 0,
      economical: 0,
    };

    const anomalyBreakdown: Record<SecurityAnomalyFlag, number> = {
      impossible_travel_geo_shift: 0,
      excessive_concurrent_devices: 0,
      high_threat_ip_score: 0,
      rapid_failed_auth_attempts: 0,
    };

    let activeUsersCount = 0;
    let blockedOrSuspendedCount = 0;
    let totalActiveSessions = 0;
    let anomalousUsersCount = 0;

    let globalTotalAttempts = 0;
    let accuracySum = 0;
    let masterySum = 0;
    let globalDueReviews = 0;

    let aiCloudEnabledUsersCount = 0;
    let aiCloudExcludedUsersCount = 0;
    let totalDailyAiRequestsUsed = 0;
    let totalDailyAiRequestsCapacity = 0;

    let totalLatencyMs = 0;
    let kvHitCount = 0;

    const coloMap = new Map<
      string,
      {
        countryCode: string;
        city: string | null;
        sessions: number;
        latencySum: number;
        kvHits: number;
      }
    >();

    const uniMap = new Map<
      string,
      {
        scholars: number;
        attempts: number;
        accuracySum: number;
        masterySum: number;
        aiEnabled: number;
      }
    >();

    for (const record of users) {
      const { profile, entitlements, studyTelemetry, activeSessions } = record;

      roleBreakdown[profile.role] = (roleBreakdown[profile.role] ?? 0) + 1;

      if (profile.restriction.status === 'active') {
        activeUsersCount += 1;
      } else {
        blockedOrSuspendedCount += 1;
      }

      globalTotalAttempts += studyTelemetry.totalAttempts;
      accuracySum += studyTelemetry.overallAccuracy;
      masterySum += studyTelemetry.masteryPercentage;
      globalDueReviews += studyTelemetry.dueReviewsCount;

      if (entitlements.ai_cloud_streaming_quota && profile.restriction.status === 'active') {
        aiCloudEnabledUsersCount += 1;
        totalDailyAiRequestsCapacity += record.dailyAiRequestsLimit;
      } else {
        aiCloudExcludedUsersCount += 1;
      }
      totalDailyAiRequestsUsed += studyTelemetry.dailyAiRequestsUsed;

      // University cohort aggregation
      const uniName = profile.universityName ?? 'Independent Medical Scholar';
      const existingUni = uniMap.get(uniName) ?? {
        scholars: 0,
        attempts: 0,
        accuracySum: 0,
        masterySum: 0,
        aiEnabled: 0,
      };
      uniMap.set(uniName, {
        scholars: existingUni.scholars + 1,
        attempts: existingUni.attempts + studyTelemetry.totalAttempts,
        accuracySum: existingUni.accuracySum + studyTelemetry.overallAccuracy,
        masterySum: existingUni.masterySum + studyTelemetry.masteryPercentage,
        aiEnabled:
          existingUni.aiEnabled + (entitlements.ai_cloud_streaming_quota ? 1 : 0),
      });

      let userHasAnomaly = false;
      for (const session of activeSessions) {
        totalActiveSessions += 1;
        tierBreakdown[session.clientTier] = (tierBreakdown[session.clientTier] ?? 0) + 1;
        const mTier: DeviceMarketTier = session.device.marketTier ?? 'mid-range';
        marketTierBreakdown[mTier] = (marketTierBreakdown[mTier] ?? 0) + 1;
        totalLatencyMs += session.edgeVerificationLatencyMs;

        const isHit = session.kvCacheStatus === 'hit';
        if (isHit) {
          kvHitCount += 1;
        }

        if (session.anomalyFlags.length > 0) {
          userHasAnomaly = true;
          for (const flag of session.anomalyFlags) {
            anomalyBreakdown[flag] = (anomalyBreakdown[flag] ?? 0) + 1;
          }
        }

        const coloKey = session.edgeNetwork.colo;
        const existingColo = coloMap.get(coloKey) ?? {
          countryCode: session.edgeNetwork.countryCode,
          city: session.edgeNetwork.city,
          sessions: 0,
          latencySum: 0,
          kvHits: 0,
        };
        coloMap.set(coloKey, {
          countryCode: existingColo.countryCode,
          city: existingColo.city,
          sessions: existingColo.sessions + 1,
          latencySum: existingColo.latencySum + session.edgeVerificationLatencyMs,
          kvHits: existingColo.kvHits + (isHit ? 1 : 0),
        });
      }

      if (userHasAnomaly) {
        anomalousUsersCount += 1;
      }
    }

    const userCount = Math.max(users.length, 1);
    const sessionCount = Math.max(totalActiveSessions, 1);

    const coloDistribution: ColoTrafficStat[] = Array.from(coloMap.entries())
      .map(([colo, data]) => ({
        colo,
        countryCode: data.countryCode,
        city: data.city,
        activeSessionsCount: data.sessions,
        avgLatencyMs: Number((data.latencySum / Math.max(data.sessions, 1)).toFixed(2)),
        kvHitRatioPercent: Math.round((data.kvHits / Math.max(data.sessions, 1)) * 100),
      }))
      .sort((a, b) => b.activeSessionsCount - a.activeSessionsCount);

    const universityCohorts: UniversityCohortStat[] = Array.from(uniMap.entries())
      .map(([universityName, data]) => ({
        universityName,
        scholarsCount: data.scholars,
        totalAttempts: data.attempts,
        avgAccuracy: Math.round(data.accuracySum / Math.max(data.scholars, 1)),
        avgMastery: Math.round(data.masterySum / Math.max(data.scholars, 1)),
        aiEnabledCount: data.aiEnabled,
      }))
      .sort((a, b) => b.totalAttempts - a.totalAttempts);

    return {
      totalUsers: users.length,
      activeUsersCount,
      blockedOrSuspendedCount,
      totalActiveSessions,
      anomalousUsersCount,
      globalTotalAttempts,
      globalAverageAccuracy: Math.round(accuracySum / userCount),
      globalAverageMastery: Math.round(masterySum / userCount),
      globalDueReviews,
      aiCloudEnabledUsersCount,
      aiCloudExcludedUsersCount,
      totalDailyAiRequestsUsed,
      totalDailyAiRequestsCapacity,
      globalAvgEdgeLatencyMs: Number((totalLatencyMs / sessionCount).toFixed(2)),
      globalKvHitRatePercent: Math.round((kvHitCount / sessionCount) * 100),
      roleBreakdown,
      tierBreakdown,
      marketTierBreakdown,
      anomalyBreakdown,
      coloDistribution,
      universityCohorts,
    };
  }
}

export const platformAnalyticsAggregator = new PlatformAnalyticsAggregator();

export function computePlatformAnalytics(
  users: readonly ManagedUserRecord[]
): PlatformAnalyticsSnapshot {
  return platformAnalyticsAggregator.aggregate(users);
}

/**
 * Helper factory to hydrate a ManagedUserRecord from a UserProfile, study telemetry,
 * and active sessions while computing deterministic RBAC + override entitlements.
 */
export function buildManagedUserRecord(params: {
  readonly profile: UserProfile;
  readonly studyTelemetry: UserStudyTelemetry;
  readonly activeSessions: readonly ActiveDeviceSession[];
}): ManagedUserRecord {
  const entitlements = rolePolicyEvaluator.resolveEntitlements(
    params.profile.role,
    params.profile.customFeatureOverrides as Partial<Record<FeatureFlagKey, boolean>>
  );
  const policy = ROLE_ENTITLEMENT_POLICIES[params.profile.role];
  const dailyAiRequestsLimit = entitlements.ai_cloud_streaming_quota
    ? Math.max(policy.dailyCloudAiRequestsLimit, 50)
    : 0;

  return {
    profile: params.profile,
    entitlements,
    studyTelemetry: params.studyTelemetry,
    activeSessions: params.activeSessions,
    dailyAiRequestsLimit,
  };
}
