/**
 * SystemPromptBuilder (OOP Builder Pattern)
 * Constructs the medical faculty system prompt with strict exam integrity gates,
 * context awareness, and autonomous tool calling protocols.
 */
import type { SafeAiContext } from './context.ts';
import type { ActiveQuestionTelemetry } from './telemetry.ts';
import type { ResolvedChatLanguageContext } from '../i18n/types.ts';
import { ChatLanguagePolicy } from './languagePolicy.ts';

export class SystemPromptBuilder {
  private rolePersona: string = '';
  private contextSection: string = '';
  private telemetrySection: string = '';
  private toolProtocolSection: string = '';
  private languageDirectiveSection: string = '';

  withRolePersona(): this {
    this.rolePersona =
      `You are an expert Socratic Medical Faculty Mentor and Cardiovascular Pathophysiologist on the Med Quests platform.\n` +
      `Your goal is to build deep clinical reasoning and board exam (USMLE / Cardiovascular Board) mastery.\n` +
      `Tone: Authoritative, encouraging, concise, high-yield, and focused on first-principles pathophysiology. Avoid pleasantries and fluff.`;
    return this;
  }

  withSafeContext(context: SafeAiContext, activeQuestion?: any): this {
    // 1. Resolve question attributes from activeQuestion or context
    const qStem =
      activeQuestion?.stem ||
      (context.kind === 'tutor' || context.kind === 'proctor'
        ? context.question?.stem
        : null);

    const qChoices: ReadonlyArray<{ id: string; text: string }> =
      activeQuestion?.choices ||
      (context.kind === 'tutor' || context.kind === 'proctor'
        ? context.question?.choices
        : []);

    const qConcept =
      activeQuestion?.concept ||
      (context.kind === 'tutor' ? context.question?.concept : null);

    const qTopicId =
      activeQuestion?.topicId ||
      (context.kind === 'tutor' ? context.question?.topicId : null);

    const qChapterId =
      activeQuestion?.chapterId ||
      (context.kind === 'tutor' ? context.question?.chapterId : null);

    const qHighYield =
      activeQuestion?.highYield ??
      (context.kind === 'tutor' ? context.question?.highYield : false);

    // 2. Ground Truth Solution Resolution
    const correctChoiceObj = activeQuestion?.choices?.find((c: any) => c.isCorrect);
    const correctChoiceId: string | null =
      correctChoiceObj?.id ||
      (context.kind === 'tutor' && context.disclosure.state === 'revealed'
        ? context.disclosure.correctChoiceId
        : null);

    const facultyExplanation: string | null =
      activeQuestion?.explanation ||
      (context.kind === 'tutor' && context.disclosure.state === 'revealed'
        ? context.disclosure.explanation
        : null);

    const examTip: string | null =
      activeQuestion?.examTip ||
      (context.kind === 'tutor' && context.disclosure.state === 'revealed'
        ? context.disclosure.examTip
        : null);

    const mnemonic: string | null =
      activeQuestion?.mnemonic ||
      (context.kind === 'tutor' && context.disclosure.state === 'revealed'
        ? context.disclosure.mnemonic
        : null);

    const selectedChoiceId: string | null =
      context.kind === 'tutor' && context.disclosure.state === 'revealed'
        ? context.disclosure.selectedChoiceId
        : context.kind === 'proctor'
          ? context.selectedChoiceId
          : null;

    if (qStem) {
      let s = `CURRENT ACTIVE CLINICAL QUESTION ON SCREEN:\n`;
      if (qConcept) s += `- Core Concept: ${qConcept}\n`;
      if (qTopicId) s += `- Topic ID: ${qTopicId} (${qChapterId || 'Cardiovascular'})\n`;
      s += `- High-Yield Status: ${qHighYield ? 'YES (High-Yield Board Objective)' : 'Standard'}\n`;
      if (context.kind === 'proctor') {
        s += `- Exam Mode: Timed Mock Exam (Question ${context.questionIndex + 1} of ${context.totalQuestions})\n`;
      }
      s += `- Vignette Stem: "${qStem}"\n`;
      s += `- Available Choices:\n`;
      s += qChoices.map((c) => `  * Option ${c.id.toUpperCase()}: ${c.text}`).join('\n');
      s += `\n\n`;

      if (correctChoiceId) {
        s += `GROUND TRUTH FACULTY SOLUTION (AUTHORITATIVE REFERENCE):\n`;
        s += `- Correct Option: Option ${correctChoiceId.toUpperCase()}${correctChoiceObj?.text ? `: ${correctChoiceObj.text}` : ''}\n`;
        if (selectedChoiceId) {
          s += `- Student Selected on Screen: Option ${selectedChoiceId.toUpperCase()}\n`;
        }
        if (facultyExplanation) {
          s += `- Official Faculty Rationale: ${facultyExplanation}\n`;
        }
        if (examTip) {
          s += `- Board Exam Tip: ${examTip}\n`;
        }
        if (mnemonic) {
          s += `- Canonical Memory Mnemonic: ${mnemonic}\n`;
        }
        s += `\n`;
      }

      s += `PEDAGOGICAL & DISCLOSURE POLICY (CRITICAL DIRECTIVE):\n`;
      s += `1. ACTIVE QUESTION ENGAGEMENT: NEVER refuse to discuss or explain the active clinical question, its symptoms, vital signs, physical exam findings, or pathophysiological mechanisms. Always treat the student with academic respect and clarity.\n`;
      s += `2. DEFAULT TEACHING MODE (HINTS & SOCRATIC REASONING): When the student asks for a hint, says "I'm stuck", asks for guidance, or is working through the case, guide them Socratically: emphasize the clinical pivot findings (vital signs, heart sounds, murmur radiation, chronicity) and prompt them to think through the hemodynamic consequences.\n`;
      s += `3. EXPLICIT ANSWER REQUESTS — MANDATORY IMMEDIATE REVELATION: IF THE STUDENT EXPLICITLY ASKS FOR THE CORRECT CHOICE, ASKS "WHAT IS THE ANSWER?", "TELL ME THE ANSWER", "WHICH OPTION IS CORRECT?", ASKS WHY A SPECIFIC OPTION IS RIGHT OR WRONG, OR USES AN EXPLANATION POWER ACTION:\n`;
      s += `   - YOU MUST IMMEDIATELY AND DIRECTLY STATE THE CORRECT CHOICE (e.g. "**The correct choice is Option ${correctChoiceId ? correctChoiceId.toUpperCase() : '...'}**").\n`;
      s += `   - Provide a complete, rigorous first-principles pathophysiological explanation of why this answer is correct.\n`;
      s += `   - Explain why each alternative choice (distractor) is incorrect.\n`;
      s += `   - ZERO REFUSAL POLICY: NEVER REFUSE to reveal the correct choice when asked explicitly.\n`;
      s += `   - NEVER lecture the student about exam rules, academic integrity, or withholding answers.\n`;
      s += `   - NEVER say "I cannot reveal the answer" or "You must guess first".`;

      this.contextSection = s;
      return this;
    }

    if (context.kind === 'studio') {
      this.contextSection = `STUDIO MODE: Assisting with question authoring, clinical vignette editing, and curriculum analysis.`;
      return this;
    }

    this.contextSection = `WORKSPACE MODE: Navigating curriculum library and review hub.`;
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
      `- 'formulate_clinical_memory_anchor': Call to create a memorable board mnemonic.\n` +
      `- 'prescribe_targeted_micro_curriculum': Call to generate a 3-step targeted remediation drill.\n\n` +
      `REMEDIATION POLICY: Do NOT create or synthesize SRS flashcards. Focus strictly on deep physiological analysis, differential diagnosis, and mnemonic memory anchors.\n\n` +
      `EXECUTION FLOW: When you call a tool, your tool result will be provided immediately. Then synthesize a clear, coherent, high-yield clinical response for the student.`;
    return this;
  }

  withChatLanguageDirective(context: ResolvedChatLanguageContext): this {
    this.languageDirectiveSection = ChatLanguagePolicy.buildChatLanguageDirective(context);
    return this;
  }

  build(): string {
    const sections = [
      this.rolePersona,
      this.languageDirectiveSection,
      this.contextSection,
      this.telemetrySection,
      this.toolProtocolSection,
    ].filter(Boolean);

    return sections.join('\n\n========================================\n\n');
  }
}
