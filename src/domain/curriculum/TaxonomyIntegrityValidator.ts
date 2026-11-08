/**
 * Pure Domain Taxonomy Integrity Validator
 * Enforces invariants TI-1 through TI-9
 * SPEC-010: Multi-Block Curriculum Architecture
 */

import type { BlockId } from './ids.ts';
import type { BlockManifest } from './schemas.ts';
import { BlockManifestSchema } from './schemas.ts';

export type TaxonomyInvariantId =
  | 'TI-1'
  | 'TI-2'
  | 'TI-3'
  | 'TI-4'
  | 'TI-5'
  | 'TI-6'
  | 'TI-7'
  | 'TI-8'
  | 'TI-9';

export interface TaxonomyViolation {
  readonly invariant: TaxonomyInvariantId;
  readonly blockId: BlockId;
  readonly path: string; // JSON pointer, e.g. "/chapters/3/subjectId"
  readonly message: string; // human, actionable
}

export type ValidationResult<T> =
  | { readonly ok: true; readonly value: T; readonly warnings: readonly TaxonomyViolation[] }
  | { readonly ok: false; readonly violations: readonly TaxonomyViolation[] };

export interface QuestionTaxonomyRef {
  readonly id: string;
  readonly blockId: string;
  readonly subjectId: string;
  readonly chapterId: string;
  readonly topicId: string;
}

export interface ITaxonomyIntegrityValidator {
  validateManifest(raw: unknown): ValidationResult<BlockManifest>;
  validateCatalog(manifests: readonly BlockManifest[]): readonly TaxonomyViolation[];
  partitionBank<Q extends QuestionTaxonomyRef>(
    manifest: BlockManifest,
    questions: readonly Q[]
  ): { readonly resolvable: readonly Q[]; readonly orphans: readonly Q[] };
}

