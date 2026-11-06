import { describe, it, expect } from 'vitest';
import { QuestionParsingAgent } from '../aiQuestionParser/QuestionParsingAgent.ts';
import { edgeQuestionBankGateway } from '../../../infrastructure/questionBank/edgeQuestionBankGateway.ts';
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
    { id: 'a', text: 'Blood culture.', isCorrect: false, rationale: 'Incorrect distractor choice.' },
    { id: 'b', text: 'Culture of a heart valve in a patient with carditis.', isCorrect: false, rationale: 'Incorrect distractor choice.' },
    { id: 'c', text: 'A high titer of antibody against the hyaluronic acid capsule.', isCorrect: false, rationale: 'Capsule is non-immunogenic.' },
    { id: 'd', text: 'A high titer of antibody against streptolysin O.', isCorrect: true, rationale: 'ASO titer confirms preceding GAS infection.' },
  ],
  explanation: 'ASO titer confirms preceding GAS infection.',
  mnemonic: null,
  examTip: 'ASO',
  difficulty: 2,
  cognitiveLevel: 'understanding',
  highYield: true,
  origin: 'authored-grounded',
  evidence: [
    {
      chunkId: 'chunk-gas-1',
      sourceName: 'Jawetz Medical Microbiology',
      location: 'Chapter 14',
      quote: 'Anti-streptolysin O (ASO) titers demonstrate prior Group A Streptococcus infection in acute rheumatic fever.',
      kind: 'text',
    },
  ],
  status: 'active',
  bankVersion: 1,
};

const RAW = `1. ${GAS_STEM}
A. Blood culture.
B. Culture of a heart valve in a patient with carditis.
C. A high titer of antibody against the hyaluronic acid capsule.
D. A high titer of antibody against streptolysin O.`;

