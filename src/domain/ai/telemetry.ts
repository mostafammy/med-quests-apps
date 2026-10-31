/**
 * Real-time Cognitive Telemetry Tracker (SOLID Single-Responsibility Domain Sensor)
 * Captures live per-question active reading duration, hesitation/choice switching,
 * initial gut-instinct choice, distractor elimination, and AI Co-Pilot consultation.
 */
import type { ChoiceId, Confidence } from '../model/types.ts';

export interface ChoiceToggleEvent {
  readonly fromChoice: ChoiceId | null;
  readonly toChoice: ChoiceId;
  readonly timestampMs: number;
}

export interface ActiveQuestionTelemetry {
  readonly questionId: string;
  readonly startedAtMs: number;
  readonly choiceToggles: readonly ChoiceToggleEvent[];
  readonly stemRereadCount: number;
  readonly activeTimeSpentMs?: number;
  readonly firstSelectedChoiceId?: ChoiceId | null;
  readonly choiceChangesCount?: number;
  readonly eliminatedChoiceIds?: ChoiceId[];
  readonly confidence?: Confidence;
  readonly aiCopilotConsulted?: boolean;
}

interface QuestionMutableState {
  questionId: string;
  firstOpenedAtMs: number;
  lastEnteredAtMs: number | null;
  accumulatedTimeMs: number;
  choiceToggles: ChoiceToggleEvent[];
  stemRereadCount: number;
  lastSelectedChoice: ChoiceId | null;
  firstSelectedChoice: ChoiceId | null;
  eliminatedChoices: Set<ChoiceId>;
  confidence: Confidence;
  aiCopilotConsulted: boolean;
}

class TelemetryTracker {
  private currentQuestionId: string | null = null;
  private startedAtMs: number = Date.now();
  private byQuestion = new Map<string, QuestionMutableState>();

  private ensureState(questionId: string): QuestionMutableState {
    let state = this.byQuestion.get(questionId);
    if (!state) {
      const now = Date.now();
      state = {
        questionId,
        firstOpenedAtMs: now,
        lastEnteredAtMs: null,
        accumulatedTimeMs: 0,
        choiceToggles: [],
        stemRereadCount: 0,
        lastSelectedChoice: null,
        firstSelectedChoice: null,
        eliminatedChoices: new Set<ChoiceId>(),
        confidence: 'unsure',
        aiCopilotConsulted: false,
      };
      this.byQuestion.set(questionId, state);
    }
    return state;
  }

  private flushCurrentQuestionTime(): void {
    if (!this.currentQuestionId) return;
    const state = this.byQuestion.get(this.currentQuestionId);
    if (state && state.lastEnteredAtMs !== null) {
      const delta = Math.max(0, Date.now() - state.lastEnteredAtMs);
      // Cap single uninterrupted dwell delta at 5 minutes to prevent idle tab inflation
      state.accumulatedTimeMs += Math.min(delta, 5 * 60 * 1000);
      state.lastEnteredAtMs = Date.now();
    }
  }

  startQuestion(questionId: string, force = false) {
    if (!force && this.currentQuestionId === questionId) return;
    this.flushCurrentQuestionTime();

    this.currentQuestionId = questionId;
    this.startedAtMs = Date.now();

    if (force) {
      this.byQuestion.delete(questionId);
    }
    const nextState = this.ensureState(questionId);
    nextState.lastEnteredAtMs = Date.now();
  }

  reset() {
    this.currentQuestionId = null;
    this.startedAtMs = Date.now();
    this.byQuestion.clear();
  }

  recordChoiceSelection(toChoice: ChoiceId, explicitQuestionId?: string) {
    const qId = explicitQuestionId ?? this.currentQuestionId ?? 'unknown';
    const state = this.ensureState(qId);
    if (state.lastSelectedChoice === toChoice) return;

    if (state.firstSelectedChoice === null) {
      state.firstSelectedChoice = toChoice;
    }

    state.choiceToggles.push({
      fromChoice: state.lastSelectedChoice,
      toChoice,
      timestampMs: Date.now(),
    });
    state.lastSelectedChoice = toChoice;
  }

  toggleChoiceElimination(choiceId: ChoiceId, explicitQuestionId?: string): readonly ChoiceId[] {
    const qId = explicitQuestionId ?? this.currentQuestionId ?? 'unknown';
    const state = this.ensureState(qId);
    if (state.eliminatedChoices.has(choiceId)) {
      state.eliminatedChoices.delete(choiceId);
    } else {
      state.eliminatedChoices.add(choiceId);
    }
    return Array.from(state.eliminatedChoices);
  }

  setConfidence(confidence: Confidence, explicitQuestionId?: string) {
    const qId = explicitQuestionId ?? this.currentQuestionId ?? 'unknown';
    const state = this.ensureState(qId);
    state.confidence = confidence;
  }

  recordConfidence(confidence: Confidence, explicitQuestionId?: string) {
    this.setConfidence(confidence, explicitQuestionId);
  }

  recordAiCopilotConsultation(explicitQuestionId?: string) {
    const qId = explicitQuestionId ?? this.currentQuestionId ?? 'unknown';
    const state = this.ensureState(qId);
    state.aiCopilotConsulted = true;
  }

  recordStemReread() {
    const qId = this.currentQuestionId ?? 'unknown';
    const state = this.ensureState(qId);
    state.stemRereadCount += 1;
  }

  getQuestionSnapshot(questionId: string): ActiveQuestionTelemetry {
    if (this.currentQuestionId === questionId) {
      this.flushCurrentQuestionTime();
    }
    const state = this.byQuestion.get(questionId);
    if (!state) {
      const elapsed = Math.max(800, Date.now() - this.startedAtMs);
      return {
        questionId,
        startedAtMs: this.startedAtMs,
        choiceToggles: [],
        stemRereadCount: 0,
        activeTimeSpentMs: elapsed,
        firstSelectedChoiceId: null,
        choiceChangesCount: 0,
        eliminatedChoiceIds: [],
        confidence: 'unsure',
        aiCopilotConsulted: false,
      };
    }

    const activeTimeSpentMs = Math.max(800, state.accumulatedTimeMs);
    const choiceChangesCount = Math.max(0, state.choiceToggles.length - 1);

    return {
      questionId: state.questionId,
      startedAtMs: state.firstOpenedAtMs,
      choiceToggles: [...state.choiceToggles],
      stemRereadCount: state.stemRereadCount,
      activeTimeSpentMs,
      firstSelectedChoiceId: state.firstSelectedChoice,
      choiceChangesCount,
      eliminatedChoiceIds: Array.from(state.eliminatedChoices),
      confidence: state.confidence,
      aiCopilotConsulted: state.aiCopilotConsulted,
    };
  }

  getSnapshot(): ActiveQuestionTelemetry {
    return this.getQuestionSnapshot(this.currentQuestionId ?? 'unknown');
  }

  getTimeSpentSeconds(): number {
    const snap = this.getSnapshot();
    return Math.max(1, Math.round((snap.activeTimeSpentMs ?? 1000) / 1000));
  }
}

export const questionTelemetryTracker = new TelemetryTracker();
