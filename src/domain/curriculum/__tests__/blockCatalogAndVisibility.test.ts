import { describe, it, expect } from 'vitest';
import { BlockCatalog } from '../BlockCatalog.ts';
import { RoleBasedBlockVisibilityPolicy } from '../BlockVisibilityPolicy.ts';
import type { BlockPackDescriptor } from '../BootBlockResolver.ts';
import type { BlockManifest } from '../schemas.ts';

describe('BlockCatalog & BlockVisibilityPolicy', () => {
  const policy = new RoleBasedBlockVisibilityPolicy();

  const manifestPublished: BlockManifest = {
    schemaVersion: 1,
    block: {
      id: 'cvs' as any,
      code: 'Block 206',
      name: { en: 'Cardiovascular System', ar: 'الجهاز القلبي الوعائي' },
      shortName: 'CVS',
      description: { en: 'CVS desc', ar: 'وصف' },
      status: 'published',
      catalogOrder: 1,
      presentation: { glyph: 'heart', accent: 'rose' },
      aiProfileId: 'cvs-faculty-v1',
    },
    subjects: [
      { id: 'anatomy' as any, name: { en: 'Anatomy', ar: 'تشريح' }, order: 1 },
      { id: 'physiology' as any, name: { en: 'Physiology', ar: 'فسيولوجيا' }, order: 2 },
    ],
    chapters: [
      {
        id: 'cvs-ana-heart-dev' as any,
        subjectId: 'anatomy' as any,
        name: { en: 'Development', ar: 'تطور' },
        order: 1,
        sourceIds: [],
      },
    ],
    topics: [
      {
        id: 'cvs-ana-heart-tube-folding' as any,
        chapterId: 'cvs-ana-heart-dev' as any,
        name: { en: 'Looping', ar: 'التواء' },
        order: 1,
      },
    ],
    sources: [],
  };

  const manifestBeta: BlockManifest = {
    ...manifestPublished,
    block: {
      ...manifestPublished.block,
      id: 'cns' as any,
      code: 'Block 207',
      status: 'beta',
      catalogOrder: 2,
    },
  };

  const manifestDraft: BlockManifest = {
    ...manifestPublished,
    block: {
      ...manifestPublished.block,
      id: 'rrs' as any,
      code: 'Block 208',
      status: 'draft',
      catalogOrder: 3,
    },
  };

  const packs: BlockPackDescriptor[] = [
    { blockId: 'cvs' as any, manifest: manifestPublished, contentHash: 'hash-cvs' },
    { blockId: 'cns' as any, manifest: manifestBeta, contentHash: 'hash-cns' },
    { blockId: 'rrs' as any, manifest: manifestDraft, contentHash: 'hash-rrs' },
  ];

  it('filters visible blocks based on role', () => {
    const catalog = new BlockCatalog(packs, policy);

    // Student only sees published blocks
    const studentList = catalog.list('student-free');
    expect(studentList.map((p) => p.blockId)).toEqual(['cvs']);

    // Faculty sees published + beta blocks
    const facultyList = catalog.list('faculty-reviewer');
    expect(facultyList.map((p) => p.blockId)).toEqual(['cvs', 'cns']);

    // Admin sees all (published + beta + draft)
    const adminList = catalog.list('admin');
    expect(adminList.map((p) => p.blockId)).toEqual(['cvs', 'cns', 'rrs']);
  });

  it('correctly queries subjects, chapters, and topics', () => {
    const catalog = new BlockCatalog(packs, policy);

    const subjects = catalog.subjects('cvs' as any);
    expect(subjects).toHaveLength(2);
    expect(subjects[0].id).toBe('anatomy');

    const chapters = catalog.chapters('cvs' as any, 'anatomy' as any);
    expect(chapters).toHaveLength(1);
    expect(chapters[0].id).toBe('cvs-ana-heart-dev');

    const topics = catalog.topics('cvs' as any, 'cvs-ana-heart-dev' as any);
    expect(topics).toHaveLength(1);
    expect(topics[0].id).toBe('cvs-ana-heart-tube-folding');
  });

  it('resolves a full taxonomy node from QuestionTaxonomyRef', () => {
    const catalog = new BlockCatalog(packs, policy);

    const resolved = catalog.resolve({
      id: 'q-1',
      blockId: 'cvs',
      subjectId: 'anatomy',
      chapterId: 'cvs-ana-heart-dev',
      topicId: 'cvs-ana-heart-tube-folding',
    });

    expect(resolved).not.toBeNull();
    expect(resolved?.block.id).toBe('cvs');
    expect(resolved?.subject.id).toBe('anatomy');
    expect(resolved?.chapter.id).toBe('cvs-ana-heart-dev');
    expect(resolved?.topic?.id).toBe('cvs-ana-heart-tube-folding');
  });
});
