/**
 * AI Co-Pilot context model.
 *
 * Two families of types live here:
 *
 * 1. **Inputs** (`CopilotSurface`, `LearnerSignals`, `BankOverview`) — the raw,
 *    fully-trusted state the application collects. These MAY contain answer keys
 *    and MUST NEVER be sent to an AI engine directly.
 *
 * 2. **Output** (`SafeAiContext`) — the only shape an AI engine is allowed to see.
 *    It is produced exclusively by `buildSafeAiContext()` (policyGate.ts).
 *
 * Exam integrity (Constitution P5) is encoded in the *types*: `ProctorContext`
 * and a sealed `TutorContext` have no field that could carry a correct answer,
 * rationale, explanation, or curriculum evidence.
 */
import type {
  AttemptClassification,
  ChapterId,
  ChoiceId,
  Confidence,
  Evidence,
  IsoDateTime,
  Millis,
  Question,
  QuestionId,
  Ratio,
  SessionMode,
  SubjectId,
  TopicId,
} from '../model/types.ts';
import type { MasteryBand } from './mastery.ts';

// ============================================================================
// 1. INPUTS — collected by the application layer (trusted, never sent to AI)
// ============================================================================

/** Routes outside the session player where the Co-Pilot can be opened. */
export type WorkspaceRoute = 'dashboard' | 'test-hub' | 'review' | 'curriculum';

/** What the learner is looking at right now. Published by the active screen. */
export type CopilotSurface =
  | {
      readonly kind: 'session';
      readonly mode: SessionMode;
      /** Exam/mock: true once the learner has submitted. Other modes: ignored. */
      readonly isSubmitted: boolean;
      readonly question: Question;
      readonly questionIndex: number;
      readonly totalQuestions: number;
      readonly selectedChoiceId: ChoiceId | null;
      readonly flaggedIndices: readonly number[];
      readonly unansweredIndices: readonly number[];
      readonly remainingMs: Millis | null;
      readonly isBookmarked: boolean;
    }
  | { readonly kind: 'workspace'; readonly route: WorkspaceRoute }
  | { readonly kind: 'studio' };

/** Historical learner telemetry for the active question/topic (from IndexedDB). */
export interface LearnerSignals {
  readonly questionAttempts: readonly {
    readonly isCorrect: boolean | null;
    readonly confidence: Confidence;
    readonly answeredAt: IsoDateTime;
  }[];
  readonly topicAccuracy: Ratio;
  readonly topicAttempts: number;
  readonly dangerZoneCountOnTopic: number;
  readonly overdueReviewCount: number;
  readonly srsIntervalDays: number | null;
  readonly existingNote: string | null;
}

/** Aggregate view of the question bank and learner progress (for workspace/studio). */
export interface BankOverview {
  readonly totalQuestions: number;
  readonly mistakeCount: number;
  readonly overallAccuracy: Ratio;
  readonly topics: readonly TopicOverview[];
}

export interface TopicOverview {
  readonly topicId: TopicId;
  readonly topicName: string;
  readonly chapterId: ChapterId;
  readonly questionCount: number;
  readonly highYieldCount: number;
  readonly attempts: number;
  readonly accuracy: Ratio;
  readonly band: MasteryBand;
}

// ============================================================================
// 2. OUTPUT — SafeAiContext (the only thing an engine may see)
// ============================================================================

export interface ChoiceView {
  readonly id: ChoiceId;
  readonly text: string;
}

export interface RevealedChoiceView extends ChoiceView {
  readonly isCorrect: boolean;
  readonly rationale: string;
}

export interface QuestionView {
  readonly id: QuestionId;
  readonly subjectId: SubjectId;
  readonly chapterId: ChapterId;
  readonly topicId: TopicId;
  readonly concept: string;
  readonly difficulty: 1 | 2 | 3;
  readonly highYield: boolean;
  readonly stem: string;
  readonly choices: readonly ChoiceView[];
}

/**
 * Answer-key material. Present only once the learner has committed an answer
 * in a non-exam mode, or after an exam/mock has been submitted.
 */
export type AnswerDisclosure =
  | { readonly state: 'sealed' }
  | {
      readonly state: 'revealed';
      readonly choices: readonly RevealedChoiceView[];
      readonly correctChoiceId: ChoiceId;
      readonly selectedChoiceId: ChoiceId | null;
      readonly isCorrect: boolean | null;
      readonly classification: AttemptClassification;
      readonly explanation: string;
      readonly examTip: string | null;
      readonly mnemonic: string | null;
      readonly evidence: readonly Evidence[];
    };

export interface LearnerSnapshot {
  readonly priorAttempts: number;
  readonly priorMistakes: number;
  readonly topicAccuracy: Ratio;
  readonly topicBand: MasteryBand;
  readonly dangerZoneCountOnTopic: number;
  readonly overdueReviewCount: number;
  readonly srsIntervalDays: number | null;
  readonly existingNote: string | null;
}

/** Unsubmitted exam/mock. Structurally incapable of carrying answer material. */
export interface ProctorContext {
  readonly kind: 'proctor';
  readonly mode: 'exam' | 'mock';
  readonly questionIndex: number;
  readonly totalQuestions: number;
  readonly remainingMs: Millis | null;
  readonly flaggedIndices: readonly number[];
  readonly unansweredIndices: readonly number[];
  readonly question: { readonly id: QuestionId; readonly stem: string; readonly choices: readonly ChoiceView[] };
  readonly selectedChoiceId: ChoiceId | null;
  readonly isBookmarked: boolean;
}

/** Practice / retest / rapid / post-exam review. */
export interface TutorContext {
  readonly kind: 'tutor';
  readonly mode: SessionMode;
  readonly question: QuestionView;
  readonly disclosure: AnswerDisclosure;
  readonly learner: LearnerSnapshot;
  readonly isBookmarked: boolean;
}

/** Dashboard, review hub, curriculum library. */
export interface WorkspaceContext {
  readonly kind: 'workspace';
  readonly route: WorkspaceRoute;
  readonly overview: BankOverview;
}

/** Question Studio — creator/faculty tooling. */
export interface StudioContext {
  readonly kind: 'studio';
  readonly overview: BankOverview;
}

export type SafeAiContext = ProctorContext | TutorContext | WorkspaceContext | StudioContext;
export type SafeAiContextKind = SafeAiContext['kind'];
