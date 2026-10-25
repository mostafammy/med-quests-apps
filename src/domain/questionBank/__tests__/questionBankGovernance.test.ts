import { describe, it, expect } from 'vitest';
import { QuestionCanonicalHasher } from '../canonicalHasher.ts';
import { QuestionQualityGatePipeline } from '../qualityGatePipeline.ts';
import { QuestionEditorialStateMachine } from '../editorialStateMachine.ts';
import { NonDestructiveBankMergeStrategy } from '../nonDestructiveMergeStrategy.ts';
import {
  QuestionSpecificationBuilder,
  computeGlobalBankKpis,
} from '../questionSpecifications.ts';
import type { Question } from '../../model/types.ts';
import type {
  GovernedQuestion,
  QuestionReviewSubmission,
  EditorialDecisionCommand,
  BankRevisionNumber,
} from '../../../../specs/005-global-question-bank-governance/contracts/question-bank-governance-ports.ts';

const SAMPLE_QUESTION: Question = {
  id: 'q-cvs-ana-001',
  blockId: 'cvs',
  subjectId: 'anatomy',
  chapterId: 'cvs-ana-heart-dev',
  topicId: 'cvs-ana-heart-dev/atrial-septation',
  concept: 'Ostium Secundum Formation',
  type: 'single-best-answer',
  stem: 'A 3-year-old child presents with a fixed split S2 murmur. What is the embryological defect?',
  choices: [
    { id: 'a', text: 'Excessive resorption of septum primum', isCorrect: true, rationale: 'Causes ostium secundum defect.' },
    { id: 'b', text: 'Failure of neural crest migration', isCorrect: false, rationale: 'Causes conotruncal defects like Tetralogy of Fallot.' },
    { id: 'c', text: 'Endocardial cushion defect', isCorrect: false, rationale: 'Causes ostium primum defect, common in Down syndrome.' },
    { id: 'd', text: 'Failure of sinus venosus closure', isCorrect: false, rationale: 'Causes sinus venosus ASD.' },
  ],
  explanation: 'Ostium secundum ASD is the most common ASD, caused by excessive apoptosis in the septum primum or deficient septum secundum.',
  examTip: 'Fixed split S2 is pathognomonic for ASD.',
  mnemonic: null,
  difficulty: 2,
  cognitiveLevel: 'understanding',
  highYield: true,
  origin: 'authored-grounded',
  evidence: [
    {
      chunkId: 'SRC-CVS-ANA-01',
      sourceName: 'Heart Development Lecture',
      location: 'Slide 14',
      quote: 'Excessive resorption of septum primum produces an ostium secundum defect.',
      kind: 'text',
    },
  ],
  status: 'active',
  bankVersion: 1,
};

describe('QuestionCanonicalHasher', () => {
  it('normalizes stem whitespace, casing, and quotation punctuation deterministically', () => {
    const rawA = '  A 3-year-old   child presents with "fixed split S2" murmur.\nWhat is the defect? ';
    const rawB = 'a 3-year-old child presents with fixed split S2 murmur. what is the defect?';

    const normA = QuestionCanonicalHasher.normalizeStemText(rawA);
    const normB = QuestionCanonicalHasher.normalizeStemText(rawB);

    expect(normA).toBe(normB);
  });

  it('produces identical synchronous 64-character hex hash for equivalent stems', () => {
    const stemA = 'A 3-year-old child presents with a fixed split S2 murmur. What is the embryological defect?';
    const stemB = '  a 3-year-old child presents with a fixed split s2 murmur. What is the embryological defect?  ';

    const hashA = QuestionCanonicalHasher.computeStemHashSync(stemA);
    const hashB = QuestionCanonicalHasher.computeStemHashSync(stemB);

    expect(hashA).toBe(hashB);
    expect(hashA).toHaveLength(64);
  });
});

