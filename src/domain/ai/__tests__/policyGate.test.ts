import { describe, it, expect } from 'vitest';
import {
  buildSafeAiContext,
  classifyAttempt,
  correctChoiceOf,
} from '../policyGate.ts';
import type { Question } from '../../model/types.ts';

const mockQuestion: Question = {
  id: 'q-test-001',
  blockId: 'cvs',
  subjectId: 'anatomy',
  chapterId: 'cvs-heart-dev',
  topicId: 'cvs-atrial-septation',
  concept: 'Atrial Septum Primum',
  type: 'single-best-answer',
  stem: 'Which embryological structure forms the primary valve of the foramen ovale?',
  choices: [
    { id: 'a', text: 'Septum spurium', isCorrect: false, rationale: 'Forms the crista terminalis.' },
    { id: 'b', text: 'Septum primum', isCorrect: true, rationale: 'Acts as a flap-like valve against septum secundum.' },
    { id: 'c', text: 'Septum secundum', isCorrect: false, rationale: 'Forms the rigid muscular boundary.' },
    { id: 'd', text: 'Endocardial cushions', isCorrect: false, rationale: 'Fuses with septum primum caudally.' },
  ],
  explanation: 'The septum primum is a thin, flexible crescent that functions as a one-way flutter valve.',
  examTip: 'Remember: Primum is the valve, Secundum is the frame.',
  mnemonic: 'P-V: Primum Valve',
  difficulty: 2,
  cognitiveLevel: 'understanding',
  highYield: true,
  origin: 'authored-grounded',
  evidence: [
    {
      chunkId: 'chunk-1',
      sourceName: 'Embryology Lecture 2',
      location: 'Slide 14',
      quote: 'Septum primum acts as the valve of the foramen ovale',
      kind: 'text',
    },
  ],
  status: 'active',
  bankVersion: 1,
};

const dummySignals = {
  questionAttempts: [],
  topicAccuracy: 0.75,
  topicAttempts: 4,
  dangerZoneCountOnTopic: 0,
  overdueReviewCount: 0,
  srsIntervalDays: 1,
  existingNote: null,
};

const dummyOverview = {
  totalQuestions: 10,
  mistakeCount: 1,
  overallAccuracy: 0.8,
  topics: [],
};

describe('Domain Policy Gate (Constitution P5 - Exam Integrity)', () => {
  it('strictly produces a ProctorContext during unsubmitted Mock Exam with zero answer leakage', () => {
    const context = buildSafeAiContext({
      surface: {
        kind: 'session',
        mode: 'mock',
        isSubmitted: false,
        question: mockQuestion,
        questionIndex: 0,
        totalQuestions: 50,
        selectedChoiceId: 'b',
        flaggedIndices: [0],
        unansweredIndices: [1, 2],
        remainingMs: 3600000,
        isBookmarked: false,
      },
      signals: dummySignals,
      overview: dummyOverview,
    });

    expect(context.kind).toBe('proctor');
    if (context.kind === 'proctor') {
      expect((context as any).disclosure).toBeUndefined();
      expect((context as any).explanation).toBeUndefined();
      expect((context as any).evidence).toBeUndefined();
      expect((context.question.choices[0] as any).isCorrect).toBeUndefined();
      expect((context.question.choices[0] as any).rationale).toBeUndefined();
      expect(context.question.stem).toBe(mockQuestion.stem);
    }
  });

  it('keeps disclosure sealed in practice mode when the student has not yet answered', () => {
    const context = buildSafeAiContext({
      surface: {
        kind: 'session',
        mode: 'practice',
        isSubmitted: false,
        question: mockQuestion,
        questionIndex: 0,
        totalQuestions: 20,
        selectedChoiceId: null, // Not answered yet
        flaggedIndices: [],
        unansweredIndices: [0],
        remainingMs: null,
        isBookmarked: false,
      },
      signals: dummySignals,
      overview: dummyOverview,
    });

    expect(context.kind).toBe('tutor');
    if (context.kind === 'tutor') {
      expect(context.disclosure.state).toBe('sealed');
      expect((context.disclosure as any).correctChoiceId).toBeUndefined();
      expect((context.disclosure as any).explanation).toBeUndefined();
    }
  });

  it('reveals comprehensive explanation, rationales, and evidence once student commits an answer in practice mode', () => {
    const context = buildSafeAiContext({
      surface: {
        kind: 'session',
        mode: 'practice',
        isSubmitted: false,
        question: mockQuestion,
        questionIndex: 0,
        totalQuestions: 20,
        selectedChoiceId: 'a', // Student committed Option A (incorrect)
        flaggedIndices: [],
        unansweredIndices: [],
        remainingMs: null,
        isBookmarked: true,
      },
      signals: dummySignals,
      overview: dummyOverview,
    });

    expect(context.kind).toBe('tutor');
    if (context.kind === 'tutor') {
      expect(context.disclosure.state).toBe('revealed');
      if (context.disclosure.state === 'revealed') {
        expect(context.disclosure.correctChoiceId).toBe('b');
        expect(context.disclosure.selectedChoiceId).toBe('a');
        expect(context.disclosure.isCorrect).toBe(false);
        expect(context.disclosure.explanation).toBe(mockQuestion.explanation);
        expect(context.disclosure.evidence[0]?.quote).toBe(mockQuestion.evidence[0]?.quote);
      }
    }
  });

  it('correctly classifies attempts (BRD §9.1 and §9.3)', () => {
    expect(classifyAttempt(true, 'sure')).toBe('mastered');
    expect(classifyAttempt(true, 'unsure')).toBe('shaky-correct');
    expect(classifyAttempt(true, 'guess')).toBe('lucky-guess');
    expect(classifyAttempt(false, 'guess')).toBe('honest-miss');
    expect(classifyAttempt(false, 'unsure')).toBe('honest-miss');
    expect(classifyAttempt(false, 'sure')).toBe('danger-zone');
    expect(classifyAttempt(null, 'unsure')).toBe('unanswered');
  });

  it('identifies correctChoiceOf reliably', () => {
    expect(correctChoiceOf(mockQuestion)).toBe('b');
  });
});
