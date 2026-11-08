import { z } from 'zod';
import { QuestionSchema } from '../../../../domain/model/types.ts';
import type { QddScope } from '../../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';
import { EdgeBlockGuard } from '../../../curriculum/EdgeBlockGuard.ts';
import { createWorkerQddEngine, syncMissingD1Fingerprints } from '../../../qdd/compositionRoot.ts';
import type { Env } from '../../../types.ts';
import { logVerdict } from './logVerdict.ts';

const QddCheckBatchRequestSchema = z.object({
  questions: z.array(QuestionSchema).max(50),
  scope: z
    .object({
      kind: z.enum(['block', 'chapter', 'batch-only']),
      blockId: z.string().optional(),
      chapterId: z.string().optional(),
    })
    .default({ kind: 'block', blockId: 'cvs' }),
});

export async function handleCheckBatch(
  request: Request,
  env: Env,
  url: URL
): Promise<Response> {
  try {
    const body = await request.json();
    const parsed = QddCheckBatchRequestSchema.safeParse(body);
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
    const targetBlock = url.searchParams.get('block') || parsed.data.scope?.blockId || parsed.data.questions[0]?.blockId;
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
    const res = await engine.checkBatch(parsed.data.questions, scope);

    if (!res.ok) {
      return new Response(JSON.stringify({ error: res.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    for (const verdict of res.value) {
      await logVerdict(env.MED_QUESTS_DB, verdict, env.QDD_MODE || 'shadow');
    }

    return new Response(JSON.stringify({ verdicts: res.value }), {
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