export class TaxonomyIntegrityValidator implements ITaxonomyIntegrityValidator {
  public validateManifest(raw: unknown): ValidationResult<BlockManifest> {
    const parseResult = BlockManifestSchema.safeParse(raw);
    if (!parseResult.success) {
      const rawObj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null;
      const rawBlock =
        rawObj && typeof rawObj.block === 'object' && rawObj.block !== null
          ? (rawObj.block as Record<string, unknown>)
          : null;
      const blockId = typeof rawBlock?.id === 'string' ? (rawBlock.id as BlockId) : ('' as BlockId);

      const violations: TaxonomyViolation[] = parseResult.error.issues.map((issue) => ({
        invariant: 'TI-1',
        blockId,
        path: `/${issue.path.join('/')}`,
        message: `Schema validation error: ${issue.message}`,
      }));

      return { ok: false, violations };
    }

    const manifest = parseResult.data;
    const blockId = manifest.block.id;
    const violations: TaxonomyViolation[] = [];
    const warnings: TaxonomyViolation[] = [];

    // TI-1: Subjects list must have unique IDs
    const subjectIds = new Set<string>();
    manifest.subjects.forEach((subj, idx) => {
      if (subjectIds.has(subj.id)) {
        violations.push({
          invariant: 'TI-1',
          blockId,
          path: `/subjects/${idx}/id`,
          message: `Duplicate subject ID '${subj.id}' detected in block '${blockId}'.`,
        });
      }
      subjectIds.add(subj.id);
    });

    // TI-6 (Subjects order): unique and contiguous 1..n
    const subjectOrders = manifest.subjects.map((s) => s.order);
    const sortedSubjOrders = [...subjectOrders].sort((a, b) => a - b);
    const isSubjContiguous = sortedSubjOrders.every((val, i) => val === i + 1);
    if (!isSubjContiguous) {
      violations.push({
        invariant: 'TI-6',
        blockId,
        path: '/subjects/order',
        message: `Subject order values must be unique and contiguous 1..${manifest.subjects.length}, found [${subjectOrders.join(', ')}].`,
      });
    }

    // TI-9: >= 1 subject
    if (manifest.subjects.length === 0) {
      violations.push({
        invariant: 'TI-9',
        blockId,
        path: '/subjects',
        message: `Block '${blockId}' must contain at least 1 subject.`,
      });
    }

    // Sources map for TI-7
    const sourceIds = new Set<string>(manifest.sources.map((s) => s.id));

    // Subject -> Chapters map for TI-9 (>= 1 chapter per subject)
    const chaptersBySubject = new Map<string, number>();
    manifest.subjects.forEach((s) => chaptersBySubject.set(s.id, 0));

    // TI-3 & TI-4 & TI-7: Chapter validations
    const chapterIds = new Set<string>();
    const expectedChapterPrefix = `${blockId}-`;

    manifest.chapters.forEach((chap, idx) => {
      // TI-4: Chapter ID must be unique within block and start with '${blockId}-'
      if (chapterIds.has(chap.id)) {
        violations.push({
          invariant: 'TI-4',
          blockId,
          path: `/chapters/${idx}/id`,
          message: `Duplicate chapter ID '${chap.id}' detected in block '${blockId}'.`,
        });
      }
      if (!chap.id.startsWith(expectedChapterPrefix)) {
        violations.push({
          invariant: 'TI-4',
          blockId,
          path: `/chapters/${idx}/id`,
          message: `Chapter ID '${chap.id}' must start with '${expectedChapterPrefix}'.`,
        });
      }
      chapterIds.add(chap.id);

      // TI-3: Chapter subjectId must resolve to an existing subject
      if (!subjectIds.has(chap.subjectId)) {
        violations.push({
          invariant: 'TI-3',
          blockId,
          path: `/chapters/${idx}/subjectId`,
          message: `Chapter '${chap.id}' references unresolvable subjectId '${chap.subjectId}'.`,
        });
      } else {
        chaptersBySubject.set(chap.subjectId, (chaptersBySubject.get(chap.subjectId) || 0) + 1);
      }

      // TI-7: Chapter sourceIds must resolve to manifest sources
      chap.sourceIds.forEach((srcId, srcIdx) => {
        if (!sourceIds.has(srcId)) {
          violations.push({
            invariant: 'TI-7',
            blockId,
            path: `/chapters/${idx}/sourceIds/${srcIdx}`,
            message: `Chapter '${chap.id}' references unknown source document '${srcId}'.`,
          });
        }
      });
    });

    // TI-9: Each subject should have at least 1 chapter (warning if empty)
    chaptersBySubject.forEach((count, sId) => {
      if (count === 0) {
        warnings.push({
          invariant: 'TI-9',
          blockId,
          path: `/subjects/${sId}`,
          message: `Subject '${sId}' has 0 registered chapters (will render as 'Coming Soon').`,
        });
      }
    });

    // TI-6: Chapter orders check (either contiguous within subject 1..m OR globally contiguous 1..N)
    const allChapOrders = manifest.chapters.map((c) => c.order);
    const sortedAllChapOrders = [...allChapOrders].sort((a, b) => a - b);
    const isChapsGloballyContiguous = sortedAllChapOrders.every((val, i) => val === i + 1);

    if (!isChapsGloballyContiguous) {
      manifest.subjects.forEach((subj) => {
        const subjectChapters = manifest.chapters.filter((c) => c.subjectId === subj.id);
        if (subjectChapters.length > 0) {
          const orders = subjectChapters.map((c) => c.order);
          const sorted = [...orders].sort((a, b) => a - b);
          const contiguous = sorted.every((val, i) => val === i + 1);
          if (!contiguous) {
            violations.push({
              invariant: 'TI-6',
              blockId,
              path: `/chapters/${subj.id}/order`,
              message: `Chapters in subject '${subj.id}' must have contiguous order (1..${subjectChapters.length} locally or 1..${manifest.chapters.length} globally), found [${orders.join(', ')}].`,
            });
          }
        }
      });
    }

    // TI-5 & TI-6: Topic validations
    const topicIds = new Set<string>();
    manifest.topics.forEach((top, idx) => {
      // Duplicate topic check
      if (topicIds.has(top.id)) {
        violations.push({
          invariant: 'TI-5',
          blockId,
          path: `/topics/${idx}/id`,
          message: `Duplicate topic ID '${top.id}' detected in block '${blockId}'.`,
        });
      }
      topicIds.add(top.id);

      // Chapter resolution
      if (!chapterIds.has(top.chapterId)) {
        violations.push({
          invariant: 'TI-5',
          blockId,
          path: `/topics/${idx}/chapterId`,
          message: `Topic '${top.id}' references unresolvable chapterId '${top.chapterId}'.`,
        });
      }

      // Topic prefix invariant: must start with '${top.chapterId}/' or '${blockId}-'
      const expectedTopicPrefix = `${top.chapterId}/`;
      const expectedBlockPrefix = `${blockId}-`;
      if (!top.id.startsWith(expectedTopicPrefix) && !top.id.startsWith(expectedBlockPrefix)) {
        violations.push({
          invariant: 'TI-5',
          blockId,
          path: `/topics/${idx}/id`,
          message: `Topic ID '${top.id}' must start with '${expectedTopicPrefix}' or '${expectedBlockPrefix}'.`,
        });
      }
    });

    // Topic order: check if contiguous within chapter (1..k) OR globally contiguous (1..N)
    const allTopicOrders = manifest.topics.map((t) => t.order);
    const sortedAllTopicOrders = [...allTopicOrders].sort((a, b) => a - b);
    const isGloballyContiguous = sortedAllTopicOrders.every((val, i) => val === i + 1);

    if (!isGloballyContiguous) {
      // If not globally contiguous, it must be contiguous within each chapter (1..k)
      chapterIds.forEach((chapId) => {
        const chapTopics = manifest.topics.filter((t) => t.chapterId === chapId);
        if (chapTopics.length > 0) {
          const orders = chapTopics.map((t) => t.order);
          const sorted = [...orders].sort((a, b) => a - b);
          const contiguous = sorted.every((val, i) => val === i + 1);
          if (!contiguous) {
            violations.push({
              invariant: 'TI-6',
              blockId,
              path: `/topics/${chapId}/order`,
              message: `Topics in chapter '${chapId}' must have contiguous order (1..${chapTopics.length} locally or 1..${manifest.topics.length} globally), found [${orders.join(', ')}].`,
            });
          }
        }
      });
    }

    if (violations.length > 0) {
      return { ok: false, violations };
    }

    return { ok: true, value: manifest, warnings };
  }

