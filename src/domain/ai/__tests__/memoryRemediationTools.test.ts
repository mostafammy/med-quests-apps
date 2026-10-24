import { describe, it, expect } from 'vitest';
import {
  CreateSrsAnchorTool,
  FormulateMnemonicTool,
  PrescribeMicroCurriculumTool,
} from '../tools/memoryRemediationTools.ts';
import type { ToolExecutionContext } from '../tools/toolTypes.ts';

describe('Active Memory & Adaptive Remediation Tools (Tools G, H, I)', () => {
  const dummyContext: ToolExecutionContext = {
    activeQuestion: {
      id: 'q-as-01',
      topicId: 'valvular-heart-disease',
      chapterId: 'cardiovascular',
      concept: 'Aortic Stenosis vs HOCM Maneuver Differentiation',
    },
    safeContext: {
      kind: 'tutor',
      question: {} as any,
      disclosure: { state: 'revealed' },
      signals: {} as any,
    },
    questionsBank: [
      { id: 'q-as-02', topicId: 'valvular-heart-disease', chapterId: 'cardiovascular' },
      { id: 'q-as-03', topicId: 'valvular-heart-disease', chapterId: 'cardiovascular' },
      { id: 'q-as-04', topicId: 'valvular-heart-disease', chapterId: 'cardiovascular' },
    ],
  };

  describe('Tool G: create_spaced_repetition_anchor', () => {
    const tool = new CreateSrsAnchorTool();

    it('synthesizes active-recall flashcard payload with 24h initial SRS interval', async () => {
      const result = await tool.execute(
        {
          frontPrompt: 'What physical exam maneuver distinguishes HOCM from Aortic Stenosis?',
          backAnswer: 'Valsalva/Standing: Increases HOCM murmur intensity, decreases AS murmur.',
          highYieldTopicId: 'valvular-heart-disease',
          srsInitialIntervalDays: 1,
        },
        dummyContext
      );

      expect(result.kind).toBe('srs_card');
      expect(result.frontPrompt).toContain('HOCM');
      expect(result.backAnswer).toContain('Valsalva');
      expect(result.cardId).toMatch(/^srs-\d+/);
      expect(result.nextReviewAtIso).toBeDefined();
    });
  });

  describe('Tool H: formulate_clinical_memory_anchor', () => {
    const tool = new FormulateMnemonicTool();

    it('synthesizes letter-by-letter board mnemonic anchor', async () => {
      const result = await tool.execute({
        conceptTitle: 'Systolic vs Diastolic Murmurs',
        mnemonicToken: 'MR ASS',
        expansionMappings: [
          { letter: 'MR', meaning: 'Mitral Regurgitation' },
          { letter: 'AS', meaning: 'Aortic Stenosis' },
          { letter: 'S', meaning: 'Systolic Murmurs' },
        ],
        clinicalApplicationRule: 'Any murmur with MR or AS occurs during ventricular systole.',
      });

      expect(result.kind).toBe('mnemonic_anchor');
      expect(result.mnemonicToken).toBe('MR ASS');
      expect(result.expansionMappings.length).toBe(3);
      expect(result.clinicalApplicationRule).toContain('ventricular systole');
    });
  });

  describe('Tool I: prescribe_targeted_micro_curriculum', () => {
    const tool = new PrescribeMicroCurriculumTool();

    it('prescribes 3-step micro-curriculum with mechanism review and verified drill questions', async () => {
      const result = await tool.execute(
        {
          targetWeaknessTitle: 'Aortic Stenosis Afterload Hemodynamics',
          twoMinuteMechanismReview: 'Severe calcific AS produces a fixed mechanical obstruction, requiring high intraventricular pressure.',
          drillQuestionCount: 3,
          retestInHours: 48,
        },
        dummyContext
      );

      expect(result.kind).toBe('micro_curriculum');
      expect(result.targetWeaknessTitle).toContain('Aortic Stenosis');
      expect(result.selectedQuestionIds).toEqual(['q-as-02', 'q-as-03', 'q-as-04']);
      expect(result.retestScheduledAtIso).toBeDefined();
    });
  });
});
