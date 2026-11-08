import { z } from 'zod';
import { QuestionSchema } from '../../../../domain/model/types.ts';
import type { QddScope } from '../../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';
import { EdgeBlockGuard } from '../../../curriculum/EdgeBlockGuard.ts';
import { createWorkerQddEngine, syncMissingD1Fingerprints } from '../../../qdd/compositionRoot.ts';
import type { Env } from '../../../types.ts';
import { logVerdict } from './logVerdict.ts';

const QddCheckRequestSchema = z.object({
  question: QuestionSchema,
  scope: z
    .object({
      kind: z.enum(['block', 'chapter', 'batch-only']),
      blockId: z.string().optional(),
      chapterId: z.string().optional(),
    })
    .default({ kind: 'block', blockId: 'cvs' }),
});

export async function handleCheckSingle(
  request: Request,
  env: Env,
  url: URL,
  effectiveMode: 'off' | 'shadow' | 'enforce'
): Promise<Response> {
  // Emergency Administrative Bypass: When QDD_MODE is 'off', bypass checks with ALLOW / UNIQUE
  if (effectiveMode === 'off') {
    const body = (await request.json().catch(() => ({}))) as { question?: { id?: string } };
    const questionId = body?.question?.id || 'unknown';
    return new Response(
      JSON.stringify({
        questionId,
        decision: 'ALLOW',
        relation: 'UNIQUE',
        candidates: [],
        stagesExecuted: [],
        decidingStage: 'BYPASS_KILL_SWITCH',
        degraded: true,
        degradedReason: 'ADMIN_BYPASS',
        engineVersion: 'qdd-engine-v2',
        thresholdsVersion: 'v1',
        latencyMs: 0,
        tier: 'edge_authoritative',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'x-qdd-bypass': 'true' },
      }
    );
  }

  try {
    const body = await request.json();
    const parsed = QddCheckRequestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: 'INVALID_REQUEST',
          details: parsed.error.issues,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const scope = parsed.data.scope as unknown as QddScope;
    const targetBlock = url.searchParams.get('block') || parsed.data.scope?.blockId || parsed.data.question.blockId;
    if (targetBlock || parsed.data.scope?.kind === 'block') {
      const edgeBlockGuard = new EdgeBlockGuard(env.MED_QUESTS_DB);
      const blockCheck = await edgeBlockGuard.requireKnownBlock(targetBlock || 'cvs');
      if (!blockCheck.ok) {
        return blockCheck.response;
      }
    }

    if (!env.MED_QUESTS_DB) {
      return new Response(JSON.stringify({ error: 'DATABASE_UNAVAILABLE' }), { status: 503 });
    }
    await syncMissingD1Fingerprints(env.MED_QUESTS_DB);
    const engine = createWorkerQddEngine(env.MED_QUESTS_DB);
    const res = await engine.check(parsed.data.question, scope, 'edge-authoritative');

    if (!res.ok) {
      return new Response(JSON.stringify({ error: res.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Record to qdd_verdict_log
    await logVerdict(env.MED_QUESTS_DB, res.value, env.QDD_MODE || 'shadow');

    return new Response(JSON.stringify(res.value), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: 'SERVER_ERROR', message: msg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