  public validateCatalog(manifests: readonly BlockManifest[]): readonly TaxonomyViolation[] {
    const violations: TaxonomyViolation[] = [];
    const seenBlockIds = new Set<string>();
    const seenChapterIds = new Map<string, BlockId>();
    const seenTopicIds = new Map<string, BlockId>();

    for (const manifest of manifests) {
      const bId = manifest.block.id;
      if (seenBlockIds.has(bId)) {
        violations.push({
          invariant: 'TI-1',
          blockId: bId,
          path: '/block/id',
          message: `Duplicate blockId '${bId}' found across catalog manifests.`,
        });
      }
      seenBlockIds.add(bId);

      for (const chap of manifest.chapters) {
        if (seenChapterIds.has(chap.id)) {
          violations.push({
            invariant: 'TI-4',
            blockId: bId,
            path: `/chapters/${chap.id}`,
            message: `Global chapter ID collision: '${chap.id}' already defined in block '${seenChapterIds.get(chap.id)}'.`,
          });
        } else {
          seenChapterIds.set(chap.id, bId);
        }
      }

      for (const topic of manifest.topics) {
        if (seenTopicIds.has(topic.id)) {
          violations.push({
            invariant: 'TI-5',
            blockId: bId,
            path: `/topics/${topic.id}`,
            message: `Global topic ID collision: '${topic.id}' already defined in block '${seenTopicIds.get(topic.id)}'.`,
          });
        } else {
          seenTopicIds.set(topic.id, bId);
        }
      }
    }

    return violations;
  }

  public partitionBank<Q extends QuestionTaxonomyRef>(
    manifest: BlockManifest,
    questions: readonly Q[]
  ): { readonly resolvable: readonly Q[]; readonly orphans: readonly Q[] } {
    const blockId = manifest.block.id;
    const subjectIds = new Set(manifest.subjects.map((s) => s.id as string));
    const chapterIds = new Set(manifest.chapters.map((c) => c.id as string));
    const topicIds = new Set(manifest.topics.map((t) => t.id as string));

    const resolvable: Q[] = [];
    const orphans: Q[] = [];

    for (const q of questions) {
      const matchesBlock = q.blockId === blockId;
      const matchesSubject = subjectIds.has(q.subjectId);
      const matchesChapter = chapterIds.has(q.chapterId);
      const matchesTopic = topicIds.has(q.topicId);

      if (matchesBlock && matchesSubject && matchesChapter && matchesTopic) {
        resolvable.push(q);
      } else {
        orphans.push(q);
      }
    }

    return { resolvable, orphans };
  }
}
