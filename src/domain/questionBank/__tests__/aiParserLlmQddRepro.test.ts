import { describe, it, expect } from 'vitest';
import { QuestionParsingAgent } from '../aiQuestionParser/QuestionParsingAgent.ts';
import type { Question } from '../../model/types.ts';

const GAS_STEM =
  'Prior infection with GAS can be demonstrated in patients with acute rheumatic fever by which one of the following?';

const bankGas: Question = {
  id: 'q-parsed-1701987600000-1',
  blockId: 'cvs',
  subjectId: 'microbiology',
  chapterId: 'cvs-mic-rheumatic-fever',
  topicId: 'cvs-mic-rheumatic-fever/clinical-review',
  concept: 'ARF Serology',
  type: 'single-best-answer',
  stem: GAS_STEM,
  choices: [
    { id: 'a', text: 'Blood culture.', isCorrect: false, rationale: 'x' },
    { id: 'b', text: 'Culture of a heart valve in a patient with carditis.', isCorrect: false, rationale: 'x' },
    { id: 'c', text: 'A high titer of antibody against the hyaluronic acid capsule.', isCorrect: false, rationale: 'x' },
    { id: 'd', text: 'A high titer of antibody against streptolysin O.', isCorrect: true, rationale: 'x' },
  ],
  explanation: 'ASO titer confirms preceding GAS infection.',
  mnemonic: null,
  examTip: 'ASO',
  difficulty: 2,
  cognitiveLevel: 'understanding',
  highYield: true,
  origin: 'authored-grounded',
  evidence: [],
  status: 'active',
  bankVersion: 1,
};

const RAW = `1. ${GAS_STEM}
A. Blood culture.
B. Culture of a heart valve in a patient with carditis.
C. A high titer of antibody against the hyaluronic acid capsule.
D. A high titer of antibody against streptolysin O.`;

/** Gemini-like output with typical schema defects (empty rationale, short quote, string difficulty). */
function makeSloppyProvider() {
  return {
    providerId: 'gemini' as const,
    modelId: 'gemini-2.5-flash',
    async *streamTurn() {
      yield {
        type: 'text',
        delta: JSON.stringify({
          items: [
            {
              wasAnswerKeyProvidedInInput: false,
              aiGeneratedAnswerKey: true,
              selectedCorrectChoiceId: 'd',
              question: {
                subjectId: 'microbiology',
                chapterId: 'cvs-mic-rheumatic-fever',
                topicId: 'x',
                concept: 'ARF',
                stem: GAS_STEM,
                choices: [
                  { id: 'a', text: 'Blood culture.', isCorrect: false, rationale: '' },
                  { id: 'b', text: 'Culture of a heart valve in a patient with carditis.', isCorrect: false },
                  { id: 'c', text: 'A high titer of antibody against the hyaluronic acid capsule.', isCorrect: false, rationale: 'no' },
                  { id: 'd', text: 'A high titer of antibody against streptolysin O.', isCorrect: true, rationale: 'ASO' },
                ],
                explanation: 'ASO confirms GAS.',
                difficulty: '2',
                cognitiveLevel: 'Recall',
                evidence: [{ chunkId: 'c', sourceName: 's', location: 'l', quote: 'ASO', kind: 'text' }],
              },
            },
          ],
        }),
      };
    },
  };
}

describe('LLM path → QDD (regression for silent "1 unique")', () => {
  it('flags EXACT even when LLM JSON violates QuestionSchema', async () => {
    const agent = new QuestionParsingAgent(makeSloppyProvider());
    let telemetry: any;
    const result = await agent.parseRawQuestions({
      rawText: RAW,
      providerId: 'gemini',
      modelId: 'gemini-2.5-flash',
      existingQuestions: [bankGas],
      onTelemetryUpdate: (t) => (telemetry = t),
    });

    const item = result.items[0];
    expect(item.question.stem).toBe(GAS_STEM);
    expect(item.qddVerdict?.relation).toBe('EXACT');
    expect(item.qddVerdict?.candidates[0].matchedQuestionId).toBe('q-parsed-1701987600000-1');
    const dedup = telemetry.steps.find((s: any) => s.id === 'deduplication');
    expect(dedup.detail).toContain('1 exact');
  });
});
