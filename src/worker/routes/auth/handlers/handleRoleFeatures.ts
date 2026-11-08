/**
 * Handler: POST /api/admin/governance/role-features
 * Updates a user's role and per-user feature flag overrides.
 */

import { extractEdgeNetworkTelemetry } from '../../../../domain/auth/telemetryParser.ts';
import { D1AuthAndGovernanceRepository } from '../../../repositories/d1AuthAndGovernanceRepository.ts';
import type { Env } from '../../../types.ts';

export async function handleRoleFeatures(
  request: Request,
  env: Env
): Promise<Response> {
  const edgeTelemetry = extractEdgeNetworkTelemetry(
    request as unknown as { headers: Headers; cf?: Record<string, unknown> }
  );
  const body = (await request.json()) as {
    actorUserId: string;
    targetUserId: string;
    newRole: string;
    customFeatureOverrides?: Record<string, boolean>;
  };

  const nowIso = new Date().toISOString();
  const featuresJson = JSON.stringify(body.customFeatureOverrides ?? {});

  if (env.MED_QUESTS_DB) {
    await D1AuthAndGovernanceRepository.updateUserRoleAndFeatures(
      env.MED_QUESTS_DB,
      {
        targetUserId: body.targetUserId,
        newRole: body.newRole,
        featuresJson,
        nowIso,
      }
    );
  }

  return new Response(
    JSON.stringify({
      ok: true,
      targetUserId: body.targetUserId,
      newRole: body.newRole,
      customFeatureOverrides: body.customFeatureOverrides ?? {},
      edgeColo: edgeTelemetry.colo,
      updatedAt: nowIso,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
