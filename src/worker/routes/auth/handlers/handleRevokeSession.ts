/**
 * Handler: POST /api/auth/session/revoke
 * Revokes a specific device session immediately in D1.
 */

import { D1AuthAndGovernanceRepository } from '../../../repositories/d1AuthAndGovernanceRepository.ts';
import type { Env } from '../../../types.ts';

export async function handleRevokeSession(
  request: Request,
  env: Env
): Promise<Response> {
  const body = (await request.json()) as { userId?: string; sessionId: string };
  const nowIso = new Date().toISOString();
  if (env.MED_QUESTS_DB && body.sessionId) {
    await D1AuthAndGovernanceRepository.revokeSession(
      env.MED_QUESTS_DB,
      body.sessionId,
      nowIso
    );
  }
  return new Response(
    JSON.stringify({ ok: true, revokedSessionId: body.sessionId }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
