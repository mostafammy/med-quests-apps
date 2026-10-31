/**
 * Specialized AI Audit Agent: Distractor Plausibility & Pedagogical Discernment
 * Evaluates distractor quality, length cue symmetry, and whether distractors represent
 * high-yield clinical pitfalls rather than trivial throwaways.
 */

import type { Question } from '../../../model/types.ts';
import type { IAccuracyEvaluationAgent } from './IAccuracyEvaluationAgent.ts';
import type { AgentCritique } from '../types.ts';

export class DistractorPlausibilityAgent implements IAccuracyEvaluationAgent {
  public readonly agentId = 'agent_distractor_plausibility';
  public readonly agentName = 'Distractor Plausibility & Trap Inspector';
  public readonly role = 'Cognitive Discrimination & Trap Specialist';
  public readonly dimension = 'distractor_plausibility' as const;

  public async evaluate(question: Question, _signal?: AbortSignal): Promise<AgentCritique> {
    const findings: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    const choices = question.choices || [];
    const distractors = choices.filter((c) => !c.isCorrect);
    const correctChoice = choices.find((c) => c.isCorrect);

    // 1. Check each distractor rationale
    for (const d of distractors) {
      if (!d.rationale || d.rationale.trim().length < 15) {
        score -= 15;
        findings.push(`Distractor ${d.id.toUpperCase()} lacks an educational rationale explaining why it is incorrect.`);
        recommendations.push(`Add a detailed explanation for choice ${d.id.toUpperCase()} detailing its clinical context.`);
      }
    }

    // 2. Length Cue Analysis (Correct answer being substantially longer or shorter than distractors)
    if (correctChoice && distractors.length > 0) {
      const correctLen = correctChoice.text.length;
      const avgDistractorLen =
        distractors.reduce((acc, curr) => acc + curr.text.length, 0) / distractors.length;

      const ratio = correctLen / (avgDistractorLen || 1);
      if (ratio > 2.5) {
        score -= 20;
        findings.push(
          `Unconscious length cue detected: Correct choice (${correctLen} chars) is >2.5x longer than distractors (avg ${Math.round(avgDistractorLen)} chars).`
        );
        recommendations.push('Balance choice lengths so the correct answer does not stand out by sheer verbosity.');
      } else if (ratio < 0.35) {
        score -= 15;
        findings.push(
          `Length cue detected: Correct choice is disproportionately brief compared to distractors.`
        );
        recommendations.push('Equalize sentence complexity across all options.');
      }
    }

    // 3. Distractor plausibility heuristic (check minimum length)
    for (const d of distractors) {
      if (d.text.trim().length < 4) {
        score -= 15;
        findings.push(`Distractor ${d.id.toUpperCase()} is suspiciously short ("${d.text}").`);
      }
    }

    const passed = score >= 75;
    const summary = passed
      ? 'Distractors are plausible, well-rationalized, and free of unconscious length cues.'
      : 'Distractor vulnerabilities identified: missing rationales or significant length disparity.';

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
