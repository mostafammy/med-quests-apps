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
import { QuestionSchema, type Question } from '../../model/types.ts';

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

  it('executes Stage 06 Duplication Collision Analysis in pipeline and attaches qddVerdict to items', async () => {
    let capturedTelemetry: any = null;

    const existingBankQuestion: Question = {
      id: 'q-bank-exact-1',
      blockId: 'cvs',
      subjectId: 'anatomy',
      chapterId: 'cvs-ana-heart-dev',
      topicId: 'cvs-ana-heart-tube',
      concept: 'Aortic Dissection Emergency',
      type: 'single-best-answer',
      stem: 'A 45-year-old male presents with sudden-onset tearing chest pain radiating to his back. Blood pressure is 185/105 mmHg in the right arm and 140/90 mmHg in the left arm. A transesophageal echocardiogram demonstrates an intimal flap in the ascending aorta. What is the most appropriate definitive management?',
      choices: [
        { id: 'a', text: 'Urgent surgical repair of the ascending aorta', isCorrect: true, rationale: 'Open repair' },
        { id: 'b', text: 'Intravenous thrombolysis with alteplase', isCorrect: false, rationale: 'Contraindicated' },
        { id: 'c', text: 'Medical management with beta-blockers alone', isCorrect: false, rationale: 'Insufficient' },
        { id: 'd', text: 'Emergent percutaneous coronary intervention', isCorrect: false, rationale: 'Incorrect' },
      ],
      explanation: 'Stanford Type A dissection is a surgical emergency.',
      mnemonic: null,
      examTip: 'Urgent surgical repair',
      difficulty: 2,
      cognitiveLevel: 'application',
      highYield: true,
      origin: 'authored-grounded',
      evidence: [],
      status: 'active',
      bankVersion: 1,
    };

    const result = await agent.parseRawQuestions({
      rawText: SAMPLE_TEXT_WITH_KEY,
      providerId: 'gemini',
      modelId: 'gemini-2.5-flash',
      existingQuestions: [existingBankQuestion],
      onTelemetryUpdate: (telemetry) => {
        capturedTelemetry = telemetry;
      },
    });

    expect(result.totalParsed).toBe(1);
    const item = result.items[0];

    // Verdict must be directly attached
    expect(item.qddVerdict).toBeDefined();
    expect(item.qddVerdict?.relation).toBe('EXACT');
    expect(item.qddVerdict?.decision).toBe('BLOCK');
    expect(item.qddVerdict?.candidates.length).toBeGreaterThan(0);
    expect(item.qddVerdict?.candidates[0].matchedQuestionId).toBe('q-bank-exact-1');

    // Telemetry must have Stage 06: deduplication
    expect(capturedTelemetry).toBeDefined();
    const dedupStep = capturedTelemetry.steps.find((s: any) => s.id === 'deduplication');
    expect(dedupStep).toBeDefined();
    expect(dedupStep.status).toBe('completed');
    expect(dedupStep.toolName).toBe('QuestionDuplicationCollisionEngine');
    expect(dedupStep.detail).toContain('1 exact');
  });

  it('detects CONFLICT relation when stem matches an existing bank question but keyed answer differs', async () => {
    const existingBankQuestion: Question = {
      id: 'q-bank-conflict-1',
      blockId: 'cvs',
      subjectId: 'anatomy',
      chapterId: 'cvs-ana-heart-dev',
      topicId: 'cvs-ana-heart-tube',
      concept: 'Aortic Dissection Emergency',
      type: 'single-best-answer',
      stem: 'A 45-year-old male presents with sudden-onset tearing chest pain radiating to his back. Blood pressure is 185/105 mmHg in the right arm and 140/90 mmHg in the left arm. A transesophageal echocardiogram demonstrates an intimal flap in the ascending aorta. What is the most appropriate definitive management?',
      choices: [
        { id: 'a', text: 'Urgent surgical repair of the ascending aorta', isCorrect: false, rationale: 'Option A' },
        { id: 'b', text: 'Intravenous thrombolysis with alteplase', isCorrect: true, rationale: 'Keyed as B in bank' },
        { id: 'c', text: 'Medical management with beta-blockers alone', isCorrect: false, rationale: 'Option C' },
        { id: 'd', text: 'Emergent percutaneous coronary intervention', isCorrect: false, rationale: 'Option D' },
      ],
      explanation: 'Bank explanation.',
      mnemonic: null,
      examTip: 'Tip',
      difficulty: 2,
      cognitiveLevel: 'application',
      highYield: true,
      origin: 'authored-grounded',
      evidence: [],
      status: 'active',
      bankVersion: 1,
    };

    const result = await agent.parseRawQuestions({
      rawText: SAMPLE_TEXT_WITH_KEY, // Has Answer: A
      providerId: 'gemini',
      modelId: 'gemini-2.5-flash',
      existingQuestions: [existingBankQuestion], // Bank has Answer: B
    });

    const item = result.items[0];
    expect(item.qddVerdict).toBeDefined();
    expect(item.qddVerdict?.relation).toBe('CONFLICT');
    expect(item.qddVerdict?.decision).toBe('REVIEW');
    expect(item.qddVerdict?.candidates[0].matchedQuestionId).toBe('q-bank-conflict-1');
  });

  it('preserves numbered stems (e.g. "1. Prior infection with GAS...") without shifting stem into Choice A, deduces Choice D, and detects EXACT duplicate', async () => {
    const gasQuestionInBank: Question = {
      id: 'q-parsed-1701987600000-1',
      blockId: 'cvs',
      subjectId: 'microbiology',
      chapterId: 'cvs-mic-rheumatic-fever',
      topicId: 'cvs-mic-rheumatic-fever/clinical-review',
      concept: 'Acute Rheumatic Fever Serology',
      type: 'single-best-answer',
      stem: 'Prior infection with GAS can be demonstrated in patients with acute rheumatic fever by which one of the following?',
      choices: [
        { id: 'a', text: 'Blood culture.', isCorrect: false, rationale: 'Blood cultures are negative.' },
        { id: 'b', text: 'Culture of a heart valve in a patient with carditis.', isCorrect: false, rationale: 'Valve cultures are negative.' },
        { id: 'c', text: 'A high titer of antibody against the hyaluronic acid capsule.', isCorrect: false, rationale: 'Hyaluronic acid capsule is non-immunogenic.' },
        { id: 'd', text: 'A high titer of antibody against streptolysin O.', isCorrect: true, rationale: 'ASO titer confirms preceding GAS infection.' },
      ],
      explanation: 'ASO titer confirms preceding GAS infection.',
      mnemonic: null,
      examTip: 'ASO is confirmatory.',
      difficulty: 2,
      cognitiveLevel: 'understanding',
      highYield: true,
      origin: 'authored-grounded',
      evidence: [],
      status: 'active',
      bankVersion: 1,
    };

    const numberedRawInput = `1. Prior infection with GAS can be demonstrated in patients with acute rheumatic fever by which one of the following?
A. Blood culture.
B. Culture of a heart valve in a patient with carditis.
C. A high titer of antibody against the hyaluronic acid capsule.
D. A high titer of antibody against streptolysin O.`;

    const result = await agent.parseRawQuestions({
      rawText: numberedRawInput,
      providerId: 'gemini',
      modelId: 'gemini-2.5-flash',
      existingQuestions: [gasQuestionInBank],
    });

    expect(result.items).toHaveLength(1);
    const item = result.items[0];

    // Stem must NOT be replaced with "Clinical scenario regarding..." or shifted into Choice A
    expect(item.question.stem).toBe(
      'Prior infection with GAS can be demonstrated in patients with acute rheumatic fever by which one of the following?'
    );
    expect(item.question.choices[0].text).toBe('Blood culture.');
    expect(item.question.choices[1].text).toBe('Culture of a heart valve in a patient with carditis.');
    expect(item.question.choices[2].text).toBe('A high titer of antibody against the hyaluronic acid capsule.');
    expect(item.question.choices[3].text).toBe('A high titer of antibody against streptolysin O.');
    expect(item.selectedCorrectChoiceId).toBe('d');
    expect(item.question.choices[3].isCorrect).toBe(true);

    // Must be flagged as EXACT duplicate of q-parsed-1701987600000-1
    expect(item.qddVerdict).toBeDefined();
    expect(item.qddVerdict?.relation).toBe('EXACT');
    expect(item.qddVerdict?.decision).toBe('BLOCK');
    expect(item.qddVerdict?.candidates[0].matchedQuestionId).toBe('q-parsed-1701987600000-1');
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
    expect(prompt).toContain('Target Block');
    expect(prompt).toContain('Cardiovascular System');
    expect(prompt).toContain('Target Subject');
    expect(prompt).toContain('Target Chapter');
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
      modelId: 'nvidia/nemotron-3.5-super-vl:free',
    });

    const batchPrompt = CrossModelVerificationPromptBuilder.buildBatchQuestionsPrompt(
      result.items,
      'Cardiovascular Mid-Term Board Audit'
    );

    expect(batchPrompt).toContain('Cardiovascular Mid-Term Board Audit (2 Items)');
    expect(batchPrompt).toContain('Question 1 of 2');
    expect(batchPrompt).toContain('Question 2 of 2');
    expect(batchPrompt).toContain('Block: Cardiovascular System');
    expect(batchPrompt).toContain('Subject:');
    expect(batchPrompt).toContain('Chapter:');
    expect(batchPrompt).toContain('Expected Output Format Per Item');
  });

  it('correctly executes injected cloud LLM provider and parses structured medical output', async () => {
    const mockProvider = {
      providerId: 'gemini' as const,
      modelId: 'gemini-2.5-pro',
      async *streamTurn() {
        yield {
          type: 'text',
          delta: JSON.stringify({
            items: [
              {
                tempId: 'mock-item-1',
                rawInputExcerpt: 'Patient with crescendo-decrescendo murmur...',
                wasAnswerKeyProvidedInInput: false,
                aiGeneratedAnswerKey: true,
                selectedCorrectChoiceId: 'b',
                confidenceScore: 99,
                warnings: ['⚠️ Answer Key was missing in raw text: AI solved the clinical scenario.'],
                question: {
                  id: 'q-parsed-mock-01',
                  blockId: 'cvs',
                  subjectId: 'physiology',
                  chapterId: 'cvs-phys-valvular',
                  topicId: 'cvs-phys-valvular/aortic-stenosis',
                  concept: 'Aortic Stenosis Hemodynamics',
                  type: 'single-best-answer',
                  stem: 'A 68-year-old male presents with exertional syncope. Cardiac auscultation demonstrates a harsh crescendo-decrescendo systolic murmur at the right upper sternal border. Which of the following is the most likely diagnosis?',
                  choices: [
                    { id: 'a', text: 'Mitral regurgitation', isCorrect: false, rationale: 'Holosystolic murmur at apex.' },
                    { id: 'b', text: 'Aortic stenosis', isCorrect: true, rationale: 'Classic presentation of severe AS.' },
                    { id: 'c', text: 'Tricuspid regurgitation', isCorrect: false, rationale: 'Murmur increases with inspiration.' },
                    { id: 'd', text: 'Aortic regurgitation', isCorrect: false, rationale: 'Early diastolic decrescendo murmur.' },
                  ],
                  explanation: 'Aortic stenosis classically presents with exertional angina, syncope, and dyspnea (SAD triad).',
                  examTip: 'Right 2nd intercostal space murmur radiating to the carotids is pathognomonic for aortic stenosis.',
                  mnemonic: 'SAD: Syncope, Angina, Dyspnea',
                  difficulty: 2,
                  cognitiveLevel: 'application',
                  highYield: true,
                  origin: 'authored-grounded',
                  evidence: [
                    {
                      chunkId: 'chunk-test-1',
                      sourceName: 'Guyton and Hall Medical Physiology',
                      location: 'Chapter 23: Heart Valves and Heart Sounds',
                      quote: 'Aortic valve stenosis causes high left ventricular systolic pressure and systolic ejection murmur.',
                      kind: 'text',
                    },
                  ],
                  status: 'active',
                  bankVersion: 1,
                },
              },
            ],
          }),
        };
      },
    };

    const cloudAgent = new QuestionParsingAgent(mockProvider);
    const result = await cloudAgent.parseRawQuestions({
      rawText: 'Patient with crescendo-decrescendo murmur...',
      providerId: 'gemini',
      modelId: 'gemini-2.5-pro',
    });

    expect(result.totalParsed).toBe(1);
    expect(result.items[0].question.concept).toBe('Aortic Stenosis Hemodynamics');
    expect(result.items[0].selectedCorrectChoiceId).toBe('b');
    expect(result.items[0].aiGeneratedAnswerKey).toBe(true);
    expect(result.items[0].question.choices[1].isCorrect).toBe(true);
  });
});
