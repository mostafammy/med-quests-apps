/**
 * Exam Integrity Policy Gate (Constitution P5, BRD §15.3).
 *
 * `buildSafeAiContext()` is the ONLY function permitted to construct a
 * `SafeAiContext`. It is pure and deterministic, and it decides — from trusted
 * application state — how much of the question an AI engine is allowed to see:
 *
 * | Situation                                   | Context kind | Answer key |
 * | :------------------------------------------ | :----------- | :--------- |
 * | Exam/Mock, not yet submitted                | `proctor`    | never      |
 * | Any other mode, learner has not answered    | `tutor`      | sealed     |
 * | Any other mode, learner committed an answer | `tutor`      | revealed   |
 * | Exam/Mock after submission                  | `tutor`      | revealed   |
 *
 * Sealing the key before the learner answers is deliberate: a tutor that
 * knows the answer leaks it. The model reasons like a clinician instead.
 */
import type {
  AttemptClassification,
  ChoiceId,
  Confidence,
  Question,
  SessionMode,
} from '../model/types.ts';
import type {
  AnswerDisclosure,
  BankOverview,
  CopilotSurface,
  LearnerSignals,
  LearnerSnapshot,
  QuestionView,
  SafeAiContext,
} from './context.ts';
import { toMasteryBand } from './mastery.ts';
import { assertNever } from '../shared/result.ts';

export interface PolicyGateInput {
  readonly surface: CopilotSurface;
  readonly signals: LearnerSignals;
  readonly overview: BankOverview;
}

const EXAM_LIKE_MODES: ReadonlySet<SessionMode> = new Set<SessionMode>(['exam', 'mock']);

export const isExamLikeMode = (mode: SessionMode): mode is 'exam' | 'mock' => EXAM_LIKE_MODES.has(mode);

export function buildSafeAiContext({ surface, signals, overview }: PolicyGateInput): SafeAiContext {
  switch (surface.kind) {
    case 'workspace':
      return { kind: 'workspace', route: surface.route, overview };

    case 'studio':
      return { kind: 'studio', overview };

    case 'session': {
      const { mode, question } = surface;

      if (isExamLikeMode(mode) && !surface.isSubmitted) {
        return {
          kind: 'proctor',
          mode,
          questionIndex: surface.questionIndex,
          totalQuestions: surface.totalQuestions,
          remainingMs: surface.remainingMs,
          flaggedIndices: surface.flaggedIndices,
          unansweredIndices: surface.unansweredIndices,
          // Explicit allow-list projection: new Question fields can never leak by accident.
          question: {
            id: question.id,
            stem: question.stem,
            choices: question.choices.map(({ id, text }) => ({ id, text })),
          },
          selectedChoiceId: surface.selectedChoiceId,
          isBookmarked: surface.isBookmarked,
        };
      }

      const answerIsUnlocked = surface.selectedChoiceId !== null || (isExamLikeMode(mode) && surface.isSubmitted);

      return {
        kind: 'tutor',
        mode,
        question: toQuestionView(question),
        disclosure: answerIsUnlocked ? revealAnswer(question, surface.selectedChoiceId) : { state: 'sealed' },
        learner: toLearnerSnapshot(signals),
        isBookmarked: surface.isBookmarked,
      };
    }

    default:
      return assertNever(surface, 'Unknown CopilotSurface');
  }
}

/** BRD §9.1 attempt classification. */
export function classifyAttempt(isCorrect: boolean | null, confidence: Confidence): AttemptClassification {
  if (isCorrect === null) return 'unanswered';
  if (isCorrect) {
    return confidence === 'sure' ? 'mastered' : confidence === 'unsure' ? 'shaky-correct' : 'lucky-guess';
  }
  return confidence === 'sure' ? 'danger-zone' : 'honest-miss';
}

/** The correct choice of a validated question (schema guarantees exactly one). */
export function correctChoiceOf(question: Question): ChoiceId {
  const correct = question.choices.find((choice) => choice.isCorrect);
  if (!correct) throw new Error(`Question ${question.id} violates the single-correct-choice invariant`);
  return correct.id;
}

// ----------------------------------------------------------------------------
// Projections
// ----------------------------------------------------------------------------

function toQuestionView(question: Question): QuestionView {
  return {
    id: question.id,
    subjectId: question.subjectId,
    chapterId: question.chapterId,
    topicId: question.topicId,
    concept: question.concept,
    difficulty: question.difficulty,
    highYield: question.highYield,
    stem: question.stem,
    choices: question.choices.map(({ id, text }) => ({ id, text })),
  };
}

/**
 * The session player does not yet capture confidence, so live attempts are
 * classified as 'unsure' — this never fabricates a danger-zone event.
 */
const LIVE_ATTEMPT_CONFIDENCE: Confidence = 'unsure';

function revealAnswer(question: Question, selectedChoiceId: ChoiceId | null): AnswerDisclosure {
  const correctChoiceId = correctChoiceOf(question);
  const isCorrect = selectedChoiceId === null ? null : selectedChoiceId === correctChoiceId;

  return {
    state: 'revealed',
    choices: question.choices.map(({ id, text, isCorrect: correct, rationale }) => ({
      id,
      text,
      isCorrect: correct,
      rationale,
    })),
    correctChoiceId,
    selectedChoiceId,
    isCorrect,
    classification: classifyAttempt(isCorrect, LIVE_ATTEMPT_CONFIDENCE),
    explanation: question.explanation,
    examTip: question.examTip,
    mnemonic: question.mnemonic,
    evidence: question.evidence,
  };
}

function toLearnerSnapshot(signals: LearnerSignals): LearnerSnapshot {
  return {
    priorAttempts: signals.questionAttempts.length,
    priorMistakes: signals.questionAttempts.filter((attempt) => attempt.isCorrect === false).length,
    topicAccuracy: signals.topicAccuracy,
    topicBand: toMasteryBand(signals.topicAccuracy, signals.topicAttempts),
    dangerZoneCountOnTopic: signals.dangerZoneCountOnTopic,
    overdueReviewCount: signals.overdueReviewCount,
    srsIntervalDays: signals.srsIntervalDays,
    existingNote: signals.existingNote,
  };
}
