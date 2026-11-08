import type {
  AuthState,
  UserProfile,
  UserRole,
  FeatureFlagKey,
  ActiveDeviceSession,
} from '../../domain/auth/types.ts';
import {
  buildManagedUserRecord,
  type ManagedUserRecord,
  type SecurityAuditLogEntry,
  type UserStudyTelemetry,
} from '../../domain/auth/governanceAnalytics.ts';
import { AUTH_STORAGE_KEYS } from './authStorageKeys.ts';
import {
  createInitialCohortDirectory,
  createInitialAuditLogs,
  LEGACY_DEMO_USER_IDS,
} from './cohortSeedFixtures.ts';
import { readStoredLocalTelemetry } from './localStudyTelemetryCalculator.ts';

/**
 * Manages the Admin Cohort Directory and Security Audit Log ledger,
 * with local storage caching and Cloudflare Worker D1/KV synchronization.
 */
export class AdminCohortDirectoryRepository {
  private managedUsersCache: ManagedUserRecord[] | null = null;
  private auditLogsCache: SecurityAuditLogEntry[] | null = null;

  public getManagedUsers(currentState: AuthState): readonly ManagedUserRecord[] {
    if (!this.managedUsersCache) {
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('medquests_admin_directory_v1');
          localStorage.removeItem('medquests_admin_audit_logs_v1');

          const raw = localStorage.getItem(AUTH_STORAGE_KEYS.MANAGED_DIRECTORY);
          if (raw) {
            const parsed = JSON.parse(raw) as ManagedUserRecord[];
            if (Array.isArray(parsed) && parsed.length > 1) {
              this.managedUsersCache = parsed;
            }
          }
        } catch {
          // Ignore storage error and seed defaults
        }
      }
      if (!this.managedUsersCache || this.managedUsersCache.length <= 1) {
        this.managedUsersCache = createInitialCohortDirectory();
      }
    }

    if (currentState.status === 'authenticated-active') {
      const existingIdx = this.managedUsersCache.findIndex(
        (u) =>
          u.profile.id === currentState.user.id || u.profile.email === currentState.user.email
      );
      const liveStudyTelemetry = readStoredLocalTelemetry(
        existingIdx >= 0 ? this.managedUsersCache[existingIdx].studyTelemetry : undefined
      );
      const syncedRecord = buildManagedUserRecord({
        profile: currentState.user,
        studyTelemetry: liveStudyTelemetry,
        activeSessions: currentState.activeSessions,
      });

      if (existingIdx >= 0) {
        this.managedUsersCache[existingIdx] = syncedRecord;
      } else {
        this.managedUsersCache = [syncedRecord, ...this.managedUsersCache];
      }
    }

    return this.managedUsersCache;
  }

  public async syncManagedUsersFromEdge(
    currentState: AuthState
  ): Promise<readonly ManagedUserRecord[]> {
    if (typeof window === 'undefined') {
      return this.getManagedUsers(currentState);
    }

    try {
      const res = await fetch('/api/admin/users', {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = (await res.json()) as {
          users?: Array<{
            profile: UserProfile;
            studyTelemetry?: UserStudyTelemetry | null;
            activeSessions: ActiveDeviceSession[];
          }>;
        };

        if (Array.isArray(data.users) && data.users.length > 0) {
          const existingList = [...this.getManagedUsers(currentState)];
          const currentSessionId =
            currentState.status === 'authenticated-active'
              ? currentState.currentSession.sessionId
              : null;

          const mergedRecords: ManagedUserRecord[] = [];
          for (const remoteUser of data.users) {
            const existing = existingList.find(
              (u) =>
                u.profile.id === remoteUser.profile.id ||
                u.profile.email.toLowerCase() === remoteUser.profile.email.toLowerCase()
            );

            const isCurrentLoggedInUser =
              currentState.status === 'authenticated-active' &&
              (currentState.user.id === remoteUser.profile.id ||
                currentState.user.email.toLowerCase() ===
                  remoteUser.profile.email.toLowerCase());

            const sessionsWithCurrentFlag = remoteUser.activeSessions.map((s) => ({
              ...s,
              isCurrentDevice: currentSessionId ? s.sessionId === currentSessionId : false,
            }));

            if (isCurrentLoggedInUser) {
              const hasCurrent = sessionsWithCurrentFlag.some(
                (s) => s.sessionId === currentState.currentSession.sessionId
              );
              if (!hasCurrent) {
                sessionsWithCurrentFlag.unshift(currentState.currentSession);
              }
            }

            const resolvedTelemetry: UserStudyTelemetry = isCurrentLoggedInUser
              ? readStoredLocalTelemetry(remoteUser.studyTelemetry ?? existing?.studyTelemetry)
              : remoteUser.studyTelemetry ??
                existing?.studyTelemetry ?? {
                  totalAttempts: remoteUser.profile.role === 'admin' ? 1250 : 120,
                  overallAccuracy: remoteUser.profile.role === 'admin' ? 98 : 84,
                  masteryPercentage: remoteUser.profile.role === 'admin' ? 99 : 78,
                  weakTopicsCount: 0,
                  dueReviewsCount: 2,
                  dailyAiRequestsUsed: 4,
                  favoriteSubspecialty: 'Clinical Cardiology & Hemodynamics',
                };

            mergedRecords.push(
              buildManagedUserRecord({
                profile: remoteUser.profile,
                studyTelemetry: resolvedTelemetry,
                activeSessions:
                  sessionsWithCurrentFlag.length > 0
                    ? sessionsWithCurrentFlag
                    : existing?.activeSessions ?? [],
              })
            );
          }

          this.managedUsersCache = mergedRecords;
          this.persistManagedDirectory();
        }
      }
    } catch {
      // Offline fallback preserves local cache
    }

    return this.getManagedUsers(currentState);
  }

  public getAuditLogs(): readonly SecurityAuditLogEntry[] {
    if (!this.auditLogsCache) {
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem(AUTH_STORAGE_KEYS.AUDIT_LOGS);
          if (raw) {
            const parsed = JSON.parse(raw) as SecurityAuditLogEntry[];
            const cleaned = parsed.filter(
              (log) =>
                !LEGACY_DEMO_USER_IDS.has(log.targetUserId) &&
                !log.targetUserId.startsWith('usr_scholar_') &&
                !log.targetUserId.startsWith('usr_faculty_')
            );
            if (cleaned.length > 0) {
              this.auditLogsCache = cleaned;
            }
          }
        } catch {
          // Ignore parse error
        }
      }
      if (!this.auditLogsCache || this.auditLogsCache.length === 0) {
        this.auditLogsCache = createInitialAuditLogs();
      }
    }
    return this.auditLogsCache;
  }

  public purgeDemoData(currentState: AuthState): { purgedUsersCount: number } {
    const currentUsers = this.getManagedUsers(currentState);

    const cleaned = currentUsers.filter(
      (u) =>
        !LEGACY_DEMO_USER_IDS.has(u.profile.id) &&
        !u.profile.id.startsWith('usr_scholar_') &&
        !u.profile.id.startsWith('usr_faculty_')
    );

    const purgedUsersCount = currentUsers.length - cleaned.length;
    this.managedUsersCache = cleaned.length > 0 ? cleaned : createInitialCohortDirectory();
    this.auditLogsCache = createInitialAuditLogs();

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('medquests_admin_directory_v1');
        localStorage.removeItem('medquests_admin_audit_logs_v1');
        localStorage.setItem(
          AUTH_STORAGE_KEYS.MANAGED_DIRECTORY,
          JSON.stringify(this.managedUsersCache)
        );
        localStorage.setItem(
          AUTH_STORAGE_KEYS.AUDIT_LOGS,
          JSON.stringify(this.auditLogsCache)
        );
      } catch {
        // Quota guard
      }
    }

    return { purgedUsersCount };
  }

  public updateManagedUserRoleAndFeatures(
    params: {
      readonly targetUserId: string;
      readonly newRole: UserRole;
      readonly customFeatureOverrides?: Partial<Record<FeatureFlagKey, boolean>>;
      readonly actorDisplayName?: string;
    },
    currentState: AuthState
  ): ManagedUserRecord | null {
    const users = [...this.getManagedUsers(currentState)];
    const idx = users.findIndex((u) => u.profile.id === params.targetUserId);
    if (idx === -1) return null;

    const currentRecord = users[idx];
    const mergedOverrides: Record<string, boolean> = {
      ...currentRecord.profile.customFeatureOverrides,
    };
    if (params.customFeatureOverrides) {
      for (const [k, v] of Object.entries(params.customFeatureOverrides)) {
        if (typeof v === 'boolean') {
          mergedOverrides[k] = v;
        }
      }
    }

    const updatedProfile: UserProfile = {
      ...currentRecord.profile,
      role: params.newRole,
      customFeatureOverrides: mergedOverrides as Record<FeatureFlagKey, boolean>,
      lastActiveAt: new Date().toISOString(),
    };

    const updatedRecord = buildManagedUserRecord({
      profile: updatedProfile,
      studyTelemetry: currentRecord.studyTelemetry,
      activeSessions: currentRecord.activeSessions,
    });

    users[idx] = updatedRecord;
    this.managedUsersCache = users;
    this.persistManagedDirectory();

    const flagEntries = params.customFeatureOverrides
      ? Object.entries(params.customFeatureOverrides)
      : [];
    const auditAction =
      flagEntries.length > 0 ? 'FEATURE_FLAG_OVERRIDDEN' : 'ROLE_UPDATED';
    const summary =
      flagEntries.length > 0
        ? `Set ${flagEntries.map(([k, v]) => `${k}=${v ? 'ENABLED' : 'EXCLUDED'}`).join(', ')} for ${updatedProfile.displayName}`
        : `Changed role tier to ${params.newRole} for ${updatedProfile.displayName}`;

    this.appendAuditLog({
      actorUserId: 'usr_admin',
      actorDisplayName: params.actorDisplayName ?? 'Platform Admin',
      targetUserId: updatedProfile.id,
      targetDisplayName: updatedProfile.displayName,
      action: auditAction,
      summary,
      edgeColo: updatedRecord.activeSessions[0]?.edgeNetwork.colo ?? 'CAI',
      latencyMs: 1.4,
    });

    if (typeof window !== 'undefined') {
      void fetch('/api/admin/governance/role-features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorUserId:
            currentState.status === 'authenticated-active'
              ? currentState.user.id
              : 'usr_admin',
          targetUserId: updatedProfile.id,
          newRole: params.newRole,
          customFeatureOverrides: updatedProfile.customFeatureOverrides,
        }),
      }).catch(() => {});
    }

    return updatedRecord;
  }

  public setManagedUserRestriction(
    params: {
      readonly targetUserId: string;
      readonly status: 'active' | 'blocked' | 'suspended';
      readonly reason: string | null;
      readonly blockedUntil: string | null;
      readonly actorDisplayName?: string;
    },
    currentState: AuthState
  ): ManagedUserRecord | null {
    const users = [...this.getManagedUsers(currentState)];
    const idx = users.findIndex((u) => u.profile.id === params.targetUserId);
    if (idx === -1) return null;

    const currentRecord = users[idx];
    const nowIso = new Date().toISOString();
    const updatedProfile: UserProfile = {
      ...currentRecord.profile,
      restriction: {
        status: params.status,
        blockedReason: params.status === 'active' ? null : params.reason,
        blockedUntil: params.status === 'active' ? null : params.blockedUntil,
        blockedByUserId: params.status === 'active' ? null : 'usr_admin',
        updatedAt: nowIso,
      },
      lastActiveAt: nowIso,
    };

    const updatedRecord = buildManagedUserRecord({
      profile: updatedProfile,
      studyTelemetry: currentRecord.studyTelemetry,
      activeSessions: currentRecord.activeSessions,
    });

    users[idx] = updatedRecord;
    this.managedUsersCache = users;
    this.persistManagedDirectory();

    const action =
      params.status === 'blocked'
        ? 'ACCOUNT_BLOCKED'
        : params.status === 'suspended'
        ? 'ACCOUNT_SUSPENDED'
        : 'ACCOUNT_UNBLOCKED';

    this.appendAuditLog({
      actorUserId: 'usr_admin',
      actorDisplayName: params.actorDisplayName ?? 'Platform Admin',
      targetUserId: updatedProfile.id,
      targetDisplayName: updatedProfile.displayName,
      action,
      summary:
        params.status === 'active'
          ? `Cleared account restrictions for ${updatedProfile.displayName}`
          : `Enforced ${params.status.toUpperCase()} on ${updatedProfile.displayName} (${params.reason ?? 'Policy violation'}) • Purged KV sessions`,
      edgeColo: updatedRecord.activeSessions[0]?.edgeNetwork.colo ?? 'CAI',
      latencyMs: 1.6,
    });

    if (typeof window !== 'undefined') {
      void fetch('/api/admin/governance/restrict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorUserId:
            currentState.status === 'authenticated-active'
              ? currentState.user.id
              : 'usr_admin',
          targetUserId: updatedProfile.id,
          status: params.status,
          reason: params.reason,
          blockedUntil: params.blockedUntil,
        }),
      }).catch(() => {});
    }

    return updatedRecord;
  }

  public quarantineAnomalousAccounts(
    currentState: AuthState,
    actorDisplayName = 'Platform Admin'
  ): number {
    const users = [...this.getManagedUsers(currentState)];
    let quarantinedCount = 0;
    const nowIso = new Date().toISOString();

    const updatedUsers = users.map((record) => {
      const hasAnomaly = record.activeSessions.some((s) => s.anomalyFlags.length > 0);
      if (
        !hasAnomaly ||
        record.profile.restriction.status !== 'active' ||
        record.profile.role === 'admin'
      ) {
        return record;
      }

      quarantinedCount += 1;
      const flags = Array.from(
        new Set(record.activeSessions.flatMap((s) => s.anomalyFlags))
      ).join(', ');

      const updatedProfile: UserProfile = {
        ...record.profile,
        restriction: {
          status: 'suspended',
          blockedReason: `Automated Security Quarantine: ${flags}`,
          blockedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          blockedByUserId: 'usr_admin',
          updatedAt: nowIso,
        },
      };

      this.appendAuditLog({
        actorUserId: 'usr_admin',
        actorDisplayName,
        targetUserId: updatedProfile.id,
        targetDisplayName: updatedProfile.displayName,
        action: 'ANOMALY_QUARANTINED',
        summary: `Auto-suspended ${updatedProfile.displayName} due to [${flags}]`,
        edgeColo: record.activeSessions[0]?.edgeNetwork.colo ?? 'FRA',
        latencyMs: 1.2,
      });

      return buildManagedUserRecord({
        profile: updatedProfile,
        studyTelemetry: record.studyTelemetry,
        activeSessions: record.activeSessions,
      });
    });

    this.managedUsersCache = updatedUsers;
    this.persistManagedDirectory();
    return quarantinedCount;
  }

  public logSecurityAudit(
    entry: Omit<SecurityAuditLogEntry, 'id' | 'createdAt'>
  ): SecurityAuditLogEntry {
    this.appendAuditLog(entry);
    return this.getAuditLogs()[0];
  }

  public appendAuditLog(entry: Omit<SecurityAuditLogEntry, 'id' | 'createdAt'>): void {
    const logs = [...this.getAuditLogs()];
    const newEntry: SecurityAuditLogEntry = {
      ...entry,
      id: `aud_${Math.random().toString(36).substring(2, 10)}`,
      createdAt: new Date().toISOString(),
    };
    this.auditLogsCache = [newEntry, ...logs].slice(0, 50);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          AUTH_STORAGE_KEYS.AUDIT_LOGS,
          JSON.stringify(this.auditLogsCache)
        );
      } catch {
        // Ignore storage error
      }
    }
  }

  private persistManagedDirectory(): void {
    if (typeof window === 'undefined' || !this.managedUsersCache) return;
    try {
      localStorage.setItem(
        AUTH_STORAGE_KEYS.MANAGED_DIRECTORY,
        JSON.stringify(this.managedUsersCache)
      );
    } catch {
      // Ignore storage error
    }
  }
}
