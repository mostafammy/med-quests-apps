/**
 * Domain Service & Registry: CurriculumTaxonomyRegistry
 * Manages the canonical Cardiovascular System curriculum taxonomy and dynamically
 * accommodates administrative expansions (e.g. newly approved Subjects & Chapters).
 *
 * Adheres to SOLID:
 * - Single Responsibility: Taxonomy registry, persistence, and querying.
 * - Open/Closed: Canonical taxonomy is preserved while allowing dynamic expansions.
 * - Dependency Inversion: Exposes ICurriculumTaxonomyRegistry abstraction.
 */

import type {
  Taxonomy,
  Subject,
  Chapter,
  Topic,
  SubjectId,
  ChapterId,
  BlockId,
  TopicId,
  SourceId,
} from '../model/types.ts';
import { CVS_TAXONOMY } from './cvsTaxonomy.ts';
import cnsManifest from '../../../content/cns/manifest.json';

export interface ICurriculumTaxonomyRegistry {
  getTaxonomy(): Taxonomy;
  getSubjects(blockId?: string): readonly Subject[];
  getChapters(subjectId?: SubjectId, blockId?: string): readonly Chapter[];
  getTopics(chapterId?: ChapterId, blockId?: string): readonly Topic[];
  registerSubject(
    subject: Omit<Subject, 'order' | 'blockId'> & { blockId?: string }
  ): Subject;
  registerChapter(
    chapter: Omit<Chapter, 'order' | 'sourceIds' | 'blockId'> & { blockId?: string }
  ): Chapter;
  hasSubject(id: SubjectId, blockId?: string): boolean;
  hasChapter(id: ChapterId, blockId?: string): boolean;
  resetToCanonical(): void;
}

export class CurriculumTaxonomyRegistry implements ICurriculumTaxonomyRegistry {
  private static instance: CurriculumTaxonomyRegistry | null = null;
  private static readonly STORAGE_KEY = 'medquests_dynamic_curriculum_taxonomy_v1';

  private currentTaxonomy: Taxonomy;
  private listeners: Array<() => void> = [];

  constructor() {
    this.currentTaxonomy = this.loadPersistedTaxonomy();
  }

  public static getInstance(): CurriculumTaxonomyRegistry {
    if (!CurriculumTaxonomyRegistry.instance) {
      CurriculumTaxonomyRegistry.instance = new CurriculumTaxonomyRegistry();
    }
    return CurriculumTaxonomyRegistry.instance;
  }

  public getTaxonomy(): Taxonomy {
    return this.currentTaxonomy;
  }

  public getSubjects(blockId?: string): readonly Subject[] {
    if (!blockId || blockId === 'all') {
      return this.currentTaxonomy.subjects;
    }
    return this.currentTaxonomy.subjects.filter((s) => !s.blockId || s.blockId === blockId);
  }

  public getChapters(subjectId?: SubjectId, blockId?: string): readonly Chapter[] {
    let chapters = this.currentTaxonomy.chapters;
    if (blockId && blockId !== 'all') {
      chapters = chapters.filter((c) => !c.blockId || c.blockId === blockId);
    }
    if (blockId === 'cns') {
      const cnsCanonical: Chapter[] = cnsManifest.chapters.map((c, idx) => ({
        id: c.id,
        blockId: 'cns',
        subjectId: c.subjectId,
        name: typeof c.name === 'string' ? c.name : (c.name as { en?: string })?.en || c.id,
        order: idx + 1,
        sourceIds: c.sourceIds || [],
      }));
      const existingIds = new Set(chapters.map((c) => c.id));
      const extras = cnsCanonical.filter((c) => !existingIds.has(c.id));
      chapters = [...chapters, ...extras];
    }
    if (!subjectId || subjectId === 'all') {
      return chapters;
    }
    return chapters.filter((c) => c.subjectId === subjectId);
  }

  public getTopics(chapterId?: ChapterId, blockId?: string): readonly Topic[] {
    let topics = this.currentTaxonomy.topics;
    if (blockId && blockId !== 'all') {
      topics = topics.filter((t) => !t.blockId || t.blockId === blockId);
    }
    if (!chapterId || chapterId === 'all') {
      return topics;
    }
    return topics.filter((t) => t.chapterId === chapterId);
  }

  public hasSubject(id: SubjectId, blockId?: string): boolean {
    if (this.currentTaxonomy.subjects.some(
      (s) => s.id === id && (!blockId || !s.blockId || s.blockId === blockId)
    )) {
      return true;
    }
    if (blockId === 'cns') {
      return cnsManifest.subjects.some((s) => s.id === id);
    }
    return false;
  }

