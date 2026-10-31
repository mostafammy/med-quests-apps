/**
 * Specialized AI Audit Agent: Single Best Answer (SBA) Invariant Inspector
 * Enforces USMLE/NBME psychometric standards: exactly one correct answer, no ambiguous duplicates,
 * no prohibited test-taking flaws (e.g. 'All of the above', 'None of the above').
 */

import type { Question } from '../../model/types.ts';
import type { IAccuracyEvaluationAgent } from './IAccuracyEvaluationAgent.ts';
import type { AgentCritique } from '../types.ts';

export class SingleBestAnswerInvariantAgent implements IAccuracyEvaluationAgent {
  public readonly agentId = 'agent_sba_invariant';
  public readonly agentName = 'SBA Invariant & Psychometric Guard';
  public readonly role = 'NBME/USMLE Psychometric Standard Reviewer';
  public readonly dimension = 'single_best_answer_invariant' as const;

  public async evaluate(question: Question, _signal?: AbortSignal): Promise<AgentCritique> {
    const findings: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    const choices = question.choices || [];
    const correctChoices = choices.filter((c) => c.isCorrect);

    // Invariant 1: Exactly 1 correct choice
    if (correctChoices.length === 0) {
      score = 0;
      findings.push('CRITICAL: Single Best Answer invariant violated: 0 correct choices designated.');
      recommendations.push('Designate exactly one unambiguously correct choice.');
    } else if (correctChoices.length > 1) {
      score = 0;
      findings.push(`CRITICAL: Multiple keys flagged as correct (${correctChoices.length} choices).`);
      recommendations.push('Resolve answer ambiguity so only one choice is keyed true.');
    }

    // Invariant 2: Exactly 4 choices
    if (choices.length !== 4) {
      score -= 25;
      findings.push(`Choice count mismatch: found ${choices.length} choices instead of standard 4 (A, B, C, D).`);
    }

    // Invariant 3: Prohibited choice tropes ('All of the above', 'None of the above')
    for (const choice of choices) {
      const lower = choice.text.toLowerCase().trim();
      if (lower.includes('all of the above') || lower.includes('none of the above')) {
        score -= 30;
        findings.push(`Prohibited choice format detected in Option ${choice.id.toUpperCase()}: "${choice.text}".`);
        recommendations.push('Replace "All/None of the above" with plausible specific clinical distractors.');
      }
    }

    // Invariant 4: Duplicate choice text
    const textSet = new Set<string>();
    for (const choice of choices) {
      const normalized = choice.text.trim().toLowerCase();
      if (textSet.has(normalized)) {
        score -= 35;
        findings.push(`Duplicate choice text detected: "${choice.text}".`);
        recommendations.push('Ensure every choice presents a distinct physiological or anatomical option.');
      }
      textSet.add(normalized);
    }

    const passed = score >= 80;
    const summary = passed
      ? 'Single Best Answer invariant verified: exactly 1 valid key with 3 distinct distractors.'
      : 'SBA Invariant violation detected: question contains keying ambiguities or psychometric flaws.';

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
