/**
 * Category 2: Clinical & Pathophysiological Modeling Tools (D, E, F)
 * Executed by the agent to generate interactive visual artifacts & exact formulas.
 */
import type { ChoiceId } from '../../model/types.ts';
import type {
  IAgentTool,
  PvLoopArgs,
  PvLoopSimulationResult,
  HemodynamicParameters,
  PeerCohortArgs,
  PeerCohortDifficultyResult,
  CardiovascularEquationArgs,
  CardiovascularEquationResult,
  ToolExecutionContext,
} from './toolTypes.ts';

/**
 * Tool D: simulate_hemodynamic_pv_loop
 */
export class SimulatePvLoopTool implements IAgentTool<PvLoopArgs, PvLoopSimulationResult> {
  readonly name = 'simulate_hemodynamic_pv_loop' as const;
  readonly visibility = 'artifact' as const;
  readonly description =
    'Generates a Pressure-Volume (P-V) loop hemodynamic simulation for valvular heart disease (Aortic Stenosis, Aortic Regurg, Mitral Stenosis, Mitral Regurg, HCM) contrasting normal vs pathological loops.';

  readonly jsonSchema = {
    type: 'object',
    properties: {
      pathology: {
        type: 'string',
        enum: ['aortic_stenosis', 'aortic_regurg', 'mitral_stenosis', 'mitral_regurg', 'hcm'],
        description: 'The specific valvular or myocardial pathology.',
      },
      chronicity: {
        type: 'string',
        enum: ['acute', 'chronic_compensated', 'chronic_decompensated'],
        description: 'Clinical stage and hemodynamic compensation state.',
      },
    },
    required: ['pathology', 'chronicity'],
    additionalProperties: false,
  };

