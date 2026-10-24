/**
 * Category 1: Invisible Autonomous Background Tools (A, B, C)
 * Executed silently by the agent to build situational awareness without UI clutter.
 */
import type {
  IAgentTool,
  AnalyzeVignetteArgs,
  AnalyzeVignetteResult,
  InspectTelemetryArgs,
  StudentTelemetryResult,
  DetectCognitiveBiasArgs,
  CognitiveBiasTrapResult,
  ToolExecutionContext,
} from './toolTypes.ts';
import { questionTelemetryTracker } from '../telemetry.ts';

/**
 * Tool A: analyze_active_question_vignette
 */
export class AnalyzeVignetteTool implements IAgentTool<AnalyzeVignetteArgs, AnalyzeVignetteResult> {
  readonly name = 'analyze_active_question_vignette' as const;
  readonly visibility = 'silent' as const;
  readonly description =
    'Deconstructs the active clinical vignette into chief complaint, clinical acuteness, hemodynamic status, decisive pivot clues, and distractor traps.';

  readonly jsonSchema = {
    type: 'object',
    properties: {
      focusChoiceId: {
        type: 'string',
        description: 'Optional choice ID (a, b, c, d) being investigated.',
      },
    },
    additionalProperties: false,
  };

  async execute(_args: AnalyzeVignetteArgs, ctx: ToolExecutionContext): Promise<AnalyzeVignetteResult> {
    const q = ctx.activeQuestion;
    const stem = q?.stem ?? '';

    // Deterministic clinical parser from stem signals
    const lowerStem = stem.toLowerCase();

    // Acuteness
    let clinicalAcuteness: AnalyzeVignetteResult['clinicalAcuteness'] = 'subacute';
    if (lowerStem.includes('sudden') || lowerStem.includes('abrupt') || lowerStem.includes('minutes ago')) {
      clinicalAcuteness = 'hyperacute';
    } else if (lowerStem.includes('hours') || lowerStem.includes('yesterday') || lowerStem.includes('acute')) {
      clinicalAcuteness = 'acute';
    } else if (lowerStem.includes('months') || lowerStem.includes('years') || lowerStem.includes('progressive')) {
      clinicalAcuteness = 'chronic';
    }

    // Hemodynamic status
    let hemodynamicStatus: AnalyzeVignetteResult['hemodynamicStatus'] = 'stable';
    if (lowerStem.includes('hypotension') || lowerStem.includes('blood pressure is 8') || lowerStem.includes('blood pressure is 7') || lowerStem.includes('shock')) {
      hemodynamicStatus = 'cardiogenic-shock';
    } else if (lowerStem.includes('tachycardia') || lowerStem.includes('elevated jvp') || lowerStem.includes('crackles') || lowerStem.includes('edema')) {
      hemodynamicStatus = 'compensated';
    }

    // Extract key clinical pivot sentences
    const sentences = stem.split(/(?<=[.?!])\s+/);
    const pivotClues = sentences.filter((s: string) => {
      const l = s.toLowerCase();
      return (
        l.includes('murmur') ||
        l.includes('blood pressure') ||
        l.includes('heart rate') ||
        l.includes('pulse') ||
        l.includes('ecg') ||
        l.includes('sound') ||
        l.includes('gallop') ||
        l.includes('friction')
      );
    });

    const decisivePivotClues = pivotClues.length > 0 ? pivotClues.slice(0, 3) : sentences.slice(0, 2);

    // Map distractor traps
    const distractorTrapMap: Record<string, { intendedTrap: string; distinguishingHallmark: string }> = {};
    if (q?.choices) {
      for (const choice of q.choices) {
        distractorTrapMap[choice.id] = {
          intendedTrap: `Common board confusion with ${choice.text.slice(0, 30)}`,
          distinguishingHallmark: `Examine the timing, maneuver response, and radiation in the vignette.`,
        };
      }
    }

    return {
      kind: 'analyze_vignette',
      chiefComplaint: sentences[0] || 'Cardiovascular presentation',
      clinicalAcuteness,
      hemodynamicStatus,
      decisivePivotClues,
      distractorTrapMap,
    };
  }
}

/**
 * Tool B: inspect_student_cognitive_telemetry
 */
