/**
 * Domain Types: AI Question Parsing & Anti-Hallucination Studio
 * Clean Architecture / Domain Driven Design (Apple Engineering Standards)
 * Layer: Domain
 */

import type { Question, ChoiceId, SubjectId, ChapterId } from '../../model/types.ts';
import type { CloudProviderId } from '../../ai/settings.ts';
import type { TaxonomyClassificationResult } from '../../taxonomy/CurriculumClassificationAgent.ts';

export type QuestionStemMode = 'verbatim' | 'vignette';

// ==========================================
// 1. MULTI-MODEL CONSENSUS VERIFICATION TYPES
// ==========================================

export type ConsensusVerdict =
  | 'unanimous_agreement' // 100% agreement across quorum
  | 'majority_consensus'   // Majority agrees (e.g. 2 of 3)
  | 'discrepancy_detected' // Split decision or high variance
  | 'insufficient_quorum'; // Only 1 model returned

export interface ModelAnswerVerdict {
  readonly modelId: string;
  readonly modelName: string;
  readonly providerId: string;
  readonly selectedChoiceId: ChoiceId;
  readonly confidenceScore: number; // 0 to 100
  readonly clinicalRationale: string;
  readonly latencyMs: number;
  readonly status: 'success' | 'timeout' | 'error';
  readonly errorMessage?: string;
}

export interface MultiModelConsensusSummary {
  readonly questionId: string;
  readonly consensusChoiceId: ChoiceId;
  readonly consensusVerdict: ConsensusVerdict;
  readonly agreementRatio: number; // 0.0 to 1.0 (e.g. 1.0 = 100%)
  readonly totalModelsQueried: number;
  readonly totalModelsSucceeded: number;
  readonly modelVerdicts: readonly ModelAnswerVerdict[];
  readonly consensusRationale: string;
  readonly discrepancies: readonly string[];
  readonly verifiedAt: string;
}

// ==========================================
// 2. AGENT TOOL EXECUTION TELEMETRY TYPES
// ==========================================

export type AgentToolStepStatus = 'queued' | 'running' | 'completed' | 'failed' | 'skipped';

export type AgentToolStepId =
  | 'segmentation'
  | 'taxonomy'
  | 'reasoning'
  | 'consensus'
  | 'validation';

export interface AgentToolStep {
  readonly id: AgentToolStepId;
  readonly toolName: string;
  readonly label: string;
  readonly description: string;
  status: AgentToolStepStatus;
  durationMs?: number;
  detail?: string;
  error?: string;
}

export interface AgentExecutionTelemetry {
  readonly isRunning: boolean;
  readonly currentStepId: AgentToolStepId | null;
  readonly totalSteps: number;
  readonly completedSteps: number;
  readonly steps: readonly AgentToolStep[];
  readonly startedAt: number | null;
  readonly elapsedMs: number;
  readonly activeToolName: string | null;
}

// ==========================================
// 3. PARSING CONTRACTS
// ==========================================

export interface RawQuestionParseRequest {
  readonly rawText: string;
  readonly providerId: CloudProviderId;
  readonly modelId: string;
  readonly targetSubjectId?: SubjectId | 'auto';
  readonly targetChapterId?: ChapterId | 'auto';
  readonly stemMode?: QuestionStemMode;
  readonly enableConsensusCheck?: boolean;
  readonly onTelemetryUpdate?: (telemetry: AgentExecutionTelemetry) => void;
}

export interface ParsedQuestionItem {
  readonly tempId: string;
  readonly rawInputExcerpt: string;
  /** Original raw stem text extracted from input prior to any vignette transformations */
  readonly originalRawStem?: string;
  /** Enriched USMLE-style clinical vignette stem (if generated) */
  readonly enrichedVignetteStem?: string;
  readonly question: Question;
  /** Whether the administrator explicitly indicated the answer key in the raw text */
  readonly wasAnswerKeyProvidedInInput: boolean;
  /** Whether the AI Agent had to solve the question and generate the answer key */
  readonly aiGeneratedAnswerKey: boolean;
  /** Keyed correct choice ('a' | 'b' | 'c' | 'd') */
  readonly selectedCorrectChoiceId: ChoiceId;
  /** Estimated clinical confidence of the parsed question */
  readonly confidenceScore: number; // 0 to 100
  /** Informative warnings regarding ambiguities or missing fields */
  readonly warnings: readonly string[];
  /** Approval status prior to committing to the Global Question Bank */
  readonly isApproved: boolean;
  /** Dynamic AI Curriculum Taxonomy Assignment & Gap Analysis */
  readonly taxonomyClassification?: TaxonomyClassificationResult;
  /** Multi-Model Cross-Examination Consensus Audit (if run) */
  readonly consensusSummary?: MultiModelConsensusSummary;
}

export interface ParseResultSummary {
  readonly items: readonly ParsedQuestionItem[];
  readonly totalParsed: number;
  readonly totalMissingAnswerKeys: number;
  readonly durationMs: number;
  readonly modelUsed: string;
}

export interface CrossModelPromptOptions {
  readonly questions: readonly Question[];
  readonly contextNote?: string;
  readonly includeRationales?: boolean;
}
