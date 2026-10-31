import { z } from 'zod';

// ==========================================
// 1. PRIMITIVE BRANDED TYPES
// ==========================================
export type BlockId = string;     // e.g. 'cvs' | 'rrs' | 'hematology'
export type SubjectId = string;   // 'anatomy' | 'histology' | 'microbiology'
export type ChapterId = string;   // 'cvs-ana-heart-development'
export type TopicId = string;     // 'cvs-ana-heart-dev/atrial-septation'
export type QuestionId = string;  // 'q-cvs-dev-0001'
export type ChoiceId = 'a' | 'b' | 'c' | 'd';
export type SourceId = string;
export type ChunkId = string;
export type SessionId = string;
export type AttemptId = string;
export type ConceptKey = string;
export type IsoDateTime = string;
export type Millis = number;
export type Ratio = number; // 0..1

// ==========================================
// 2. TAXONOMY & CURRICULUM
// ==========================================
export interface Block {
  id: BlockId;
  name: string;
  shortName: string;
  code?: string;
  description: string;
  subjectIds: SubjectId[];
}

export interface Subject {
  id: SubjectId;
  blockId: BlockId;
  name: string;
  order: number;
}

export interface Chapter {
  id: ChapterId;
  blockId: BlockId;
  subjectId: SubjectId;
  name: string;
  order: number;
  sourceIds: SourceId[];
}

export interface Topic {
  id: TopicId;
  blockId: BlockId;
  chapterId: ChapterId;
  name: string;
  order: number;
}

export interface Taxonomy {
  block: Block;
  subjects: Subject[];
  chapters: Chapter[];
  topics: Topic[];
}

// ==========================================
// 3. QUESTIONS & EVIDENCE (ZOD SCHEMAS)
// ==========================================
export const ChoiceSchema = z.object({
  id: z.enum(['a', 'b', 'c', 'd']),
  text: z.string().min(1, 'Choice text cannot be empty'),
  isCorrect: z.boolean(),
  rationale: z.string().min(1, 'Rationale required for all choices'),
});
export type Choice = z.infer<typeof ChoiceSchema>;

export const EvidenceSchema = z.object({
  chunkId: z.string(),
  sourceName: z.string(),
  location: z.string(), // e.g. "Page 6" or "Slide 14"
  quote: z.string().min(5, 'Evidence quote must be a verbatim excerpt proving the answer'),
  kind: z.enum(['text', 'figure']).default('text'),
});
export type Evidence = z.infer<typeof EvidenceSchema>;

export const QuestionSchema = z.object({
  id: z.string(),
  blockId: z.string().default('cvs'),
  subjectId: z.string(),
  chapterId: z.string(),
  topicId: z.string(),
  concept: z.string(),
  type: z.enum(['single-best-answer', 'true-false']).default('single-best-answer'),
  stem: z.string().min(10, 'Question stem must be at least 10 characters'),
  choices: z.array(ChoiceSchema).length(4, 'SBA questions must have exactly 4 choices (A, B, C, D)'),
  explanation: z.string().min(10, 'Explanation must be comprehensive'),
  examTip: z.string().nullable().default(null),
  mnemonic: z.string().nullable().default(null),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
  cognitiveLevel: z.enum(['recall', 'understanding', 'application']).default('understanding'),
  highYield: z.boolean().default(true),
  origin: z.enum(['curriculum-self-assessment', 'authored-grounded']).default('authored-grounded'),
  evidence: z.array(EvidenceSchema).min(1, 'At least 1 curriculum evidence citation is required'),
  status: z.enum(['active', 'quarantined']).default('active'),
  bankVersion: z.number().default(1),
}).refine(
  (data) => data.choices.filter((c) => c.isCorrect).length === 1,
  { message: 'Exactly one choice must be marked as correct (isCorrect: true)' }
);

export type Question = z.infer<typeof QuestionSchema>;

// ==========================================
// 4. LEARNER ATTEMPTS & CLASSIFICATION
// ==========================================
export type Confidence = 'guess' | 'unsure' | 'sure';

export type AttemptClassification =
  | 'mastered'       // correct + sure
  | 'shaky-correct'  // correct + unsure
  | 'lucky-guess'    // correct + guess
  | 'honest-miss'    // incorrect + guess/unsure
  | 'danger-zone'    // incorrect + sure (confident mistake)
  | 'unanswered';

export interface Attempt {
  id: AttemptId;
  questionId: QuestionId;
  blockId: BlockId;
  sessionId: SessionId;
  mode: SessionMode;
  selectedChoiceId: ChoiceId | null;
  isCorrect: boolean | null;
  confidence: Confidence;
  responseTimeMs: Millis;
  answeredAt: IsoDateTime;
  // Enriched Cognitive & Behavioral Micro-Telemetry (Optional for backward compatibility)
  firstSelectedChoiceId?: ChoiceId | null;
  choiceChangesCount?: number;
  eliminatedChoiceIds?: ChoiceId[];
  aiCopilotConsulted?: boolean;
  stemRereadCount?: number;
}

export interface ReviewCard {
  questionId: QuestionId;
  blockId: BlockId;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  dueAt: IsoDateTime;
  lastReviewedAt: IsoDateTime | null;
}

// ==========================================
// 5. SESSION ENGINE MODES & POLICIES
// ==========================================
export type SessionMode = 'practice' | 'exam' | 'mock' | 'rapid' | 'retest';

export interface ModePolicy {
  mode: SessionMode;
  feedback: 'immediate' | 'compact-immediate' | 'deferred-until-submit';
  allowChangeAnswer: boolean;
  autoAdvanceMs: number | null;
  timer: 'none' | 'elapsed' | 'countdown';
  allowFreeNavigation: boolean;
  allowFlagging: boolean;
  showExplanationKey: boolean;
  updatesSrs: boolean;
}

export const MODE_POLICIES: Record<SessionMode, ModePolicy> = {
  practice: {
    mode: 'practice',
    feedback: 'immediate',
    allowChangeAnswer: false,
    autoAdvanceMs: null,
    timer: 'elapsed',
    allowFreeNavigation: true,
    allowFlagging: true,
    showExplanationKey: true,
    updatesSrs: true,
  },
  exam: {
    mode: 'exam',
    feedback: 'deferred-until-submit',
    allowChangeAnswer: true,
    autoAdvanceMs: null,
    timer: 'countdown',
    allowFreeNavigation: true,
    allowFlagging: true,
    showExplanationKey: false,
    updatesSrs: true,
  },
  mock: {
    mode: 'mock',
    feedback: 'deferred-until-submit',
    allowChangeAnswer: true,
    autoAdvanceMs: null,
    timer: 'countdown',
    allowFreeNavigation: true,
    allowFlagging: true,
    showExplanationKey: false,
    updatesSrs: true,
  },
  rapid: {
    mode: 'rapid',
    feedback: 'compact-immediate',
    allowChangeAnswer: false,
    autoAdvanceMs: 900,
    timer: 'none',
    allowFreeNavigation: false,
    allowFlagging: false,
    showExplanationKey: true,
    updatesSrs: true,
  },
  retest: {
    mode: 'retest',
    feedback: 'immediate',
    allowChangeAnswer: false,
    autoAdvanceMs: null,
    timer: 'none',
    allowFreeNavigation: true,
    allowFlagging: false,
    showExplanationKey: true,
    updatesSrs: true,
  },
};
