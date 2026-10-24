import { describe, it, expect } from 'vitest';
import { isToolAllowed, authorizeToolCall } from '../toolPolicy.ts';
import type { SafeAiContext } from '../context.ts';
import type { Question } from '../../model/types.ts';

const mockQuestion: Question = {
  id: 'q-test-002',
  blockId: 'cvs',
  subjectId: 'histology',
  chapterId: 'cvs-vessels',
  topicId: 'cvs-elastic-arteries',
  concept: 'Internal Elastic Lamina',
  type: 'single-best-answer',
  stem: 'A histological cross-section of the aorta displays extensive fenestrated elastic lamellae throughout the media. Which cell type produces these lamellae?',
  choices: [
    { id: 'a', text: 'Fibroblasts', isCorrect: false, rationale: 'Fibroblasts are scarce in the tunica media.' },
    { id: 'b', text: 'Vascular smooth muscle cells', isCorrect: true, rationale: 'Vascular smooth muscle cells synthesize elastic fibers and collagen in elastic arteries.' },
    { id: 'c', text: 'Endothelial cells', isCorrect: false, rationale: 'Endothelial cells line the intima.' },
    { id: 'd', text: 'Pericytes', isCorrect: false, rationale: 'Pericytes surround post-capillary venules and capillaries.' },
  ],
  explanation: 'In the tunica media of large elastic arteries, smooth muscle cells synthesize both elastic fibers and collagen.',
  examTip: 'Smooth muscle cells synthesize elastic lamina, not fibroblasts!',
  mnemonic: 'SMC = Synthesizes Media Components',
  difficulty: 2,
  cognitiveLevel: 'understanding',
  highYield: true,
  origin: 'authored-grounded',
  evidence: [
    {
      chunkId: 'chunk-2',
      sourceName: 'Histology PPTX',
      location: 'Slide 8',
      quote: 'Smooth muscle cells in the media produce elastic lamellae',
      kind: 'text',
    },
  ],
  status: 'active',
  bankVersion: 1,
};

const proctorContext: SafeAiContext = {
  kind: 'proctor',
  mode: 'exam',
  questionIndex: 0,
  totalQuestions: 50,
  remainingMs: 3600000,
  flaggedIndices: [3],
  unansweredIndices: [1, 2],
  question: {
    id: mockQuestion.id,
    stem: mockQuestion.stem,
    choices: mockQuestion.choices.map(({ id, text }) => ({ id, text })),
  },
  selectedChoiceId: null,
  isBookmarked: false,
};

const revealedTutorContext: SafeAiContext = {
  kind: 'tutor',
  mode: 'practice',
  question: {
    id: mockQuestion.id,
    subjectId: mockQuestion.subjectId,
    chapterId: mockQuestion.chapterId,
    topicId: mockQuestion.topicId,
    concept: mockQuestion.concept,
    difficulty: mockQuestion.difficulty,
    highYield: mockQuestion.highYield,
    stem: mockQuestion.stem,
    choices: mockQuestion.choices.map(({ id, text }) => ({ id, text })),
  },
  disclosure: {
    state: 'revealed',
    choices: mockQuestion.choices,
    correctChoiceId: 'b',
    selectedChoiceId: 'a',
    isCorrect: false,
    classification: 'honest-miss',
    explanation: mockQuestion.explanation,
    examTip: mockQuestion.examTip,
    mnemonic: mockQuestion.mnemonic,
    evidence: mockQuestion.evidence,
  },
  learner: {
    priorAttempts: 1,
    priorMistakes: 1,
    topicAccuracy: 0.5,
    topicBand: 'critical',
    dangerZoneCountOnTopic: 0,
    overdueReviewCount: 0,
    srsIntervalDays: 1,
    existingNote: null,
  },
  isBookmarked: false,
};

describe('Tool Authorization & Access Matrix', () => {
  it('allows navigation and bookmark tools in proctor mode, but forbids clinical hint/explanation tools', () => {
    expect(isToolAllowed('navigate_exam', proctorContext)).toBe(true);
    expect(isToolAllowed('toggle_bookmark', proctorContext)).toBe(true);
    expect(isToolAllowed('highlight_stem_clues', proctorContext)).toBe(false);
    expect(isToolAllowed('eliminate_choices', proctorContext)).toBe(false);
    expect(isToolAllowed('render_differential_table', proctorContext)).toBe(false);
    expect(isToolAllowed('render_curriculum_citation', proctorContext)).toBe(false);
  });

  it('allows Socratic and visual tools in revealed tutor mode', () => {
    expect(isToolAllowed('highlight_stem_clues', revealedTutorContext)).toBe(true);
    expect(isToolAllowed('eliminate_choices', revealedTutorContext)).toBe(true);
    expect(isToolAllowed('render_differential_table', revealedTutorContext)).toBe(true);
    expect(isToolAllowed('render_curriculum_citation', revealedTutorContext)).toBe(true);
    expect(isToolAllowed('launch_targeted_retest', revealedTutorContext)).toBe(true);
  });

  it('protects ground-truth: eliminates distractors but NEVER eliminates the verified correct key', () => {
    const authResult = authorizeToolCall(
      {
        id: 'call-1',
        name: 'eliminate_choices',
        args: {
          choiceIds: ['a', 'b', 'c'], // 'b' is the correct answer!
          reason: 'Test elimination',
        },
      },
      revealedTutorContext,
      { question: mockQuestion },
    );

    expect(authResult.ok).toBe(true);
    if (authResult.ok) {
      expect(authResult.value.name).toBe('eliminate_choices');
      if (authResult.value.name === 'eliminate_choices') {
        expect(authResult.value.args.choiceIds).toContain('a');
        expect(authResult.value.args.choiceIds).toContain('c');
        expect(authResult.value.args.choiceIds).not.toContain('b'); // Protected!
      }
    }
  });

  it('filters highlighted clues to only verbatim substrings of the stem', () => {
    const authResult = authorizeToolCall(
      {
        id: 'call-2',
        name: 'highlight_stem_clues',
        args: {
          clues: [
            {
              phrase: 'fenestrated elastic lamellae',
              color: 'anatomy',
              meaning: 'Key anatomical feature',
            },
            {
              phrase: 'this phrase does not exist in stem',
              color: 'danger',
              meaning: 'Hallucinated phrase',
            },
          ],
        },
      },
      revealedTutorContext,
      { question: mockQuestion },
    );

    expect(authResult.ok).toBe(true);
    if (authResult.ok && authResult.value.name === 'highlight_stem_clues') {
      expect(authResult.value.args.clues.length).toBe(1);
      expect(authResult.value.args.clues[0]?.phrase).toBe('fenestrated elastic lamellae');
    }
  });
});
