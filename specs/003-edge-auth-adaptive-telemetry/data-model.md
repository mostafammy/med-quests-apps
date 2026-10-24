# Data Model & Strict Type Architecture: Edge Authentication, Telemetry & Adaptive UX (`003-edge-auth-adaptive-telemetry`)

**Feature**: [spec.md](spec.md) | **Research**: [research.md](research.md)

All types adhere to Constitution **P6 (Type Safety & Determinism)**: `strict: true`, zero `any`, zero `!`, `readonly` domain immutability, exhaustive discriminated unions with `assertNever`, and Zod boundary schemas.

---

## 1. Branded Domain Identifiers & Role / Entitlement Model

```typescript
import { z } from 'zod';
import type { IsoDateTime, Millis } from '../model/types.ts';

// ==========================================
// 1.1 PRIMITIVE IDENTIFIERS
// ==========================================
export type UserId = string;        // e.g., 'usr_01jb0x9...' or 'usr_local_guest'
export type AuthSessionId = string; // e.g., 'ses_01jb0x9...'
export type AuditEventId = string;  // e.g., 'aud_01jb0x9...'
export type EdgeColoCode = string;  // IATA 3-letter code e.g. 'CAI', 'LHR', 'JFK', 'FRA', 'LOCAL'

// ==========================================
// 1.2 ROLES & GRANULAR FEATURE ENTITLEMENTS
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
  'security_governance_admin' // Inspect users, toggle roles, block/unblock accounts
]);
export type FeatureFlagKey = z.infer<typeof FeatureFlagKeySchema>;

export type FeatureEntitlementMap = Readonly<Record<FeatureFlagKey, boolean>>;

export interface RoleEntitlementPolicy {
  readonly role: UserRole;
  readonly label: string;
  readonly badgeTone: 'slate' | 'blue' | 'indigo' | 'emerald' | 'amber';
  readonly defaultFeatures: FeatureEntitlementMap;
  readonly maxConcurrentDevices: number;
  readonly dailyCloudAiRequestsLimit: number;
}

export const ROLE_ENTITLEMENT_POLICIES: Readonly<Record<UserRole, RoleEntitlementPolicy>> = {
  anonymous: {
    role: 'anonymous',
    label: 'Local Guest',
    badgeTone: 'slate',
    defaultFeatures: {
      local_practice_and_mock: true,
      local_grounded_copilot: true,
      cloud_sync_backup: false,
      ai_cloud_streaming_quota: false,
      multi_block_unlock: true,
      question_studio_author: true,
      security_governance_admin: false,
    },
    maxConcurrentDevices: 1,
    dailyCloudAiRequestsLimit: 0,
  },
  'student-free': {
    role: 'student-free',
    label: 'Student',
    badgeTone: 'blue',
    defaultFeatures: {
      local_practice_and_mock: true,
      local_grounded_copilot: true,
      cloud_sync_backup: true,
      ai_cloud_streaming_quota: false,
      multi_block_unlock: true,
      question_studio_author: false,
      security_governance_admin: false,
    },
    maxConcurrentDevices: 2,
    dailyCloudAiRequestsLimit: 15,
  },
  'student-pro': {
    role: 'student-pro',
    label: 'Scholar Pro',
    badgeTone: 'indigo',
    defaultFeatures: {
      local_practice_and_mock: true,
      local_grounded_copilot: true,
      cloud_sync_backup: true,
      ai_cloud_streaming_quota: true,
      multi_block_unlock: true,
      question_studio_author: false,
      security_governance_admin: false,
    },
    maxConcurrentDevices: 4,
    dailyCloudAiRequestsLimit: 250,
  },
  'faculty-reviewer': {
    role: 'faculty-reviewer',
    label: 'Faculty Reviewer',
    badgeTone: 'emerald',
    defaultFeatures: {
      local_practice_and_mock: true,
      local_grounded_copilot: true,
      cloud_sync_backup: true,
      ai_cloud_streaming_quota: true,
      multi_block_unlock: true,
      question_studio_author: true,
      security_governance_admin: false,
    },
    maxConcurrentDevices: 5,
    dailyCloudAiRequestsLimit: 500,
  },
  admin: {
    role: 'admin',
    label: 'Platform Admin',
    badgeTone: 'amber',
    defaultFeatures: {
      local_practice_and_mock: true,
      local_grounded_copilot: true,
      cloud_sync_backup: true,
      ai_cloud_streaming_quota: true,
      multi_block_unlock: true,
      question_studio_author: true,
      security_governance_admin: true,
    },
    maxConcurrentDevices: 10,
    dailyCloudAiRequestsLimit: 5000,
  },
};
```

---

## 2. Edge Network, Geo & Device Intelligence Model (`request.cf` + Headers)