describe('QuestionQualityGatePipeline', () => {
  it('accepts compliant questions citing authoritative evidence with rationales', () => {
    const pipeline = new QuestionQualityGatePipeline();
    const result = pipeline.validateBatch([SAMPLE_QUESTION]);

    expect(result.errors).toHaveLength(0);
    expect(result.validQuestions).toHaveLength(1);
    expect(result.stemHashes.get(SAMPLE_QUESTION.id)).toBeDefined();
  });

  it('rejects questions with zero or multiple correct answers', () => {
    const badQuestion: Question = {
      ...SAMPLE_QUESTION,
      choices: [
        { id: 'a', text: 'Option A', isCorrect: false, rationale: 'Rationale A' },
        { id: 'b', text: 'Option B', isCorrect: false, rationale: 'Rationale B' },
        { id: 'c', text: 'Option C', isCorrect: false, rationale: 'Rationale C' },
        { id: 'd', text: 'Option D', isCorrect: false, rationale: 'Rationale D' },
      ],
    };

    const pipeline = new QuestionQualityGatePipeline();
    const result = pipeline.validateBatch([badQuestion]);

    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects evidence quotes shorter than 10 characters', () => {
    const badEvidenceQuestion: Question = {
      ...SAMPLE_QUESTION,
      evidence: [
        {
          chunkId: 'SRC-01',
          sourceName: 'Slides',
          location: 'Slide 1',
          quote: 'Short', // < 10 chars
          kind: 'text',
        },
      ],
    };

    const pipeline = new QuestionQualityGatePipeline();
    const result = pipeline.validateBatch([badEvidenceQuestion]);

    expect(result.errors.some((e) => e.code === 'INSUFFICIENT_EVIDENCE_GROUNDING')).toBe(true);
  });
});

describe('QuestionEditorialStateMachine', () => {
  const mockSubmission: QuestionReviewSubmission = {
    ticketId: 'ticket-001' as any,
    question: {
      ...SAMPLE_QUESTION,
      provenanceScope: 'submitted-pending',
      editorialStatus: 'pending_review',
      stemHash: QuestionCanonicalHasher.computeStemHashSync(SAMPLE_QUESTION.stem),
      globalRevision: 1,
      authorId: 'usr-student-01',
      authorDisplayName: 'Dr. Student',
      reviewedById: null,
      reviewedByDisplayName: null,
      reviewerNotes: null,
      publishedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    submittedByUserId: 'usr-student-01',
    submittedByDisplayName: 'Dr. Student',
    submittedByRole: 'student-free',
    submittedAt: new Date().toISOString(),
    editorialStatus: 'pending_review',
    reviewedByUserId: null,
    reviewedByDisplayName: null,
    reviewedAt: null,
    reviewerNotes: null,
  };

  it('prevents non-faculty / non-admin from approving submissions', () => {
    const command: EditorialDecisionCommand = {
      ticketId: 'ticket-001' as any,
      questionId: SAMPLE_QUESTION.id,
      reviewerUserId: 'usr-intruder',
      reviewerDisplayName: 'Intruder',
      reviewerRole: 'student-free',
      decision: 'approve_and_publish',
      reviewerNotes: 'Attempted unauthorized publish',
    };

    const res = QuestionEditorialStateMachine.transition(mockSubmission, command, 2 as BankRevisionNumber);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe('INSUFFICIENT_EDITORIAL_PERMISSION');
    }
  });

  it('successfully transitions pending_review to published by faculty reviewer', () => {
    const command: EditorialDecisionCommand = {
      ticketId: 'ticket-001' as any,
      questionId: SAMPLE_QUESTION.id,
      reviewerUserId: 'usr-prof-01',
      reviewerDisplayName: 'Prof. Anderson',
      reviewerRole: 'faculty-reviewer',
      decision: 'approve_and_publish',
      reviewerNotes: 'Excellent board-style item with sound grounding.',
    };

    const res = QuestionEditorialStateMachine.transition(mockSubmission, command, 5 as BankRevisionNumber);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.publishedQuestion?.editorialStatus).toBe('published');
      expect(res.value.publishedQuestion?.provenanceScope).toBe('global-canonical');
      expect(res.value.publishedQuestion?.globalRevision).toBe(5);
      expect(res.value.auditEntry.action).toBe('SUBMISSION_APPROVED');
    }
  });
});

