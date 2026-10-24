/**
 * Clean Architecture & OOP Domain Contracts for the AI Cognitive Co-Pilot (v2.0)
 * Feature: 002-ai-cognitive-copilot
 *
 * Design Principles:
 * - Zero `any`, exhaustive discriminated unions, readonly value objects.
 * - Clear separation between Silent Autonomous Background Tools (A, B, C)
 *   and Visible Clinical Modeling / Memory Tools (D, E, F, G, H, I).
 * - Multi-turn ReAct (Reason + Act) tool execution loop across OpenRouter, Groq, and Gemini.
 */

import type { ChoiceId } from '../../../src/domain/model/types.ts';

// ============================================================================
// 1. CLOUD AI PROVIDERS (NO LOCAL ENGINE — OPENROUTER DEFAULT + GROQ + GEMINI)
// ============================================================================

export type CloudProviderId = 'openrouter' | 'groq' | 'gemini';

export interface CloudProviderConfig {
  readonly providerId: CloudProviderId;
  readonly apiKey: string;
  readonly modelId: string;
  readonly baseUrl: string;
  readonly temperature: number;
  readonly maxTokens: number;
}

export interface AiSettingsV2 {
  readonly activeProvider: CloudProviderId;
  readonly openRouterApiKey: string;
  readonly openRouterModel: string; // Default: 'meta-llama/llama-3.1-8b-instruct:free'
  readonly groqApiKey: string;
  readonly groqModel: string;       // Default: 'llama-3.3-70b-versatile'
  readonly geminiApiKey: string;
  readonly geminiModel: string;     // Default: 'gemini-2.5-flash'
}

// ============================================================================
// 2. AUTONOMOUS BACKGROUND TOOLS (INVISIBLE TO USER: A, B, C)
// ============================================================================

/**
 * Tool A: analyze_active_question_vignette
 * Deconstructs the clinical vignette into a structured diagnostic graph.
 */
export interface AnalyzeVignetteArgs {
  readonly focusChoiceId?: ChoiceId;
}

export interface DistractorTrapEntry {
  readonly intendedTrap: string;
  readonly distinguishingHallmark: string;
}

export interface AnalyzeVignetteResult {
  readonly kind: 'analyze_vignette';
  readonly chiefComplaint: string;
  readonly clinicalAcuteness: 'hyperacute' | 'acute' | 'subacute' | 'chronic';
  readonly hemodynamicStatus: 'stable' | 'compensated' | 'cardiogenic-shock';
  readonly decisivePivotClues: readonly string[];
  readonly distractorTrapMap: Readonly<Record<string, DistractorTrapEntry>>;
}

/**
 * Tool B: inspect_student_cognitive_telemetry
 * Measures live hesitation, option toggling, and historical struggle signals.
 */
export interface InspectTelemetryArgs {
  readonly includeHistoricalTopicStats?: boolean;
}

export interface ChoiceToggleEvent {
  readonly fromChoice: ChoiceId | null;
  readonly toChoice: ChoiceId;
  readonly timestampMs: number;
}

export interface StudentTelemetryResult {
  readonly kind: 'student_telemetry';
  readonly timeSpentSeconds: number;
  readonly choiceToggles: readonly ChoiceToggleEvent[];
  readonly stemRereadCount: number;
  readonly topicHistoricalAccuracy: number;
  readonly recentMistakeStreak: number;
}

/**
 * Tool C: detect_cognitive_bias_trap
 * Identifies the exact diagnostic pitfall the student is falling into.
 */
export type CognitiveBiasType =
  | 'anchoring_bias'
  | 'premature_closure'
  | 'availability_heuristic'
  | 'framing_effect';

export interface DetectCognitiveBiasArgs {
  readonly candidateChoiceId?: ChoiceId;
  readonly studentReasoningSnippet?: string;
}

export interface CognitiveBiasTrapResult {
  readonly kind: 'cognitive_bias';
  readonly detectedBias: CognitiveBiasType;
  readonly biasLabel: string;
  readonly clinicalTrigger: string;
  readonly overlookedPivotClue: string;
  readonly socraticCounterPrompt: string;
}

