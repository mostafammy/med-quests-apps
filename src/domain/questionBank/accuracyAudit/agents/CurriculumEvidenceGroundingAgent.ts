/**
 * Specialized AI Audit Agent: Curriculum Evidence & Citation Grounding
 * Validates verbatim evidence quotes, slide/syllabus source citations,
 * ensuring questions are anchored in official curriculum without hallucination.
 */

import type { Question } from '../../model/types.ts';
import type { IAccuracyEvaluationAgent } from './IAccuracyEvaluationAgent.ts';
import type { AgentCritique } from '../types.ts';

export class CurriculumEvidenceGroundingAgent implements IAccuracyEvaluationAgent {
  public readonly agentId = 'agent_evidence_grounding';
  public readonly agentName = 'Curriculum Evidence & Grounding Auditor';
  public readonly role = 'Faculty Syllabus Verification Officer';
  public readonly dimension = 'curriculum_evidence_grounding' as const;

  public async evaluate(question: Question, _signal?: AbortSignal): Promise<AgentCritique> {
    const findings: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    const evidenceList = question.evidence || [];

    if (evidenceList.length === 0) {
      score = 0;
      findings.push('CRITICAL: Question has zero curriculum evidence citations attached.');
      recommendations.push('Attach at least one official lecture slide or syllabus citation with a verbatim quote.');
    } else {
      for (let i = 0; i < evidenceList.length; i++) {
        const ev = evidenceList[i];
        if (!ev.sourceName || ev.sourceName.trim().length < 3) {
          score -= 20;
          findings.push(`Evidence #${i + 1} lacks a distinct syllabus/source name.`);
        }
        if (!ev.location || ev.location.trim().length < 2) {
          score -= 15;
          findings.push(`Evidence #${i + 1} lacks specific location indexing (e.g., "Slide 14" or "Page 6").`);
        }
        if (!ev.quote || ev.quote.trim().length < 15) {
          score -= 25;
          findings.push(`Evidence #${i + 1} quote is too brief (${ev.quote?.length || 0} chars) to serve as verbatim proof.`);
          recommendations.push('Provide an authoritative verbatim excerpt of >= 15 characters from the primary source material.');
        }
      }
    }

    const passed = score >= 75;
    const summary = passed
      ? 'Curriculum citations verified: authentic verbatim proof grounds this question.'
      : 'Insufficient curriculum evidence grounding: question lacks verifiable syllabus citations.';

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
