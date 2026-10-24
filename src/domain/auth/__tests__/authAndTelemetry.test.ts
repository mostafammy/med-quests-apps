import { describe, it, expect } from 'vitest';
import {
  RolePolicyEvaluator,
  hasFeatureEntitlement,
  ROLE_ENTITLEMENT_POLICIES,
} from '../entitlements.ts';
import {
  HardwareTierClassifierService,
  computePerformanceTier,
} from '../hardwareTier.ts';
import {
  ProgressMergeService,
  mergeLocalProgressIntoAccount,
} from '../progressMerge.ts';
import {
  extractEdgeNetworkTelemetry,
  parseDeviceHeaderProfile,
} from '../telemetryParser.ts';
import {
  SessionAnomalyDetectorService,
} from '../anomalyDetector.ts';
import {
  computePlatformAnalytics,
  filterManagedUsers,
  buildManagedUserRecord,
} from '../governanceAnalytics.ts';
import { resolveAiEngine } from '../../../infrastructure/ai/engineRegistry.ts';
import { edgeAuthGateway } from '../../../infrastructure/auth/edgeAuthGateway.ts';
import type { Attempt, ReviewCard } from '../../model/types.ts';
import type { ActiveDeviceSession } from '../types.ts';

describe('Auth & Role Policy Evaluator (P6 / SOLID)', () => {
  const evaluator = new RolePolicyEvaluator();

  it('provides immutable role policies for all defined roles', () => {
    expect(ROLE_ENTITLEMENT_POLICIES.anonymous.role).toBe('anonymous');
    expect(ROLE_ENTITLEMENT_POLICIES['student-pro'].maxConcurrentDevices).toBe(4);
    expect(ROLE_ENTITLEMENT_POLICIES.admin.maxConcurrentDevices).toBe(10);
  });

  it('guarantees Constitution P1/P8 invariants (local practice is never disabled)', () => {
    const guestEntitlements = evaluator.resolveEntitlements('anonymous');
    expect(guestEntitlements.local_practice_and_mock).toBe(true);
    expect(guestEntitlements.local_grounded_copilot).toBe(true);
    expect(guestEntitlements.cloud_sync_backup).toBe(false);

    // Overriding local_practice_and_mock to false must still be forced to true
    const overridden = evaluator.resolveEntitlements('anonymous', {
      local_practice_and_mock: false,
    });
    expect(overridden.local_practice_and_mock).toBe(true);
  });

  it('correctly gates studio authoring and admin governance', () => {
    expect(hasFeatureEntitlement('student-free', 'question_studio_author')).toBe(false);
    expect(hasFeatureEntitlement('faculty-reviewer', 'question_studio_author')).toBe(true);
    expect(hasFeatureEntitlement('admin', 'security_governance_admin')).toBe(true);
    expect(hasFeatureEntitlement('student-pro', 'security_governance_admin')).toBe(false);
  });
});

describe('Hardware Tier Classifier (Compositor Optimization)', () => {
  const classifier = new HardwareTierClassifierService();

  it('forces low-spec tier when prefersReducedMotion or saveData is active', () => {
    expect(
      classifier.classify({
        logicalCpuCores: 16,
        deviceMemoryGb: 16,
        effectiveNetworkType: '4g',
        saveDataEnabled: false,
        prefersReducedMotion: true,
        devicePixelRatio: 2,
      })
    ).toBe('low-spec');

    expect(
      classifier.classify({
        logicalCpuCores: 8,
        deviceMemoryGb: 8,
        effectiveNetworkType: '4g',
        saveDataEnabled: true,
        prefersReducedMotion: false,
        devicePixelRatio: 2,
      })
    ).toBe('low-spec');
  });

  it('forces low-spec tier on slow cellular connections (3G/2G)', () => {
    expect(
      computePerformanceTier({
        logicalCpuCores: 8,
        deviceMemoryGb: 8,
        effectiveNetworkType: '3g',
        saveDataEnabled: false,
        prefersReducedMotion: false,
        devicePixelRatio: 2,
      })
    ).toBe('low-spec');
  });

  it('resolves ultra tier for high-spec desktop / tablet (>=8 cores, >=8GB, DPR >= 2)', () => {
    expect(
      computePerformanceTier({
        logicalCpuCores: 10,
        deviceMemoryGb: 16,
        effectiveNetworkType: '4g',
        saveDataEnabled: false,
        prefersReducedMotion: false,
        devicePixelRatio: 2,
      })
    ).toBe('ultra');
  });

  it('resolves balanced tier for standard 4-6 core machines', () => {
    expect(
      computePerformanceTier({
        logicalCpuCores: 4,
        deviceMemoryGb: 4,
        effectiveNetworkType: '4g',
        saveDataEnabled: false,
        prefersReducedMotion: false,
        devicePixelRatio: 1,
      })
    ).toBe('balanced');
  });
});