// ============================================================================
// 3. CLINICAL & PATHOPHYSIOLOGICAL MODELING TOOLS (D, E, F)
// ============================================================================

/**
 * Tool D: simulate_hemodynamic_pv_loop
 * Simulates cardiac Pressure-Volume (P-V) loops for valvular lesions & HCM.
 */
export type ValvularPathologyId =
  | 'aortic_stenosis'
  | 'aortic_regurg'
  | 'mitral_stenosis'
  | 'mitral_regurg'
  | 'hcm';

export type HemodynamicChronicity =
  | 'acute'
  | 'chronic_compensated'
  | 'chronic_decompensated';

export interface PvLoopArgs {
  readonly pathology: ValvularPathologyId;
  readonly chronicity: HemodynamicChronicity;
}

export interface HemodynamicParameters {
  readonly edvMl: number;              // End-Diastolic Volume (Normal ~120 mL)
  readonly esvMl: number;              // End-Systolic Volume (Normal ~50 mL)
  readonly strokeVolumeMl: number;     // Net forward SV (Normal ~70 mL)
  readonly ejectionFractionPct: number;// EF % (Normal ~58%)
  readonly peakLvSystolicMmHg: number; // Peak LV Pressure (Normal ~120 mmHg)
  readonly lvEdpMmHg: number;          // LV End-Diastolic Pressure (Normal ~8 mmHg)
  readonly preloadShift: 'decreased' | 'normal' | 'increased' | 'markedly_increased';
  readonly afterloadShift: 'decreased' | 'normal' | 'increased' | 'markedly_increased';
  readonly isovolumetricPhaseNote: string;
}

export interface PvLoopSimulationResult {
  readonly kind: 'pv_loop';
  readonly pathology: ValvularPathologyId;
  readonly pathologyLabel: string;
  readonly chronicity: HemodynamicChronicity;
  readonly normalParams: HemodynamicParameters;
  readonly pathologicParams: HemodynamicParameters;
  readonly clinicalSummary: string;
}

/**
 * Tool E: simulate_peer_cohort_difficulty
 * Retrieves peer cohort distractor trap distribution from the question bank.
 */
export interface PeerCohortArgs {
  readonly highlightChoiceId?: ChoiceId;
}

export interface PeerCohortDifficultyResult {
  readonly kind: 'peer_cohort';
  readonly overallAccuracyPct: number;
  readonly difficultyLabel: 'High-Trap Hard' | 'Moderate Board Level' | 'Core Foundation';
  readonly choiceDistributionPct: Readonly<Record<ChoiceId, number>>;
  readonly topTrapChoiceId: ChoiceId;
  readonly topTrapPercentage: number;
  readonly peerTrapExplanation: string;
}

/**
 * Tool F: calculate_cardiovascular_equation
 * Computes physiological cardiovascular equations with exact steps & normal ranges.
 */
export type CardiovascularEquationInput =
  | {
      readonly equation: 'map';
      readonly sbpMmHg: number;
      readonly dbpMmHg: number;
    }
  | {
      readonly equation: 'fick_co';
      readonly vo2MlMin: number;
      readonly caO2MlDl: number;
      readonly cvO2MlDl: number;
    }
  | {
      readonly equation: 'svr';
      readonly mapMmHg: number;
      readonly cvpMmHg: number;
      readonly coLMin: number;
    }
  | {
      readonly equation: 'gorlin_ava';
      readonly coLMin: number;
      readonly heartRateBpm: number;
      readonly systolicEjectionPeriodSec: number;
      readonly meanGradientMmHg: number;
    };

export interface CardiovascularEquationResult {
  readonly kind: 'cv_equation';
  readonly equationId: CardiovascularEquationInput['equation'];
  readonly title: string;
  readonly formulaExpression: string;
  readonly substitutionSteps: string;
  readonly computedValue: number;
  readonly unit: string;
  readonly referenceRange: string;
  readonly hemodynamicInterpretation: string;
}

// ============================================================================
// 4. ACTIVE MEMORY & ADAPTIVE REMEDIATION TOOLS (G, H, I)
// ============================================================================

/**
 * Tool G: create_spaced_repetition_anchor
 * Synthesizes an active recall flashcard and persists it directly to Dexie DB.
 */
