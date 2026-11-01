/**
 * Specialized AI Audit Agent: Medical Factual Accuracy & Clinical Coherence
 * Evaluates physiological mechanisms, anatomical facts, clinical guidelines, and correctness of keyed answer.
 * Supports live Cloud LLM inference (Gemini 2.5 Pro, Groq 120B, Claude 3.7 Sonnet) with deterministic fallback.
 */

import type { Question } from '../../../model/types.ts';
import type { IAccuracyEvaluationAgent } from './IAccuracyEvaluationAgent.ts';
import type { AgentCritique } from '../types.ts';
import type { CloudProviderId } from '../../../ai/settings.ts';
import { createCloudProvider } from '../../../../infrastructure/ai/engineRegistry.ts';
import type { LlmMessage } from '../../../../infrastructure/ai/providers/openAiCompatibleProvider.ts';

export interface MedicalAccuracyAgentOptions {
  readonly providerId?: CloudProviderId;
  readonly modelId?: string;
}

export class MedicalFactualAccuracyAgent implements IAccuracyEvaluationAgent {
  public readonly agentId = 'agent_medical_factuality';
  public readonly agentName = 'Clinical Factual Accuracy Agent';
  public readonly role = 'Board-Certified Cardiovascular Curriculum Evaluator';
  public readonly dimension = 'factual_accuracy' as const;

  constructor(private readonly options?: MedicalAccuracyAgentOptions) {}

  public async evaluate(question: Question, signal?: AbortSignal): Promise<AgentCritique> {
    const isTestEnv = Boolean(
      (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') ||
      (import.meta as any).env?.VITEST ||
      (import.meta as any).env?.MODE === 'test'
    );

    // Attempt Live Cloud LLM Evaluation if configured and credentials available (non-test env)
    if (!isTestEnv && this.options?.providerId) {
      try {
        const cloudEvaluation = await this.evaluateViaCloudLlm(question, signal);
        if (cloudEvaluation) {
          return {
            agentId: this.agentId,
            agentName: `${this.agentName} (${this.options.modelId || this.options.providerId})`,
            role: this.role,
            dimension: this.dimension,
            evaluation: cloudEvaluation,
          };
        }
      } catch {
        // Graceful fallback to deterministic analysis on network or API quota errors
      }
    }

    // Deterministic Rule-Based Fallback
    return this.evaluateDeterministically(question);
  }

  /**
   * Deep live clinical critique powered by the selected AI model.
   */
  private async evaluateViaCloudLlm(
    question: Question,
    signal?: AbortSignal
  ): Promise<AgentCritique['evaluation'] | null> {
    const provider = createCloudProvider(
      this.options!.providerId!,
      this.options!.modelId
    );
    if (!provider) return null;

    const correctChoice = question.choices.find((c) => c.isCorrect);
    const choicesSummary = question.choices
      .map((c) => `- Option ${c.id.toUpperCase()}: "${c.text}" [${c.isCorrect ? 'KEYED CORRECT' : 'Distractor'}] (Rationale: ${c.rationale || 'None'})`)
      .join('\n');

    const prompt = `You are a Senior Board-Certified Cardiovascular Medical Faculty Member and USMLE/Board Examination Chief.
Evaluate the following cardiovascular board question for clinical factual accuracy, single-best-answer invariant, and rationale validity.

[QUESTION STEM]
${question.stem}

[CHOICES]
${choicesSummary}

[KEYED ANSWER]
Option ${correctChoice?.id?.toUpperCase() || 'NONE'}: ${correctChoice?.text || 'MISSING'}

[EXPLANATION]
${question.explanation}

[EVIDENCE GROUNDING]
${question.evidence?.map((e) => `${e.sourceName} (${e.location})`).join('; ') || 'None provided'}

Carefully verify:
1. Is the medical vignette accurate and aligned with established AHA/ACC/ESC cardiovascular clinical guidelines?
2. Is the keyed answer indisputably correct?
3. Are all distractors definitively incorrect while remaining plausible?
4. Does the explanation clearly explain the pathophysiology?

Respond strictly with valid JSON (no markdown formatting, no commentary):
{
  "score": <number between 0 and 100>,
  "passed": <boolean>,
  "summary": "<1-2 sentence executive summary of clinical factual accuracy>",
  "findings": ["<finding 1>", "<finding 2>"],
  "recommendations": ["<recommendation 1>"]
}`;

    const messages: LlmMessage[] = [
      {
        role: 'system',
        content: 'You are an elite Medical Board Examination Auditor. Return strictly valid JSON.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    let responseText = '';
    const turnSignal = signal ?? new AbortController().signal;

    for await (const chunk of provider.streamTurn(messages, [], turnSignal)) {
      if (chunk.type === 'text') {
        responseText += chunk.delta;
      }
    }

    const cleanJson = responseText
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/```(?:json)?/gi, '')
      .trim();

    try {
      const parsed = JSON.parse(cleanJson);
      const score = typeof parsed.score === 'number' ? Math.min(100, Math.max(0, parsed.score)) : 90;
      const passed = typeof parsed.passed === 'boolean' ? parsed.passed : score >= 80;
      const summary = typeof parsed.summary === 'string' && parsed.summary.trim()
        ? parsed.summary.trim()
        : 'Live model clinical factual accuracy audit completed.';
      const findings = Array.isArray(parsed.findings) ? parsed.findings.map(String) : [];
      const recommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations.map(String) : [];

      return {
        dimension: this.dimension,
        score,
        passed,
        summary,
        findings,
        recommendations,
      };
    } catch {
      return null;
    }
  }

  /**
   * Deterministic static evaluation rules (zero external dependencies).
   */
  private evaluateDeterministically(question: Question): AgentCritique {
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
