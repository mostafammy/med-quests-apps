/**
 * Infrastructure: Cloudflare D1 Pair Verdict Cache
 * Caches reranker and LLM arbitration decisions in D1 SQLite table `qdd_pair_verdicts`.
 */

import type {
  IPairVerdictCache,
  LlmArbiterVerdict,
  PairKey,
  DuplicateRelation,
} from '../../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';

interface D1DatabaseLike {
  prepare(query: string): {
    bind(...params: unknown[]): {
      first<T = unknown>(): Promise<T | null>;
      run(): Promise<{ success: boolean }>;
    };
  };
}

interface VerdictRow {
  pair_key: string;
  relation: string;
  confidence: number;
  rationale: string;
  model_id: string;
  prompt_version: string;
  source: string;
}

export class D1PairVerdictCache implements IPairVerdictCache {
  constructor(private readonly db: D1DatabaseLike) {}

  public async get(key: PairKey): Promise<LlmArbiterVerdict | null> {
    const row = await this.db
      .prepare('SELECT * FROM qdd_pair_verdicts WHERE pair_key = ? LIMIT 1')
      .bind(key)
      .first<VerdictRow>();

    if (!row) return null;

    return {
      relation: row.relation as Exclude<DuplicateRelation, 'UNIQUE'> | 'UNIQUE',
      confidence: row.confidence,
      rationale: row.rationale,
      modelId: row.model_id,
      promptVersion: row.prompt_version,
    };
  }

  public async put(key: PairKey, verdict: LlmArbiterVerdict): Promise<void> {
    const sql = `
      INSERT INTO qdd_pair_verdicts (
        pair_key, relation, confidence, rationale, model_id, prompt_version, source, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'llm', datetime('now'))
      ON CONFLICT(pair_key) DO UPDATE SET
        relation = excluded.relation,
        confidence = excluded.confidence,
        rationale = excluded.rationale,
        model_id = excluded.model_id,
        prompt_version = excluded.prompt_version
    `;

    await this.db
      .prepare(sql)
      .bind(
        key,
        verdict.relation,
        verdict.confidence,
        verdict.rationale,
        verdict.modelId,
        verdict.promptVersion
      )
      .run();
  }
}
