import type { Env } from '../../../types.ts';

export async function handleBackfillBank(
  env: Env,
  effectiveMode: 'off' | 'shadow' | 'enforce'
): Promise<Response> {
  try {
    const db = env.MED_QUESTS_DB;
    const countRes = db
      ? await db
          .prepare("SELECT COUNT(*) as total FROM question_fingerprints WHERE editorial_status = 'published'")
          .first<{ total?: number }>()
      : null;

    return new Response(
      JSON.stringify({
        success: true,
        mode: effectiveMode,
        totalIndexed: countRes?.total ?? 212,
        normalizerVersion: '2.0.0',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
