/**
 * Domain Service: AccuracyAuditEngine (Pipeline / Orchestrator Pattern)
 * Coordinates sampling strategies, multi-agent evaluation squad execution,
 * statistical margin of error computation, and report synthesis.
 *
 * Adheres to SOLID:
 * - Single Responsibility: Orchestrating the audit execution pipeline.
 * - Open/Closed: Accepts injected sampling strategies and agent squads.
 * - Dependency Inversion: Relies on ISamplingStrategy and IAccuracyEvaluationAgent abstractions.
 */

import type { Question } from '../../model/types.ts';
import type {
  SamplingConfiguration,
  AccuracyAuditRunReport,
  QuestionAccuracyAuditResult,
  AgentCritique,
  AuditProgressCallback,
  AccuracyAuditSummaryKpis,
  StatisticalMarginOfError,
  AuditEvaluationDimension,
  AuditVerdict,
} from './types.ts';
import { SamplingStrategyFactory } from './sampling/SamplingStrategyFactory.ts';
import { AuditAgentFactory } from './agents/AuditAgentFactory.ts';
import type { ISamplingStrategy } from './sampling/ISamplingStrategy.ts';
import type { IAccuracyEvaluationAgent } from './agents/IAccuracyEvaluationAgent.ts';

export interface AuditEngineOptions {
  readonly samplingStrategy?: ISamplingStrategy;
  readonly agents?: readonly IAccuracyEvaluationAgent[];
}

export class AccuracyAuditEngine {
  private readonly defaultAgents: readonly IAccuracyEvaluationAgent[];
  private readonly defaultStrategy?: ISamplingStrategy;

  constructor(options?: AuditEngineOptions) {
    this.defaultAgents = options?.agents ?? AuditAgentFactory.createDefaultSquad();
    this.defaultStrategy = options?.samplingStrategy;
  }

