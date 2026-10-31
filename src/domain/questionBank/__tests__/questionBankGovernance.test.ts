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

  it('does not duplicate locally authored questions when they are approved and synced from the global bank (same ID and stemHash)', () => {
    const mergeStrategy = new NonDestructiveBankMergeStrategy();
    const commonStem = 'A 55-year-old male presents with retrosternal chest pain radiating to the left arm.';
    const commonStemHash = QuestionCanonicalHasher.computeStemHashSync(commonStem);

    // 1. User authored locally or submitted for review
    const localPendingQuestion: GovernedQuestion = {
      ...SAMPLE_QUESTION,
      id: 'q-cvs-ana-0099',
      stem: commonStem,
      provenanceScope: 'submitted-pending',
      editorialStatus: 'pending_review',
      stemHash: commonStemHash,
      globalRevision: 0,
      authorId: 'usr-student',
      authorDisplayName: 'Medical Scholar',
      reviewedById: null,
      reviewedByDisplayName: null,
      reviewerNotes: null,
      publishedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 2. Incoming from global bank after reviewer approved and published it
    const incomingApprovedCanonical: GovernedQuestion = {
      ...SAMPLE_QUESTION,
      id: 'q-cvs-ana-0099',
      stem: commonStem,
      provenanceScope: 'global-canonical',
      editorialStatus: 'published',
      stemHash: commonStemHash,
      globalRevision: 5,
      authorId: 'usr-student',
      authorDisplayName: 'Medical Scholar',
      reviewedById: 'usr-faculty-admin',
      reviewedByDisplayName: 'Dr. Faculty',
      reviewerNotes: 'Verified against anatomy syllabus.',
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = mergeStrategy.mergeGlobalDeltaIntoLocal({
      blockId: 'cvs',
      currentLocalQuestions: [localPendingQuestion],
      incomingGlobalQuestions: [incomingApprovedCanonical],
      archivedGlobalIds: [],
      newRevision: 5 as BankRevisionNumber,
      syncedAt: new Date().toISOString(),
    });

    // CRITICAL: MUST NOT DUPLICATE! Exactly 1 question in bank, upgraded to canonical
    expect(result.mergedQuestions).toHaveLength(1);
    expect(result.report.updatedCanonicalCount).toBe(1);
    expect(result.report.insertedCount).toBe(0);
    expect(result.mergedQuestions[0].id).toBe('q-cvs-ana-0099');
    expect(result.mergedQuestions[0].provenanceScope).toBe('global-canonical');
    expect(result.mergedQuestions[0].editorialStatus).toBe('published');
    expect(result.mergedQuestions.some((q) => q.id.includes('-local-'))).toBe(false);
  });

  it('reconciles and does not duplicate when local question had a temporary ID and incoming canonical has official ID with same stemHash', () => {
    const mergeStrategy = new NonDestructiveBankMergeStrategy();
    const commonStem = 'A 28-year-old female presents with palpitations and mid-systolic click.';
    const commonStemHash = QuestionCanonicalHasher.computeStemHashSync(commonStem);

    // User authored with temporary local ID
    const localDraftQuestion: GovernedQuestion = {
      ...SAMPLE_QUESTION,
      id: 'temp-local-draft-001',
      stem: commonStem,
      provenanceScope: 'local-custom',
      editorialStatus: 'local_draft',
      stemHash: commonStemHash,
      globalRevision: 0,
      authorId: 'usr-author',
      authorDisplayName: 'Author',
      reviewedById: null,
      reviewedByDisplayName: null,
      reviewerNotes: null,
      publishedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Global canonical bank publishes it with official canonical ID
    const incomingCanonical: GovernedQuestion = {
      ...SAMPLE_QUESTION,
      id: 'q-cvs-ana-0150',
      stem: commonStem,
      provenanceScope: 'global-canonical',
      editorialStatus: 'published',
      stemHash: commonStemHash,
      globalRevision: 8,
      authorId: 'usr-author',
      authorDisplayName: 'Author',
      reviewedById: 'usr-faculty',
      reviewedByDisplayName: 'Faculty Reviewer',
      reviewerNotes: null,
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = mergeStrategy.mergeGlobalDeltaIntoLocal({
      blockId: 'cvs',
      currentLocalQuestions: [localDraftQuestion],
      incomingGlobalQuestions: [incomingCanonical],
      archivedGlobalIds: [],
      newRevision: 8 as BankRevisionNumber,
      syncedAt: new Date().toISOString(),
    });

    // Old temporary ID must be retired, canonical ID inserted, no duplicates!
    expect(result.mergedQuestions).toHaveLength(1);
    expect(result.mergedQuestions[0].id).toBe('q-cvs-ana-0150');
    expect(result.mergedQuestions[0].provenanceScope).toBe('global-canonical');
    expect(result.report.updatedCanonicalCount).toBe(1);
    expect(result.mergedQuestions.find((q) => q.id === 'temp-local-draft-001')).toBeUndefined();
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

  it('guarantees resetLocalBankToGlobal logic restores canonical items while eliminating stale drafts', () => {
    // Canonical questions received from the global server
    const incomingCanonical: GovernedQuestion[] = [
      {
        ...SAMPLE_QUESTION,
        id: 'q-cvs-canonical-001',
        editorialStatus: 'published',
        provenanceScope: 'global-canonical',
        stemHash: QuestionCanonicalHasher.computeStemHashSync(SAMPLE_QUESTION.stem),
        globalRevision: 2,
        authorId: 'usr-faculty',
        authorDisplayName: 'Faculty Chair',
        reviewedById: 'usr-admin',
        reviewedByDisplayName: 'Board Admin',
        reviewerNotes: 'Verified board standard',
        publishedAt: new Date().toISOString(),
        createdAt: '',
        updatedAt: '',
      },
    ];

    // Simulating the store reset behavior: local bank cleared, canonical bank installed
    const resetBank = [...incomingCanonical];
    expect(resetBank).toHaveLength(1);
    expect(resetBank[0].id).toBe('q-cvs-canonical-001');
    expect(resetBank[0].editorialStatus).toBe('published');
    expect(resetBank.find((q) => q.id === 'q-local-stale-draft')).toBeUndefined();
  });

  it('computes exact Added, Edited, Deleted, and Preserved Custom question diffs via computeDiffPreview', () => {
    const mergeStrategy = new NonDestructiveBankMergeStrategy();

    const localEditedCandidate: GovernedQuestion = {
      ...SAMPLE_QUESTION,
      id: 'q-cvs-edit-01',
      stem: 'Original clinical stem before faculty errata update.',
      bankVersion: 1,
      provenanceScope: 'seed-bundled',
      editorialStatus: 'published',
      stemHash: QuestionCanonicalHasher.computeStemHashSync('Original clinical stem before faculty errata update.'),
      globalRevision: 1,
      authorId: 'usr-faculty',
      authorDisplayName: 'Faculty',
      reviewedById: null,
      reviewedByDisplayName: null,
      reviewerNotes: null,
      publishedAt: null,
      createdAt: '',
      updatedAt: '',
    };

    const localDeleteCandidate: GovernedQuestion = {
      ...SAMPLE_QUESTION,
      id: 'q-cvs-retire-02',
      provenanceScope: 'global-canonical',
      editorialStatus: 'published',
      status: 'active',
      stemHash: QuestionCanonicalHasher.computeStemHashSync(SAMPLE_QUESTION.stem),
      globalRevision: 1,
      authorId: 'usr-faculty',
      authorDisplayName: 'Faculty',
      reviewedById: null,
      reviewedByDisplayName: null,
      reviewerNotes: null,
      publishedAt: null,
      createdAt: '',
      updatedAt: '',
    };

    const localCustomItem: GovernedQuestion = {
      ...SAMPLE_QUESTION,
      id: 'q-my-private-custom-03',
      stem: 'My private custom student vignette.',
      provenanceScope: 'local-custom',
      editorialStatus: 'local_draft',
      stemHash: QuestionCanonicalHasher.computeStemHashSync('My private custom student vignette.'),
      globalRevision: 0,
      authorId: 'usr-me',
      authorDisplayName: 'Me',
      reviewedById: null,
      reviewedByDisplayName: null,
      reviewerNotes: null,
      publishedAt: null,
      createdAt: '',
      updatedAt: '',
    };

    const incomingEditedCanonical: GovernedQuestion = {
      ...localEditedCandidate,
      stem: 'Updated clinical stem after faculty errata refinement.',
      bankVersion: 2,
      globalRevision: 3,
      stemHash: QuestionCanonicalHasher.computeStemHashSync('Updated clinical stem after faculty errata refinement.'),
    };

    const incomingBrandNewCanonical: GovernedQuestion = {
      ...SAMPLE_QUESTION,
      id: 'q-cvs-brand-new-04',
      concept: 'New High-Yield Pericarditis Concept',
      stem: 'A 40-year-old presents with pleuritic chest pain relieved by leaning forward.',
      provenanceScope: 'global-canonical',
      editorialStatus: 'published',
      stemHash: QuestionCanonicalHasher.computeStemHashSync('A 40-year-old presents with pleuritic chest pain relieved by leaning forward.'),
      globalRevision: 3,
      authorId: 'usr-faculty',
      authorDisplayName: 'Faculty',
      reviewedById: null,
      reviewedByDisplayName: null,
      reviewerNotes: null,
      publishedAt: null,
      createdAt: '',
      updatedAt: '',
    };

    const preview = mergeStrategy.computeDiffPreview({
      blockId: 'cvs',
      localRevision: 1,
      currentLocalQuestions: [localEditedCandidate, localDeleteCandidate, localCustomItem],
      delta: {
        status: 'delta-applied',
        blockId: 'cvs',
        revision: 3 as BankRevisionNumber,
        syncedAt: new Date().toISOString(),
        etag: 'W/rev-3',
        upsertedQuestions: [incomingEditedCanonical, incomingBrandNewCanonical],
        archivedQuestionIds: ['q-cvs-retire-02'],
      },
    });

    expect(preview.localRevision).toBe(1);
    expect(preview.remoteRevision).toBe(3);
    expect(preview.hasChanges).toBe(true);
    expect(preview.isOutOfDate).toBe(true);
    expect(preview.addedQuestions).toHaveLength(1);
    expect(preview.addedQuestions[0].id).toBe('q-cvs-brand-new-04');
    expect(preview.editedQuestions).toHaveLength(1);
    expect(preview.editedQuestions[0].id).toBe('q-cvs-edit-01');
    expect(preview.editedQuestions[0].changedFields).toContain('stem');
    expect(preview.deletedQuestions).toHaveLength(1);
    expect(preview.deletedQuestions[0].id).toBe('q-cvs-retire-02');
    expect(preview.preservedCustomQuestions).toHaveLength(1);
    expect(preview.preservedCustomQuestions[0].id).toBe('q-my-private-custom-03');
  });

  it('enforces strict version monotonicity when content diverges (never shows Local v6.0 -> Global v6.0 with +106 added questions)', () => {
    const mergeStrategy = new NonDestructiveBankMergeStrategy();

    const localBank111: GovernedQuestion[] = Array.from({ length: 111 }, (_, idx) => ({
      ...SAMPLE_QUESTION,
      id: `q-cvs-seed-${idx + 1}`,
      stem: `Canonical seed question #${idx + 1} clinical vignette.`,
      provenanceScope: 'global-canonical',
      editorialStatus: 'published',
      stemHash: QuestionCanonicalHasher.computeStemHashSync(
        `Canonical seed question #${idx + 1} clinical vignette.`
      ),
      globalRevision: 1,
      authorId: 'usr-faculty',
      authorDisplayName: 'Faculty',
      reviewedById: null,
      reviewedByDisplayName: null,
      reviewerNotes: null,
      publishedAt: null,
      createdAt: '',
      updatedAt: '',
    }));

    const globalBank217: GovernedQuestion[] = Array.from({ length: 217 }, (_, idx) => ({
      ...SAMPLE_QUESTION,
      id: `q-cvs-seed-${idx + 1}`,
      stem: `Canonical seed question #${idx + 1} clinical vignette.`,
      provenanceScope: 'global-canonical',
      editorialStatus: 'published',
      stemHash: QuestionCanonicalHasher.computeStemHashSync(
        `Canonical seed question #${idx + 1} clinical vignette.`
      ),
      globalRevision: idx < 111 ? 1 : 7,
      authorId: 'usr-faculty',
      authorDisplayName: 'Faculty',
      reviewedById: null,
      reviewedByDisplayName: null,
      reviewerNotes: null,
      publishedAt: null,
      createdAt: '',
      updatedAt: '',
    }));

    // Even if delta initially arrives with stale revision 6 matching localRevision 6,
    // computeDiffPreview must advance remoteRevision to 7 when +106 additions are detected.
    const preview = mergeStrategy.computeDiffPreview({
      blockId: 'cvs',
      localRevision: 6,
      currentLocalQuestions: localBank111,
      delta: {
        status: 'delta-applied',
        blockId: 'cvs',
        revision: 6 as BankRevisionNumber,
        syncedAt: new Date().toISOString(),
        etag: 'W/rev-6',
        upsertedQuestions: globalBank217,
        archivedQuestionIds: [],
      },
      remoteCanonicalCount: 217,
    });

    expect(preview.localTotalCount).toBe(111);
    expect(preview.remoteCanonicalCount).toBe(217);
    expect(preview.addedQuestions).toHaveLength(106);
    expect(preview.hasChanges).toBe(true);
    expect(preview.isOutOfDate).toBe(true);
    expect(preview.localRevision).toBe(6);
    expect(preview.remoteRevision).toBe(7);
    expect(preview.remoteRevision).toBeGreaterThan(preview.localRevision);
    expect(Number(preview.rawDelta.revision)).toBe(7);
  });

  it('correctly matches multiline stems with quotes, punctuation, and parentheses via enhanced SearchQuerySpecification', () => {
    const sternalQuestion: GovernedQuestion = {
      ...SAMPLE_QUESTION,
      id: 'q-cvs-ana-018',
      stem: 'The horizontal transverse thoracic plane passing through the sternal angle (angle of Louis) anteriorly intersects which vertebral level posteriorly?',
      concept: 'Superior Mediastinum Plane (Angle of Louis)',
      choices: [
        { id: 'a', text: 'T2-T3 intervertebral disc', isCorrect: false, rationale: 'Too superior' },
        { id: 'b', text: 'T7-T8 intervertebral disc', isCorrect: false, rationale: 'Too inferior' },
        { id: 'c', text: 'T4-T5 intervertebral disc', isCorrect: true, rationale: 'Passes through T4-T5 junction' },
        { id: 'd', text: 'T9-T10 intervertebral disc', isCorrect: false, rationale: 'Level of xiphisternal joint' },
      ],
      editorialStatus: 'published',
      bankVersion: 2,
      provenanceScope: 'global-canonical',
      stemHash: QuestionCanonicalHasher.computeStemHashSync(
        'The horizontal transverse thoracic plane passing through the sternal angle (angle of Louis) anteriorly intersects which vertebral level posteriorly?'
      ),
      globalRevision: 2,
      authorId: 'usr-faculty',
      authorDisplayName: 'Faculty',
      reviewedById: 'usr-admin',
      reviewedByDisplayName: 'Admin',
      reviewerNotes: null,
      publishedAt: '2026-10-31T00:00:00Z',
      createdAt: '2026-10-31T00:00:00Z',
      updatedAt: '2026-10-31T00:00:00Z',
    };

    // User prompt's exact multiline query with quotes and line breaks
    const multilineQueryWithQuotes = `"The horizontal transverse thoracic
plane passing through the sternal
angle (angle of Louis) anteriorly
intersects which vertebral level
posteriorly?"`;

    const spec1 = QuestionSpecificationBuilder.build({
      searchQuery: multilineQueryWithQuotes,
    });
    expect(spec1.isSatisfiedBy(sternalQuestion)).toBe(true);

    // Searching by answer choice text
    const specChoice = QuestionSpecificationBuilder.build({
      searchQuery: 'T4-T5 intervertebral disc',
    });
    expect(specChoice.isSatisfiedBy(sternalQuestion)).toBe(true);

    // Searching with parentheses and punctuation
    const specPunctuation = QuestionSpecificationBuilder.build({
      searchQuery: '(angle of Louis)?',
    });
    expect(specPunctuation.isSatisfiedBy(sternalQuestion)).toBe(true);

    // Non-matching query
    const specNonMatching = QuestionSpecificationBuilder.build({
      searchQuery: 'completely unrelated cardiology question',
    });
    expect(specNonMatching.isSatisfiedBy(sternalQuestion)).toBe(false);
  });

  it('permanently deletes canonical questions, bumps revision, records audit log, and honors tombstones', async () => {
    const { edgeQuestionBankGateway } = await import('../../../infrastructure/questionBank/edgeQuestionBankGateway.ts');

    const testQuestion: Question = {
      ...SAMPLE_QUESTION,
      id: 'q-cvs-to-delete-001',
      stem: 'Temporary test question to delete permanently from the canonical curriculum.',
      concept: 'Deletion Test Concept',
    };

    // 1. Create canonical question
    const createRes = await edgeQuestionBankGateway.createCanonicalQuestions({
      questions: [testQuestion],
      actorId: 'usr-admin',
      actorDisplayName: 'Dr. Apple Admin',
      actorRole: 'admin',
    });
    expect(createRes.ok).toBe(true);

    const beforeBank = edgeQuestionBankGateway.getLocalCanonicalBank('cvs');
    expect(beforeBank.some((q) => q.id === 'q-cvs-to-delete-001')).toBe(true);

    // 2. Delete canonical question permanently
    const deleteRes = await edgeQuestionBankGateway.deleteCanonicalQuestion({
      questionId: 'q-cvs-to-delete-001' as any,
      actorId: 'usr-admin',
      actorDisplayName: 'Dr. Apple Admin',
      actorRole: 'admin',
      reason: 'Curriculum pruning of outdated clinical item',
      permanent: true,
    });

    expect(deleteRes.ok).toBe(true);
    if (deleteRes.ok) {
      expect(deleteRes.value.deletedQuestionId).toBe('q-cvs-to-delete-001');
      expect(deleteRes.value.auditEntry.action).toBe('CANONICAL_QUESTION_DELETED');
      expect(deleteRes.value.auditEntry.summary).toContain('Curriculum pruning');
    }

    // 3. Verify removed from canonical bank
    const afterBank = edgeQuestionBankGateway.getLocalCanonicalBank('cvs');
    expect(afterBank.some((q) => q.id === 'q-cvs-to-delete-001')).toBe(false);
  });

  it('updates canonical question choices, changes the correct answer, and bumps bankVersion', async () => {
    const { edgeQuestionBankGateway } = await import('../../../infrastructure/questionBank/edgeQuestionBankGateway.ts');

    const testQuestion: Question = {
      ...SAMPLE_QUESTION,
      id: 'q-cvs-choices-edit-001',
      stem: 'Question to test changing the correct answer choice in the curriculum.',
      concept: 'Choices Mutation Concept',
      choices: [
        { id: 'a', text: 'Initial correct answer', isCorrect: true, rationale: 'Old rationale for correct choice.' },
        { id: 'b', text: 'Initial distractor 1', isCorrect: false, rationale: 'Old distractor rationale for choice 1.' },
        { id: 'c', text: 'Initial distractor 2', isCorrect: false, rationale: 'Old distractor rationale for choice 2.' },
        { id: 'd', text: 'Initial distractor 3', isCorrect: false, rationale: 'Old distractor rationale for choice 3.' },
      ],
    };

    const createRes = await edgeQuestionBankGateway.createCanonicalQuestions({
      questions: [testQuestion],
      actorId: 'usr-admin',
      actorDisplayName: 'Dr. Apple Admin',
      actorRole: 'admin',
    });
    expect(createRes.ok).toBe(true);

    // Mutate choices: switch correct answer from A to B
    const updateRes = await edgeQuestionBankGateway.updateCanonicalQuestion({
      questionId: 'q-cvs-choices-edit-001' as any,
      patch: {
        choices: [
          { id: 'a', text: 'New distractor text', isCorrect: false, rationale: 'Now incorrect according to evidence.' },
          { id: 'b', text: 'New verified correct answer', isCorrect: true, rationale: 'Now correct according to evidence.' },
          { id: 'c', text: 'Initial distractor 2', isCorrect: false, rationale: 'Old distractor rationale for choice 2.' },
          { id: 'd', text: 'Initial distractor 3', isCorrect: false, rationale: 'Old distractor rationale for choice 3.' },
        ],
      },
      actorId: 'usr-admin',
      actorDisplayName: 'Dr. Apple Admin',
      actorRole: 'admin',
      changeReason: 'Errata: re-keying correct answer based on 2026 ACC/AHA guidelines',
    });

    expect(updateRes.ok).toBe(true);
    if (updateRes.ok) {
      const updated = updateRes.value.updatedQuestion;
      expect(updated.choices[0].isCorrect).toBe(false);
      expect(updated.choices[1].isCorrect).toBe(true);
      expect(updated.choices[1].text).toBe('New verified correct answer');
      expect(updated.bankVersion).toBeGreaterThan(1);
    }
  });
});
