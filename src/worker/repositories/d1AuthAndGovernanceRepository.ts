/**
 * Worker Repository: D1 Authentication & Admin User Governance Operations
 * Encapsulates all SQL statements for user accounts, credentials, device sessions, and security governance.
 */

import type { ActiveDeviceSession } from '../../domain/auth/types.ts';
import type { D1DatabaseBinding } from '../types.ts';
import { mapD1SessionRowToActiveSession } from './d1SessionRepository.ts';

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  image?: string | null;
  phone_number: string | null;
  university_name?: string | null;
  academic_year?: number;
  custom_features_json?: string | null;
  account_status: string;
  blocked_reason: string | null;
  blocked_until?: string | null;
  blocked_by_user_id?: string | null;
  email_verified?: number;
  created_at?: string;
  updated_at?: string;
  last_active_at?: string;
}

export interface SessionWithUserRow {
  id: string;
  user_id: string;
  role: string;
  account_status: string;
  blocked_reason: string | null;
}

export interface AdminUserListItemDto {
  profile: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    phoneNumber: string | null;
    universityName: string;
    academicYear: number;
    role: string;
    customFeatureOverrides: Record<string, boolean>;
    restriction: {
      status: string;
      blockedReason: string | null;
      blockedUntil: string | null;
      blockedByUserId: string | null;
      updatedAt: string;
    };
    emailVerified: boolean;
    createdAt: string;
    lastActiveAt: string;
  };
  activeSessions: ActiveDeviceSession[];
}

export class D1AuthAndGovernanceRepository {
  public static async findUserByIdOrEmail(
    db: D1DatabaseBinding,
    email: string,
    userId: string
  ): Promise<UserRow | null> {
    const row = await db
      .prepare(
        'SELECT id, name, email, role, phone_number, account_status, blocked_reason FROM user WHERE email = ? OR id = ? LIMIT 1'
      )
      .bind(email || '', userId || '')
      .first<UserRow>();
    return row ?? null;
  }

  public static async findSessionByTokenHash(
    db: D1DatabaseBinding,
    tokenHash: string
  ): Promise<SessionWithUserRow | null> {
    const row = await db
      .prepare(
        'SELECT s.*, u.role, u.account_status, u.blocked_reason FROM session s JOIN user u ON s.user_id = u.id WHERE s.token_hash = ? AND s.revoked_at IS NULL'
      )
      .bind(tokenHash)
      .first<SessionWithUserRow>();
    return row ?? null;
  }

  public static async revokeSession(
    db: D1DatabaseBinding,
    sessionId: string,
    nowIso: string
  ): Promise<void> {
    await db
      .prepare(
        'UPDATE session SET revoked_at = ?, updated_at = ? WHERE id = ?'
      )
      .bind(nowIso, nowIso, sessionId)
      .run();
  }

  public static async fetchAllAdminUsersWithSessions(
    db: D1DatabaseBinding
  ): Promise<AdminUserListItemDto[]> {
    const userRows = await db
      .prepare(
        "SELECT * FROM user WHERE email NOT IN ('test@example.com', 'dr.alex.rivera@stanford.edu') ORDER BY last_active_at DESC LIMIT 200"
      )
      .all<Record<string, unknown>>();

    const sessionRows = await db
      .prepare(
        "SELECT * FROM session WHERE revoked_at IS NULL AND os_name != 'Web' ORDER BY updated_at DESC LIMIT 500"
      )
      .all<Record<string, unknown>>();

    const sessionsByUser = new Map<string, ActiveDeviceSession[]>();
    for (const sRow of sessionRows.results) {
      const mapped = mapD1SessionRowToActiveSession(sRow, null);
      const list = sessionsByUser.get(mapped.userId) ?? [];
      list.push(mapped);
      sessionsByUser.set(mapped.userId, list);
    }

    return userRows.results.map((uRow) => {
      const uid = String(uRow.id);
      let customOverrides: Record<string, boolean> = {};
      try {
        if (typeof uRow.custom_features_json === 'string') {
          customOverrides = JSON.parse(uRow.custom_features_json) as Record<
            string,
            boolean
          >;
        }
      } catch {
        customOverrides = {};
      }

      return {
        profile: {
          id: uid,
          email: String(uRow.email),
          displayName: String(uRow.name),
          avatarUrl: uRow.image ? String(uRow.image) : null,
          phoneNumber: uRow.phone_number ? String(uRow.phone_number) : null,
          universityName: uRow.university_name
            ? String(uRow.university_name)
            : 'Faculty of Medicine',
          academicYear: Number(uRow.academic_year ?? 2),
          role: String(uRow.role || 'student-pro'),
          customFeatureOverrides: customOverrides,
          restriction: {
            status: String(uRow.account_status || 'active'),
            blockedReason: uRow.blocked_reason
              ? String(uRow.blocked_reason)
              : null,
            blockedUntil: uRow.blocked_until ? String(uRow.blocked_until) : null,
            blockedByUserId: uRow.blocked_by_user_id
              ? String(uRow.blocked_by_user_id)
              : null,
            updatedAt: String(uRow.updated_at || new Date().toISOString()),
          },
          emailVerified: Boolean(uRow.email_verified),
          createdAt: String(uRow.created_at || new Date().toISOString()),
          lastActiveAt: String(uRow.last_active_at || new Date().toISOString()),
        },
        activeSessions: sessionsByUser.get(uid) ?? [],
      };
    });
  }

