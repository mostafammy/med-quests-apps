import { z } from 'zod';

// ==========================================
// 1. PRIMITIVE IDENTIFIERS
// ==========================================
export type UserId = string;
export type AuthSessionId = string;
export type AuditEventId = string;
export type EdgeColoCode = string;

// ==========================================
// 2. ROLES & GRANULAR FEATURE ENTITLEMENTS
// ==========================================
export const UserRoleSchema = z.enum([
  'anonymous',        // Default local-first guest (100% free offline access)
  'student-free',     // Authenticated student (cloud sync + standard features)
  'student-pro',      // Pro tier (high-rate AI cloud streaming + multi-block early access)
  'faculty-reviewer', // Medical faculty (Question Studio authoring & verification access)
  'admin',            // Platform administrator (full user governance & security console)
]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const FeatureFlagKeySchema = z.enum([
  'local_practice_and_mock',  // Always true for all roles (Constitution P1/P8)
  'local_grounded_copilot',   // Always true for all roles (Offline Socratic Tutor)
  'cloud_sync_backup',        // True for authenticated roles
  'ai_cloud_streaming_quota', // Enabled for student-pro, faculty-reviewer, admin
  'multi_block_unlock',       // Unlock additional blocks (RRS, Hematology, GIT)
  'question_studio_author',   // Author & verify questions in /studio
  'security_governance_admin', // Inspect users, toggle roles, block/unblock accounts
]);
export type FeatureFlagKey = z.infer<typeof FeatureFlagKeySchema>;

export type FeatureEntitlementMap = Readonly<Record<FeatureFlagKey, boolean>>;

// ==========================================
// 3. PARSED DEVICE & CLIENT HEADER PROFILE
// ==========================================
export const DeviceCategorySchema = z.enum([
  'desktop',
  'tablet',
  'mobile',
  'smart-tv',
  'bot',
  'unknown',
]);
export type DeviceCategory = z.infer<typeof DeviceCategorySchema>;

export const ParsedDeviceProfileSchema = z.object({
  deviceCategory: DeviceCategorySchema,
  osName: z.string(),
  osVersion: z.string().nullable(),
  browserName: z.string(),
  browserVersion: z.string().nullable(),
  browserEngine: z.enum(['WebKit', 'Blink', 'Gecko', 'Unknown']),
  cpuArchitecture: z.string().nullable(),
  isMobileHint: z.boolean(),
  preferredLanguage: z.string(),
  rawUserAgent: z.string(),
});
export type ParsedDeviceProfile = z.infer<typeof ParsedDeviceProfileSchema>;

// ==========================================
// 4. CLOUDFLARE EDGE GEO & NETWORK TELEMETRY
// ==========================================
export const EdgeNetworkTelemetrySchema = z.object({
  ipAddress: z.string(),
  countryCode: z.string().length(2).or(z.literal('DEV')),
  countryName: z.string(),
  city: z.string().nullable(),
  region: z.string().nullable(),
  continent: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  postalCode: z.string().nullable(),
  edgeTimezone: z.string().nullable(),
  asn: z.number().nullable(),
  ispOrganization: z.string().nullable(),
  colo: z.string(),
  httpProtocol: z.string(),
  tlsVersion: z.string(),
  ja4Fingerprint: z.string().nullable().default(null),
  threatScore: z.number().min(0).max(100).nullable().default(null),
  capturedAt: z.string(),
});
export type EdgeNetworkTelemetry = z.infer<typeof EdgeNetworkTelemetrySchema>;

// ==========================================
// 5. CLIENT HARDWARE & ADAPTIVE UX PERFORMANCE MODEL
// ==========================================
export const PerformanceTierSchema = z.enum([
  'ultra',    // 120fps spring physics, full multi-pass backdrop blur, ambient floating orbs
  'balanced', // 60fps GPU transform/opacity, moderate blur, static ambient background
  'low-spec', // 0 blur overdraw, crisp high-contrast surfaces, <70ms fast opacity transitions
]);
export type PerformanceTier = z.infer<typeof PerformanceTierSchema>;

export const PerformanceOverrideModeSchema = z.enum([
  'auto',
  'ultra',
  'balanced',
  'low-spec',
]);
export type PerformanceOverrideMode = z.infer<typeof PerformanceOverrideModeSchema>;

export const EffectiveNetworkTypeSchema = z.enum([
  'slow-2g',
  '2g',
  '3g',
  '4g',
  'unknown',
]);
export type EffectiveNetworkType = z.infer<typeof EffectiveNetworkTypeSchema>;

export const ClientCapabilityProfileSchema = z.object({
  clientTimezone: z.string(),
  clientLocale: z.string(),
  logicalCpuCores: z.number().int().min(1),
  deviceMemoryGb: z.number().nullable(),
  devicePixelRatio: z.number().min(1),
  screenResolution: z.object({
    width: z.number().int(),
    height: z.number().int(),
    colorDepth: z.number().int(),
  }),
  effectiveNetworkType: EffectiveNetworkTypeSchema,
  downlinkMbps: z.number().nullable(),
  rttMs: z.number().nullable(),
  saveDataEnabled: z.boolean(),
  prefersReducedMotion: z.boolean(),
  isTouchPrimary: z.boolean(),
  computedTier: PerformanceTierSchema,
  activeTier: PerformanceTierSchema,
  probedAt: z.string(),
});
export type ClientCapabilityProfile = z.infer<typeof ClientCapabilityProfileSchema>;

// ==========================================
// 6. ACCOUNT STATUS & ACTIVE SESSIONS
// ==========================================
export const AccountRestrictionSchema = z.object({
  status: z.enum(['active', 'blocked', 'suspended']),
  blockedReason: z.string().nullable(),
  blockedUntil: z.string().nullable(),
  blockedByUserId: z.string().nullable(),
  updatedAt: z.string(),
});
export type AccountRestriction = z.infer<typeof AccountRestrictionSchema>;

export const UserProfileSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string().min(1),
  avatarUrl: z.string().nullable(),
  universityName: z.string().nullable(),
  academicYear: z.number().int().min(1).max(7).default(2),
  role: UserRoleSchema,
  customFeatureOverrides: z.record(FeatureFlagKeySchema, z.boolean()).default({}),
  restriction: AccountRestrictionSchema,
  emailVerified: z.boolean(),
  createdAt: z.string(),
  lastActiveAt: z.string(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const SecurityAnomalyFlagSchema = z.enum([
  'impossible_travel_geo_shift',
  'excessive_concurrent_devices',
  'high_threat_ip_score',
  'rapid_failed_auth_attempts',
]);
export type SecurityAnomalyFlag = z.infer<typeof SecurityAnomalyFlagSchema>;

export const ActiveDeviceSessionSchema = z.object({
  sessionId: z.string(),
  userId: z.string(),
  isCurrentDevice: z.boolean(),
  device: ParsedDeviceProfileSchema,
  edgeNetwork: EdgeNetworkTelemetrySchema,
  clientTimezone: z.string(),
  clientTier: PerformanceTierSchema,
  anomalyFlags: z.array(SecurityAnomalyFlagSchema).default([]),
  createdAt: z.string(),
  lastVerifiedAt: z.string(),
  expiresAt: z.string(),
  kvCacheStatus: z.enum(['hit', 'miss-d1-hydrated', 'local-optimistic']),
  edgeVerificationLatencyMs: z.number(),
  hardwareProfile: ClientCapabilityProfileSchema.optional(),
});
export type ActiveDeviceSession = z.infer<typeof ActiveDeviceSessionSchema>;

// ==========================================
// 7. DISCRIMINATED AUTHENTICATION STATE
// ==========================================
export type AuthState =
  | {
      readonly status: 'anonymous-guest';
      readonly user: {
        readonly id: 'usr_local_guest';
        readonly displayName: 'Local Scholar';
        readonly role: 'anonymous';
      };
      readonly entitlements: FeatureEntitlementMap;
      readonly clientProfile: ClientCapabilityProfile;
      readonly edgePreview: EdgeNetworkTelemetry;
    }
  | {
      readonly status: 'authenticated-active';
      readonly user: UserProfile;
      readonly currentSession: ActiveDeviceSession;
      readonly activeSessions: readonly ActiveDeviceSession[];
      readonly entitlements: FeatureEntitlementMap;
      readonly clientProfile: ClientCapabilityProfile;
      readonly syncStatus: 'synced' | 'syncing' | 'offline-queued';
    }
  | {
      readonly status: 'account-blocked';
      readonly user: UserProfile;
      readonly restriction: AccountRestriction;
      readonly edgeNetwork: EdgeNetworkTelemetry;
      readonly clientProfile: ClientCapabilityProfile;
    };