describe('CRDT Local-to-Cloud Progress Merge (Zero Data Loss)', () => {
  const merger = new ProgressMergeService();

  it('merges and deduplicates attempts chronologically', () => {
    const localAttempt: Attempt = {
      id: 'att_local_1',
      questionId: 'q-cvs-001',
      blockId: 'cvs',
      sessionId: 'ses_1',
      mode: 'practice',
      selectedChoiceId: 'b',
      isCorrect: true,
      confidence: 'sure',
      responseTimeMs: 3400,
      answeredAt: '2026-10-24T10:00:00Z',
    };

    const remoteAttempt: Attempt = {
      id: 'att_remote_1',
      questionId: 'q-cvs-002',
      blockId: 'cvs',
      sessionId: 'ses_2',
      mode: 'practice',
      selectedChoiceId: 'c',
      isCorrect: false,
      confidence: 'unsure',
      responseTimeMs: 5100,
      answeredAt: '2026-10-24T09:00:00Z',
    };

    const result = merger.merge({
      localAttempts: [localAttempt],
      remoteAttempts: [remoteAttempt],
      localReviewCards: [],
      remoteReviewCards: [],
      localBookmarks: [],
      remoteBookmarks: [],
      localNotes: [],
      remoteNotes: [],
    });

    expect(result.mergedAttempts.length).toBe(2);
    expect(result.mergedAttempts[0].id).toBe('att_remote_1'); // older first
    expect(result.mergedAttempts[1].id).toBe('att_local_1');
    expect(result.stats.newAttemptsAdded).toBe(1);
  });

  it('resolves review card conflicts by taking the latest reviewed state', () => {
    const localCard: ReviewCard = {
      questionId: 'q-cvs-001',
      blockId: 'cvs',
      easeFactor: 2.5,
      intervalDays: 6,
      repetitions: 3,
      lapses: 0,
      dueAt: '2026-10-30T00:00:00Z',
      lastReviewedAt: '2026-10-24T12:00:00Z',
    };

    const staleRemoteCard: ReviewCard = {
      questionId: 'q-cvs-001',
      blockId: 'cvs',
      easeFactor: 2.5,
      intervalDays: 1,
      repetitions: 1,
      lapses: 0,
      dueAt: '2026-10-21T00:00:00Z',
      lastReviewedAt: '2026-10-20T12:00:00Z',
    };

    const result = mergeLocalProgressIntoAccount({
      localAttempts: [],
      remoteAttempts: [],
      localReviewCards: [localCard],
      remoteReviewCards: [staleRemoteCard],
      localBookmarks: [],
      remoteBookmarks: [],
      localNotes: [],
      remoteNotes: [],
    });

    expect(result.mergedReviewCards.length).toBe(1);
    expect(result.mergedReviewCards[0].repetitions).toBe(3);
    expect(result.mergedReviewCards[0].intervalDays).toBe(6);
  });
});

