/**
 * Handler: GET /api/admin/users
 * Returns the admin directory of users with their linked active sessions.
 */

import { D1AuthAndGovernanceRepository } from '../../../repositories/d1AuthAndGovernanceRepository.ts';
import type { Env } from '../../../types.ts';

export async function handleGetAdminUsers(env: Env): Promise<Response> {
  if (!env.MED_QUESTS_DB) {
    return new Response(JSON.stringify({ users: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const users =
      await D1AuthAndGovernanceRepository.fetchAllAdminUsersWithSessions(
        env.MED_QUESTS_DB
      );
    return new Response(JSON.stringify({ ok: true, users }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: unknown) {
    return new Response(
      JSON.stringify({
        users: [],
        error: e instanceof Error ? e.message : 'D1 query failed',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
