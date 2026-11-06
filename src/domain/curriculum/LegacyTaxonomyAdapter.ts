/**
 * Legacy Taxonomy Adapter (Strangler Fig pattern)
 * Bridges BlockManifest into the legacy Taxonomy domain interface.
 * SPEC-010: Multi-Block Curriculum Architecture
 */

import type { BlockManifest } from './schemas.ts';
import type { Taxonomy, Block, Subject, Chapter, Topic } from '../model/types.ts';

export class LegacyTaxonomyAdapter {
  public static manifestToTaxonomy(
    manifest: BlockManifest,
    locale: 'en' | 'ar' = 'en'
  ): Taxonomy {
    const block: Block = {
      id: manifest.block.id,
      name: manifest.block.name[locale] || manifest.block.name.en,
      shortName: manifest.block.shortName,
      code: manifest.block.code,
      description: manifest.block.description[locale] || manifest.block.description.en,
      subjectIds: manifest.subjects.map((s) => s.id),
    };

    const subjects: Subject[] = manifest.subjects.map((s) => ({
      id: s.id,
      blockId: manifest.block.id,
      name: s.name[locale] || s.name.en,
      order: s.order,
    }));

    const chapters: Chapter[] = manifest.chapters.map((c) => ({
      id: c.id,
      blockId: manifest.block.id,
      subjectId: c.subjectId,
      name: c.name[locale] || c.name.en,
      order: c.order,
      sourceIds: c.sourceIds,
    }));

    const topics: Topic[] = manifest.topics.map((t) => ({
      id: t.id,
      blockId: manifest.block.id,
      chapterId: t.chapterId,
      name: t.name[locale] || t.name.en,
      order: t.order,
    }));

    return {
      block,
      subjects,
      chapters,
      topics,
    };
  }
}
