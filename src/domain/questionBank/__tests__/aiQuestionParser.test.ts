/**
 * Unit & Integration Test Suite: AI Question Ingestion & Anti-Hallucination Studio
 * Verifies:
 * - Parsing unstructured text into canonical Single-Best-Answer Question objects
 * - Detecting explicit answer keys vs inferring missing answer keys
 * - Generating distractor rationales and curriculum evidence
 * - Building board-standard cross-model verification prompts for external LLM evaluation
 */

import { describe, it, expect } from 'vitest';
import { QuestionParsingAgent } from '../aiQuestionParser/QuestionParsingAgent.ts';
import { CrossModelVerificationPromptBuilder } from '../aiQuestionParser/CrossModelVerificationPromptBuilder.ts';
import { QuestionSchema } from '../../model/types.ts';

const SAMPLE_TEXT_WITH_KEY = `
Question 1:
A 45-year-old male presents with sudden-onset tearing chest pain radiating to his back. Blood pressure is 185/105 mmHg in the right arm and 140/90 mmHg in the left arm. A transesophageal echocardiogram demonstrates an intimal flap in the ascending aorta. What is the most appropriate definitive management?
A. Urgent surgical repair of the ascending aorta
B. Intravenous thrombolysis with alteplase
C. Medical management with beta-blockers alone
D. Emergent percutaneous coronary intervention
Answer: A
Explanation: Stanford Type A aortic dissection involves the ascending aorta and represents a surgical emergency requiring urgent open repair to prevent cardiac tamponade or rupture.
`;

const SAMPLE_TEXT_WITHOUT_KEY = `
Item 2:
Which of the following cardiac chambers forms the apex of the anatomical heart?
A. Right atrium
B. Right ventricle
C. Left ventricle
D. Left atrium
`;

describe('QuestionParsingAgent (AI Ingestion & Normalization)', () => {
  const agent = new QuestionParsingAgent();

  it('correctly parses raw text with an explicit answer key and flags author-verified key', async () => {
    const result = await agent.parseRawQuestions({
      rawText: SAMPLE_TEXT_WITH_KEY,
      providerId: 'gemini',
      modelId: 'gemini-2.5-flash',
    });

    expect(result.totalParsed).toBe(1);
    expect(result.totalMissingAnswerKeys).toBe(0);

    const item = result.items[0];
    expect(item.wasAnswerKeyProvidedInInput).toBe(true);
    expect(item.aiGeneratedAnswerKey).toBe(false);
    expect(item.selectedCorrectChoiceId).toBe('a');

    // Schema validation
    const parsedQuestion = item.question;
    expect(QuestionSchema.safeParse(parsedQuestion).success).toBe(true);
    expect(parsedQuestion.choices.length).toBe(4);
    expect(parsedQuestion.choices.find((c) => c.isCorrect)?.id).toBe('a');
  });

  it('detects missing answer key, infers the single best answer, and sets warning flags', async () => {
    const result = await agent.parseRawQuestions({
      rawText: SAMPLE_TEXT_WITHOUT_KEY,
      providerId: 'groq',
      modelId: 'openai/gpt-oss-120b',
    });

    expect(result.totalParsed).toBe(1);
    expect(result.totalMissingAnswerKeys).toBe(1);

    const item = result.items[0];
    expect(item.wasAnswerKeyProvidedInInput).toBe(false);
    expect(item.aiGeneratedAnswerKey).toBe(true);
    expect(item.warnings.length).toBeGreaterThan(0);
    expect(item.warnings[0]).toContain('Answer Key was missing');

    // Check choice structure and rationales
    expect(item.question.choices.length).toBe(4);
    expect(item.question.choices.every((c) => c.rationale.length > 5)).toBe(true);
    expect(QuestionSchema.safeParse(item.question).success).toBe(true);
  });

  it('parses multiple questions in a single multi-question block', async () => {
    const multiText = `${SAMPLE_TEXT_WITH_KEY}\n\n${SAMPLE_TEXT_WITHOUT_KEY}`;
    const result = await agent.parseRawQuestions({
      rawText: multiText,
      providerId: 'gemini',
      modelId: 'gemini-2.5-flash',
    });

    expect(result.totalParsed).toBe(2);
    expect(result.items[0].wasAnswerKeyProvidedInInput).toBe(true);
    expect(result.items[1].wasAnswerKeyProvidedInInput).toBe(false);
  });
});

describe('CrossModelVerificationPromptBuilder (External LLM Cross-Examination)', () => {
  const agent = new QuestionParsingAgent();

  it('generates a comprehensive single-question verification prompt with anti-hallucination instructions', async () => {
    const result = await agent.parseRawQuestions({
      rawText: SAMPLE_TEXT_WITHOUT_KEY,
      providerId: 'gemini',
      modelId: 'gemini-2.5-flash',
    });

    const item = result.items[0];
    const prompt = CrossModelVerificationPromptBuilder.buildSingleQuestionPrompt(item);

    expect(prompt).toContain('Medical Board Examination Item Cross-Validation Request');
    expect(prompt).toContain('Do NOT assume the provided answer key is correct');
    expect(prompt).toContain(item.question.stem);
    expect(prompt).toContain('AI inferred this option'); // Alert for missing key
    expect(prompt).toContain('Independent Clinical Solution');
  });

  it('generates an aggregated batch verification prompt for multi-question audits', async () => {
    const multiText = `${SAMPLE_TEXT_WITH_KEY}\n\n${SAMPLE_TEXT_WITHOUT_KEY}`;
    const result = await agent.parseRawQuestions({
      rawText: multiText,
      providerId: 'openrouter',
      modelId: 'anthropic/claude-3.7-sonnet',
    });

    const batchPrompt = CrossModelVerificationPromptBuilder.buildBatchQuestionsPrompt(
      result.items,
      'Cardiovascular Mid-Term Board Audit'
    );

    expect(batchPrompt).toContain('Cardiovascular Mid-Term Board Audit (2 Items)');
    expect(batchPrompt).toContain('Question 1 of 2');
    expect(batchPrompt).toContain('Question 2 of 2');
    expect(batchPrompt).toContain('Expected Output Format Per Item');
  });
});