  async execute(args: PvLoopArgs): Promise<PvLoopSimulationResult> {
    const normalParams: HemodynamicParameters = {
      edvMl: 120,
      esvMl: 50,
      strokeVolumeMl: 70,
      ejectionFractionPct: 58,
      peakLvSystolicMmHg: 120,
      lvEdpMmHg: 10,
      preloadShift: 'normal',
      afterloadShift: 'normal',
      isovolumetricPhaseNote: 'Normal distinct isovolumetric contraction & relaxation phases.',
    };

    let pathologicParams = { ...normalParams };
    let pathologyLabel = '';
    let clinicalSummary = '';

    switch (args.pathology) {
      case 'aortic_stenosis':
        pathologyLabel = 'Aortic Stenosis';
        pathologicParams = {
          edvMl: 125,
          esvMl: 65,
          strokeVolumeMl: 60,
          ejectionFractionPct: 48,
          peakLvSystolicMmHg: 195, // Massive systolic transvalvular gradient
          lvEdpMmHg: 18,
          preloadShift: 'normal',
          afterloadShift: 'markedly_increased',
          isovolumetricPhaseNote: 'Isovolumetric contraction preserved; huge peak systolic pressure required to open calcified valve.',
        };
        clinicalSummary =
          'Severe afterload elevation generates high intraventricular pressure with concentric LV hypertrophy, shifting the P-V loop upward and rightward.';
        break;

      case 'aortic_regurg':
        pathologyLabel = 'Aortic Regurgitation';
        pathologicParams = {
          edvMl: 210, // Massive volume overload
          esvMl: 75,
          strokeVolumeMl: 135, // Huge total stroke volume
          ejectionFractionPct: 64,
          peakLvSystolicMmHg: 160, // Wide pulse pressure
          lvEdpMmHg: 22,
          preloadShift: 'markedly_increased',
          afterloadShift: 'increased',
          isovolumetricPhaseNote: 'NO true isovolumetric relaxation phase: valve leaks retrograde throughout diastole.',
        };
        clinicalSummary =
          'Massive eccentric LV dilation accommodates retrograde regurgitant blood, shifting the P-V loop far rightward with widened total stroke volume.';
        break;

      case 'mitral_stenosis':
        pathologyLabel = 'Mitral Stenosis';
        pathologicParams = {
          edvMl: 85, // Impaired LV filling
          esvMl: 35,
          strokeVolumeMl: 50,
          ejectionFractionPct: 59,
          peakLvSystolicMmHg: 110,
          lvEdpMmHg: 6,
          preloadShift: 'decreased',
          afterloadShift: 'normal',
          isovolumetricPhaseNote: 'Impaired LV inflow restricts diastole, shrinking the overall loop area.',
        };
        clinicalSummary =
          'Impaired LV diastolic inflow causes elevated left atrial pressures and decreased LV preload, shifting the entire loop leftward with low stroke volume.';
        break;

      case 'mitral_regurg':
        pathologyLabel = 'Mitral Regurgitation';
        pathologicParams = {
          edvMl: 180,
          esvMl: 40,
          strokeVolumeMl: 140, // High total ejection (forward + backward)
          ejectionFractionPct: 77,
          peakLvSystolicMmHg: 125,
          lvEdpMmHg: 16,
          preloadShift: 'increased',
          afterloadShift: 'decreased',
          isovolumetricPhaseNote: 'NO true isovolumetric contraction: blood immediately ejects back into low-pressure LA upon LV systole.',
        };
        clinicalSummary =
          'Dual ejection into the low-pressure left atrium and aorta eliminates isovolumetric contraction, expanding the loop rightward and downward.';
        break;

      case 'hcm':
        pathologyLabel = 'Hypertrophic Cardiomyopathy (HCM)';
        pathologicParams = {
          edvMl: 90,
          esvMl: 20,
          strokeVolumeMl: 70,
          ejectionFractionPct: 78, // Hyperdynamic EF
          peakLvSystolicMmHg: 170, // Dynamic subaortic gradient
          lvEdpMmHg: 24, // Severe diastolic stiffness
          preloadShift: 'decreased',
          afterloadShift: 'increased',
          isovolumetricPhaseNote: 'Marked diastolic non-compliance elevates LV filling pressures with dynamic mid-systolic outflow obstruction.',
        };
        clinicalSummary =
          'Asymmetric septal hypertrophy causes profound diastolic stiffness and dynamic systolic anterior motion (SAM) of the mitral valve.';
        break;
    }

    return {
      kind: 'pv_loop',
      pathology: args.pathology,
      pathologyLabel,
      chronicity: args.chronicity,
      normalParams,
      pathologicParams,
      clinicalSummary,
    };
  }
}

/**
 * Tool E: simulate_peer_cohort_difficulty
 */
export class SimulatePeerCohortTool implements IAgentTool<PeerCohortArgs, PeerCohortDifficultyResult> {
  readonly name = 'simulate_peer_cohort_difficulty' as const;
  readonly visibility = 'artifact' as const;
  readonly description =
    'Retrieves cohort question difficulty and choice distribution percentage across peer medical students, highlighting the primary distractor trap.';

  readonly jsonSchema = {
    type: 'object',
    properties: {
      highlightChoiceId: {
        type: 'string',
        description: 'Specific choice letter to inspect peer selection percentage.',
      },
    },
    additionalProperties: false,
  };

