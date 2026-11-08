import { describe, it, expect, beforeEach } from 'vitest';
import { DirectJsonQuestionStrategy } from '../aiQuestionParser/DirectJsonQuestionStrategy.ts';
import { QuestionQualityGatePipeline } from '../qualityGatePipeline.ts';
import { normalizeBlockId, QuestionNormalizer } from '../QuestionNormalizer.ts';
import { TaxonomyDisplayResolver } from '../../taxonomy/TaxonomyDisplayResolver.ts';
import {
  LocalBankStorageSimulator,
  safeSetStorage,
  STORAGE_KEYS,
} from '../../../infrastructure/questionBank/clients/LocalBankStorageSimulator.ts';
import type { GovernedQuestion } from '../../../../specs/005-global-question-bank-governance/contracts/question-bank-governance-ports.ts';
import { createClientQddEngine } from '../duplication/clientCompositionRoot.ts';

const SAMPLE_RAW_QUESTION = {
  id: 'q-cns-ana-136',
  blockId: 'block-02-supratentorial',
  subjectId: 'subj-cns-anatomy',
  chapterId: 'chap-white-matter',
  topicId: 'top-fiber-classification',
  concept: 'Classification of Cerebral White Matter Fibers',
  type: 'single-best-answer',
  stem: 'Based on their anatomical connections, into which three functional categories are the myelinated nerve fibers of the cerebral white matter classified?',
  choices: [
    {
      id: 'a',
      text: 'Projection fibers, commissural fibers, and association fibers',
      isCorrect: true,
      rationale: 'Cerebral white matter consists of myelinated nerve fibers supported by neuroglia.',
    },
    {
      id: 'b',
      text: 'Somatic motor fibers, general sensory fibers, and visceral autonomic fibers',
      isCorrect: false,
      rationale: 'Functional classification of peripheral/cranial nerves.',
    },
    {
      id: 'c',
      text: 'Pyramidal fibers, extrapyramidal fibers, and spinocerebellar fibers',
      isCorrect: false,
      rationale: 'Specific motor/sensory tracts.',
    },
    {
      id: 'd',
      text: 'Primary afferent fibers, secondary relay fibers, and tertiary thalamic fibers',
      isCorrect: false,
      rationale: 'Order of neurons in sensory pathways.',
    },
  ],
  explanation: 'Cerebral white matter is classified into projection, commissural, and association fibers.',
  examTip: 'Remember association stays within hemisphere, commissural crosses to opposite hemisphere.',
  difficulty: 'easy',
  cognitiveLevel: 'recall',
  highYield: true,
  origin: 'White matter lecture notes.pdf',
  evidence: {
    chunkId: 'chunk-wm-01',
    sourceName: 'White matter lecture notes.pdf',
    location: 'White Matter of Cerebral Hemispheres',
    quote: 'The nerve fibers are classified into three groups: projection, commissural, association.',
    kind: 'text',
  },
  status: 'published',
  bankVersion: '1.0.0',
};

describe('Supratentorial Block Ingestion & Taxonomy Resolution Regression Test', () => {
  beforeEach(() => {
    // Clear storage before each test
    const simulator = new LocalBankStorageSimulator();
    simulator.saveLocalCanonicalBank('cns', []);
  });

  it('normalizes supratentorial block variant to canonical cns', () => {
    expect(normalizeBlockId('block-02-supratentorial')).toBe('cns');
    expect(normalizeBlockId('supratentorial')).toBe('cns');
    expect(normalizeBlockId('infratentorial')).toBe('cns');
    expect(normalizeBlockId('cns-anatomy')).toBe('cns');
  });

  it('humanizes taxonomy slugs to clean clinical titles', () => {
    expect(TaxonomyDisplayResolver.resolveChapterName('chap-white-matter')).toBe('White Matter');
    expect(TaxonomyDisplayResolver.resolveSubjectName('subj-cns-anatomy')).toBe('CNS Anatomy');
    expect(TaxonomyDisplayResolver.resolveSubjectMeta('subj-cns-anatomy').icon).toBe('🩺');
  });

  it('successfully parses and passes quality gates for raw JSON questions with supratentorial blockId', () => {
    const directResult = DirectJsonQuestionStrategy.extractDirectJsonItems(
      [SAMPLE_RAW_QUESTION],
      { rawText: '', stemMode: 'verbatim' } as any,
      'block-02-supratentorial',
      Date.now()
    );

    expect(directResult.items).toHaveLength(1);
    const parsedItem = directResult.items[0];
    expect(parsedItem.question.blockId).toBe('cns');

    const pipeline = new QuestionQualityGatePipeline();
    const valResult = pipeline.validateBatch([parsedItem.question]);
    expect(valResult.validQuestions).toHaveLength(1);
    expect(valResult.errors).toHaveLength(0);
  });

  it('auto-heals orphaned supratentorial bank in LocalBankStorageSimulator into canonical cns', () => {
    const simulator = new LocalBankStorageSimulator();
    const orphanedQuestion: GovernedQuestion = {
      ...(SAMPLE_RAW_QUESTION as any),
      provenanceScope: 'global-canonical',
      editorialStatus: 'published',
      stemHash: 'stem-hash-136',
      globalRevision: 1,
      authorId: 'admin',
      authorDisplayName: 'Admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Simulate an existing orphaned bank key from a previous session
    safeSetStorage(
      `${STORAGE_KEYS.CANONICAL_BANK}_block-02-supratentorial`,
      JSON.stringify([orphanedQuestion])
    );

    // When fetching CNS canonical bank, simulator auto-heals and migrates the orphaned item
    const cnsBank = simulator.getLocalCanonicalBank('cns');
    expect(cnsBank.some((q) => q.id === 'q-cns-ana-136')).toBe(true);
    const healedItem = cnsBank.find((q) => q.id === 'q-cns-ana-136');
    expect(healedItem?.blockId).toBe('cns');
  });

  it('detects duplicate when re-pasting CNS question against client QDD engine', async () => {
    const existingQuestion = QuestionNormalizer.repairToQuestionSchema(SAMPLE_RAW_QUESTION, 'cns');

    // Client QDD engine initialized with existing CNS bank
    const qddEngine = await createClientQddEngine([existingQuestion]);

    // Check newly pasted probe
    const probeQuestion = QuestionNormalizer.repairToQuestionSchema({
      ...SAMPLE_RAW_QUESTION,
      id: 'q-cns-ana-136-probe-1',
    }, 'cns');

    const res = await qddEngine.check(probeQuestion, { kind: 'block', blockId: 'cns' }, 'batch-audit');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.relation).toBe('EXACT');
      expect(res.value.candidates.length).toBeGreaterThan(0);
      expect(res.value.candidates[0].matchedQuestionId).toBe('q-cns-ana-136');
    }
  });
});
