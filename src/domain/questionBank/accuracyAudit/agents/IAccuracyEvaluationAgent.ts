/**
 * Interface Segregation (ISP): IAccuracyEvaluationAgent
 * Contract for specialized AI audit agents inspecting a specific clinical quality dimension.
 */

import type { Question } from '../../../model/types.ts';
import type { AgentCritique, AuditEvaluationDimension } from '../types.ts';

export interface IAccuracyEvaluationAgent {
  readonly agentId: string;
  readonly agentName: string;
  readonly role: string;
  readonly dimension: AuditEvaluationDimension;

  /**
   * Conducts an in-depth audit critique on a single clinical question.
   */
  evaluate(question: Question, signal?: AbortSignal): Promise<AgentCritique>;
}
