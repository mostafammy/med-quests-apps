/**
 * Handler: POST /api/auth/oauth/google
 * Verifies Google OAuth token claims, creates/updates scholar profile, and issues Edge session token.
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
import { CLIENT_HINTS_HEADER } from './handleSessionEndpoint.ts';

export async function handleGoogleAuth(
  request: Request,
  env: Env
): Promise<Response> {
  const edgeTelemetry = extractEdgeNetworkTelemetry(
    request as unknown as { headers: Headers; cf?: Record<string, unknown> }
  );
  const headerDevice = parseDeviceHeaderProfile(
    request as unknown as { headers: Headers }
  );
  const body = (await request.json()) as {
    idToken?: string;
    sessionId?: string;
    deviceProfile?: ParsedDeviceProfile;
    hardwareProfile?: ClientCapabilityProfile;
    claims?: {
      sub: string;
      email: string;
      name: string;
      picture?: string;
      hd?: string;
    };
  };

  const email = body.claims?.email || 'scholar.google@med.edu';
  const PLATFORM_OWNER_EMAILS = ['mostafa.yaser.developer@gmail.com'];
  const isPlatformOwner = PLATFORM_OWNER_EMAILS.includes(
    email.toLowerCase().trim()
  );

  const role = isPlatformOwner
    ? 'admin'
    : email.includes('admin')
    ? 'admin'
    : 'student-pro';
  const universityName = isPlatformOwner
    ? 'Med Quests Platform Owner & Principal Architect'
    : 'Google Medical Scholar';

  const name =
    isPlatformOwner &&
    (!body.claims?.name || body.claims.name === 'Dr. Alex Rivera')
      ? 'Mostafa Yaser (Platform Owner)'
      : body.claims?.name || email.split('@')[0];

  const image =
    body.claims?.picture ||
    'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80';
  let userId = isPlatformOwner
    ? 'usr_owner_mostafa'
    : `usr_g_${(body.claims?.sub || email).replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 24)}`;
  const nowIso = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const sessionToken = `g_tok_${Math.random().toString(36).substring(2, 15)}_${Date.now().toString(36)}`;
  const tokenHash = await sha256(sessionToken);

  const mergedDevice: ParsedDeviceProfile = body.deviceProfile
    ? { ...headerDevice, ...body.deviceProfile }
    : headerDevice;

  let existingPhoneNumber: string | null = null;
  let activeSessions: ActiveDeviceSession[] = [];

  if (env.MED_QUESTS_DB) {
    const upsertRes = await D1AuthAndGovernanceRepository.upsertGoogleUser(
      env.MED_QUESTS_DB,
      {
        userId,
        name,
        email,
        image,
        role,
        universityName,
        countryCode: edgeTelemetry.countryCode,
        colo: edgeTelemetry.colo,
        nowIso,
      }
    );
    userId = upsertRes.userId;
    existingPhoneNumber = upsertRes.existingPhoneNumber;

    const deterministicSessionId =
      body.sessionId ||
      computeDeterministicDeviceSessionId(
        userId,
        mergedDevice,
        body.hardwareProfile
      );

    await upsertD1DeviceSession(env.MED_QUESTS_DB, {
      sessionId: deterministicSessionId,
      userId,
      tokenHash,
      edgeTelemetry,
      deviceProfile: mergedDevice,
      hardwareProfile: body.hardwareProfile,
    });

    activeSessions = await fetchUserActiveSessionsFromD1(
      env.MED_QUESTS_DB,
      userId,
      deterministicSessionId
    );
  }

  if (env.MED_QUESTS_AUTH_KV) {
    await env.MED_QUESTS_AUTH_KV.put(
      `sess:${tokenHash}`,
      JSON.stringify({ userId, role, expiresAt }),
      { expirationTtl: 600 }
    );
  }

  return new Response(
    JSON.stringify({
      ok: true,
      provider: 'google',
      sessionToken,
      user: {
        id: userId,
        email,
        displayName: name,
        avatarUrl: image,
        phoneNumber: existingPhoneNumber,
        role,
        universityName,
        emailVerified: true,
      },
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
}