/** Gemini-like output with typical schema defects AND the colliding placeholder id "q-parsed-1701987600000-1". */
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
                id: 'q-parsed-1701987600000-1',
                blockId: 'block-206',
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
  it('flags EXACT even when LLM JSON reuses colliding placeholder ID "q-parsed-1701987600000-1" and violates QuestionSchema', async () => {
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
    expect(item.question.id).not.toBe('q-parsed-1701987600000-1');
    expect(item.question.stem).toBe(GAS_STEM);
    expect(item.qddVerdict?.relation).toBe('EXACT');
    expect(item.qddVerdict?.decision).toBe('BLOCK');
    expect(item.qddVerdict?.candidates[0].matchedQuestionId).toBe('q-parsed-1701987600000-1');
    const dedup = telemetry.steps.find((s: any) => s.id === 'deduplication');
    expect(dedup.detail).toContain('1 exact');
  });

  it('flags EXACT when bank question choices lack trailing periods ("Blood culture" vs "Blood culture.")', async () => {
    const bankWithoutPeriods: Question = {
      ...bankGas,
      id: 'q-bank-no-periods',
      choices: bankGas.choices.map((c) => ({ ...c, text: c.text.replace(/\.$/, '') })),
    };

    const agent = new QuestionParsingAgent(makeSloppyProvider());
    const result = await agent.parseRawQuestions({
      rawText: RAW,
      providerId: 'gemini',
      modelId: 'gemini-2.5-flash',
      existingQuestions: [bankWithoutPeriods],
    });

    expect(result.items[0].qddVerdict?.relation).toBe('EXACT');
    expect(result.items[0].qddVerdict?.decision).toBe('BLOCK');
    expect(result.items[0].qddVerdict?.candidates[0].matchedQuestionId).toBe('q-bank-no-periods');
  });

  it('flags duplicate even if local bank question was saved earlier with legacy stem-shift ("Clinical scenario regarding...")', async () => {
    const legacyCorruptedBankQuestion: Question = {
      ...bankGas,
      id: 'q-legacy-corrupted-gas',
      stem: 'Clinical scenario regarding Cardiovascular MICROBIOLOGY Clinical Assessment:',
      choices: [
        { id: 'a', text: `1. ${GAS_STEM}`, isCorrect: true, rationale: 'shifted' },
        { id: 'b', text: 'Blood culture.', isCorrect: false, rationale: 'x' },
        { id: 'c', text: 'Culture of a heart valve in a patient with carditis.', isCorrect: false, rationale: 'x' },
        { id: 'd', text: 'A high titer of antibody against streptolysin O.', isCorrect: false, rationale: 'x' },
      ],
    };

    const agent = new QuestionParsingAgent(makeSloppyProvider());
    const result = await agent.parseRawQuestions({
      rawText: RAW,
      providerId: 'gemini',
      modelId: 'gemini-2.5-flash',
      existingQuestions: [legacyCorruptedBankQuestion],
    });

    expect(['EXACT', 'NEAR']).toContain(result.items[0].qddVerdict?.relation);
    expect(result.items[0].qddVerdict?.candidates[0].matchedQuestionId).toBe('q-legacy-corrupted-gas');
  });

  it('automatically discovers questions stored in edgeQuestionBankGateway local canonical bank even when existingQuestions is omitted', async () => {
    await edgeQuestionBankGateway.createCanonicalQuestions({
      questions: [bankGas],
      actorId: 'admin-1',
      actorDisplayName: 'Admin',
      actorRole: 'admin',
    });

    const agent = new QuestionParsingAgent(makeSloppyProvider());
    const result = await agent.parseRawQuestions({
      rawText: RAW,
      providerId: 'gemini',
      modelId: 'gemini-2.5-flash',
      existingQuestions: [],
    });

    expect(result.items[0].qddVerdict?.relation).toBe('EXACT');
    expect(result.items[0].qddVerdict?.decision).toBe('BLOCK');
    expect(result.items[0].qddVerdict?.candidates[0].matchedQuestionId).toBe('q-parsed-1701987600000-1');
  });

  it('delays commit by unselecting duplicate items and blocks direct commit if duplicate is selected', async () => {
    const { useAdminAiQuestionParserStore } = await import('../../../application/stores/useAdminAiQuestionParserStore.ts');
    const { useAuthStore } = await import('../../../application/stores/useAuthStore.ts');
    const { useBankGovernanceStore } = await import('../../../application/stores/useBankGovernanceStore.ts');

    useAuthStore.setState({
      authState: {
        status: 'authenticated-active',
        user: { id: 'admin-1', displayName: 'Admin Editor', role: 'admin' },
      } as any,
    });

    // Seed bank with bankGas
    await edgeQuestionBankGateway.createCanonicalQuestions({
      questions: [bankGas],
      actorId: 'admin-1',
      actorDisplayName: 'Admin Editor',
      actorRole: 'admin',
    });

    const store = useAdminAiQuestionParserStore.getState();
    store.clearParsedQuestions();
    useAdminAiQuestionParserStore.setState({
      rawInputText: RAW,
      selectedProvider: 'gemini',
      selectedModelId: 'gemini-2.5-flash',
    });

    // Parse the duplicate question
    await useAdminAiQuestionParserStore.getState().parseRawQuestions();

    const stateAfterParse = useAdminAiQuestionParserStore.getState();
    expect(stateAfterParse.parsedQuestions.length).toBe(1);
    expect(stateAfterParse.parsedQuestions[0].qddVerdict?.relation).toBe('EXACT');

    // 1. DUPLICATE IS NOT SELECTED BY DEFAULT (delayed from direct commit)
    expect(stateAfterParse.selectedTempIds.size).toBe(0);

    // 2. If manually selected and commit attempted, DIRECT COMMIT IS BLOCKED
    useAdminAiQuestionParserStore.getState().toggleQuestionSelection(stateAfterParse.parsedQuestions[0].tempId);
    expect(useAdminAiQuestionParserStore.getState().selectedTempIds.size).toBe(1);

    const commitSuccess = await useAdminAiQuestionParserStore.getState().commitToGlobalQuestionBank(true);
    expect(commitSuccess).toBe(false);
    expect(useAdminAiQuestionParserStore.getState().commitFeedback?.type).toBe('error');
    expect(useAdminAiQuestionParserStore.getState().commitFeedback?.message).toContain('Direct commit blocked');

    // 3. SEND TO APPROVAL QUEUE routes the duplicate to the Governance Review Queue
    const routeSuccess = await useAdminAiQuestionParserStore.getState().sendToApprovalQueue();
    expect(routeSuccess).toBe(true);
    expect(useAdminAiQuestionParserStore.getState().parsedQuestions.length).toBe(0);
    expect(useAdminAiQuestionParserStore.getState().commitFeedback?.type).toBe('success');
    expect(useAdminAiQuestionParserStore.getState().commitFeedback?.message).toContain('routed 1 duplicate question');

    // Verify it appeared in Bank Governance review queue
    const govQueue = useBankGovernanceStore.getState().reviewQueue;
    expect(govQueue.length).toBeGreaterThan(0);
  });

  it('correctly handles viral myocarditis question with trailing "E. ST elevation on ECG" without false CONFLICT', async () => {
    const MYOCARDITIS_STEM =
      'Which of the following findings would most strongly support the diagnosis of viral myocarditis over bacterial myocarditis?';

    const bankMyocarditis: Question = {
      id: 'q-parsed-1701010101001-1',
      blockId: 'cvs',
      subjectId: 'pathology',
      chapterId: 'cvs-pat-myocarditis',
      topicId: 'cvs-pat-myocarditis/clinical-review',
      concept: 'Viral Myocarditis Diagnosis',
      type: 'single-best-answer',
      stem: MYOCARDITIS_STEM,
      choices: [
        { id: 'a', text: 'Presence of pericardial effusion', isCorrect: false, rationale: 'Non-specific finding.' },
        { id: 'b', text: 'Positive blood cultures', isCorrect: false, rationale: 'Supports bacterial etiology.' },
        { id: 'c', text: 'Elevated CRP and leukocytosis', isCorrect: false, rationale: 'Non-specific inflammatory markers.' },
        { id: 'd', text: 'PCR detection of viral RNA in serum', isCorrect: true, rationale: 'Confirms viral etiology.' },
      ],
      explanation: 'PCR detection of viral genetic material is definitive.',
      mnemonic: null,
      examTip: 'PCR for viral myocarditis',
      difficulty: 2,
      cognitiveLevel: 'understanding',
      highYield: true,
      origin: 'authored-grounded',
      evidence: [
        {
          chunkId: 'chunk-myo-1',
          sourceName: 'Robbins Basic Pathology',
          location: 'Chapter 12',
          quote: 'PCR detection of viral genome confirms viral myocarditis etiology.',
          kind: 'text',
        },
      ],
      status: 'active',
      bankVersion: 1,
    };

    // User input where Option E is inline after Option D
    const RAW_INLINE_E = `${MYOCARDITIS_STEM}
A. Presence of pericardial effusion
B. Positive blood cultures
C. Elevated CRP and leukocytosis
D. PCR detection of viral RNA in serum E. ST elevation on ECG
Answer: D`;

    const agent = new QuestionParsingAgent();
    const resultInline = await agent.parseRawQuestions({
      rawText: RAW_INLINE_E,
      providerId: 'gemini',
      modelId: 'gemini-2.5-flash',
      existingQuestions: [bankMyocarditis],
    });

    expect(resultInline.items.length).toBe(1);
    const itemInline = resultInline.items[0];
    expect(itemInline.question.choices[3].text).toBe('PCR detection of viral RNA in serum');
    expect(itemInline.question.choices[3].isCorrect).toBe(true);
    expect(itemInline.qddVerdict?.relation).toBe('EXACT');
    expect(itemInline.qddVerdict?.relation).not.toBe('CONFLICT');

    // User input where Option E is on a separate line
    const RAW_SEPARATE_E = `${MYOCARDITIS_STEM}
A. Presence of pericardial effusion
B. Positive blood cultures
C. Elevated CRP and leukocytosis
D. PCR detection of viral RNA in serum
E. ST elevation on ECG
Answer: D`;

    const resultSeparate = await agent.parseRawQuestions({
      rawText: RAW_SEPARATE_E,
      providerId: 'gemini',
      modelId: 'gemini-2.5-flash',
      existingQuestions: [bankMyocarditis],
    });

    expect(resultSeparate.items.length).toBe(1);
    const itemSeparate = resultSeparate.items[0];
    expect(itemSeparate.question.choices.length).toBe(4);
    expect(itemSeparate.question.choices[3].text).toBe('PCR detection of viral RNA in serum');
    expect(itemSeparate.question.choices[3].isCorrect).toBe(true);
    expect(itemSeparate.qddVerdict?.relation).toBe('EXACT');
    expect(itemSeparate.qddVerdict?.relation).not.toBe('CONFLICT');
  });

  it('automatically detects CNS block and updates store targetBlockId when pasting CNS questions', async () => {
    const { useAdminAiQuestionParserStore } = await import('../../../application/stores/useAdminAiQuestionParserStore.ts');
    useAdminAiQuestionParserStore.setState({ targetBlockId: 'cvs' as any, rawInputText: '' });
    expect(useAdminAiQuestionParserStore.getState().targetBlockId).toBe('cvs');

    useAdminAiQuestionParserStore.getState().setRawInputText(`[
      {
        "id": "q-cns-ana-001",
        "blockId": "cns-neuroscience",
        "stem": "A histology researcher is examining parenchymal cells..."
      }
    ]`);

    expect(useAdminAiQuestionParserStore.getState().targetBlockId).toBe('cns');
  });
});
