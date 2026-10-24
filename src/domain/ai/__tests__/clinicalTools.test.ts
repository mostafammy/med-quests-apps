import { describe, it, expect, beforeEach } from 'vitest';
import {
  AnalyzeVignetteTool,
  InspectTelemetryTool,
  DetectCognitiveBiasTool,
} from '../tools/autonomousDiagnosticTools.ts';
import {
  SimulatePvLoopTool,
  SimulatePeerCohortTool,
  CalculateCvEquationTool,
} from '../tools/clinicalModelingTools.ts';
import { questionTelemetryTracker } from '../telemetry.ts';
import type { ToolExecutionContext } from '../tools/toolTypes.ts';

describe('Clinical & Diagnostic Tools Suite (Tools A–F)', () => {
  const dummyContext: ToolExecutionContext = {
    activeQuestion: {
      id: 'q-as-01',
      stem: 'A 68-year-old male presents with abrupt onset of severe dyspnea and blood pressure is 85/50 mmHg. Auscultation reveals an early diastolic decrescendo murmur at the right upper sternal border.',
      choices: [
        { id: 'a', text: 'Acute Aortic Regurgitation' },
        { id: 'b', text: 'Aortic Stenosis' },
        { id: 'c', text: 'Cardiac Tamponade' },
        { id: 'd', text: 'Mitral Stenosis' },
      ],
      correctChoiceId: 'a',
      difficulty: 'hard',
      topicId: 'valvular-heart-disease',
    },
    safeContext: {
      kind: 'tutor',
      question: {} as any,
      disclosure: { state: 'sealed' },
      signals: {
        topicAccuracy: 0.42,
        dangerZoneCountOnTopic: 3,
      } as any,
    },
    questionsBank: [],
  };

  beforeEach(() => {
    questionTelemetryTracker.startQuestion('q-as-01', true);
  });

  describe('Tool A: analyze_active_question_vignette', () => {
    const tool = new AnalyzeVignetteTool();

    it('has silent visibility and deconstructs acute shock vignette', async () => {
      expect(tool.visibility).toBe('silent');
      const result = await tool.execute({}, dummyContext);

      expect(result.clinicalAcuteness).toBe('hyperacute');
      expect(result.hemodynamicStatus).toBe('cardiogenic-shock');
      expect(result.decisivePivotClues.length).toBeGreaterThan(0);
      expect(result.distractorTrapMap['b']).toBeDefined();
    });
  });

  describe('Tool B: inspect_student_cognitive_telemetry', () => {
    const tool = new InspectTelemetryTool();

    it('captures live student hesitation, toggles, and topic accuracy', async () => {
      questionTelemetryTracker.recordChoiceSelection('b');
      questionTelemetryTracker.recordChoiceSelection('c');
      questionTelemetryTracker.recordStemReread();

      const result = await tool.execute({}, dummyContext);

      expect(result.kind).toBe('student_telemetry');
      expect(result.choiceToggles.length).toBe(2);
      expect(result.choiceToggles[0].toChoice).toBe('b');
      expect(result.choiceToggles[1].toChoice).toBe('c');
      expect(result.stemRereadCount).toBe(1);
      expect(result.topicHistoricalAccuracy).toBe(0.42);
      expect(result.recentMistakeStreak).toBe(3);
    });
  });

  describe('Tool C: detect_cognitive_bias_trap', () => {
    const tool = new DetectCognitiveBiasTool();

    it('identifies premature closure when decision is too rapid without toggling', async () => {
      const result = await tool.execute(
        { candidateChoiceId: 'b', studentReasoningSnippet: 'Must be AS' },
        dummyContext
      );
      expect(result.detectedBias).toBe('premature_closure');
      expect(result.biasLabel).toBe('Premature Closure');
    });

    it('identifies availability heuristic when multiple choice toggles occur', async () => {
      questionTelemetryTracker.recordChoiceSelection('a');
      questionTelemetryTracker.recordChoiceSelection('b');
      questionTelemetryTracker.recordChoiceSelection('c');

      const result = await tool.execute(
        { candidateChoiceId: 'c' },
        dummyContext
      );
      expect(result.detectedBias).toBe('availability_heuristic');
      expect(result.biasLabel).toBe('Availability Heuristic');
    });
  });

  describe('Tool D: simulate_hemodynamic_pv_loop', () => {
    const tool = new SimulatePvLoopTool();

    it('simulates Aortic Stenosis with afterload elevation and high peak LV pressure', async () => {
      const result = await tool.execute({
        pathology: 'aortic_stenosis',
        chronicity: 'chronic_compensated',
      });

      expect(result.kind).toBe('pv_loop');
      expect(result.pathologyLabel).toBe('Aortic Stenosis');
      expect(result.pathologicParams.peakLvSystolicMmHg).toBe(195);
      expect(result.pathologicParams.afterloadShift).toBe('markedly_increased');
      expect(result.pathologicParams.strokeVolumeMl).toBeLessThan(result.normalParams.strokeVolumeMl);
    });

    it('simulates Aortic Regurgitation with absent isovolumetric relaxation and volume overload', async () => {
      const result = await tool.execute({
        pathology: 'aortic_regurg',
        chronicity: 'chronic_compensated',
      });

      expect(result.pathologicParams.edvMl).toBe(210);
      expect(result.pathologicParams.strokeVolumeMl).toBe(135);
      expect(result.pathologicParams.isovolumetricPhaseNote).toContain('NO true isovolumetric relaxation');
    });

    it('simulates Mitral Regurgitation with dual ejection and loss of isovolumetric contraction', async () => {
      const result = await tool.execute({
        pathology: 'mitral_regurg',
        chronicity: 'chronic_compensated',
      });

      expect(result.pathologicParams.ejectionFractionPct).toBe(77);
      expect(result.pathologicParams.isovolumetricPhaseNote).toContain('NO true isovolumetric contraction');
    });

    it('simulates HCM with hyperdynamic EF and diastolic stiffness', async () => {
      const result = await tool.execute({
        pathology: 'hcm',
        chronicity: 'chronic_compensated',
      });

      expect(result.pathologicParams.ejectionFractionPct).toBe(78);
      expect(result.pathologicParams.lvEdpMmHg).toBe(24);
      expect(result.pathologicParams.preloadShift).toBe('decreased');
    });
  });

  describe('Tool E: simulate_peer_cohort_difficulty', () => {
    const tool = new SimulatePeerCohortTool();

    it('calculates peer distribution percentage and flags primary distractor trap', async () => {
      const result = await tool.execute({}, dummyContext);

      expect(result.kind).toBe('peer_cohort');
      expect(result.difficultyLabel).toBe('High-Trap Hard');
      expect(result.overallAccuracyPct).toBe(44);
      expect(result.choiceDistributionPct['a']).toBe(44);
      expect(result.topTrapPercentage).toBeGreaterThan(20);
      expect(result.peerTrapExplanation).toContain('primary board trap');
    });
  });

  describe('Tool F: calculate_cardiovascular_equation', () => {
    const tool = new CalculateCvEquationTool();

    it('computes Mean Arterial Pressure (MAP) accurately', async () => {
      // SBP 120, DBP 80 -> MAP = 80 + (120 - 80)/3 = 93
      const result = await tool.execute({
        equation: 'map',
        sbpMmHg: 120,
        dbpMmHg: 80,
      });

      expect(result.kind).toBe('cv_equation');
      expect(result.equationId).toBe('map');
      expect(result.computedValue).toBe(93);
      expect(result.unit).toBe('mmHg');
      expect(result.hemodynamicInterpretation).toContain('Adequate organ perfusion');
    });

    it('computes Fick Cardiac Output accurately', async () => {
      // VO2 = 250 mL/min, CaO2 = 20 mL/dL, CvO2 = 15 mL/dL -> avDiff = 50 -> CO = 250 / 50 = 5.0 L/min
      const result = await tool.execute({
        equation: 'fick_co',
        vo2MlMin: 250,
        caO2MlDl: 20,
        cvO2MlDl: 15,
      });

      expect(result.computedValue).toBe(5);
      expect(result.unit).toBe('L/min');
      expect(result.hemodynamicInterpretation).toContain('Physiological resting cardiac output');
    });

    it('computes Systemic Vascular Resistance (SVR) accurately', async () => {
      // MAP 90, CVP 10, CO 4.0 -> SVR = 80 * (90 - 10) / 4.0 = 80 * 80 / 4 = 1600 dynes*sec/cm^5
      const result = await tool.execute({
        equation: 'svr',
        mapMmHg: 90,
        cvpMmHg: 10,
        coLMin: 4.0,
      });

      expect(result.computedValue).toBe(1600);
      expect(result.unit).toBe('dynes*sec/cm^5');
      expect(result.hemodynamicInterpretation).toContain('Elevated SVR reflecting compensatory neurohormonal vasoconstriction');
    });

    it('computes Gorlin Valve Area (AVA) accurately', async () => {
      // CO = 5 L/min (5000 mL/min), HR = 70, SEP = 0.30 sec, meanGradient = 64 mmHg (sqrt = 8)
      // Denom = 44.3 * 70 * 0.30 * 8 = 7442.4
      // AVA = 5000 / 7442.4 = 0.67 cm²
      const result = await tool.execute({
        equation: 'gorlin_ava',
        coLMin: 5.0,
        heartRateBpm: 70,
        systolicEjectionPeriodSec: 0.3,
        meanGradientMmHg: 64,
      });

      expect(result.computedValue).toBe(0.67);
      expect(result.unit).toBe('cm²');
      expect(result.hemodynamicInterpretation).toContain('Severe Aortic Stenosis');
    });
  });
});
