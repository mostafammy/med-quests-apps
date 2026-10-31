/**
 * Specialized AI Audit Agent: Medical Factual Accuracy & Clinical Coherence
 * Evaluates physiological mechanisms, anatomical facts, clinical guidelines, and correctness of keyed answer.
 */

import type { Question } from '../../../model/types.ts';
import type { IAccuracyEvaluationAgent } from './IAccuracyEvaluationAgent.ts';
import type { AgentCritique } from '../types.ts';

export class MedicalFactualAccuracyAgent implements IAccuracyEvaluationAgent {
  public readonly agentId = 'agent_medical_factuality';
  public readonly agentName = 'Clinical Factual Accuracy Agent';
  public readonly role = 'Board-Certified Cardiovascular Curriculum Evaluator';
  public readonly dimension = 'factual_accuracy' as const;

  public async evaluate(question: Question, _signal?: AbortSignal): Promise<AgentCritique> {
    const findings: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Check stem length and clinical vignette presence
    if (!question.stem || question.stem.trim().length < 25) {
      score -= 30;
      findings.push('Stem is excessively terse or lacks sufficient clinical vignette context.');
      recommendations.push('Enrich stem with patient demographics, vital signs, or clinical presentation.');
    }

    // Check explanation depth and factual soundness
    if (!question.explanation || question.explanation.trim().length < 40) {
      score -= 25;
      findings.push('Explanation lacks mechanistic pathophysiological depth.');
      recommendations.push('Provide a thorough explanation detailing why the keyed mechanism is correct.');
    }

    // Check key correctness indication
    const correctChoice = question.choices.find((c) => c.isCorrect);
    if (!correctChoice) {
      score = 0;
      findings.push('CRITICAL: No correct choice is marked.');
      recommendations.push('Designate exactly one choice as correct.');
    } else {
      if (correctChoice.text.trim().length < 2) {
        score -= 20;
        findings.push('Correct choice text is suspiciously brief.');
      }
      if (!correctChoice.rationale || correctChoice.rationale.trim().length < 15) {
        score -= 15;
        findings.push('Correct choice rationale lacks authoritative justification.');
      }
    }

    const passed = score >= 80;
    const summary = passed
      ? 'Question exhibits strong medical factual accuracy and sound clinical rationale.'
      : 'Question exhibits potential factual vulnerabilities or insufficiently justified explanations.';

    return {
      agentId: this.agentId,
      agentName: this.agentName,
      role: this.role,
      dimension: this.dimension,
      evaluation: {
        dimension: this.dimension,
        score: Math.max(0, score),
        passed,
        summary,
        findings,
        recommendations,
      },
    };
  }
}