```typescript
// ==========================================
// 2.1 PARSED DEVICE & CLIENT HEADER PROFILE
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
  osName: z.string(),           // e.g. 'macOS', 'iOS', 'Windows', 'Android', 'Linux'
  osVersion: z.string().nullable(),
  browserName: z.string(),      // e.g. 'Safari', 'Chrome', 'Firefox', 'Edge'
  browserVersion: z.string().nullable(),
  browserEngine: z.enum(['WebKit', 'Blink', 'Gecko', 'Unknown']),
  cpuArchitecture: z.string().nullable(), // e.g. 'arm64', 'x86_64' from Sec-CH-UA-Arch
  isMobileHint: z.boolean(),
  preferredLanguage: z.string(), // e.g. 'en-US' from Accept-Language
  rawUserAgent: z.string(),
});
export type ParsedDeviceProfile = z.infer<typeof ParsedDeviceProfileSchema>;

// ==========================================
// 2.2 CLOUDFLARE EDGE GEO & NETWORK TELEMETRY (0ms Cost)
// ==========================================
export const EdgeNetworkTelemetrySchema = z.object({
  ipAddress: z.string(),                  // From CF-Connecting-IP (or anonymized prefix)
  countryCode: z.string().length(2).or(z.literal('DEV')), // ISO-3166-1 alpha-2 e.g. 'EG', 'US', 'GB'
  countryName: z.string(),
  city: z.string().nullable(),            // request.cf.city e.g. 'Cairo', 'London'
  region: z.string().nullable(),          // request.cf.region
  continent: z.string().nullable(),       // request.cf.continent e.g. 'AF', 'EU', 'NA'
  latitude: z.number().nullable(),        // request.cf.latitude
  longitude: z.number().nullable(),       // request.cf.longitude
  postalCode: z.string().nullable(),      // request.cf.postalCode
  edgeTimezone: z.string().nullable(),    // request.cf.timezone e.g. 'Africa/Cairo'
  asn: z.number().nullable(),             // request.cf.asn e.g. 8452
  ispOrganization: z.string().nullable(), // request.cf.asOrganization e.g. 'TE-AS'
  colo: z.string(),                       // request.cf.colo e.g. 'CAI', 'FRA', 'MRS'
  httpProtocol: z.string(),               // request.cf.httpProtocol e.g. 'HTTP/3'
  tlsVersion: z.string(),                 // request.cf.tlsVersion e.g. 'TLSv1.3'
  ja4Fingerprint: z.string().nullable(),  // request.cf.botManagement?.ja4 if available
  threatScore: z.number().min(0).max(100).nullable(), // request.cf.threatScore
  capturedAt: z.string(),                 // IsoDateTime
});
export type EdgeNetworkTelemetry = z.infer<typeof EdgeNetworkTelemetrySchema>;
```

---

## 3. Client Hardware, Network & Adaptive UX Performance Model

```typescript
// ==========================================
// 3.1 PERFORMANCE TIER & OVERRIDE MODE
// ==========================================
export const PerformanceTierSchema = z.enum([
  'ultra',    // 120fps spring physics, full multi-pass backdrop blur, ambient floating orbs
  'balanced', // 60fps GPU transform/opacity, moderate 12px blur, static ambient background
  'low-spec', // 0 blur overdraw, crisp high-contrast surfaces, <80ms fast opacity transitions
]);
export type PerformanceTier = z.infer<typeof PerformanceTierSchema>;

export const PerformanceOverrideModeSchema = z.enum([
  'auto',     // Dynamically derived from hardware & connection probe
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

// ==========================================
// 3.2 CLIENT HARDWARE & ENVIRONMENT CAPABILITY SNAPSHOT
// ==========================================
export const ClientCapabilityProfileSchema = z.object({
  clientTimezone: z.string(),                      // Intl.DateTimeFormat().resolvedOptions().timeZone
  clientLocale: z.string(),                        // navigator.language
  logicalCpuCores: z.number().int().min(1),        // navigator.hardwareConcurrency (fallback 4)
  deviceMemoryGb: z.number().nullable(),           // navigator.deviceMemory (e.g. 2, 4, 8, or null on Safari)
  devicePixelRatio: z.number().min(1),             // window.devicePixelRatio
  screenResolution: z.object({
    width: z.number().int(),
    height: z.number().int(),
    colorDepth: z.number().int(),
  }),
  effectiveNetworkType: EffectiveNetworkTypeSchema,
  downlinkMbps: z.number().nullable(),             // navigator.connection?.downlink
  rttMs: z.number().nullable(),                    // navigator.connection?.rtt
  saveDataEnabled: z.boolean(),                    // navigator.connection?.saveData
  prefersReducedMotion: z.boolean(),               // matchMedia('(prefers-reduced-motion: reduce)')
  isTouchPrimary: z.boolean(),                     // matchMedia('(pointer: coarse)')
  computedTier: PerformanceTierSchema,
  activeTier: PerformanceTierSchema,               // Respects user override if set
  probedAt: z.string(),
});
export type ClientCapabilityProfile = z.infer<typeof ClientCapabilityProfileSchema>;
```

