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

import type { Taxonomy, Subject, Chapter, Topic, SubjectId, ChapterId } from '../model/types.ts';
import { CVS_TAXONOMY } from './cvsTaxonomy.ts';

export interface ICurriculumTaxonomyRegistry {
  getTaxonomy(): Taxonomy;
  getSubjects(): readonly Subject[];
  getChapters(subjectId?: SubjectId): readonly Chapter[];
  getTopics(chapterId?: ChapterId): readonly Topic[];
  registerSubject(subject: Omit<Subject, 'blockId' | 'order'>): Subject;
  registerChapter(chapter: Omit<Chapter, 'blockId' | 'order' | 'sourceIds'>): Chapter;
  hasSubject(id: SubjectId): boolean;
  hasChapter(id: ChapterId): boolean;
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

  public getSubjects(): readonly Subject[] {
    return this.currentTaxonomy.subjects;
  }

  public getChapters(subjectId?: SubjectId): readonly Chapter[] {
    if (!subjectId || subjectId === 'all') {
      return this.currentTaxonomy.chapters;
    }
    return this.currentTaxonomy.chapters.filter((c) => c.subjectId === subjectId);
  }

  public getTopics(chapterId?: ChapterId): readonly Topic[] {
    if (!chapterId || chapterId === 'all') {
      return this.currentTaxonomy.topics;
    }
    return this.currentTaxonomy.topics.filter((t) => t.chapterId === chapterId);
  }

  public hasSubject(id: SubjectId): boolean {
    return this.currentTaxonomy.subjects.some((s) => s.id === id);
  }

  public hasChapter(id: ChapterId): boolean {
    return this.currentTaxonomy.chapters.some((c) => c.id === id);
  }

  public registerSubject(subjectInput: Omit<Subject, 'blockId' | 'order'>): Subject {
    const existing = this.currentTaxonomy.subjects.find((s) => s.id === subjectInput.id);
    if (existing) return existing;

    const newSubject: Subject = {
      id: subjectInput.id,
      blockId: 'cvs',
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
    chapterInput: Omit<Chapter, 'blockId' | 'order' | 'sourceIds'>
  ): Chapter {
    const existing = this.currentTaxonomy.chapters.find((c) => c.id === chapterInput.id);
    if (existing) return existing;

    // Ensure parent subject exists or auto-register it
    if (!this.hasSubject(chapterInput.subjectId)) {
      this.registerSubject({
        id: chapterInput.subjectId,
        name: `CVS ${chapterInput.subjectId.charAt(0).toUpperCase() + chapterInput.subjectId.slice(1)}`,
      });
    }

    const newChapter: Chapter = {
      id: chapterInput.id,
      blockId: 'cvs',
      subjectId: chapterInput.subjectId,
      name: chapterInput.name,
      order: this.currentTaxonomy.chapters.length + 1,
      sourceIds: [`SRC-CVS-${chapterInput.subjectId.toUpperCase().slice(0, 3)}-EXPANSION`],
    };

    // Auto-create a default review topic for this chapter
    const defaultTopic: Topic = {
      id: `${newChapter.id}/core-concepts`,
      blockId: 'cvs',
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
