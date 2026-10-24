/**
 * Real-time Cognitive Telemetry Tracker
 * Captures live hesitation, option toggling, and rereading behavior
 * while the student works through an active question.
 */
import type { ChoiceId } from '../model/types.ts';

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
}

class TelemetryTracker {
  private currentQuestionId: string | null = null;
  private startedAtMs: number = Date.now();
  private choiceToggles: ChoiceToggleEvent[] = [];
  private stemRereadCount: number = 0;
  private lastSelectedChoice: ChoiceId | null = null;

  startQuestion(questionId: string, force = false) {
    if (!force && this.currentQuestionId === questionId) return;
    this.currentQuestionId = questionId;
    this.startedAtMs = Date.now();
    this.choiceToggles = [];
    this.stemRereadCount = 0;
    this.lastSelectedChoice = null;
  }

  reset() {
    this.currentQuestionId = null;
    this.startedAtMs = Date.now();
    this.choiceToggles = [];
    this.stemRereadCount = 0;
    this.lastSelectedChoice = null;
  }

  recordChoiceSelection(toChoice: ChoiceId) {
    if (this.lastSelectedChoice === toChoice) return;
    this.choiceToggles.push({
      fromChoice: this.lastSelectedChoice,
      toChoice,
      timestampMs: Date.now(),
    });
    this.lastSelectedChoice = toChoice;
  }

  recordStemReread() {
    this.stemRereadCount += 1;
  }

  getSnapshot(): ActiveQuestionTelemetry {
    return {
      questionId: this.currentQuestionId ?? 'unknown',
      startedAtMs: this.startedAtMs,
      choiceToggles: [...this.choiceToggles],
      stemRereadCount: this.stemRereadCount,
    };
  }

  getTimeSpentSeconds(): number {
    return Math.max(1, Math.round((Date.now() - this.startedAtMs) / 1000));
  }
}

export const questionTelemetryTracker = new TelemetryTracker();
