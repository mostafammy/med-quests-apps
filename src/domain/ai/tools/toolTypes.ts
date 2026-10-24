/**
 * Domain contracts and Zod schemas for the 9 Agentic Tools (v2.0)
 */
import { z } from 'zod';
import type {
  AnalyzeVignetteResult,
  StudentTelemetryResult,
  CognitiveBiasTrapResult,
  PvLoopSimulationResult,
  HemodynamicParameters,
  PeerCohortDifficultyResult,
  CardiovascularEquationResult,
  SrsAnchorResult,
  MnemonicAnchorResult,
  MicroCurriculumResult,
  AgentToolName,
  ToolVisibility,
  AgentToolResultPayload,
} from '../../../../specs/002-ai-cognitive-copilot/contracts/ai-copilot-ports.ts';

export type {
  AnalyzeVignetteResult,
  StudentTelemetryResult,
  CognitiveBiasTrapResult,
  PvLoopSimulationResult,
  HemodynamicParameters,
  PeerCohortDifficultyResult,
  CardiovascularEquationResult,
  SrsAnchorResult,
  MnemonicAnchorResult,
  MicroCurriculumResult,
  AgentToolName,
  ToolVisibility,
  AgentToolResultPayload,
};

// ============================================================================
// TOOL INPUT SCHEMAS (ZOD)
// ============================================================================

export const AnalyzeVignetteSchema = z.object({
  focusChoiceId: z.string().optional(),
});
export type AnalyzeVignetteArgs = z.infer<typeof AnalyzeVignetteSchema>;

export const InspectTelemetrySchema = z.object({
  includeHistoricalTopicStats: z.boolean().optional(),
});
export type InspectTelemetryArgs = z.infer<typeof InspectTelemetrySchema>;

export const DetectCognitiveBiasSchema = z.object({
  candidateChoiceId: z.string().optional(),
  studentReasoningSnippet: z.string().optional(),
});
export type DetectCognitiveBiasArgs = z.infer<typeof DetectCognitiveBiasSchema>;

export const PvLoopSchema = z.object({
  pathology: z.enum(['aortic_stenosis', 'aortic_regurg', 'mitral_stenosis', 'mitral_regurg', 'hcm']),
  chronicity: z.enum(['acute', 'chronic_compensated', 'chronic_decompensated']),
});
export type PvLoopArgs = z.infer<typeof PvLoopSchema>;

export const PeerCohortSchema = z.object({
  highlightChoiceId: z.string().optional(),
});
export type PeerCohortArgs = z.infer<typeof PeerCohortSchema>;

export const CardiovascularEquationSchema = z.discriminatedUnion('equation', [
  z.object({
    equation: z.literal('map'),
    sbpMmHg: z.number().min(30).max(300),
    dbpMmHg: z.number().min(20).max(200),
  }),
  z.object({
    equation: z.literal('fick_co'),
    vo2MlMin: z.number().min(50).max(500),
    caO2MlDl: z.number().min(5).max(30),
    cvO2MlDl: z.number().min(5).max(30),
  }),
  z.object({
    equation: z.literal('svr'),
    mapMmHg: z.number().min(30).max(250),
    cvpMmHg: z.number().min(0).max(40),
    coLMin: z.number().min(0.5).max(25),
  }),
  z.object({
    equation: z.literal('gorlin_ava'),
    coLMin: z.number().min(0.5).max(20),
    heartRateBpm: z.number().min(30).max(220),
    systolicEjectionPeriodSec: z.number().min(0.1).max(0.6),
    meanGradientMmHg: z.number().min(1).max(120),
  }),
]);
export type CardiovascularEquationArgs = z.infer<typeof CardiovascularEquationSchema>;

export const CreateSrsCardSchema = z.object({
  frontPrompt: z.string().min(5),
  backAnswer: z.string().min(2),
  highYieldTopicId: z.string().min(1),
  srsInitialIntervalDays: z.literal(1).default(1),
});
export type CreateSrsCardArgs = z.infer<typeof CreateSrsCardSchema>;

export const MnemonicAnchorSchema = z.object({
  conceptTitle: z.string().min(2),
  mnemonicToken: z.string().min(2),
  expansionMappings: z.array(
    z.object({
      letter: z.string().min(1),
      meaning: z.string().min(1),
    })
  ),
  clinicalApplicationRule: z.string().min(5),
});
export type MnemonicAnchorArgs = z.infer<typeof MnemonicAnchorSchema>;

export const MicroCurriculumSchema = z.object({
  targetWeaknessTitle: z.string().min(3),
  twoMinuteMechanismReview: z.string().min(10),
  drillQuestionCount: z.number().min(1).max(5).default(3),
  retestInHours: z.number().default(48),
});
export type MicroCurriculumArgs = z.infer<typeof MicroCurriculumSchema>;

// ============================================================================
// OOP TOOL EXECUTION INTERFACE
// ============================================================================

export interface ToolExecutionContext {
  readonly activeQuestion: any | null;
  readonly safeContext: any;
  readonly questionsBank: any[];
}

export interface IAgentTool<TArgs, TResult extends AgentToolResultPayload> {
  readonly name: AgentToolName;
  readonly visibility: ToolVisibility;
  readonly description: string;
  readonly jsonSchema: Record<string, unknown>;
  execute(args: TArgs, ctx: ToolExecutionContext): Promise<TResult>;
}
