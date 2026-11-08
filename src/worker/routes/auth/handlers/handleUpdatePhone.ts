/**
 * Handler: POST /api/auth/profile/phone
 * Updates a user's primary mobile communication phone number.
 */

import { D1AuthAndGovernanceRepository } from '../../../repositories/d1AuthAndGovernanceRepository.ts';
import type { Env } from '../../../types.ts';

export async function handleUpdatePhone(
  request: Request,
  env: Env
): Promise<Response> {
  const body = (await request.json()) as {
    email?: string;
    userId?: string;
    phoneNumber: string;
  };
  const cleanPhone = (body.phoneNumber || '').trim();
  if (env.MED_QUESTS_DB) {
    try {
      await D1AuthAndGovernanceRepository.updateUserPhone(
        env.MED_QUESTS_DB,
        cleanPhone,
        body.email,
        body.userId
      );
      return new Response(
        JSON.stringify({ ok: true, phoneNumber: cleanPhone }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (e: unknown) {
      return new Response(
        JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
        { status: 500 }
      );
    }
  }

  return new Response(
    JSON.stringify({ ok: true, phoneNumber: cleanPhone }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
