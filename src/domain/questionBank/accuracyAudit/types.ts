/**
 * Domain Types & Contracts: Question Bank Accuracy & Quality Audit Engine
 * Architecture: Clean Architecture / Domain Driven Design (Apple Engineering Standards)
 * Layer: Domain
 */

import { z } from 'zod';
import type { Question, QuestionId, BlockId, SubjectId } from '../model/types.ts';
import type { UserId } from '../auth/types.ts';

// ==========================================
// 1. EVALUATION DIMENSIONS & CRITIQUE
// ==========================================

export type AuditEvaluationDimension =
  | 'factual_accuracy'
  | 'single_best_answer_invariant'
  | 'distractor_plausibility'
  | 'curriculum_evidence_grounding'
  | 'pedagogical_clarity';

export type AuditVerdict = 'verified' | 'warning' | 'critical_error';

export interface DimensionEvaluationResult {
  readonly dimension: AuditEvaluationDimension;
  readonly score: number; // 0 to 100
  readonly passed: boolean;
  readonly summary: string;
  readonly findings: readonly string[];
  readonly recommendations?: readonly string[];
}

export interface AgentCritique {
  readonly agentId: string;
  readonly agentName: string;
  readonly role: string;
  readonly dimension: AuditEvaluationDimension;
  readonly evaluation: DimensionEvaluationResult;
}

export interface QuestionAccuracyAuditResult {
  readonly questionId: QuestionId;
  readonly questionStem: string;
  readonly concept: string;
  readonly subjectId: SubjectId;
  readonly difficulty: 1 | 2 | 3;
  readonly cognitiveLevel: 'recall' | 'understanding' | 'application';
  readonly highYield: boolean;
  readonly verdict: AuditVerdict;
  readonly compositeAccuracyScore: number; // 0 to 100
  readonly critiques: readonly AgentCritique[];
  readonly criticalFlags: readonly string[];
  readonly suggestedRemediation?: {
    readonly field: string;
    readonly suggestion: string;
    readonly rationales?: string;
  };
}

// ==========================================
// 2. SAMPLING CONFIGURATION & STRATEGIES
// ==========================================

export type SamplingStrategyType =
  | 'uniform_random'
  | 'stratified_by_subject'
  | 'stratified_by_difficulty'
  | 'stratified_by_cognitive_level';

export interface SamplingConfiguration {
  readonly strategyType: SamplingStrategyType;
  readonly sampleSize: number;
  readonly seed?: number; // Optional seed for deterministic reproducibility in testing & audit verification
  readonly highYieldOnly?: boolean;
  readonly blockId?: BlockId;
}

export interface SampleExtractionResult {
  readonly sampledQuestions: readonly Question[];
  readonly totalPopulationSize: number;
  readonly sampleSize: number;
  readonly strategyType: SamplingStrategyType;
  readonly strataRepresentation: Record<string, { populationCount: number; sampleCount: number; percentage: number }>;
  readonly randomSeed: number;
}

// ==========================================
// 3. STATISTICAL VALIDITY & KPI REPORT
// ==========================================

export interface StatisticalMarginOfError {
  readonly confidenceLevel: number; // e.g. 0.95 for 95%
  readonly zScore: number; // 1.96 for 95%
  readonly marginOfErrorPercentage: number; // e.g. 3.4%
  readonly lowerBoundScore: number;
  readonly upperBoundScore: number;
  readonly finitePopulationCorrectionApplied: boolean;
}

export interface AccuracyAuditSummaryKpis {
  readonly overallAccuracyIndex: number; // 0 to 100
  readonly statisticalMarginOfError: StatisticalMarginOfError;
  readonly totalSampled: number;
  readonly verifiedCount: number;
  readonly warningCount: number;
  readonly criticalErrorCount: number;
  readonly dimensionAverages: Record<AuditEvaluationDimension, number>;
}

export interface AccuracyAuditRunReport {
  readonly runId: string;
  readonly timestamp: string;
  readonly executedByAdmin: {
    readonly userId: UserId;
    readonly displayName: string;
  };
  readonly configuration: SamplingConfiguration;
  readonly extractionMetadata: {
    readonly totalBankQuestions: number;
    readonly sampledCount: number;
    readonly randomSeed: number;
    readonly strataRepresentation: Record<string, { populationCount: number; sampleCount: number; percentage: number }>;
  };
  readonly kpis: AccuracyAuditSummaryKpis;
  readonly questionResults: readonly QuestionAccuracyAuditResult[];
  readonly durationMs: number;
}

// ==========================================
// 4. STREAMING PROGRESS & EVENTS
// ==========================================

export type AuditProgressStage =
  | 'idle'
  | 'authorizing'
  | 'sampling'
  | 'evaluating'
  | 'synthesizing'
  | 'completed'
  | 'aborted'
  | 'error';

export interface AuditProgressTelemetry {
  readonly stage: AuditProgressStage;
  readonly currentQuestionIndex: number;
  readonly totalQuestionsToAudit: number;
  readonly activeAgentName?: string;
  readonly percentComplete: number;
  readonly message: string;
}

export type AuditProgressCallback = (telemetry: AuditProgressTelemetry) => void;