  public async runAudit(
    population: readonly Question[],
    config: SamplingConfiguration,
    adminUser: { userId: string; displayName: string },
    onProgress?: AuditProgressCallback,
    signal?: AbortSignal
  ): Promise<AccuracyAuditRunReport> {
    const startTime = Date.now();

    // Stage 1: Sampling
    onProgress?.({
      stage: 'sampling',
      currentQuestionIndex: 0,
      totalQuestionsToAudit: config.sampleSize,
      percentComplete: 5,
      message: `Extracting statistically unbiased sample (${config.strategyType})...`,
    });

    const strategy =
      this.defaultStrategy ?? SamplingStrategyFactory.create(config.strategyType);
    const extraction = strategy.sample(population, config);
    const sample = extraction.sampledQuestions;
    const totalToAudit = sample.length;

    // Stage 2: Multi-Agent Evaluation
    const questionResults: QuestionAccuracyAuditResult[] = [];
    const agents = this.defaultAgents;

    for (let i = 0; i < totalToAudit; i++) {
      if (signal?.aborted) {
        throw new Error('Accuracy audit aborted by administrator.');
      }

      const question = sample[i];
      const progressPercent = Math.round(10 + (i / totalToAudit) * 80);

      onProgress?.({
        stage: 'evaluating',
        currentQuestionIndex: i + 1,
        totalQuestionsToAudit: totalToAudit,
        activeAgentName: 'Multi-Agent Critic Squad',
        percentComplete: progressPercent,
        message: `Auditing question ${i + 1} of ${totalToAudit}: "${question.concept || question.id}"`,
      });

      // Run all agents for this question (parallel within item)
      const critiques: AgentCritique[] = await Promise.all(
        agents.map((agent) => agent.evaluate(question, signal))
      );

      // Synthesize composite score & verdict
      const result = this.synthesizeQuestionAuditResult(question, critiques);
      questionResults.push(result);
    }

    // Stage 3: Synthesizing Global KPIs & Statistical Validity
    onProgress?.({
      stage: 'synthesizing',
      currentQuestionIndex: totalToAudit,
      totalQuestionsToAudit: totalToAudit,
      percentComplete: 95,
      message: 'Computing statistical confidence intervals and dimension health...',
    });

    const kpis = this.calculateSummaryKpis(
      questionResults,
      extraction.totalPopulationSize,
      totalToAudit
    );

    const runReport: AccuracyAuditRunReport = {
      runId: `audit-run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      executedByAdmin: {
        userId: adminUser.userId,
        displayName: adminUser.displayName,
      },
      configuration: config,
      extractionMetadata: {
        totalBankQuestions: extraction.totalPopulationSize,
        sampledCount: totalToAudit,
        randomSeed: extraction.randomSeed,
        strataRepresentation: extraction.strataRepresentation,
      },
      kpis,
      questionResults,
      durationMs: Date.now() - startTime,
    };

    onProgress?.({
      stage: 'completed',
      currentQuestionIndex: totalToAudit,
      totalQuestionsToAudit: totalToAudit,
      percentComplete: 100,
      message: `Audit completed successfully in ${runReport.durationMs}ms. Accuracy Index: ${kpis.overallAccuracyIndex}%`,
    });

    return runReport;
  }

  private synthesizeQuestionAuditResult(
    question: Question,
    critiques: readonly AgentCritique[]
  ): QuestionAccuracyAuditResult {
    const criticalFlags: string[] = [];
    let weightedSum = 0;
    let totalWeights = 0;

    // Weights per dimension:
    // Factual accuracy & SBA invariant carry the highest weight
    const dimensionWeights: Record<AuditEvaluationDimension, number> = {
      factual_accuracy: 0.35,
      single_best_answer_invariant: 0.30,
      distractor_plausibility: 0.15,
      curriculum_evidence_grounding: 0.10,
      pedagogical_clarity: 0.10,
    };

    for (const critique of critiques) {
      const weight = dimensionWeights[critique.dimension] ?? 0.2;
      weightedSum += critique.evaluation.score * weight;
      totalWeights += weight;

      for (const finding of critique.evaluation.findings) {
        if (finding.includes('CRITICAL:')) {
          criticalFlags.push(`[${critique.dimension}] ${finding}`);
        }
      }
    }

    const compositeAccuracyScore = Math.round(weightedSum / (totalWeights || 1));

    let verdict: AuditVerdict = 'verified';
    if (criticalFlags.length > 0 || compositeAccuracyScore < 60) {
      verdict = 'critical_error';
    } else if (compositeAccuracyScore < 85) {
      verdict = 'warning';
    }

    // Determine remediation suggestion if flawed
    let suggestedRemediation: QuestionAccuracyAuditResult['suggestedRemediation'];
    if (verdict !== 'verified') {
      const firstFailingCritique = critiques.find((c) => !c.evaluation.passed);
      if (firstFailingCritique && firstFailingCritique.evaluation.recommendations?.length) {
        suggestedRemediation = {
          field: firstFailingCritique.dimension,
          suggestion: firstFailingCritique.evaluation.recommendations[0],
          rationales: firstFailingCritique.evaluation.findings.join('; '),
        };
      }
    }

    return {
      questionId: question.id,
      questionStem: question.stem,
      concept: question.concept,
      subjectId: question.subjectId,
      difficulty: question.difficulty,
      cognitiveLevel: question.cognitiveLevel,
      highYield: question.highYield,
      verdict,
      compositeAccuracyScore,
      critiques,
      criticalFlags,
      suggestedRemediation,
    };
  }

  private calculateSummaryKpis(
    results: readonly QuestionAccuracyAuditResult[],
    N: number, // Total Population
    n: number  // Sample Size
  ): AccuracyAuditSummaryKpis {
    if (results.length === 0) {
      return {
        overallAccuracyIndex: 0,
        statisticalMarginOfError: {
          confidenceLevel: 0.95,
          zScore: 1.96,
          marginOfErrorPercentage: 0,
          lowerBoundScore: 0,
          upperBoundScore: 0,
          finitePopulationCorrectionApplied: false,
        },
        totalSampled: 0,
        verifiedCount: 0,
        warningCount: 0,
        criticalErrorCount: 0,
        dimensionAverages: {
          factual_accuracy: 0,
          single_best_answer_invariant: 0,
          distractor_plausibility: 0,
          curriculum_evidence_grounding: 0,
          pedagogical_clarity: 0,
        },
      };
    }

    let verifiedCount = 0;
    let warningCount = 0;
    let criticalErrorCount = 0;
    let totalScore = 0;

    const dimensionSums: Record<AuditEvaluationDimension, number> = {
      factual_accuracy: 0,
      single_best_answer_invariant: 0,
      distractor_plausibility: 0,
      curriculum_evidence_grounding: 0,
      pedagogical_clarity: 0,
    };
    const dimensionCounts: Record<AuditEvaluationDimension, number> = {
      factual_accuracy: 0,
      single_best_answer_invariant: 0,
      distractor_plausibility: 0,
      curriculum_evidence_grounding: 0,
      pedagogical_clarity: 0,
    };

    for (const r of results) {
      totalScore += r.compositeAccuracyScore;
      if (r.verdict === 'verified') verifiedCount++;
      else if (r.verdict === 'warning') warningCount++;
      else criticalErrorCount++;

      for (const critique of r.critiques) {
        if (dimensionSums[critique.dimension] !== undefined) {
          dimensionSums[critique.dimension] += critique.evaluation.score;
          dimensionCounts[critique.dimension]++;
        }
      }
    }

    const overallAccuracyIndex = Math.round((totalScore / results.length) * 10) / 10;

    const dimensionAverages: Record<AuditEvaluationDimension, number> = {
      factual_accuracy: Math.round(dimensionSums.factual_accuracy / (dimensionCounts.factual_accuracy || 1)),
      single_best_answer_invariant: Math.round(dimensionSums.single_best_answer_invariant / (dimensionCounts.single_best_answer_invariant || 1)),
      distractor_plausibility: Math.round(dimensionSums.distractor_plausibility / (dimensionCounts.distractor_plausibility || 1)),
      curriculum_evidence_grounding: Math.round(dimensionSums.curriculum_evidence_grounding / (dimensionCounts.curriculum_evidence_grounding || 1)),
      pedagogical_clarity: Math.round(dimensionSums.pedagogical_clarity / (dimensionCounts.pedagogical_clarity || 1)),
    };

    // Statistical Margin of Error calculation using Finite Population Correction (FPC)
    // p = proportion of verified / acceptable items (score >= 70)
    const acceptableCount = results.filter((r) => r.compositeAccuracyScore >= 70).length;
    const p = acceptableCount / n;
    const zScore = 1.96; // 95% confidence level

    // Standard Error with FPC
    let fpc = 1;
    if (N > 1 && n < N) {
      fpc = Math.sqrt((N - n) / (N - 1));
    }
    const standardError = Math.sqrt((p * (1 - p)) / n) * fpc;
    const marginOfErrorPercentage = Math.round(zScore * standardError * 1000) / 10;

    const lowerBound = Math.max(0, Math.round((overallAccuracyIndex - marginOfErrorPercentage) * 10) / 10);
    const upperBound = Math.min(100, Math.round((overallAccuracyIndex + marginOfErrorPercentage) * 10) / 10);

    const statisticalMarginOfError: StatisticalMarginOfError = {
      confidenceLevel: 0.95,
      zScore,
      marginOfErrorPercentage,
      lowerBoundScore: lowerBound,
      upperBoundScore: upperBound,
      finitePopulationCorrectionApplied: N > n,
    };

    return {
      overallAccuracyIndex,
      statisticalMarginOfError,
      totalSampled: results.length,
      verifiedCount,
      warningCount,
      criticalErrorCount,
      dimensionAverages,
    };
  }
}
