/**
 * Specialized AI Audit Agent: Pedagogical Clarity & Cognitive Taxonomy
 * Evaluates item clarity, cognitive taxonomy calibration (Recall vs Application),
 * absence of negatively phrased stems, and mnemonic efficacy.
 */

import type { Question } from '../../model/types.ts';
import type { IAccuracyEvaluationAgent } from './IAccuracyEvaluationAgent.ts';
import type { AgentCritique } from '../types.ts';

export class PedagogicalClarityAgent implements IAccuracyEvaluationAgent {
  public readonly agentId = 'agent_pedagogical_clarity';
  public readonly agentName = 'Pedagogical Clarity & Taxonomy Agent';
  public readonly role = 'Medical Education & Cognitive Assessment Director';
  public readonly dimension = 'pedagogical_clarity' as const;

  public async evaluate(question: Question, _signal?: AbortSignal): Promise<AgentCritique> {
    const findings: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    const stemLower = (question.stem || '').toLowerCase();

    // 1. Detect negative stems ("EXCEPT", "NOT", "LEAST LIKELY")
    if (
      stemLower.includes(' except') ||
      stemLower.includes(' not ') ||
      stemLower.includes('least likely') ||
      stemLower.includes('incorrect')
    ) {
      score -= 20;
      findings.push('Negative item phrasing detected (e.g., EXCEPT / NOT / LEAST LIKELY). NBME guidelines discourage negative stems.');
      recommendations.push('Refactor into a positive clinical inquiry (e.g., "Which finding is most consistent with...").');
    }

    // 2. Validate concept label
    if (!question.concept || question.concept.trim().length < 5) {
      score -= 15;
      findings.push('Concept tag is missing or too generic.');
      recommendations.push('Provide a precise clinical concept name (e.g. "Aortic Stenosis Hemodynamics").');
    }

    // 3. Cognitive level vs stem complexity heuristic
    if (question.cognitiveLevel === 'application') {
      const hasPatientVignette =
        stemLower.includes('year-old') ||
        stemLower.includes('man') ||
        stemLower.includes('woman') ||
        stemLower.includes('patient') ||
        stemLower.includes('boy') ||
        stemLower.includes('girl') ||
        stemLower.includes('presents with');

      if (!hasPatientVignette) {
        score -= 15;
        findings.push('Item tagged as "Application" but stem lacks a concrete clinical vignette or patient scenario.');
        recommendations.push('Reclassify as "Recall" / "Understanding" or frame within a patient case vignette.');
      }
    }

    // 4. Bonus/check for high-yield tips and mnemonics
    if (!question.examTip) {
      score -= 5;
      findings.push('No high-yield exam tip provided for rapid review.');
    }

    const passed = score >= 75;
    const summary = passed
      ? 'Pedagogical structure is sound, unambiguous, and properly aligned with cognitive standards.'
      : 'Clarity or cognitive alignment issues detected in the question stem.';

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
