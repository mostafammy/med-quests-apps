import type { DuplicationVerdict } from '../../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';
import { QddTelemetrySink } from '../../../../infrastructure/questionBank/duplication/telemetry/QddTelemetrySink.ts';
import type { D1DatabaseBinding } from '../../../types.ts';

export async function logVerdict(
  db: D1DatabaseBinding | null | undefined,
  verdict: DuplicationVerdict,
  mode: string
): Promise<void> {
  if (!db) return;
  try {
    const id = `vlog-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const sql = `
      INSERT INTO qdd_verdict_log (
        id, subject_id, tier, mode, decision, relation, verdict_json,
        engine_version, thresholds_version, latency_ms, degraded, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `;
    await db
      .prepare(sql)
      .bind(
        id,
        verdict.questionId,
        verdict.tier,
        mode === 'enforce' ? 'enforce' : 'shadow',
        verdict.decision,
        verdict.relation,
        JSON.stringify(verdict),
        verdict.engineVersion,
        verdict.thresholdsVersion,
        verdict.latencyMs,
        verdict.degraded ? 1 : 0
      )
      .run();

    // Non-blocking telemetry dispatch
    QddTelemetrySink.getInstance().recordVerdict({
      subjectId: verdict.questionId,
      tier: verdict.tier,
      mode: mode === 'enforce' ? 'enforce' : 'shadow',
      decision: verdict.decision,
      relation: verdict.relation,
      decidingStage: verdict.candidates[0]?.decidedBy || 'S0_CANONICALIZE',
      stagesExecuted: verdict.stagesExecuted,
      latencyMs: verdict.latencyMs,
      degraded: verdict.degraded,
      degradedReason: verdict.degradedReasons[0] ?? null,
      candidateCount: verdict.candidates.length,
      topScore: verdict.candidates[0]?.signals?.fusedScore,
    });
  } catch {
    // Non-blocking log failure
  }
}
