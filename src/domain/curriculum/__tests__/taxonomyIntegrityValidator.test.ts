import { describe, it, expect } from 'vitest';
import { TaxonomyIntegrityValidator } from '../TaxonomyIntegrityValidator.ts';
import type { BlockManifest } from '../schemas.ts';

describe('TaxonomyIntegrityValidator (TI-1 through TI-9)', () => {
  const validator = new TaxonomyIntegrityValidator();

  const validManifest: BlockManifest = {
    schemaVersion: 1,
    block: {
      id: 'cns' as any,
      code: 'Block 207',
      name: { en: 'Central Nervous System', ar: 'الجهاز العصبي المركزي' },
      shortName: 'CNS',
      description: { en: 'CNS block description', ar: 'وصف مجمع الجهاز العصبي' },
      status: 'published',
      catalogOrder: 2,
      presentation: { glyph: 'brain', accent: 'violet' },
      aiProfileId: 'cns-faculty-v1',
    },
    subjects: [
      { id: 'anatomy' as any, name: { en: 'Anatomy', ar: 'تشريح' }, order: 1 },
      { id: 'physiology' as any, name: { en: 'Physiology', ar: 'فسيولوجيا' }, order: 2 },
    ],
    chapters: [
      {
        id: 'cns-ana-brainstem' as any,
        subjectId: 'anatomy' as any,
        name: { en: 'Brainstem', ar: 'جذع الدماغ' },
        order: 1,
        sourceIds: ['SRC-CNS-01'],
      },
      {
        id: 'cns-phy-synapse' as any,
        subjectId: 'physiology' as any,
        name: { en: 'Synaptic Transmission', ar: 'النقل المشبكي' },
        order: 1,
        sourceIds: ['SRC-CNS-02'],
      },
    ],
    topics: [
      {
        id: 'cns-ana-brainstem/cranial-nerves' as any,
        chapterId: 'cns-ana-brainstem' as any,
        name: { en: 'Cranial Nerves', ar: 'الأعصاب القحفية' },
        order: 1,
      },
    ],
    sources: [
      {
        id: 'SRC-CNS-01',
        subjectId: 'anatomy' as any,
        title: { en: 'Neuroanatomy', ar: 'التشريح العصبي' },
        fileName: 'neuroanatomy.pdf',
        format: 'PDF',
        extent: { unit: 'pages', count: 50 },
        highlights: ['Brainstem'],
      },
      {
        id: 'SRC-CNS-02',
        subjectId: 'physiology' as any,
        title: { en: 'Neurophysiology', ar: 'الفسيولوجيا العصبية' },
        fileName: 'neurophysiology.pdf',
        format: 'PDF',
        extent: { unit: 'pages', count: 40 },
        highlights: ['Synapses'],
      },
    ],
  };

  it('passes a fully compliant manifest', () => {
    const result = validator.validateManifest(validManifest);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.block.id).toBe('cns');
    }
  });

  it('enforces TI-1: catches duplicate subject IDs', () => {
    const invalid = {
      ...validManifest,
      subjects: [
        { id: 'anatomy', name: { en: 'Anatomy 1', ar: 'تشريح 1' }, order: 1 },
        { id: 'anatomy', name: { en: 'Anatomy 2', ar: 'تشريح 2' }, order: 2 },
      ],
    };
    const result = validator.validateManifest(invalid);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.violations.some((v) => v.invariant === 'TI-1')).toBe(true);
    }
  });

  it('enforces TI-3: catches chapter referencing non-existent subject', () => {
    const invalid = {
      ...validManifest,
      chapters: [
        {
          id: 'cns-unknown-chap',
          subjectId: 'microbiology', // Not in subjects list
          name: { en: 'Micro Chapter', ar: 'فصل الميكرو' },
          order: 1,
          sourceIds: [],
        },
      ],
    };
    const result = validator.validateManifest(invalid);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.violations.some((v) => v.invariant === 'TI-3')).toBe(true);
    }
  });

  it('enforces TI-4: catches chapter without block prefix', () => {
    const invalid = {
      ...validManifest,
      chapters: [
        {
          id: 'other-prefix-chap',
          subjectId: 'anatomy',
          name: { en: 'Bad Prefix Chapter', ar: 'فصل ببادئة خاطئة' },
          order: 1,
          sourceIds: [],
        },
      ],
    };
    const result = validator.validateManifest(invalid);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.violations.some((v) => v.invariant === 'TI-4')).toBe(true);
    }
  });

  it('enforces TI-5: catches topic referencing non-existent chapter', () => {
    const invalid = {
      ...validManifest,
      topics: [
        {
          id: 'cns-nonexistent-chap/some-topic',
          chapterId: 'cns-nonexistent-chap',
          name: { en: 'Bad Topic', ar: 'موضوع غير مرتبط' },
          order: 1,
        },
      ],
    };
    const result = validator.validateManifest(invalid);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.violations.some((v) => v.invariant === 'TI-5')).toBe(true);
    }
  });

  it('enforces TI-6: catches non-contiguous subject ordering', () => {
    const invalid = {
      ...validManifest,
      subjects: [
        { id: 'anatomy', name: { en: 'Anatomy', ar: 'تشريح' }, order: 1 },
        { id: 'physiology', name: { en: 'Physiology', ar: 'فسيولوجيا' }, order: 4 }, // Gap: 1, 4
      ],
    };
    const result = validator.validateManifest(invalid);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.violations.some((v) => v.invariant === 'TI-6')).toBe(true);
    }
  });

  it('enforces TI-7: catches chapter referencing unknown source document', () => {
    const invalid = {
      ...validManifest,
      chapters: [
        {
          id: 'cns-ana-brainstem',
          subjectId: 'anatomy',
          name: { en: 'Brainstem', ar: 'جذع الدماغ' },
          order: 1,
          sourceIds: ['SRC-UNKNOWN-999'],
        },
      ],
    };
    const result = validator.validateManifest(invalid);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.violations.some((v) => v.invariant === 'TI-7')).toBe(true);
    }
  });

  it('enforces TI-8: partitions bank questions into resolvable and orphan sets', () => {
    const questions = [
      {
        id: 'q-cns-001',
        blockId: 'cns',
        subjectId: 'anatomy',
        chapterId: 'cns-ana-brainstem',
        topicId: 'cns-ana-brainstem/cranial-nerves',
      },
      {
        id: 'q-cns-002',
        blockId: 'cns',
        subjectId: 'anatomy',
        chapterId: 'cns-ana-brainstem',
        topicId: 'cns-unknown-topic', // Orphan topic
      },
      {
        id: 'q-cvs-001',
        blockId: 'cvs', // Wrong block
        subjectId: 'anatomy',
        chapterId: 'cns-ana-brainstem',
        topicId: 'cns-ana-brainstem/cranial-nerves',
      },
    ];

    const { resolvable, orphans } = validator.partitionBank(validManifest, questions);
    expect(resolvable).toHaveLength(1);
    expect(resolvable[0].id).toBe('q-cns-001');
    expect(orphans).toHaveLength(2);
    expect(orphans.map((o) => o.id)).toEqual(['q-cns-002', 'q-cvs-001']);
  });

  it('validates catalog cross-pack uniqueness', () => {
    const manifestA = validManifest;
    const manifestB: BlockManifest = {
      ...validManifest,
      block: { ...validManifest.block, id: 'cns-2' as any },
      chapters: [
        {
          id: 'cns-ana-brainstem' as any, // ID collision with manifestA!
          subjectId: 'anatomy' as any,
          name: { en: 'Colliding Chapter', ar: 'فصل متصادم' },
          order: 1,
          sourceIds: [],
        },
      ],
    };

    const violations = validator.validateCatalog([manifestA, manifestB]);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations.some((v) => v.invariant === 'TI-4')).toBe(true);
  });
});