export class InspectTelemetryTool implements IAgentTool<InspectTelemetryArgs, StudentTelemetryResult> {
  readonly name = 'inspect_student_cognitive_telemetry' as const;
  readonly visibility = 'silent' as const;
  readonly description =
    'Inspects live student hesitation signals: time spent on current question, choice toggling sequence, stem reread frequency, and recent topic accuracy.';

  readonly jsonSchema = {
    type: 'object',
    properties: {
      includeHistoricalTopicStats: {
        type: 'boolean',
        description: 'Whether to include historical chapter/topic accuracy.',
      },
    },
    additionalProperties: false,
  };

  async execute(_args: InspectTelemetryArgs, ctx: ToolExecutionContext): Promise<StudentTelemetryResult> {
    const snap = questionTelemetryTracker.getSnapshot();
    const timeSpent = questionTelemetryTracker.getTimeSpentSeconds();

    const topicAcc = ctx.safeContext?.signals?.topicAccuracy ?? 0.7;
    const streak = ctx.safeContext?.signals?.dangerZoneCountOnTopic ?? 0;

    return {
      kind: 'student_telemetry',
      timeSpentSeconds: timeSpent,
      choiceToggles: snap.choiceToggles,
      stemRereadCount: snap.stemRereadCount,
      topicHistoricalAccuracy: Math.round(topicAcc * 100) / 100,
      recentMistakeStreak: streak,
    };
  }
}

/**
 * Tool C: detect_cognitive_bias_trap
 */
export class DetectCognitiveBiasTool implements IAgentTool<DetectCognitiveBiasArgs, CognitiveBiasTrapResult> {
  readonly name = 'detect_cognitive_bias_trap' as const;
  readonly visibility = 'silent' as const;
  readonly description =
    'Identifies whether the student is falling for a specific diagnostic bias (Anchoring Bias, Premature Closure, Availability Heuristic, or Framing Effect).';

  readonly jsonSchema = {
    type: 'object',
    properties: {
      candidateChoiceId: {
        type: 'string',
        description: 'Choice the student is currently contemplating or justifying.',
      },
      studentReasoningSnippet: {
        type: 'string',
        description: 'Snippet of what the student said or questioned.',
      },
    },
    additionalProperties: false,
  };

  async execute(_args: DetectCognitiveBiasArgs, _ctx: ToolExecutionContext): Promise<CognitiveBiasTrapResult> {
    const timeSpent = questionTelemetryTracker.getTimeSpentSeconds();
    const snap = questionTelemetryTracker.getSnapshot();

    // Bias detection heuristic
    let detectedBias: CognitiveBiasTrapResult['detectedBias'] = 'anchoring_bias';
    let biasLabel = 'Anchoring Bias';
    let clinicalTrigger = 'Fixating on an isolated symptom without integrating subsequent physical exam findings.';
    let overlookedPivotClue = 'Check the pulse character and radiation in the physical exam.';
    let socraticCounterPrompt = 'What specific finding in the auscultation or vitals argues against this choice?';

    if (timeSpent < 20 && snap.choiceToggles.length === 0) {
      detectedBias = 'premature_closure';
      biasLabel = 'Premature Closure';
      clinicalTrigger = 'Selecting an initial match rapidly before ruling out high-yield differential look-alikes.';
      overlookedPivotClue = 'Review all choices to verify whether a more specific pathological mechanism exists.';
      socraticCounterPrompt = 'Before committing, what is the single distinguishing feature between this and the closest mimic?';
    } else if (snap.choiceToggles.length >= 3) {
      detectedBias = 'availability_heuristic';
      biasLabel = 'Availability Heuristic';
      clinicalTrigger = 'Vacillating between choices due to recent study recall rather than vignette physiology.';
      overlookedPivotClue = 'Focus on the hemodynamic timeline (acute vs chronic remodeling).';
      socraticCounterPrompt = 'Step back from the disease names: what is the primary volume vs pressure overload state here?';
    }

    return {
      kind: 'cognitive_bias',
      detectedBias,
      biasLabel,
      clinicalTrigger,
      overlookedPivotClue,
      socraticCounterPrompt,
    };
  }
}
