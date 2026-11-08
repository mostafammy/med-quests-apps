/**
 * Handler: GET|POST /api/auth/session
 * Revalidates tokens, caches active sessions in Workers KV, and syncs device telemetry.
 */

import {
  computeDeterministicDeviceSessionId,
  extractEdgeNetworkTelemetry,
  parseDeviceHeaderProfile,
} from '../../../../domain/auth/telemetryParser.ts';
import type {
  ActiveDeviceSession,
  ClientCapabilityProfile,
  ParsedDeviceProfile,
} from '../../../../domain/auth/types.ts';
import { sha256 } from '../../../middleware/workerGuards.ts';
import {
  fetchUserActiveSessionsFromD1,
  upsertD1DeviceSession,
} from '../../../repositories/d1SessionRepository.ts';
import { D1AuthAndGovernanceRepository } from '../../../repositories/d1AuthAndGovernanceRepository.ts';
import type { Env } from '../../../types.ts';

export const CLIENT_HINTS_HEADER =
  'Sec-CH-UA-Model, Sec-CH-UA-Platform, Sec-CH-UA-Platform-Version, Sec-CH-UA-Arch, Sec-CH-UA-Bitness, Sec-CH-UA-Mobile';

export async function handleSessionEndpoint(
  request: Request,
  env: Env
): Promise<Response> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '') ?? null;

  const edgeTelemetry = extractEdgeNetworkTelemetry(
    request as unknown as { headers: Headers; cf?: Record<string, unknown> }
  );
  const headerDeviceProfile = parseDeviceHeaderProfile(
    request as unknown as { headers: Headers }
  );

  if (request.method === 'POST') {
    try {
      const body = (await request.json()) as {
        userId?: string;
        email?: string;
        displayName?: string;
        role?: string;
        sessionId?: string;
        deviceProfile?: ParsedDeviceProfile;
        hardwareProfile?: ClientCapabilityProfile;
      };

      const mergedDevice: ParsedDeviceProfile = body.deviceProfile
        ? { ...headerDeviceProfile, ...body.deviceProfile }
        : headerDeviceProfile;

      let canonicalUserId = body.userId || 'usr_local_guest';
      let userRole = body.role || 'student-pro';
      let phoneNumber: string | null = null;
      let accountStatus = 'active';
      let blockedReason: string | null = null;

      if (env.MED_QUESTS_DB && (body.email || body.userId)) {
        const userRow = await D1AuthAndGovernanceRepository.findUserByIdOrEmail(
          env.MED_QUESTS_DB,
          body.email || '',
          body.userId || ''
        );

        if (userRow) {
          canonicalUserId = userRow.id;
          userRole = userRow.role;
          phoneNumber = userRow.phone_number;
          accountStatus = userRow.account_status;
          blockedReason = userRow.blocked_reason;
        }
      }

      if (accountStatus === 'blocked') {
        return new Response(
          JSON.stringify({
            code: 'ACCOUNT_BLOCKED',
            restriction: { status: 'blocked', blockedReason },
            edgeNetwork: edgeTelemetry,
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const deterministicSessionId =
        body.sessionId ||
        computeDeterministicDeviceSessionId(
          canonicalUserId,
          mergedDevice,
          body.hardwareProfile
        );

      let activeSessions: ActiveDeviceSession[] = [];
      if (env.MED_QUESTS_DB && canonicalUserId !== 'usr_local_guest') {
        await upsertD1DeviceSession(env.MED_QUESTS_DB, {
          sessionId: deterministicSessionId,
          userId: canonicalUserId,
          tokenHash: token
            ? await sha256(token)
            : `tok_${deterministicSessionId}`,
          edgeTelemetry,
          deviceProfile: mergedDevice,
          hardwareProfile: body.hardwareProfile,
        });
        activeSessions = await fetchUserActiveSessionsFromD1(
          env.MED_QUESTS_DB,
          canonicalUserId,
          deterministicSessionId
        );
      }

      return new Response(
        JSON.stringify({
          status: 'authenticated-active',
          userId: canonicalUserId,
          role: userRole,
          phoneNumber,
          kvCacheStatus: 'hit',
          edgeNetwork: edgeTelemetry,
          device: mergedDevice,
          activeSessions,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Accept-CH': CLIENT_HINTS_HEADER,
          },
        }
      );
    } catch {
      // Fall through to standard GET check if body malformed
    }
  }

  if (!token) {
    return new Response(
      JSON.stringify({
        status: 'anonymous-guest',
        user: {
          id: 'usr_local_guest',
          displayName: 'Local Scholar',
          role: 'anonymous',
        },
        edgePreview: edgeTelemetry,
        device: headerDeviceProfile,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Accept-CH': CLIENT_HINTS_HEADER,
        },
      }
    );
  }

  // Check Workers KV Cache-Aside Layer (~2ms edge execution)
  const tokenHash = await sha256(token);
  const kvCachedSession = env.MED_QUESTS_AUTH_KV
    ? await env.MED_QUESTS_AUTH_KV.get<{
        userId: string;
        role: string;
        expiresAt: string;
      }>(`sess:${tokenHash}`, 'json')
    : null;

  if (kvCachedSession) {
    const userGuard = env.MED_QUESTS_AUTH_KV
      ? await env.MED_QUESTS_AUTH_KV.get<{
          status: string;
          blockedReason?: string;
        }>(`usr_guard:${kvCachedSession.userId}`, 'json')
      : null;

    if (userGuard && userGuard.status === 'blocked') {
      return new Response(
        JSON.stringify({
          code: 'ACCOUNT_BLOCKED',
          restriction: {
            status: 'blocked',
            blockedReason: userGuard.blockedReason,
          },
          edgeNetwork: edgeTelemetry,
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const activeSessions = env.MED_QUESTS_DB
      ? await fetchUserActiveSessionsFromD1(
          env.MED_QUESTS_DB,
          kvCachedSession.userId,
          null
        )
      : [];

    return new Response(
      JSON.stringify({
        status: 'authenticated-active',
        userId: kvCachedSession.userId,
        role: kvCachedSession.role,
        kvCacheStatus: 'hit',
        edgeNetwork: edgeTelemetry,
        activeSessions,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Fallback: Query Cloudflare D1 (~25ms) on KV Cache Miss
  if (env.MED_QUESTS_DB) {
    const sessionRecord =
      await D1AuthAndGovernanceRepository.findSessionByTokenHash(
        env.MED_QUESTS_DB,
        tokenHash
      );

    if (sessionRecord) {
      if (sessionRecord.account_status === 'blocked') {
        return new Response(
          JSON.stringify({
            code: 'ACCOUNT_BLOCKED',
            restriction: {
              status: 'blocked',
              blockedReason: sessionRecord.blocked_reason,
            },
            edgeNetwork: edgeTelemetry,
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (env.MED_QUESTS_AUTH_KV) {
        await env.MED_QUESTS_AUTH_KV.put(
          `sess:${tokenHash}`,
          JSON.stringify({
            userId: sessionRecord.user_id,
            role: sessionRecord.role,
          }),
          { expirationTtl: 600 }
        );
      }

      const activeSessions = await fetchUserActiveSessionsFromD1(
        env.MED_QUESTS_DB,
        sessionRecord.user_id,
        sessionRecord.id
      );

      return new Response(
        JSON.stringify({
          status: 'authenticated-active',
          userId: sessionRecord.user_id,
          role: sessionRecord.role,
          kvCacheStatus: 'miss-d1-hydrated',
          edgeNetwork: edgeTelemetry,
          activeSessions,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  return new Response(
    JSON.stringify({ code: 'SESSION_EXPIRED_OR_REVOKED' }),
    { status: 401, headers: { 'Content-Type': 'application/json' } }
  );
}