---

## 4. User Account, Active Sessions & Discriminated Auth State

```typescript
// ==========================================
// 4.1 ACCOUNT STATUS DISCRIMINATED UNION
// ==========================================
export const AccountRestrictionSchema = z.object({
  status: z.enum(['active', 'blocked', 'suspended']),
  blockedReason: z.string().nullable(),
  blockedUntil: z.string().nullable(), // IsoDateTime or null for permanent
  blockedByUserId: z.string().nullable(),
  updatedAt: z.string(),
});
export type AccountRestriction = z.infer<typeof AccountRestrictionSchema>;

// ==========================================
// 4.2 USER PROFILE & ACTIVE SESSION RECORD
// ==========================================
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
  'impossible_travel_geo_shift',   // Different countries within impossible travel time
  'excessive_concurrent_devices',  // Exceeds role maxConcurrentDevices
  'high_threat_ip_score',          // Edge threatScore >= 50
  'rapid_failed_auth_attempts',    // Brute-force / credential stuffing indicator
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
});
export type ActiveDeviceSession = z.infer<typeof ActiveDeviceSessionSchema>;

// ==========================================
// 4.3 DISCRIMINATED AUTHENTICATION STATE
// Compile-time guarantee for UI and Domain Consumers
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
```

---

## 5. Cloudflare D1 Relational Schema & Workers KV Key Topology

### 5.1 Cloudflare D1 SQLite Tables (`migrations/0001_better_auth_edge_telemetry.sql`)

```sql
-- 1. Core Users Table (Better Auth compatible + RBAC & Blocking extensions)
CREATE TABLE IF NOT EXISTS user (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  email_verified INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  university_name TEXT,
  academic_year INTEGER NOT NULL DEFAULT 2,
  role TEXT NOT NULL DEFAULT 'student-free' CHECK (role IN ('student-free', 'student-pro', 'faculty-reviewer', 'admin')),
  custom_features_json TEXT NOT NULL DEFAULT '{}',
  account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'blocked', 'suspended')),
  blocked_reason TEXT,
  blocked_until TEXT,
  blocked_by_user_id TEXT,
  last_country_code TEXT,
  last_colo TEXT,
  last_active_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_email ON user(email);
CREATE INDEX IF NOT EXISTS idx_user_role_status ON user(role, account_status);

-- 2. Enriched Edge Sessions Table (Better Auth session + Cloudflare request.cf & Device Profile)
CREATE TABLE IF NOT EXISTS session (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  country_code TEXT NOT NULL,
  city TEXT,
  region TEXT,
  continent TEXT,
  latitude REAL,
  longitude REAL,
  postal_code TEXT,
  asn INTEGER,
  isp_organization TEXT,
  edge_colo TEXT NOT NULL,
  http_protocol TEXT,
  tls_version TEXT,
  threat_score INTEGER,
  device_category TEXT NOT NULL DEFAULT 'desktop',
  os_name TEXT NOT NULL,
  browser_name TEXT NOT NULL,
  client_timezone TEXT NOT NULL,
  client_perf_tier TEXT NOT NULL DEFAULT 'balanced',
  anomaly_flags_json TEXT NOT NULL DEFAULT '[]',
  revoked_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_session_user_id ON session(user_id);
CREATE INDEX IF NOT EXISTS idx_session_token_hash ON session(token_hash);

-- 3. Security & Governance Audit Log
CREATE TABLE IF NOT EXISTS security_audit_log (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT NOT NULL,
  target_user_id TEXT NOT NULL,
  action TEXT NOT NULL, -- 'SIGN_IN' | 'ROLE_CHANGED' | 'FEATURE_TOGGLED' | 'USER_BLOCKED' | 'USER_UNBLOCKED' | 'SESSION_REVOKED' | 'GEO_ANOMALY_DETECTED'
  metadata_json TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  edge_colo TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_target_user ON security_audit_log(target_user_id, created_at DESC);
```

### 5.2 Cloudflare Workers KV Key Topology (`MED_QUESTS_AUTH_KV`)

| KV Key Pattern | Payload Type | TTL | Purpose & Invalidation Trigger |
| :--- | :--- | :--- | :--- |
| `sess:{tokenHash}` | `CachedEdgeSessionPayload` | `600s` (10 min sliding) | Fast `~2 ms` session, role, entitlement & block lookup at edge. Deleted immediately on logout, session revoke, role update, or user block. |
| `usr_guard:{userId}` | `{ status, role, customFeatures, version }` | `3600s` (1 hour) | Authoritative user state override. Checked alongside `sess:{tokenHash}` so a single write to `usr_guard:{userId}` instantaneously blocks or upgrades ALL active device sessions for that user without scanning session keys. |
| `ratelimit:{ip}:{route}` | `{ count, windowStartMs }` | `60s` | Edge brute-force and scraping protection. |
