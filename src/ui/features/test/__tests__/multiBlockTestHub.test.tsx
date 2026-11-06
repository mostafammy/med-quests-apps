/**
 * Multi-Block Test Hub & Practice Modes Integration Test Suite
 * SPEC-010: Multi-Block Curriculum Architecture (User Story 3 & User Story 8)
 * Path: src/ui/features/test/__tests__/multiBlockTestHub.test.tsx
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { TestHub } from '../TestHub.tsx';
import { QuickPractice } from '../QuickPractice.tsx';
import { MockExamSetup } from '../MockExamSetup.tsx';
import { CurriculumLibrary } from '../../curriculum/CurriculumLibrary.tsx';
import { useQuestionStore } from '../../../../application/stores/useQuestionStore.ts';
import { useBlockContextStore } from '../../../../application/stores/useBlockContextStore.ts';
import { defaultBlockMementoStore } from '../../../../infrastructure/curriculum/LocalStorageBlockMementoStore.ts';
import { db } from '../../../../infrastructure/storage/db.ts';
import defaultCvsBank from '../../../../../content/cvs/dist/bank.v1.json';
import type { Question } from '../../../../domain/model/types.ts';
import type { BlockId } from '../../../../domain/curriculum/ids.ts';

function createMockCnsQuestion(id: string, subjectId: string): Question {
  return {
    id,
    blockId: 'cns',
    subjectId,
    chapterId: 'cns-ana-brainstem',
    topicId: 'cns-ana-cranial-nerves',
    concept: 'Cranial Nerve Nuclei',
    type: 'single-best-answer',
    stem: 'A 64-year-old patient presents with oculomotor palsy. Which brainstem structure is involved?',
    choices: [
      { id: 'a', text: 'Midbrain tegmentum', isCorrect: true, rationale: 'CN III emerges from midbrain.' },
      { id: 'b', text: 'Pons', isCorrect: false, rationale: 'Pons houses CN V-VIII.' },
      { id: 'c', text: 'Medulla', isCorrect: false, rationale: 'Medulla houses CN IX-XII.' },
      { id: 'd', text: 'Spinal cord', isCorrect: false, rationale: 'Spinal cord is below foramen magnum.' },
    ],
    explanation: 'The oculomotor nerve originates in the midbrain tegmentum at the level of the superior colliculus.',
    examTip: null,
    mnemonic: null,
    difficulty: 2,
    cognitiveLevel: 'understanding',
    highYield: true,
    origin: 'authored-grounded',
    evidence: [
      {
        chunkId: 'chk-cns-01',
        sourceName: 'CNS Neuroanatomy Atlas',
        location: 'Page 12',
        quote: 'The oculomotor nuclear complex lies in the rostral midbrain tegmentum.',
        kind: 'text',
      },
    ],
    status: 'active',
    bankVersion: 1,
  };
}

describe('SPEC-010: Multi-Subject Test Hub & Practice Modes (US3 & US8)', () => {
  const memoryStorage = new Map<string, string>();

  beforeEach(() => {
    memoryStorage.clear();
    (globalThis as any).window = {
      localStorage: {
        getItem: (k: string) => memoryStorage.get(k) ?? null,
        setItem: (k: string, v: string) => memoryStorage.set(k, v),
        removeItem: (k: string) => memoryStorage.delete(k),
      },
    };

    // Reset Dexie spies for Node.js SSR testing
    (vi.spyOn(db.attempts, 'toArray') as any).mockImplementation(async () => []);
    (vi.spyOn(db.attempts, 'where') as any).mockImplementation(() => ({
      equals: () => ({
        toArray: async () => [],
        count: async () => 0,
      }),
    }));
    (vi.spyOn(db.reviewCards, 'toArray') as any).mockImplementation(async () => []);
    (vi.spyOn(db.reviewCards, 'where') as any).mockImplementation(() => ({
      equals: () => ({
        toArray: async () => [],
        count: async () => 0,
      }),
    }));
    (vi.spyOn(db.srsCards, 'toArray') as any).mockImplementation(async () => []);
    (vi.spyOn(db.srsCards, 'where') as any).mockImplementation(() => ({
      equals: () => ({
        toArray: async () => [],
        count: async () => 0,
      }),
    }));
    (vi.spyOn(db.aiModelMetrics, 'toArray') as any).mockImplementation(async () => []);
  });

  it('renders CVS subjects in TestHub when active block is CVS', () => {
    useBlockContextStore.setState({ activeBlockId: 'cvs' as BlockId });
    useQuestionStore.setState({
      questions: defaultCvsBank as Question[],
      activeBlockId: 'cvs',
      isLoading: false,
    });

    const html = renderToString(
      <MemoryRouter initialEntries={['/test']}>
        <TestHub />
      </MemoryRouter>
    );
    const cleanHtml = html.replace(/<!--.*?-->/g, '');

    // Expect CVS subjects to be rendered in subject filter pills
    expect(cleanHtml).toContain('Anatomy &amp; Embryology');
    expect(cleanHtml).toContain('Histology');
    expect(cleanHtml).toContain('Microbiology');
    expect(cleanHtml).toContain('Physiology');
  });

  it('renders CNS subjects in TestHub when active block is CNS', () => {
    useBlockContextStore.setState({ activeBlockId: 'cns' as BlockId });
    const cnsQuestions = [
      createMockCnsQuestion('cns-q1', 'anatomy'),
      createMockCnsQuestion('cns-q2', 'physiology'),
    ];
    useQuestionStore.setState({
      questions: cnsQuestions,
      activeBlockId: 'cns',
      isLoading: false,
    });

    const html = renderToString(
      <MemoryRouter initialEntries={['/test']}>
        <TestHub />
      </MemoryRouter>
    );
    const cleanHtml = html.replace(/<!--.*?-->/g, '');

    // Expect CNS subjects to be rendered in subject filter pills
    expect(cleanHtml).toContain('Central Nervous System');
    expect(cleanHtml).toContain('Block 207');
    expect(cleanHtml).toContain('Neuroanatomy &amp; Embryology');
    expect(cleanHtml).toContain('Pathology &amp; Microbiology');
    expect(cleanHtml).toContain('Neuropharmacology');
  });

  it('renders CNS subjects in QuickPractice when active block is CNS', () => {
    useBlockContextStore.setState({ activeBlockId: 'cns' as BlockId });
    useQuestionStore.setState({
      questions: [],
      activeBlockId: 'cns',
      isLoading: false,
    });

    const html = renderToString(
      <MemoryRouter initialEntries={['/test/quick']}>
        <QuickPractice />
      </MemoryRouter>
    );
    const cleanHtml = html.replace(/<!--.*?-->/g, '');

    expect(cleanHtml).toContain('CNS Neuroanatomy &amp; Embryology');
    expect(cleanHtml).toContain('CNS Neuropharmacology');
  });

  it('renders CNS blueprint and beta advisory in MockExamSetup when active block is CNS', () => {
    useBlockContextStore.setState({ activeBlockId: 'cns' as BlockId });
    useQuestionStore.setState({
      questions: [],
      activeBlockId: 'cns',
      isLoading: false,
    });

    const html = renderToString(
      <MemoryRouter initialEntries={['/test/mock']}>
        <MockExamSetup />
      </MemoryRouter>
    );
    const cleanHtml = html.replace(/<!--.*?-->/g, '');

    expect(cleanHtml).toContain('Curriculum Blueprint Distribution (5 Subjects)');
    expect(cleanHtml).toContain('This curriculum block is currently in beta');
    expect(cleanHtml).toContain('No Questions Published Yet');
  });

  it('dynamically renders curriculum sources from active block manifest in CurriculumLibrary (US8)', () => {
    // 1. In CVS: renders 7 CVS source documents
    useBlockContextStore.setState({ activeBlockId: 'cvs' as BlockId });
    let html = renderToString(
      <MemoryRouter initialEntries={['/curriculum']}>
        <CurriculumLibrary />
      </MemoryRouter>
    );
    let cleanHtml = html.replace(/<!--.*?-->/g, '');
    expect(cleanHtml).toContain('Block 206');
    expect(cleanHtml).toContain('Cardiovascular System');
    expect(cleanHtml).toContain('2nd Year CVS Anatomy of Heart and Mediastinum Handout');
    expect(cleanHtml).toContain('CVS Physiology &amp; Hemodynamics Self-Assessment Guide');

    // 2. In CNS: renders 6 CNS source documents
    useBlockContextStore.setState({ activeBlockId: 'cns' as BlockId });
    html = renderToString(
      <MemoryRouter initialEntries={['/curriculum']}>
        <CurriculumLibrary />
      </MemoryRouter>
    );
    cleanHtml = html.replace(/<!--.*?-->/g, '');
    expect(cleanHtml).toContain('Block 207');
    expect(cleanHtml).toContain('Central Nervous System');
    expect(cleanHtml).toContain('CNS Neuroanatomy, Cranial Nerves &amp; Tracts Atlas');
    expect(cleanHtml).toContain('Neuropharmacology &amp; Psychotropics Review');
  });

  it('restores per-block filter mementos independently (ADR-010-05)', () => {
    // Save memento for CVS
    defaultBlockMementoStore.save({
      blockId: 'cvs' as BlockId,
      testHub: {
        subjectId: 'microbiology',
        chapterId: 'cvs-mic-rheumatic',
        count: 10,
        highYieldOnly: true,
      },
      reviewTab: null,
      savedAtIso: new Date().toISOString(),
    });

    // Save memento for CNS
    defaultBlockMementoStore.save({
      blockId: 'cns' as BlockId,
      testHub: {
        subjectId: 'pharmacology',
        chapterId: 'cns-pha-antiepileptic',
        count: 30,
        highYieldOnly: false,
      },
      reviewTab: null,
      savedAtIso: new Date().toISOString(),
    });

    const cvsMemento = defaultBlockMementoStore.load('cvs' as BlockId);
    expect(cvsMemento?.testHub.subjectId).toBe('microbiology');
    expect(cvsMemento?.testHub.count).toBe(10);

    const cnsMemento = defaultBlockMementoStore.load('cns' as BlockId);
    expect(cnsMemento?.testHub.subjectId).toBe('pharmacology');
    expect(cnsMemento?.testHub.count).toBe(30);
  });
});
