/**
 * Factory Pattern: AuditAgentFactory
 * Assembles and instantiates the multi-agent clinical evaluation squad.
 * Adheres to Dependency Inversion & Open/Closed Principle.
 */

import type { IAccuracyEvaluationAgent } from './IAccuracyEvaluationAgent.ts';
import { MedicalFactualAccuracyAgent } from './MedicalFactualAccuracyAgent.ts';
import { SingleBestAnswerInvariantAgent } from './SingleBestAnswerInvariantAgent.ts';
import { DistractorPlausibilityAgent } from './DistractorPlausibilityAgent.ts';
import { CurriculumEvidenceGroundingAgent } from './CurriculumEvidenceGroundingAgent.ts';
import { PedagogicalClarityAgent } from './PedagogicalClarityAgent.ts';

export class AuditAgentFactory {
  private static customAgents: IAccuracyEvaluationAgent[] = [];

  public static createDefaultSquad(): readonly IAccuracyEvaluationAgent[] {
    return [
      new MedicalFactualAccuracyAgent(),
      new SingleBestAnswerInvariantAgent(),
      new DistractorPlausibilityAgent(),
      new CurriculumEvidenceGroundingAgent(),
      new PedagogicalClarityAgent(),
      ...this.customAgents,
    ];
  }

  public static registerCustomAgent(agent: IAccuracyEvaluationAgent): void {
    this.customAgents.push(agent);
  }

  public static clearCustomAgents(): void {
    this.customAgents = [];
  }
}
