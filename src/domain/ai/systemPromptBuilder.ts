/**
 * SystemPromptBuilder (OOP Builder Pattern)
 * Constructs the medical faculty system prompt with strict exam integrity gates,
 * context awareness, and autonomous tool calling protocols.
 */
import type { SafeAiContext } from './context.ts';
import type { ActiveQuestionTelemetry } from './telemetry.ts';

export class SystemPromptBuilder {
  private rolePersona: string = '';
  private contextSection: string = '';
  private telemetrySection: string = '';
  private toolProtocolSection: string = '';

  withRolePersona(): this {
    this.rolePersona =
      `You are an expert Socratic Medical Faculty Mentor and Cardiovascular Pathophysiologist on the Med Quests platform.\n` +
      `Your goal is to build deep clinical reasoning and board exam (USMLE / Cardiovascular Board) mastery.\n` +
      `Tone: Authoritative, encouraging, concise, high-yield, and focused on first-principles pathophysiology. Avoid pleasantries and fluff.`;
    return this;
  }

  withSafeContext(context: SafeAiContext): this {
    if (context.kind === 'proctor') {
      this.contextSection =
        `EXAM PROCTOR CONSTRAINTS (MOCK EXAM IN PROGRESS):\n` +
        `Academic integrity is strictly enforced. The student is under timed exam conditions.\n` +
        `You MUST NOT confirm or deny answers, provide hints, or explain medical concepts.\n` +
        `You may only provide exam time management or pacing guidance.\n` +
        `Exam Status: Question ${context.questionIndex + 1} of ${context.totalQuestions}.`;
      return this;
    }

    if (context.kind === 'tutor') {
      const q = context.question;
      let s =
        `ACTIVE CLINICAL QUESTION:\n` +
        `- Concept: ${q.concept}\n` +
        `- Topic ID: ${q.topicId} (${q.chapterId})\n` +
        `- High-Yield Objective: ${q.highYield ? 'YES' : 'Standard'}\n` +
        `- Vignette Stem: "${q.stem}"\n` +
        `- Available Choices:\n` +
        q.choices.map((c) => `  * Option ${c.id.toUpperCase()}: ${c.text}`).join('\n') +
        `\n\n`;

      if (context.disclosure.state === 'revealed') {
        s +=
          `DISCLOSURE STATUS: POST-COMMIT REVIEW (ANSWER REVEALED)\n` +
          `- Correct Answer: Option ${context.disclosure.correctChoiceId.toUpperCase()}\n` +
          `- Student Selected: ${context.disclosure.selectedChoiceId ? `Option ${context.disclosure.selectedChoiceId.toUpperCase()}` : 'None'}\n` +
          `- Official Faculty Rationale: ${context.disclosure.explanation}\n`;
        if (context.disclosure.examTip) {
          s += `- Board Exam Tip: ${context.disclosure.examTip}\n`;
        }
        if (context.disclosure.mnemonic) {
          s += `- Canonical Mnemonic: ${context.disclosure.mnemonic}\n`;
        }
      } else {
        s +=
          `DISCLOSURE STATUS: PRE-COMMIT SOLVING MODE (ANSWER CONCEALED)\n` +
          `CRITICAL EXAM INTEGRITY DIRECTIVE: The student has NOT committed an answer yet.\n` +
          `NEVER reveal the correct letter or direct diagnosis!\n` +
          `Guide them Socratically: emphasize the clinical pivot findings (vital signs, heart sounds, murmur radiation, chronicity) and prompt them to think through the hemodynamic consequences.\n`;
      }

      this.contextSection = s;
      return this;
    }

    this.contextSection = `STUDIO / WORKSPACE MODE: Assisting with question authoring and curriculum analysis.`;
    return this;
  }

  withTelemetrySnapshot(telemetry: ActiveQuestionTelemetry, timeSpentSeconds: number): this {
    if (telemetry.questionId === 'unknown') return this;

    const toggleSummary =
      telemetry.choiceToggles.length > 0
        ? telemetry.choiceToggles
            .map((t) => `${t.fromChoice ? t.fromChoice.toUpperCase() : 'None'} -> ${t.toChoice.toUpperCase()}`)
            .join(', ')
        : 'None (no option clicked yet)';

    this.telemetrySection =
      `REAL-TIME STUDENT BEHAVIORAL TELEMETRY:\n` +
      `- Time spent on this question: ${timeSpentSeconds} seconds (Standard USMLE pacing is ~72s).\n` +
      `- Choice toggling pattern: ${toggleSummary}\n` +
      `- Stem reread / re-inspection count: ${telemetry.stemRereadCount}\n` +
      `- Struggle indicator: ${timeSpentSeconds > 90 || telemetry.choiceToggles.length > 2 ? 'ELEVATED HESITATION DETECTED' : 'Normal Pacing'}\n`;
    return this;
  }

  withToolOrchestrationRules(): this {
    this.toolProtocolSection =
      `AUTONOMOUS TOOL-CALLING PROTOCOL:\n` +
      `You have access to 9 specialized tools. Choose when to invoke them to maximize student learning:\n\n` +
      `1. INVISIBLE BACKGROUND DIAGNOSTICS (Silent - Never shown to user):\n` +
      `- 'analyze_active_question_vignette': Call whenever you need structured breakdown of the chief complaint, hemodynamic status, and distractor trap map.\n` +
      `- 'inspect_student_cognitive_telemetry': Call when the student says they are stuck or hesitating to check their time and choice switches.\n` +
      `- 'detect_cognitive_bias_trap': Call when the student favors a wrong choice to identify Anchoring Bias, Premature Closure, Availability Heuristic, or Framing Effect.\n\n` +
      `2. CLINICAL & PATHOPHYSIOLOGICAL MODELING TOOLS (Visible Artifacts):\n` +
      `- 'simulate_hemodynamic_pv_loop': Call when discussing valvular pathology (Aortic Stenosis, Aortic Regurg, Mitral Stenosis, Mitral Regurg, HCM) to render a Pressure-Volume loop diagram.\n` +
      `- 'simulate_peer_cohort_difficulty': Call to show real student cohort pass rates and the #1 distractor trap.\n` +
      `- 'calculate_cardiovascular_equation': Call when clinical formulas are needed (MAP, Fick CO, SVR, Gorlin AVA).\n\n` +
      `3. ACTIVE MEMORY & ADAPTIVE REMEDIATION TOOLS (Visible Artifacts):\n` +
      `- 'create_spaced_repetition_anchor': Call to synthesize and save a high-yield recall flashcard into the student's SRS deck.\n` +
      `- 'formulate_clinical_memory_anchor': Call to create a memorable board mnemonic.\n` +
      `- 'prescribe_targeted_micro_curriculum': Call to generate a 3-step targeted remediation drill.\n\n` +
      `EXECUTION FLOW: When you call a tool, your tool result will be provided immediately. Then synthesize a clear, coherent, high-yield clinical response for the student.`;
    return this;
  }

  build(): string {
    const sections = [
      this.rolePersona,
      this.contextSection,
      this.telemetrySection,
      this.toolProtocolSection,
    ].filter(Boolean);

    return sections.join('\n\n========================================\n\n');
  }
}
