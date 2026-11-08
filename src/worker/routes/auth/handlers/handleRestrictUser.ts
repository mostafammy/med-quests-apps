/**
 * Handler: POST /api/admin/governance/restrict
 * Enforces instant account block, suspension, or active clearance with Workers KV eviction.
 */

import { extractEdgeNetworkTelemetry } from '../../../../domain/auth/telemetryParser.ts';
import { D1AuthAndGovernanceRepository } from '../../../repositories/d1AuthAndGovernanceRepository.ts';
import type { Env } from '../../../types.ts';

export async function handleRestrictUser(
  request: Request,
  env: Env
): Promise<Response> {
  const edgeTelemetry = extractEdgeNetworkTelemetry(
    request as unknown as { headers: Headers; cf?: Record<string, unknown> }
  );
  const body = (await request.json()) as {
    actorUserId: string;
    targetUserId: string;
    status: 'active' | 'blocked' | 'suspended';
    reason?: string | null;
    blockedUntil?: string | null;
  };

  const nowIso = new Date().toISOString();

  if (env.MED_QUESTS_AUTH_KV) {
    if (body.status === 'active') {
      await env.MED_QUESTS_AUTH_KV.delete(`usr_guard:${body.targetUserId}`);
    } else {
      await env.MED_QUESTS_AUTH_KV.put(
        `usr_guard:${body.targetUserId}`,
        JSON.stringify({
          status: body.status,
          blockedReason: body.reason ?? 'Administrative security restriction',
          blockedUntil: body.blockedUntil ?? null,
          updatedAt: nowIso,
        })
      );
    }
  }

  if (env.MED_QUESTS_DB) {
    await D1AuthAndGovernanceRepository.restrictUserAccount(
      env.MED_QUESTS_DB,
      {
        targetUserId: body.targetUserId,
        status: body.status,
        reason: body.reason ?? null,
        blockedUntil: body.blockedUntil ?? null,
        actorUserId: body.actorUserId,
        nowIso,
      }
    );
  }

  return new Response(
    JSON.stringify({
      ok: true,
      targetUserId: body.targetUserId,
      status: body.status,
      edgeColo: edgeTelemetry.colo,
      updatedAt: nowIso,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