  public hasChapter(id: ChapterId, blockId?: string): boolean {
    if (this.currentTaxonomy.chapters.some(
      (c) => c.id === id && (!blockId || !c.blockId || c.blockId === blockId)
    )) {
      return true;
    }
    if (blockId === 'cns') {
      return cnsManifest.chapters.some((c) => c.id === id);
    }
    return false;
  }

  public registerSubject(
    subjectInput: Omit<Subject, 'order' | 'blockId'> & { blockId?: string }
  ): Subject {
    const targetBlockId = (subjectInput.blockId || 'cvs') as BlockId;
    const existing = this.currentTaxonomy.subjects.find(
      (s) => s.id === subjectInput.id && (!s.blockId || s.blockId === targetBlockId)
    );
    if (existing) return existing;

    const newSubject: Subject = {
      id: subjectInput.id,
      blockId: targetBlockId,
      name: subjectInput.name,
      order: this.currentTaxonomy.subjects.length + 1,
    };

    const updatedSubjects = [...this.currentTaxonomy.subjects, newSubject];
    const updatedSubjectIds = [...this.currentTaxonomy.block.subjectIds, newSubject.id];

    this.currentTaxonomy = {
      ...this.currentTaxonomy,
      block: {
        ...this.currentTaxonomy.block,
        subjectIds: updatedSubjectIds,
      },
      subjects: updatedSubjects,
    };

    this.persistTaxonomy();
    this.notifyListeners();
    return newSubject;
  }

  public registerChapter(
    chapterInput: Omit<Chapter, 'order' | 'sourceIds' | 'blockId'> & { blockId?: string }
  ): Chapter {
    const targetBlockId = (chapterInput.blockId || 'cvs') as BlockId;
    const existing = this.currentTaxonomy.chapters.find(
      (c) => c.id === chapterInput.id && (!c.blockId || c.blockId === targetBlockId)
    );
    if (existing) return existing;

    // Ensure parent subject exists or auto-register it
    if (!this.hasSubject(chapterInput.subjectId, targetBlockId)) {
      this.registerSubject({
        id: chapterInput.subjectId,
        blockId: targetBlockId,
        name: `${targetBlockId.toUpperCase()} ${chapterInput.subjectId.charAt(0).toUpperCase() + chapterInput.subjectId.slice(1)}`,
      });
    }

    const newChapter: Chapter = {
      id: chapterInput.id,
      blockId: targetBlockId,
      subjectId: chapterInput.subjectId,
      name: chapterInput.name,
      order: this.currentTaxonomy.chapters.length + 1,
      sourceIds: [`SRC-${targetBlockId.toUpperCase()}-${chapterInput.subjectId.toUpperCase().slice(0, 3)}-EXPANSION` as SourceId],
    };

    // Auto-create a default review topic for this chapter
    const defaultTopic: Topic = {
      id: `${newChapter.id}/core-concepts` as TopicId,
      blockId: targetBlockId,
      chapterId: newChapter.id,
      name: `${newChapter.name} - Core Clinical Concepts`,
      order: this.currentTaxonomy.topics.length + 1,
    };

    this.currentTaxonomy = {
      ...this.currentTaxonomy,
      chapters: [...this.currentTaxonomy.chapters, newChapter],
      topics: [...this.currentTaxonomy.topics, defaultTopic],
    };

    this.persistTaxonomy();
    this.notifyListeners();
    return newChapter;
  }

  public resetToCanonical(): void {
    this.currentTaxonomy = JSON.parse(JSON.stringify(CVS_TAXONOMY));
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(CurriculumTaxonomyRegistry.STORAGE_KEY);
      }
    } catch {
      // ignore
    }
    this.notifyListeners();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        // ignore
      }
    }
  }

  private loadPersistedTaxonomy(): Taxonomy {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(CurriculumTaxonomyRegistry.STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.subjects) && Array.isArray(parsed.chapters)) {
            return parsed as Taxonomy;
          }
        }
      }
    } catch {
      // Fall through to canonical
    }
    return JSON.parse(JSON.stringify(CVS_TAXONOMY));
  }

  private persistTaxonomy(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(
          CurriculumTaxonomyRegistry.STORAGE_KEY,
          JSON.stringify(this.currentTaxonomy)
        );
      }
    } catch {
      // ignore quota errors
    }
  }
}

export const curriculumTaxonomyRegistry = CurriculumTaxonomyRegistry.getInstance();