  async execute(_args: PeerCohortArgs, ctx: ToolExecutionContext): Promise<PeerCohortDifficultyResult> {
    const q = ctx.activeQuestion;
    const isHard = q?.difficulty === 'hard';
    const isMedium = q?.difficulty === 'medium';

    const overallAccuracyPct = isHard ? 44 : isMedium ? 62 : 81;
    const difficultyLabel = isHard
      ? 'High-Trap Hard'
      : isMedium
      ? 'Moderate Board Level'
      : 'Core Foundation';

    // Formulate realistic peer distribution across choices
    const choices = q?.choices ?? [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
    const correctId = q?.correctChoiceId ?? 'a';

    const choiceDistributionPct: Record<string, number> = {};
    const remainingChoices = choices.filter((c: any) => c.id !== correctId);
    const topTrapChoice = remainingChoices[0]?.id ?? 'b';

    choiceDistributionPct[correctId] = overallAccuracyPct;
    const remainingPct = 100 - overallAccuracyPct;
    const topTrapPct = Math.round(remainingPct * 0.65);
    choiceDistributionPct[topTrapChoice] = topTrapPct;

    const othersCount = Math.max(1, choices.length - 2);
    const otherShare = Math.max(1, Math.floor((remainingPct - topTrapPct) / othersCount));
    for (const c of choices) {
      if (c.id !== correctId && c.id !== topTrapChoice) {
        choiceDistributionPct[c.id] = otherShare;
      }
    }

    return {
      kind: 'peer_cohort',
      overallAccuracyPct,
      difficultyLabel,
      choiceDistributionPct: choiceDistributionPct as Record<ChoiceId, number>,
      topTrapChoiceId: topTrapChoice,
      topTrapPercentage: topTrapPct,
      peerTrapExplanation: `Option ${topTrapChoice.toUpperCase()} is the primary board trap: students frequently confuse this pathology's hemodynamic maneuver response with aortic outflow murmurs.`,
    };
  }
}

/**
 * Tool F: calculate_cardiovascular_equation
 */
export class CalculateCvEquationTool
  implements IAgentTool<CardiovascularEquationArgs, CardiovascularEquationResult>
{
  readonly name = 'calculate_cardiovascular_equation' as const;
  readonly visibility = 'artifact' as const;
  readonly description =
    'Solves clinical cardiovascular equations (Mean Arterial Pressure, Fick Cardiac Output, Systemic Vascular Resistance, Gorlin Valve Area) with step-by-step substitution and normal reference ranges.';

  readonly jsonSchema = {
    type: 'object',
    properties: {
      equation: {
        type: 'string',
        enum: ['map', 'fick_co', 'svr', 'gorlin_ava'],
        description: 'Equation to compute.',
      },
      sbpMmHg: { type: 'number', description: 'Systolic blood pressure (mmHg) for MAP.' },
      dbpMmHg: { type: 'number', description: 'Diastolic blood pressure (mmHg) for MAP.' },
      vo2MlMin: { type: 'number', description: 'O2 consumption (mL/min) for Fick CO.' },
      caO2MlDl: { type: 'number', description: 'Arterial O2 content (mL/dL) for Fick CO.' },
      cvO2MlDl: { type: 'number', description: 'Venous O2 content (mL/dL) for Fick CO.' },
      mapMmHg: { type: 'number', description: 'Mean arterial pressure (mmHg) for SVR.' },
      cvpMmHg: { type: 'number', description: 'Central venous pressure (mmHg) for SVR.' },
      coLMin: { type: 'number', description: 'Cardiac output (L/min) for SVR or Gorlin.' },
      heartRateBpm: { type: 'number', description: 'Heart rate (bpm) for Gorlin AVA.' },
      systolicEjectionPeriodSec: { type: 'number', description: 'Systolic ejection period (sec) for Gorlin.' },
      meanGradientMmHg: { type: 'number', description: 'Mean transvalvular gradient (mmHg) for Gorlin.' },
    },
    required: ['equation'],
  };

  async execute(args: CardiovascularEquationArgs): Promise<CardiovascularEquationResult> {
    switch (args.equation) {
      case 'map': {
        const computedValue = Math.round(args.dbpMmHg + (args.sbpMmHg - args.dbpMmHg) / 3);
        return {
          kind: 'cv_equation',
          equationId: 'map',
          title: 'Mean Arterial Pressure (MAP)',
          formulaExpression: 'MAP = DBP + 1/3(SBP - DBP)',
          substitutionSteps: `MAP = ${args.dbpMmHg} + 1/3(${args.sbpMmHg} - ${args.dbpMmHg}) = ${args.dbpMmHg} + ${Math.round(((args.sbpMmHg - args.dbpMmHg) / 3) * 10) / 10}`,
          computedValue,
          unit: 'mmHg',
          referenceRange: '70 - 105 mmHg',
          hemodynamicInterpretation:
            computedValue >= 65
              ? 'Adequate organ perfusion pressure (MAP >= 65 mmHg).'
              : 'Sub-target perfusion pressure (< 65 mmHg): high risk for renal and cerebral hypoperfusion.',
        };
      }

      case 'fick_co': {
        // CO = VO2 / ((CaO2 - CvO2) * 10)
        const avDiff = (args.caO2MlDl - args.cvO2MlDl) * 10;
        const computedValue = Math.round((args.vo2MlMin / avDiff) * 100) / 100;
        return {
          kind: 'cv_equation',
          equationId: 'fick_co',
          title: 'Cardiac Output (Fick Principle)',
          formulaExpression: 'CO = VO2 / [(CaO2 - CvO2) * 10]',
          substitutionSteps: `CO = ${args.vo2MlMin} / [(${args.caO2MlDl} - ${args.cvO2MlDl}) * 10] = ${args.vo2MlMin} / ${avDiff}`,
          computedValue,
          unit: 'L/min',
          referenceRange: '4.0 - 8.0 L/min',
          hemodynamicInterpretation:
            computedValue < 4.0
              ? 'Low cardiac output state indicative of cardiogenic pump impairment or severe hypovolemia.'
              : 'Physiological resting cardiac output.',
        };
      }

      case 'svr': {
        // SVR = 80 * (MAP - CVP) / CO
        const computedValue = Math.round((80 * (args.mapMmHg - args.cvpMmHg)) / args.coLMin);
        return {
          kind: 'cv_equation',
          equationId: 'svr',
          title: 'Systemic Vascular Resistance (SVR)',
          formulaExpression: 'SVR = 80 * (MAP - CVP) / CO',
          substitutionSteps: `SVR = 80 * (${args.mapMmHg} - ${args.cvpMmHg}) / ${args.coLMin}`,
          computedValue,
          unit: 'dynes*sec/cm^5',
          referenceRange: '800 - 1200 dynes*sec/cm^5',
          hemodynamicInterpretation:
            computedValue > 1200
              ? 'Elevated SVR reflecting compensatory neurohormonal vasoconstriction (e.g. Cardiogenic Shock or Hypovolemia).'
              : computedValue < 800
              ? 'Low SVR reflecting distributive vasodilation (e.g. Septic / Anaphylactic Shock).'
              : 'Normal systemic vascular tone.',
        };
      }

      case 'gorlin_ava': {
        // AVA = CO / (44.3 * HR * SEP * sqrt(meanGradient))
        const coMlMin = args.coLMin * 1000;
        const denom = 44.3 * args.heartRateBpm * args.systolicEjectionPeriodSec * Math.sqrt(args.meanGradientMmHg);
        const computedValue = Math.round((coMlMin / denom) * 100) / 100;
        return {
          kind: 'cv_equation',
          equationId: 'gorlin_ava',
          title: 'Aortic Valve Area (Gorlin Equation)',
          formulaExpression: 'AVA = CO / [44.3 * HR * SEP * sqrt(meanGradient)]',
          substitutionSteps: `AVA = ${coMlMin} / [44.3 * ${args.heartRateBpm} * ${args.systolicEjectionPeriodSec} * sqrt(${args.meanGradientMmHg})]`,
          computedValue,
          unit: 'cm²',
          referenceRange: 'Normal: 3.0 - 4.0 cm² | Severe AS: < 1.0 cm²',
          hemodynamicInterpretation:
            computedValue <= 1.0
              ? 'Severe Aortic Stenosis (AVA <= 1.0 cm² or index < 0.6 cm²/m²): high indication for valve replacement if symptomatic.'
              : 'Moderate to mild aortic stenosis.',
        };
      }
    }
  }
}
