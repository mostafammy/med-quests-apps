import { describe, it, expect } from 'vitest';
import {
  QuestionAiPromptBuilder,
  GOLD_STANDARD_EXAMPLE_QUESTION,
} from '../questionAiPromptBuilder.ts';
import { QuestionSchema } from '../../model/types.ts';
import { ZodStructureQualityRule, SingleCorrectChoiceRule, ClinicalEvidenceGroundingRule } from '../qualityGatePipeline.ts';

describe('QuestionAiPromptBuilder Domain Service', () => {
  it('gold standard example question passes QuestionSchema and all clinical quality gate rules', () => {
    // 1. Zod schema validation
    const zodResult = QuestionSchema.safeParse(GOLD_STANDARD_EXAMPLE_QUESTION);
    expect(zodResult.success).toBe(true);

    const zodRule = new ZodStructureQualityRule();
    const zodRuleResult = zodRule.validate(GOLD_STANDARD_EXAMPLE_QUESTION as any, 0);
    expect(zodRuleResult.ok).toBe(true);

    // 2. Single correct choice rule
    const sbaRule = new SingleCorrectChoiceRule();
    const sbaResult = sbaRule.validate(GOLD_STANDARD_EXAMPLE_QUESTION as any, 0);
    expect(sbaResult.ok).toBe(true);

    // 3. Clinical evidence grounding rule
    const evidenceRule = new ClinicalEvidenceGroundingRule();
    const evidenceResult = evidenceRule.validate(GOLD_STANDARD_EXAMPLE_QUESTION as any, 0);
    expect(evidenceResult.ok).toBe(true);
  });

  it('builds a prompt for format_existing mode with subject and chapter context', () => {
    const prompt = QuestionAiPromptBuilder.buildPrompt({
      mode: 'format_existing',
      subjectId: 'anatomy',
      chapterId: 'cvs-ana-heart-dev',
      difficulty: 2,
      customFocus: 'Focus on cardiac looping and septation',
    });

    expect(prompt).toContain('TARGET CURRICULUM CONTEXT:');
    expect(prompt).toContain('CVS Anatomy & Embryology (anatomy)');
    expect(prompt).toContain('Development of the Heart (cvs-ana-heart-dev)');
    expect(prompt).toContain('Level 2 (Clinical Vignette / Application)');
    expect(prompt).toContain('Focus on cardiac looping and septation');
    expect(prompt).toContain('EXACT JSON SCHEMA DEFINITION');
    expect(prompt).toContain('[PASTE YOUR RAW QUESTIONS OR EXAM DRAFT HERE]');
  });

  it('builds a prompt for generate_new mode with target question count', () => {
    const prompt = QuestionAiPromptBuilder.buildPrompt({
      mode: 'generate_new',
      subjectId: 'microbiology',
      chapterId: 'cvs-mic-infective-endocarditis',
      difficulty: 3,
      questionCount: 5,
    });

    expect(prompt).toContain('author 5 original, high-yield');
    expect(prompt).toContain('CVS Microbiology (microbiology)');
    expect(prompt).toContain('Infective Endocarditis (L2) (cvs-mic-infective-endocarditis)');
    expect(prompt).toContain('Level 3 (Complex Multi-step Pathophysiology)');
    expect(prompt).toContain('REFERENCE JSON FORMAT (1-SHOT EXAMPLE)');
  });

  it('builds schema only JSON reference', () => {
    const schemaRef = QuestionAiPromptBuilder.buildPrompt({ mode: 'schema_only' });
    const parsed = JSON.parse(schemaRef);
    expect(parsed.id).toBe('q-cvs-ana-0042');
    expect(parsed.choices).toHaveLength(4);
  });
});