describe('Edge Telemetry & Anomaly Detector', () => {
  it('extracts request.cf telemetry with fallback in local dev', () => {
    const localReq = { headers: new Headers({ 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' }) };
    const parsed = extractEdgeNetworkTelemetry(localReq);
    expect(parsed.colo).toBe('LOCAL');
    expect(parsed.countryCode).toBe('DEV');

    const device = parseDeviceHeaderProfile(localReq);
    expect(device.osName).toBe('macOS');
    expect(device.deviceCategory).toBe('desktop');
  });

  it('detects impossible travel geo shifts across active sessions', () => {
    const detector = new SessionAnomalyDetectorService();
    const sessionEgypt: ActiveDeviceSession = {
      sessionId: 'ses_eg',
      userId: 'usr_1',
      isCurrentDevice: true,
      device: {
        deviceCategory: 'desktop',
        osName: 'macOS',
        osVersion: '15',
        browserName: 'Chrome',
        browserVersion: '131',
        browserEngine: 'Blink',
        cpuArchitecture: 'arm64',
        isMobileHint: false,
        preferredLanguage: 'en',
        rawUserAgent: 'agent',
      },
      edgeNetwork: {
        ipAddress: '156.208.1.1',
        countryCode: 'EG',
        countryName: 'Egypt',
        city: 'Cairo',
        region: 'Cairo',
        continent: 'AF',
        latitude: 30,
        longitude: 31,
        postalCode: '11511',
        edgeTimezone: 'Africa/Cairo',
        asn: 8452,
        ispOrganization: 'TE',
        colo: 'CAI',
        httpProtocol: 'HTTP/3',
        tlsVersion: 'TLSv1.3',
        ja4Fingerprint: null,
        threatScore: 0,
        capturedAt: '2026-10-24T12:00:00Z',
      },
      clientTimezone: 'Africa/Cairo',
      clientTier: 'ultra',
      anomalyFlags: [],
      createdAt: '2026-10-24T12:00:00Z',
      lastVerifiedAt: '2026-10-24T12:00:00Z',
      expiresAt: '2026-11-24T12:00:00Z',
      kvCacheStatus: 'hit',
      edgeVerificationLatencyMs: 1.8,
    };

    const sessionLondon10MinutesAgo: ActiveDeviceSession = {
      ...sessionEgypt,
      sessionId: 'ses_uk',
      lastVerifiedAt: '2026-10-24T11:50:00Z', // 10 minutes prior
      edgeNetwork: {
        ...sessionEgypt.edgeNetwork,
        countryCode: 'GB',
        countryName: 'United Kingdom',
        city: 'London',
        colo: 'LHR',
      },
    };

    const anomalies = detector.evaluateAnomalies({
      currentSession: sessionEgypt,
      existingSessions: [sessionLondon10MinutesAgo],
      userRole: 'student-free',
    });

    expect(anomalies).toContain('impossible_travel_geo_shift');
  });
});

describe('Enterprise Governance, Per-User AI Activation/Exclusion & Cohort Analytics', () => {
  it('allows activating Cloud AI for a free student and excluding it from a Pro user', () => {
    // 1. Free student granted AI scholarship override
    expect(
      hasFeatureEntitlement('student-free', 'ai_cloud_streaming_quota', {
        ai_cloud_streaming_quota: true,
      })
    ).toBe(true);

    // 2. Pro student excluded from Cloud AI due to quota abuse
    expect(
      hasFeatureEntitlement('student-pro', 'ai_cloud_streaming_quota', {
        ai_cloud_streaming_quota: false,
      })
    ).toBe(false);
  });

  it('enforces AI Entitlement Guard in resolveAiEngine when user is excluded or blocked', () => {
    const cloudSettings = {
      engine: 'groq' as const,
      openRouterApiKey: '',
      openRouterModel: '',
      groqApiKey: 'gsk_test_live_key_12345',
      groqModel: 'llama-3.3-70b-versatile',
      geminiApiKey: '',
      geminiModel: 'gemini-2.5-flash',
    };

    // Allowed user gets GroqCloudEngine
    const allowedEngine = resolveAiEngine(cloudSettings, {
      isCloudStreamingAllowed: true,
      isAccountRestricted: false,
    });
    expect(allowedEngine.id).toBe('groq');

    // Excluded user is strictly routed to OpenRouter fallback
    const excludedEngine = resolveAiEngine(cloudSettings, {
      isCloudStreamingAllowed: false,
      isAccountRestricted: false,
    });
    expect(excludedEngine.id).toBe('openrouter');

    // Blocked user is strictly routed to OpenRouter fallback
    const blockedEngine = resolveAiEngine(cloudSettings, {
      isCloudStreamingAllowed: true,
      isAccountRestricted: true,
    });
    expect(blockedEngine.id).toBe('openrouter');
  });

  it('aggregates platform-wide cohort analytics and filters the user directory accurately', () => {
    const cohort = edgeAuthGateway.getManagedUsers();
    expect(cohort.length).toBeGreaterThanOrEqual(5);

    const analytics = computePlatformAnalytics(cohort);
    expect(analytics.totalUsers).toBe(cohort.length);
    expect(analytics.globalTotalAttempts).toBeGreaterThan(1000);
    expect(analytics.aiCloudEnabledUsersCount).toBeGreaterThan(0);
    expect(analytics.aiCloudExcludedUsersCount).toBeGreaterThan(0);
    expect(analytics.universityCohorts.length).toBeGreaterThanOrEqual(3);
    expect(analytics.coloDistribution.some((c) => c.colo === 'CAI')).toBe(true);

    // Filter by AI-excluded users
    const excludedUsers = filterManagedUsers(cohort, {
      searchQuery: '',
      roleFilter: 'all',
      restrictionFilter: 'all',
      aiFeatureFilter: 'ai-excluded',
    });
    expect(excludedUsers.every((u) => !u.entitlements.ai_cloud_streaming_quota)).toBe(true);

    // Filter by anomalous sessions
    const anomalousUsers = filterManagedUsers(cohort, {
      searchQuery: '',
      roleFilter: 'all',
      restrictionFilter: 'anomalous',
      aiFeatureFilter: 'all',
    });
    expect(anomalousUsers.length).toBeGreaterThan(0);

    // Build custom record and verify deterministic entitlement resolution
    const customRecord = buildManagedUserRecord({
      profile: {
        ...cohort[0].profile,
        role: 'student-free',
        customFeatureOverrides: { ai_cloud_streaming_quota: true },
      },
      studyTelemetry: cohort[0].studyTelemetry,
      activeSessions: cohort[0].activeSessions,
    });
    expect(customRecord.entitlements.ai_cloud_streaming_quota).toBe(true);
    expect(customRecord.dailyAiRequestsLimit).toBeGreaterThanOrEqual(50);
  });
});
