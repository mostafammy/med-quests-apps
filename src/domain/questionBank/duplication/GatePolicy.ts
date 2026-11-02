/**
 * Domain Service: GatePolicy
 * Strategy Pattern: Converts DuplicateRelation into a GateDecision.
 * Enforces Zero Auto-Acceptance and no false BLOCK invariants.
 */

import type {
  DuplicateRelation,
  GateDecision,
  IGatePolicy,
  QddExecutionTier,
} from '../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';

export class EdgeGatePolicy implements IGatePolicy {
  public decide(
    relation: DuplicateRelation,
    tier: QddExecutionTier,
    degraded: boolean,
    llmConfidence: number | null
  ): GateDecision {
    // In browser advisory tier, the gate is never authoritative (always INFORM or ALLOW)
    if (tier === 'browser-advisory') {
      if (relation === 'EXACT' || relation === 'NEAR' || relation === 'CONFLICT' || relation === 'SIBLING') {
        return 'INFORM';
      }
      return 'ALLOW';
    }

    // Degraded mode safety: probabilistic relations can NEVER block
    if (degraded && relation !== 'EXACT') {
      return relation === 'UNIQUE' ? 'ALLOW' : 'REVIEW';
    }

    // Low LLM confidence forces human review
    if (llmConfidence !== null && llmConfidence < 0.70) {
      return 'REVIEW';
    }

    switch (relation) {
      case 'EXACT':
        // Only published exact copies are blocked
        return 'BLOCK';

      case 'CONFLICT':
      case 'NEAR':
        // Routed to Faculty Review Queue for human triage
        return 'REVIEW';

      case 'SIBLING':
        // Shown as an advisory variant hint, does not block
        return 'INFORM';

      case 'UNIQUE':
      default:
        // ALLOW merely permits the submission to enter pending_review in the queue
        // ZERO AUTO-ACCEPTANCE: never auto-publishes
        return 'ALLOW';
    }
  }
}
