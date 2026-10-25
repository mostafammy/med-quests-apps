import { describe, it, expect } from 'vitest';
import { SystemPromptBuilder } from '../systemPromptBuilder.ts';
import type { QuestionView, TutorContext, ProctorContext } from '../context.ts';
import type { ActiveQuestionTelemetry } from '../telemetry.ts';

describe('SystemPromptBuilder (v2 Medical Faculty Builder)', () => {
  const dummyQuestion: QuestionView = {
    id: 'q-as-01',
    subjectId: 'cardiovascular',
    topicId: 'valvular-heart-disease',
    chapterId: 'cardiovascular',
    concept: 'Aortic Stenosis Hemodynamics',
    difficulty: 2,
    highYield: true,
    stem: 'A 72-year-old male presents with exertional syncope and a crescendo-decrescendo systolic murmur.',
    choices: [
      { id: 'a', text: 'Aortic Stenosis' },
      { id: 'b', text: 'Mitral Regurgitation' },
      { id: 'c', text: 'Hypertrophic Cardiomyopathy' },
    ],
  };

  it('builds authoritative role persona without pleasantries', () => {
    const prompt = new SystemPromptBuilder().withRolePersona().build();
    expect(prompt).toContain('expert Socratic Medical Faculty Mentor');
    expect(prompt).toContain('USMLE / Cardiovascular Board');
    expect(prompt).toContain('first-principles pathophysiology');
  });

  it('enforces Sealed Exam Integrity: NEVER reveals answer or diagnosis before commitment', () => {
    const sealedContext: TutorContext = {
      kind: 'tutor',
      mode: 'practice',
      question: dummyQuestion,
      disclosure: { state: 'sealed' },
      learner: {
        priorAttempts: 1,
        priorMistakes: 0,
        topicAccuracy: 0.8,
        topicBand: 'strong',
        dangerZoneCountOnTopic: 0,
        overdueReviewCount: 0,
        srsIntervalDays: 1,
        existingNote: null,
      },
      isBookmarked: false,
    };

    const prompt = new SystemPromptBuilder()
      .withRolePersona()
      .withSafeContext(sealedContext)
      .build();

    expect(prompt).toContain('CRITICAL EXAM INTEGRITY DIRECTIVE');
    expect(prompt).toContain('NEVER reveal the correct letter or direct diagnosis');
    expect(prompt).toContain('Guide them Socratically');
    expect(prompt).not.toContain('POST-COMMIT REVIEW');
  });

  it('includes official rationale, board tips, and mnemonic when revealed', () => {
    const revealedContext: TutorContext = {
      kind: 'tutor',
      mode: 'practice',
      question: dummyQuestion,
      disclosure: {
        state: 'revealed',
        choices: [
          { id: 'a', text: 'Aortic Stenosis', isCorrect: true, rationale: 'Correct etiology.' },
          { id: 'b', text: 'Mitral Regurgitation', isCorrect: false, rationale: 'Holosystolic murmur at apex.' },
          { id: 'c', text: 'Hypertrophic Cardiomyopathy', isCorrect: false, rationale: 'Increases with Valsalva.' },
        ],
        correctChoiceId: 'a',
        selectedChoiceId: 'b',
        isCorrect: false,
        classification: 'honest-miss',
        explanation: 'Aortic stenosis features a parvus et tardus pulse and radiation to carotids.',
        examTip: 'Pulsus parvus et tardus confirms severe aortic stenosis.',
        mnemonic: 'SAD: Syncope, Angina, Dyspnea',
        evidence: [],
      },
      learner: {
        priorAttempts: 2,
        priorMistakes: 1,
        topicAccuracy: 0.5,
        topicBand: 'weak',
        dangerZoneCountOnTopic: 1,
        overdueReviewCount: 0,
        srsIntervalDays: 1,
        existingNote: null,
      },
      isBookmarked: false,
    };

    const prompt = new SystemPromptBuilder()
      .withRolePersona()
      .withSafeContext(revealedContext)
      .build();

    expect(prompt).toContain('DISCLOSURE STATUS: POST-COMMIT REVIEW (ANSWER REVEALED)');
    expect(prompt).toContain('Correct Answer: Option A');
    expect(prompt).toContain('Student Selected: Option B');
    expect(prompt).toContain('parvus et tardus');
    expect(prompt).toContain('SAD: Syncope, Angina, Dyspnea');
  });

  it('enforces strict Proctor constraints during timed mock exams', () => {
    const proctorContext: ProctorContext = {
      kind: 'proctor',
      mode: 'mock',
      questionIndex: 4,
      totalQuestions: 20,
      remainingMs: 1200000,
      flaggedIndices: [1],
      unansweredIndices: [5, 6],
      question: {
        id: 'q-as-01',
        stem: dummyQuestion.stem,
        choices: dummyQuestion.choices,
      },
      selectedChoiceId: null,
      isBookmarked: false,
    };

    const prompt = new SystemPromptBuilder()
      .withRolePersona()
      .withSafeContext(proctorContext)
      .build();

    expect(prompt).toContain('EXAM PROCTOR CONSTRAINTS (MOCK EXAM IN PROGRESS)');
    expect(prompt).toContain('MUST NOT confirm or deny answers, provide hints, or explain medical concepts');
    expect(prompt).toContain('Question 5 of 20');
  });

  it('embeds real-time behavioral telemetry with hesitation detection', () => {
    const telemetry: ActiveQuestionTelemetry = {
      questionId: 'q-as-01',
      startedAtMs: Date.now() - 115000,
      choiceToggles: [
        { fromChoice: null, toChoice: 'c', timestampMs: Date.now() - 60000 },
        { fromChoice: 'c', toChoice: 'b', timestampMs: Date.now() - 20000 },
        { fromChoice: 'b', toChoice: 'c', timestampMs: Date.now() - 5000 },
      ],
      stemRereadCount: 3,
    };

    const prompt = new SystemPromptBuilder()
      .withTelemetrySnapshot(telemetry, 115)
      .build();

    expect(prompt).toContain('Time spent on this question: 115 seconds');
    expect(prompt).toContain('Choice toggling pattern: None -> C, C -> B, B -> C');
    expect(prompt).toContain('Stem reread / re-inspection count: 3');
    expect(prompt).toContain('ELEVATED HESITATION DETECTED');
  });

  it('includes full 9-tool orchestration protocols with silent vs artifact specifications', () => {
    const prompt = new SystemPromptBuilder().withToolOrchestrationRules().build();

    expect(prompt).toContain('analyze_active_question_vignette');
    expect(prompt).toContain('inspect_student_cognitive_telemetry');
    expect(prompt).toContain('detect_cognitive_bias_trap');
    expect(prompt).toContain('simulate_hemodynamic_pv_loop');
    expect(prompt).toContain('simulate_peer_cohort_difficulty');
    expect(prompt).toContain('calculate_cardiovascular_equation');
    expect(prompt).toContain('formulate_clinical_memory_anchor');
    expect(prompt).toContain('prescribe_targeted_micro_curriculum');
  });

  it('injects Arabic medical language directive and preserves tool English protocol', () => {
    const prompt = new SystemPromptBuilder()
      .withRolePersona()
      .withChatLanguageDirective({
        preference: 'ar',
        resolvedLanguage: 'ar',
        direction: 'rtl',
        detectedInputScript: 'ar',
        preserveEnglishMedicalTerms: true,
      })
      .withToolOrchestrationRules()
      .build();

    expect(prompt).toContain('اللغة العربية الفصحى الطبية السليمة');
    expect(prompt).toContain('CANONICAL USMLE MEDICAL TERMS');
    expect(prompt).toContain('STRICT TOOL CALLING PROTOCOL');
    expect(prompt).toContain('simulate_hemodynamic_pv_loop');
  });
});
