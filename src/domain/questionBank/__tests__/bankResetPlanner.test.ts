import { describe, expect, it } from 'vitest';
import { BankResetPlanner } from '../bankResetPlanner.ts';
import { QuestionCanonicalHasher } from '../canonicalHasher.ts';
import type { GovernedQuestion } from '../../../../specs/005-global-question-bank-governance/contracts/question-bank-governance-ports.ts';
import type { Question } from '../../model/types.ts';

const BASE_QUESTION: Question = {
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
    { id: 'b', text: 'Failure of neural crest migration', isCorrect: false, rationale: 'Causes conotruncal defects.' },
    { id: 'c', text: 'Endocardial cushion defect', isCorrect: false, rationale: 'Causes ostium primum defect.' },
    { id: 'd', text: 'Failure of sinus venosus closure', isCorrect: false, rationale: 'Causes sinus venosus ASD.' },
  ],
  explanation: 'Ostium secundum ASD is the most common ASD, caused by excessive apoptosis in the septum primum.',
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

function governed(overrides: Partial<GovernedQuestion> & Pick<GovernedQuestion, 'id' | 'stem'>): GovernedQuestion {
  const { stemHash: _stemHashOverride, ...rest } = overrides;
  const stemHash = _stemHashOverride ?? QuestionCanonicalHasher.computeStemHashSync(overrides.stem);
  return {
    ...BASE_QUESTION,
    provenanceScope: 'global-canonical',
    editorialStatus: 'published',
    globalRevision: 1,
    authorId: 'usr-faculty',
    authorDisplayName: 'Faculty',
    reviewedById: null,
    reviewedByDisplayName: null,
    reviewerNotes: null,
    publishedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...rest,
    // Keep the hash coherent even when an override changes the stem.
    stemHash,
  };
}

describe('BankResetPlanner', () => {
  const planner = new BankResetPlanner();

  it('restores canonical rows while preserving learner-owned and pending-review data', () => {
    const canonicalA = governed({
      id: 'q-canonical-a',
      stem: 'Canonical A stem that is long enough to be valid for the schema.',
      globalRevision: 4,
      bankVersion: 3,
    });
    const canonicalB = governed({
      id: 'q-canonical-b',
      stem: 'Canonical B stem that is long enough to be valid for the schema.',
      globalRevision: 4,
      bankVersion: 2,
    });
    const staleCanonical = governed({
      id: 'q-stale-canonical',
      stem: 'Stale canonical row that no longer exists in the latest canonical snapshot.',
      globalRevision: 2,
    });
    const localCustom = governed({
      id: 'q-private-custom',
      stem: 'My private custom question kept only on this device and never shared.',
      provenanceScope: 'local-custom',
      editorialStatus: 'local_draft',
      globalRevision: 0,
    });
    const pendingSubmission = governed({
      id: 'q-pending-submission',
      stem: 'A pending submission awaiting faculty review and never yet published.',
      provenanceScope: 'submitted-pending',
      editorialStatus: 'pending_review',
      globalRevision: 0,
    });

    const plan = planner.buildPlan({
      blockId: 'cvs',
      currentLocalQuestions: [staleCanonical, localCustom, pendingSubmission],
      canonicalQuestions: [canonicalA, canonicalB],
      previousRevision: 2,
      newRevision: 4 as any,
      syncedAt: '2026-10-26T00:00:00.000Z',
    });

    expect(plan.restoredCanonicalCount).toBe(2);
    expect(plan.preservedLocalCount).toBe(2);
    expect(plan.archivedStaleCount).toBe(1);
    expect(plan.report.insertedCount).toBe(2);
    expect(plan.report.preservedLocalCustomCount).toBe(2);
    expect(plan.report.archivedTombstoneCount).toBe(1);

    const byId = new Map(plan.questions.map((question) => [question.id, question]));
    expect(byId.get('q-canonical-a')?.editorialStatus).toBe('published');
    expect(byId.get('q-canonical-b')?.editorialStatus).toBe('published');
    expect(byId.get('q-private-custom')?.editorialStatus).toBe('local_draft');
    expect(byId.get('q-pending-submission')?.editorialStatus).toBe('pending_review');
    expect(byId.get('q-stale-canonical')?.editorialStatus).toBe('archived');
    expect(byId.get('q-stale-canonical')?.status).toBe('quarantined');
    expect(plan.questions).toHaveLength(5);
  });

  it('does not silently delete a local custom item when its id collides with a canonical id', () => {
    const localCustom = governed({
      id: 'q-collision',
      stem: 'A private local custom question with a colliding identifier.',
      provenanceScope: 'local-custom',
      editorialStatus: 'local_draft',
      globalRevision: 0,
    });
    const canonical = governed({
      id: 'q-collision',
      stem: 'A canonical question that legitimately owns the colliding identifier.',
      globalRevision: 5,
    });

    const plan = planner.buildPlan({
      blockId: 'cvs',
      currentLocalQuestions: [localCustom],
      canonicalQuestions: [canonical],
      previousRevision: 4,
      newRevision: 5 as any,
      syncedAt: '2026-10-26T00:00:00.000Z',
    });

    const canonicalRows = plan.questions.filter((question) => question.id === 'q-collision');
    const preservedCustomRows = plan.questions.filter(
      (question) => question.provenanceScope === 'local-custom'
    );

    expect(canonicalRows).toHaveLength(1);
    expect(canonicalRows[0].editorialStatus).toBe('published');
    expect(preservedCustomRows).toHaveLength(1);
    expect(preservedCustomRows[0].id).not.toBe('q-collision');
    expect(plan.preservedLocalCount).toBe(1);
  });
});