  public static async restrictUserAccount(
    db: D1DatabaseBinding,
    params: {
      targetUserId: string;
      status: 'active' | 'blocked' | 'suspended';
      reason: string | null;
      blockedUntil: string | null;
      actorUserId: string;
      nowIso: string;
    }
  ): Promise<void> {
    await db
      .prepare(
        'UPDATE user SET account_status = ?, blocked_reason = ?, blocked_until = ?, blocked_by_user_id = ?, updated_at = ? WHERE id = ?'
      )
      .bind(
        params.status,
        params.reason,
        params.blockedUntil,
        params.actorUserId,
        params.nowIso,
        params.targetUserId
      )
      .run();

    if (params.status !== 'active') {
      await db
        .prepare(
          'UPDATE session SET revoked_at = ?, updated_at = ? WHERE user_id = ? AND revoked_at IS NULL'
        )
        .bind(params.nowIso, params.nowIso, params.targetUserId)
        .run();
    }
  }

  public static async updateUserRoleAndFeatures(
    db: D1DatabaseBinding,
    params: {
      targetUserId: string;
      newRole: string;
      featuresJson: string;
      nowIso: string;
    }
  ): Promise<void> {
    await db
      .prepare(
        'UPDATE user SET role = ?, custom_features_json = ?, updated_at = ? WHERE id = ?'
      )
      .bind(
        params.newRole,
        params.featuresJson,
        params.nowIso,
        params.targetUserId
      )
      .run();
  }

  public static async upsertGoogleUser(
    db: D1DatabaseBinding,
    params: {
      userId: string;
      name: string;
      email: string;
      image: string;
      role: string;
      universityName: string;
      countryCode: string;
      colo: string;
      nowIso: string;
    }
  ): Promise<{ userId: string; existingPhoneNumber: string | null }> {
    const existingUserRow = await db
      .prepare('SELECT id, phone_number FROM user WHERE email = ?')
      .bind(params.email)
      .first<{ id: string; phone_number: string | null }>();

    const canonicalId = existingUserRow?.id || params.userId;
    const existingPhoneNumber = existingUserRow?.phone_number || null;

    await db
      .prepare(
        `INSERT INTO user (id, name, email, email_verified, image, role, university_name, account_status, last_country_code, last_colo, last_active_at, created_at, updated_at)
         VALUES (?, ?, ?, 1, ?, ?, ?, 'active', ?, ?, ?, ?, ?)
         ON CONFLICT(email) DO UPDATE SET
           name = excluded.name,
           image = COALESCE(excluded.image, user.image),
           role = excluded.role,
           last_country_code = excluded.last_country_code,
           last_colo = excluded.last_colo,
           last_active_at = ?,
           updated_at = ?`
      )
      .bind(
        canonicalId,
        params.name,
        params.email,
        params.image,
        params.role,
        params.universityName,
        params.countryCode,
        params.colo,
        params.nowIso,
        params.nowIso,
        params.nowIso,
        params.nowIso,
        params.nowIso
      )
      .run();

    return { userId: canonicalId, existingPhoneNumber };
  }

  public static async updateUserPhone(
    db: D1DatabaseBinding,
    phoneNumber: string,
    email?: string,
    userId?: string
  ): Promise<void> {
    await db
      .prepare(
        `UPDATE user
         SET phone_number = ?, updated_at = datetime('now')
         WHERE email = ? OR id = ?`
      )
      .bind(phoneNumber, email || '', userId || '')
      .run();
  }

  public static async upsertAppleUser(
    db: D1DatabaseBinding,
    params: {
      userId: string;
      name: string;
      email: string;
      image: string;
      countryCode: string;
      colo: string;
      ipAddress: string;
      tokenHash: string;
      expiresAt: string;
      nowIso: string;
    }
  ): Promise<void> {
    await db
      .prepare(
        `INSERT INTO user (id, name, email, email_verified, image, role, university_name, account_status, last_country_code, last_colo, last_active_at, created_at, updated_at)
         VALUES (?, ?, ?, 1, ?, 'student-pro', 'Harvard Medical School / Apple ID', 'active', ?, ?, ?, ?, ?)
         ON CONFLICT(email) DO UPDATE SET last_active_at = ?, updated_at = ?`
      )
      .bind(
        params.userId,
        params.name,
        params.email,
        params.image,
        params.countryCode,
        params.colo,
        params.nowIso,
        params.nowIso,
        params.nowIso,
        params.nowIso,
        params.nowIso
      )
      .run();

    await db
      .prepare(
        `INSERT INTO session (id, user_id, token_hash, expires_at, ip_address, country_code, edge_colo, client_timezone, os_name, browser_name, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'iOS/macOS', 'Safari/WebKit', ?, ?)`
      )
      .bind(
        `ses_${Math.random().toString(36).substring(2, 10)}`,
        params.userId,
        params.tokenHash,
        params.expiresAt,
        params.ipAddress,
        params.countryCode,
        params.colo,
        'Africa/Cairo',
        params.nowIso,
        params.nowIso
      )
      .run();
  }
}
