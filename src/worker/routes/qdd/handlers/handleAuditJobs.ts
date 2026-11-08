import { D1AuditJobRepository } from '../../../../infrastructure/questionBank/duplication/d1/D1AuditJobRepository.ts';
import { syncMissingD1Fingerprints } from '../../../qdd/compositionRoot.ts';
import type { Env } from '../../../types.ts';

export async function handleStartAuditJob(request: Request, env: Env): Promise<Response> {
  try {
    if (!env.MED_QUESTS_DB) {
      return new Response(JSON.stringify({ error: 'DATABASE_UNAVAILABLE' }), { status: 503 });
    }
    const body = (await request.json().catch(() => ({}))) as {
      blockId?: string;
      startedBy?: string;
    };
    const blockId = body.blockId || 'cvs';
    const startedBy = body.startedBy || 'admin';
    await syncMissingD1Fingerprints(env.MED_QUESTS_DB);
    const repo = new D1AuditJobRepository(env.MED_QUESTS_DB);
    const job = await repo.createJob(blockId, startedBy);
    return new Response(JSON.stringify(job), {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    });
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

export async function handleAdvanceAuditJob(jobId: string, env: Env): Promise<Response> {
  try {
    if (!env.MED_QUESTS_DB) {
      return new Response(JSON.stringify({ error: 'DATABASE_UNAVAILABLE' }), { status: 503 });
    }
    const repo = new D1AuditJobRepository(env.MED_QUESTS_DB);
    const job = await repo.advanceChunk(jobId);
    return new Response(JSON.stringify(job), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
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

export async function handleGetAuditJobStatus(jobId: string, env: Env): Promise<Response> {
  try {
    if (!env.MED_QUESTS_DB) {
      return new Response(JSON.stringify({ error: 'DATABASE_UNAVAILABLE' }), { status: 503 });
    }
    const repo = new D1AuditJobRepository(env.MED_QUESTS_DB);
    const job = await repo.getJob(jobId);
    if (!job) {
      return new Response(JSON.stringify({ error: 'JOB_NOT_FOUND' }), { status: 404 });
    }
    return new Response(JSON.stringify(job), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
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

export async function handleGetAuditClusters(jobId: string, env: Env): Promise<Response> {
  try {
    if (!env.MED_QUESTS_DB) {
      return new Response(JSON.stringify({ error: 'DATABASE_UNAVAILABLE' }), { status: 503 });
    }
    const repo = new D1AuditJobRepository(env.MED_QUESTS_DB);
    const clusters = await repo.getClusters(jobId);
    return new Response(JSON.stringify({ clusters }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
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