describe('NonDestructiveBankMergeStrategy', () => {
  const mergeStrategy = new NonDestructiveBankMergeStrategy();

  it('preserves student local-custom questions even on identical ID collision with canonical bank', () => {
    const localCustom: GovernedQuestion = {
      ...SAMPLE_QUESTION,
      id: 'q-collision-001',
      provenanceScope: 'local-custom',
      editorialStatus: 'local_draft',
      stemHash: QuestionCanonicalHasher.computeStemHashSync(SAMPLE_QUESTION.stem),
      globalRevision: 0,
      authorId: 'usr-me',
      authorDisplayName: 'Me',
      reviewedById: null,
      reviewedByDisplayName: null,
      reviewerNotes: null,
      publishedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const incomingCanonical: GovernedQuestion = {
      ...SAMPLE_QUESTION,
      id: 'q-collision-001',
      concept: 'Global Canonical Concept',
      provenanceScope: 'global-canonical',
      editorialStatus: 'published',
      stemHash: 'canonical-hash-123456789' as any,
      globalRevision: 10,
      authorId: 'usr-faculty',
      authorDisplayName: 'Faculty',
      reviewedById: 'usr-admin',
      reviewedByDisplayName: 'Admin',
      reviewerNotes: null,
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = mergeStrategy.mergeGlobalDeltaIntoLocal({
      blockId: 'cvs',
      currentLocalQuestions: [localCustom],
      incomingGlobalQuestions: [incomingCanonical],
      archivedGlobalIds: [],
      newRevision: 10 as BankRevisionNumber,
      syncedAt: new Date().toISOString(),
    });

    // Both questions must exist in merged output!
    expect(result.mergedQuestions).toHaveLength(2);
    expect(result.report.preservedLocalCustomCount).toBe(1);
    expect(result.report.insertedCount).toBe(1);

    const preserved = result.mergedQuestions.find((q) => q.id.includes('-local-'));
    const canonical = result.mergedQuestions.find((q) => q.id === 'q-collision-001');

    expect(preserved).toBeDefined();
    expect(canonical?.provenanceScope).toBe('global-canonical');
  });
});

describe('QuestionSpecificationBuilder & computeGlobalBankKpis', () => {
  const testItems: GovernedQuestion[] = [
    {
      ...SAMPLE_QUESTION,
      id: 'q-1',
      subjectId: 'anatomy',
      difficulty: 1,
      editorialStatus: 'published',
      provenanceScope: 'global-canonical',
      stemHash: 'h1' as any,
      globalRevision: 1,
      authorId: 'u1',
      authorDisplayName: 'U1',
      reviewedById: null,
      reviewedByDisplayName: null,
      reviewerNotes: null,
      publishedAt: null,
      createdAt: '',
      updatedAt: '',
    },
    {
      ...SAMPLE_QUESTION,
      id: 'q-2',
      subjectId: 'histology',
      difficulty: 3,
      editorialStatus: 'pending_review',
      provenanceScope: 'submitted-pending',
      stemHash: 'h2' as any,
      globalRevision: 1,
      authorId: 'u2',
      authorDisplayName: 'U2',
      reviewedById: null,
      reviewedByDisplayName: null,
      reviewerNotes: null,
      publishedAt: null,
      createdAt: '',
      updatedAt: '',
    },
  ];

  it('filters items correctly via composite specification', () => {
    const spec = QuestionSpecificationBuilder.build({
      subjectId: 'anatomy',
      difficulty: 1,
    });

    const matching = testItems.filter((item) => spec.isSatisfiedBy(item));
    expect(matching).toHaveLength(1);
    expect(matching[0].id).toBe('q-1');
  });

  it('computes accurate KPIs for the governance dashboard', () => {
    const kpis = computeGlobalBankKpis(testItems, 5);
    expect(kpis.totalPublishedCanonical).toBe(1);
    expect(kpis.totalPendingReview).toBe(1);
    expect(kpis.currentBlockRevision).toBe(5);
    expect(kpis.difficultyBreakdown.foundational).toBe(1);
  });
});
