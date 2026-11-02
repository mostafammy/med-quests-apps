/**
 * Unit Test Suite: Multi-Model Consensus Engine & Real-Time Agent Tool Telemetry
 * Architecture: Clean Architecture / DDD (Apple Engineering Standards)
 */

import { describe, it, expect } from 'vitest';
import {
  MultiModelConsensusEngine,
  type EnsembleTargetModel,
} from '../aiQuestionParser/MultiModelConsensusEngine.ts';
import { QuestionParsingAgent } from '../aiQuestionParser/QuestionParsingAgent.ts';
import type { Question } from '../../model/types.ts';
import type { AgentExecutionTelemetry } from '../aiQuestionParser/types.ts';

const SAMPLE_QUESTION: Question = {
  id: 'test-q-1',
  blockId: 'cvs',
  subjectId: 'microbiology',
  chapterId: 'cvs-mic-rheumatic-fever',
  topicId: 'cvs-mic-rheumatic-fever/laboratory',
  concept: 'Acute Rheumatic Fever Antecedent Diagnosis',
  type: 'single-best-answer',
  stem: 'A 7-year-old child presents with fever, migratory polyarthritis, and carditis. Which test demonstrates prior GAS infection?',
  choices: [
    { id: 'a', text: 'Blood culture', isCorrect: false, rationale: 'Blood cultures are sterile.' },
    { id: 'b', text: 'Heart valve culture', isCorrect: false, rationale: 'Aschoff nodules are sterile immune lesions.' },
    { id: 'c', text: 'Anti-hyaluronic acid titer', isCorrect: false, rationale: 'Capsule is non-immunogenic.' },
    { id: 'd', text: 'Anti-streptolysin O (ASO) titer', isCorrect: true, rationale: 'ASO titer proves preceding streptococcal pharyngitis.' },
  ],
  explanation: 'Diagnosis of ARF requires evidence of prior GAS pharyngitis via elevated ASO titer.',
  examTip: 'ASO titer elevated 2-4 weeks post-pharyngitis.',
  mnemonic: null,
  difficulty: 2,
  cognitiveLevel: 'understanding',
  highYield: true,
  origin: 'authored-grounded',
  evidence: [
    {
      chunkId: 'chk-1',
      sourceName: 'Robbins Pathology',
      location: 'Chapter 12',
      quote: 'Diagnosis of ARF requires antecedent GAS proof',
      kind: 'text',
    },
  ],
  status: 'active',
  bankVersion: 1,
};

describe('MultiModelConsensusEngine (Cross-Model Quorum & Discrepancy Detection)', () => {
  it('achieves unanimous consensus when all ensemble models agree on Option D', async () => {
    const mockEnsemble: EnsembleTargetModel[] = [
      { id: 'gemini-test', name: 'Gemini 2.5 Flash', providerId: 'referee' },
      { id: 'claude-test', name: 'Claude 3.7 Sonnet', providerId: 'referee' },
      { id: 'deepseek-test', name: 'DeepSeek R1', providerId: 'referee' },
    ];

    const engine = new MultiModelConsensusEngine(mockEnsemble);
    const summary = await engine.verifyConsensus(SAMPLE_QUESTION);

    expect(summary.totalModelsQueried).toBe(3);
    expect(summary.totalModelsSucceeded).toBe(3);
    expect(summary.consensusChoiceId).toBe('d');
    expect(summary.consensusVerdict).toBe('unanimous_agreement');
    expect(summary.agreementRatio).toBe(1.0);
    expect(summary.discrepancies.length).toBe(0);
    expect(summary.modelVerdicts.every((v) => v.selectedChoiceId === 'd')).toBe(true);
  });

  it('detects majority consensus when models have a split decision', async () => {
    const mockEnsemble: EnsembleTargetModel[] = [
      { id: 'model-a', name: 'Model A', providerId: 'referee' },
      { id: 'model-b', name: 'Model B', providerId: 'referee' },
    ];

    const engine = new MultiModelConsensusEngine(mockEnsemble);
    const summary = await engine.verifyConsensus(SAMPLE_QUESTION);

    expect(summary.consensusChoiceId).toBe('d');
    expect(summary.agreementRatio).toBeGreaterThanOrEqual(0.5);
  });
});

describe('QuestionParsingAgent (Agent Tool Execution Telemetry & Consensus Pipeline)', () => {
  it('emits ordered tool execution telemetry updates during parsing', async () => {
    const agent = new QuestionParsingAgent();
    const telemetryEvents: AgentExecutionTelemetry[] = [];

    const raw = `
Question 1:
Which cardiac chamber forms the apex of the anatomical heart?
A. Right atrium
B. Right ventricle
C. Left ventricle
D. Left atrium
Answer: C
`;

    const result = await agent.parseRawQuestions({
      rawText: raw,
      providerId: 'gemini',
      modelId: 'gemini-2.5-flash',
      enableConsensusCheck: true,
      onTelemetryUpdate: (t) => telemetryEvents.push(t),
    });

    expect(result.totalParsed).toBe(1);
    expect(telemetryEvents.length).toBeGreaterThanOrEqual(4);

    // Verify initial telemetry state
    const firstEvent = telemetryEvents[0];
    expect(firstEvent.isRunning).toBe(true);
    expect(firstEvent.steps.length).toBe(5);
    expect(firstEvent.steps[0].id).toBe('segmentation');
    expect(firstEvent.steps[1].id).toBe('taxonomy');
    expect(firstEvent.steps[2].id).toBe('reasoning');
    expect(firstEvent.steps[3].id).toBe('consensus');
    expect(firstEvent.steps[4].id).toBe('validation');

    // Verify final telemetry state
    const lastEvent = telemetryEvents[telemetryEvents.length - 1];
    expect(lastEvent.isRunning).toBe(false);
    expect(lastEvent.steps.every((s) => s.status === 'completed')).toBe(true);

    // Verify consensusSummary was attached to the parsed question
    const item = result.items[0];
    expect(item.consensusSummary).toBeDefined();
    expect(item.consensusSummary?.consensusChoiceId).toBe('c');
    expect(item.consensusSummary?.consensusVerdict).toBe('unanimous_agreement');
  });

  it('skips consensus tool step when enableConsensusCheck is false', async () => {
    const agent = new QuestionParsingAgent();
    let finalTelemetry: AgentExecutionTelemetry | null = null;

    const raw = `
Question 1:
Which test demonstrates prior GAS infection in rheumatic fever?
A. Blood culture
B. Heart valve culture
C. Hyaluronic acid capsule antibody
D. Anti-streptolysin O
`;

    const result = await agent.parseRawQuestions({
      rawText: raw,
      providerId: 'gemini',
      modelId: 'gemini-2.5-flash',
      enableConsensusCheck: false,
      onTelemetryUpdate: (t) => {
        finalTelemetry = t;
      },
    });

    expect(result.totalParsed).toBe(1);
    expect(finalTelemetry).not.toBeNull();
    const consensusStep = finalTelemetry!.steps.find((s) => s.id === 'consensus');
    expect(consensusStep?.status).toBe('skipped');
    expect(result.items[0].consensusSummary).toBeUndefined();
  });
});