export interface CreateSrsCardArgs {
  readonly frontPrompt: string;
  readonly backAnswer: string;
  readonly highYieldTopicId: string;
  readonly srsInitialIntervalDays: 1;
}

export interface SrsAnchorResult {
  readonly kind: 'srs_card';
  readonly cardId: string;
  readonly frontPrompt: string;
  readonly backAnswer: string;
  readonly highYieldTopicId: string;
  readonly nextReviewAtIso: string;
}

/**
 * Tool H: formulate_clinical_memory_anchor
 * Generates high-yield board mnemonics anchored to pathophysiology.
 */
export interface MnemonicAnchorArgs {
  readonly conceptTitle: string;
  readonly mnemonicToken: string;
  readonly expansionMappings: readonly { readonly letter: string; readonly meaning: string }[];
  readonly clinicalApplicationRule: string;
}

export interface MnemonicAnchorResult {
  readonly kind: 'mnemonic_anchor';
  readonly conceptTitle: string;
  readonly mnemonicToken: string;
  readonly expansionMappings: readonly { readonly letter: string; readonly meaning: string }[];
  readonly clinicalApplicationRule: string;
}

/**
 * Tool I: prescribe_targeted_micro_curriculum
 * Prescribes a 3-step recovery plan: 2-min mechanism review, 3 targeted Qs, 48h SRS.
 */
export interface MicroCurriculumArgs {
  readonly targetWeaknessTitle: string;
  readonly twoMinuteMechanismReview: string;
  readonly drillQuestionCount?: number; // Defaults to 3
  readonly retestInHours?: number;      // Defaults to 48
}

export interface MicroCurriculumResult {
  readonly kind: 'micro_curriculum';
  readonly targetWeaknessTitle: string;
  readonly twoMinuteMechanismReview: string;
  readonly selectedQuestionIds: readonly string[];
  readonly retestScheduledAtIso: string;
}

// ============================================================================
// 5. UNIFIED TOOL REGISTRY & POLYMORPHIC COMMAND CONTRACTS
// ============================================================================

export type AgentToolName =
  // 1. Invisible Autonomous Background Tools
  | 'analyze_active_question_vignette'
  | 'inspect_student_cognitive_telemetry'
  | 'detect_cognitive_bias_trap'
  // 2. Clinical & Pathophysiological Modeling Tools
  | 'simulate_hemodynamic_pv_loop'
  | 'simulate_peer_cohort_difficulty'
  | 'calculate_cardiovascular_equation'
  // 3. Active Memory & Adaptive Remediation Tools
  | 'create_spaced_repetition_anchor'
  | 'formulate_clinical_memory_anchor'
  | 'prescribe_targeted_micro_curriculum';

export type ToolVisibility = 'silent' | 'artifact';

export type AgentToolResultPayload =
  | AnalyzeVignetteResult
  | StudentTelemetryResult
  | CognitiveBiasTrapResult
  | PvLoopSimulationResult
  | PeerCohortDifficultyResult
  | CardiovascularEquationResult
  | SrsAnchorResult
  | MnemonicAnchorResult
  | MicroCurriculumResult;

export interface AgentToolExecutionEnvelope {
  readonly callId: string;
  readonly toolName: AgentToolName;
  readonly visibility: ToolVisibility;
  readonly status: 'ok' | 'blocked' | 'error';
  readonly llmFeedbackJson: string; // Passed back to the LLM in the multi-turn ReAct loop
  readonly artifactPayload?: AgentToolResultPayload; // Rendered in UI only if visibility === 'artifact'
}

/**
 * OOP Polymorphic Tool Handler Interface (Command & Strategy Pattern)
 */
export interface IAgentToolCommand<TArgs, TResult extends AgentToolResultPayload> {
  readonly name: AgentToolName;
  readonly visibility: ToolVisibility;
  readonly description: string;
  readonly jsonSchemaParameters: Record<string, unknown>;
  validateArgs(raw: unknown): { ok: true; value: TArgs } | { ok: false; error: string };
  execute(args: TArgs, context: unknown): Promise<TResult>;
}
