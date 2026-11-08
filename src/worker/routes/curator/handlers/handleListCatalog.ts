/**
 * Handler: GET /api/admin/questions/catalog
 * Lists canonical question catalog, audit logs, and computes global bank KPIs.
 */

import { computeGlobalBankKpis } from '../../../../domain/questionBank/questionSpecifications.ts';
import { ensureGlobalBankSeeded } from '../../../repositories/d1QuestionBankRepository.ts';
import { D1CuratorRepository } from '../../../repositories/d1CuratorRepository.ts';
import type { Env } from '../../../types.ts';

export async function handleListCatalog(env: Env, url: URL): Promise<Response> {
  const blockId = url.searchParams.get('block') || 'cvs';
  if (!env.MED_QUESTS_DB) {
    return new Response(
      JSON.stringify({ questions: [], auditLogs: [], kpis: null }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    await ensureGlobalBankSeeded(env.MED_QUESTS_DB, blockId);
    const { questions, auditLogs, currentRev } =
      await D1CuratorRepository.fetchCanonicalCatalog(env.MED_QUESTS_DB, blockId);
    const kpis = computeGlobalBankKpis(questions, currentRev);

    return new Response(
      JSON.stringify({ questions, auditLogs, kpis }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e: unknown) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500 }
    );
  }
}
