/**
 * Immutable Block Catalog Registry (FR-004)
 * Provides frozen, queryable reads of all curriculum packs with visibility filtering.
 * SPEC-010: Multi-Block Curriculum Architecture
 */

import { BlockId, ChapterId, SubjectKey } from './ids.ts';
import type {
  BlockManifest,
  SubjectManifest,
  ChapterManifest,
  TopicManifest,
} from './schemas.ts';
import type {
  IBlockVisibilityPolicy,
  ViewerRole,
} from './BlockVisibilityPolicy.ts';
import { defaultBlockVisibilityPolicy } from './BlockVisibilityPolicy.ts';
import type { BlockPackDescriptor } from './BootBlockResolver.ts';
import type { QuestionTaxonomyRef } from './TaxonomyIntegrityValidator.ts';

export interface ResolvedTaxonomyNode {
  readonly block: BlockManifest['block'];
  readonly subject: SubjectManifest;
  readonly chapter: ChapterManifest;
  readonly topic: TopicManifest | null;
}

export interface IBlockCatalogReader {
  list(role?: ViewerRole): readonly BlockPackDescriptor[];
  get(blockId: BlockId): BlockPackDescriptor | null;
  has(blockId: BlockId): boolean;
  subjects(blockId: BlockId): readonly SubjectManifest[];
  chapters(blockId: BlockId, subjectId?: SubjectKey): readonly ChapterManifest[];
  topics(blockId: BlockId, chapterId?: ChapterId): readonly TopicManifest[];
  resolve(ref: QuestionTaxonomyRef): ResolvedTaxonomyNode | null;
  subscribe(listener: () => void): () => void;
}

export class BlockCatalog implements IBlockCatalogReader {
  private descriptors: Map<string, BlockPackDescriptor> = new Map();
  private visibilityPolicy: IBlockVisibilityPolicy;
  private listeners: Set<() => void> = new Set();

  constructor(
    initialPacks: readonly BlockPackDescriptor[] = [],
    visibilityPolicy: IBlockVisibilityPolicy = defaultBlockVisibilityPolicy
  ) {
    this.visibilityPolicy = visibilityPolicy;
    for (const pack of initialPacks) {
      this.descriptors.set(pack.blockId, Object.freeze(pack));
    }
  }

  public registerPack(pack: BlockPackDescriptor): void {
    this.descriptors.set(pack.blockId, Object.freeze(pack));
    this.notify();
  }

  public setPacks(packs: readonly BlockPackDescriptor[]): void {
    this.descriptors.clear();
    for (const pack of packs) {
      this.descriptors.set(pack.blockId, Object.freeze(pack));
    }
    this.notify();
  }

  public list(role: ViewerRole = 'student-free'): readonly BlockPackDescriptor[] {
    const list: BlockPackDescriptor[] = [];
    for (const desc of this.descriptors.values()) {
      if (this.visibilityPolicy.isVisible(desc.manifest.block.status, role)) {
        list.push(desc);
      }
    }
    return Object.freeze(
      list.sort((a, b) => a.manifest.block.catalogOrder - b.manifest.block.catalogOrder)
    );
  }

  public get(blockId: BlockId): BlockPackDescriptor | null {
    return this.descriptors.get(blockId) || null;
  }

  public has(blockId: BlockId): boolean {
    return this.descriptors.has(blockId);
  }

  public subjects(blockId: BlockId): readonly SubjectManifest[] {
    const pack = this.get(blockId);
    if (!pack) return [];
    return Object.freeze([...pack.manifest.subjects].sort((a, b) => a.order - b.order));
  }

  public chapters(blockId: BlockId, subjectId?: SubjectKey): readonly ChapterManifest[] {
    const pack = this.get(blockId);
    if (!pack) return [];
    let list = pack.manifest.chapters;
    if (subjectId) {
      list = list.filter((c) => c.subjectId === subjectId);
    }
    return Object.freeze([...list].sort((a, b) => a.order - b.order));
  }

  public topics(blockId: BlockId, chapterId?: ChapterId): readonly TopicManifest[] {
    const pack = this.get(blockId);
    if (!pack) return [];
    let list = pack.manifest.topics;
    if (chapterId) {
      list = list.filter((t) => t.chapterId === chapterId);
    }
    return Object.freeze([...list].sort((a, b) => a.order - b.order));
  }

  public resolve(ref: QuestionTaxonomyRef): ResolvedTaxonomyNode | null {
    const pack = this.get(ref.blockId as BlockId);
    if (!pack) return null;

    const subject = pack.manifest.subjects.find((s) => s.id === ref.subjectId);
    if (!subject) return null;

    const chapter = pack.manifest.chapters.find((c) => c.id === ref.chapterId);
    if (!chapter) return null;

    const topic = pack.manifest.topics.find((t) => t.id === ref.topicId) || null;

    return {
      block: pack.manifest.block,
      subject,
      chapter,
      topic,
    };
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
