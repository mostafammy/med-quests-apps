/**
 * Domain Service: Non-Destructive Downstream Bank Merge Strategy & Diff Engine
 * Layer: Domain (Protects local-custom items; handles tombstones, ID collisions, and exact diffs)
 */

import type {
  BlockId,
  QuestionId,
  IsoDateTime,
} from '../model/types.ts';
import type {
  GovernedQuestion,
  IQuestionMergeStrategy,
  LocalBankMergeReport,
  BankRevisionNumber,
  QuestionDiffItem,
  BankVersionDiffPreview,
  BankDeltaSyncResponse,
} from '../../../specs/005-global-question-bank-governance/contracts/question-bank-governance-ports.ts';
import { QuestionCanonicalHasher } from './canonicalHasher.ts';

export class NonDestructiveBankMergeStrategy implements IQuestionMergeStrategy {
  /**
   * Computes which semantic fields changed between a local question and an incoming canonical question.
   */
  public static computeChangedFields(
    existing: GovernedQuestion,
    incoming: GovernedQuestion
  ): readonly string[] {
    const changed: string[] = [];

    const existingHash =
      existing.stemHash || QuestionCanonicalHasher.computeStemHashSync(existing.stem);
    const incomingHash =
      incoming.stemHash || QuestionCanonicalHasher.computeStemHashSync(incoming.stem);

    if (existingHash !== incomingHash || existing.stem.trim() !== incoming.stem.trim()) {
      changed.push('stem');
    }
    if (existing.concept !== incoming.concept) {
      changed.push('concept');
    }
    if (existing.explanation !== incoming.explanation) {
      changed.push('explanation');
    }
    if ((existing.examTip || null) !== (incoming.examTip || null)) {
      changed.push('examTip');
    }
    if (existing.difficulty !== incoming.difficulty) {
      changed.push('difficulty');
    }
    if (JSON.stringify(existing.choices) !== JSON.stringify(incoming.choices)) {
      changed.push('choices');
    }
    if (existing.bankVersion !== incoming.bankVersion) {
      changed.push('bankVersion');
    }

    return changed;
  }

  /**
   * Non-mutating diff preview calculation: compares the user's current local bank against
   * an incoming global delta payload to display exact Added, Edited, Deleted, and Preserved Custom items.
   */
  public computeDiffPreview(params: {
    readonly blockId: BlockId;
    readonly localRevision: number;
    readonly currentLocalQuestions: readonly GovernedQuestion[];
    readonly delta: BankDeltaSyncResponse;
    readonly remoteCanonicalCount?: number;
  }): BankVersionDiffPreview {
    const { blockId, localRevision, currentLocalQuestions, delta, remoteCanonicalCount } = params;

    const addedQuestions: QuestionDiffItem[] = [];
    const editedQuestions: QuestionDiffItem[] = [];
    const deletedQuestions: QuestionDiffItem[] = [];
    const preservedCustomQuestions: QuestionDiffItem[] = [];

    const localById = new Map<string, GovernedQuestion>();
    const hashToIdMap = new Map<string, string>();
    const archivedSet = new Set(delta.archivedQuestionIds);

    for (const q of currentLocalQuestions) {
      localById.set(q.id, q);
      const hash = q.stemHash || QuestionCanonicalHasher.computeStemHashSync(q.stem);
      hashToIdMap.set(hash, q.id);

      if (q.provenanceScope === 'local-custom') {
        preservedCustomQuestions.push({
          id: q.id,
          concept: q.concept,
          subjectId: q.subjectId,
          chapterId: q.chapterId,
          stem: q.stem,
          newBankVersion: q.bankVersion || 1,
          globalRevision: q.globalRevision || 0,
          diffKind: 'preserved_custom',
          question: q,
        });
      }
    }

    for (const incoming of delta.upsertedQuestions) {
      if (archivedSet.has(incoming.id) || incoming.editorialStatus === 'archived') {
        continue;
      }

      const incomingHash =
        incoming.stemHash || QuestionCanonicalHasher.computeStemHashSync(incoming.stem);
      const existingById = localById.get(incoming.id);
      const existingIdByHash = hashToIdMap.get(incomingHash);
      const existingByHash = existingIdByHash ? localById.get(existingIdByHash) : undefined;

      if (existingById) {
        if (existingById.provenanceScope === 'local-custom') {
          const existingHash =
            existingById.stemHash || QuestionCanonicalHasher.computeStemHashSync(existingById.stem);
          if (existingHash !== incomingHash) {
            // Collision with custom question: custom is preserved, incoming is added
            addedQuestions.push({
              id: incoming.id,
              concept: incoming.concept,
              subjectId: incoming.subjectId,
              chapterId: incoming.chapterId,
              stem: incoming.stem,
              newBankVersion: incoming.bankVersion || 1,
              globalRevision: incoming.globalRevision || Number(delta.revision),
              diffKind: 'added',
              question: incoming,
            });
            continue;
          }
        }

        const changedFields = NonDestructiveBankMergeStrategy.computeChangedFields(
          existingById,
          incoming
        );
        const wasQuarantined =
          existingById.status === 'quarantined' || existingById.editorialStatus === 'archived';
        const wasPendingPromotion =
          existingById.provenanceScope === 'submitted-pending' &&
          incoming.editorialStatus === 'published';

        if (changedFields.length > 0 || wasQuarantined || wasPendingPromotion) {
          editedQuestions.push({
            id: incoming.id,
            concept: incoming.concept,
            subjectId: incoming.subjectId,
            chapterId: incoming.chapterId,
            stem: incoming.stem,
            previousStem: existingById.stem,
            previousBankVersion: existingById.bankVersion || 1,
            newBankVersion: incoming.bankVersion || 1,
            globalRevision: incoming.globalRevision || Number(delta.revision),
            diffKind: 'edited',
            changedFields:
              changedFields.length > 0
                ? changedFields
                : wasQuarantined
                ? ['status_restored']
                : ['promoted_to_canonical'],
            question: incoming,
            previousQuestion: existingById,
          });
        }
      } else if (existingByHash) {
        // Reconciled by stemHash
        const changedFields = NonDestructiveBankMergeStrategy.computeChangedFields(
          existingByHash,
          incoming
        );
        editedQuestions.push({
          id: incoming.id,
          concept: incoming.concept,
          subjectId: incoming.subjectId,
          chapterId: incoming.chapterId,
          stem: incoming.stem,
          previousStem: existingByHash.stem,
          previousBankVersion: existingByHash.bankVersion || 1,
          newBankVersion: incoming.bankVersion || 1,
          globalRevision: incoming.globalRevision || Number(delta.revision),
          diffKind: 'edited',
          changedFields: changedFields.length > 0 ? changedFields : ['canonical_id_assigned'],
          question: incoming,
          previousQuestion: existingByHash,
        });
      } else {
        // Brand new canonical question
        addedQuestions.push({
          id: incoming.id,
          concept: incoming.concept,
          subjectId: incoming.subjectId,
          chapterId: incoming.chapterId,
          stem: incoming.stem,
          newBankVersion: incoming.bankVersion || 1,
          globalRevision: incoming.globalRevision || Number(delta.revision),
          diffKind: 'added',
          question: incoming,
        });
      }
    }

    // Check deleted / soft-archived questions that are currently active in local bank
    for (const archivedId of archivedSet) {
      const localItem = localById.get(archivedId);
      if (
        localItem &&
        localItem.provenanceScope !== 'local-custom' &&
        localItem.status !== 'quarantined' &&
        localItem.editorialStatus !== 'archived'
      ) {
        deletedQuestions.push({
          id: localItem.id,
          concept: localItem.concept,
          subjectId: localItem.subjectId,
          chapterId: localItem.chapterId,
          stem: localItem.stem,
          previousStem: localItem.stem,
          previousBankVersion: localItem.bankVersion || 1,
          newBankVersion: localItem.bankVersion || 1,
          globalRevision: Number(delta.revision),
          diffKind: 'deleted',
          changedFields: ['archived'],
          question: {
            ...localItem,
            status: 'quarantined',
            editorialStatus: 'archived',
          },
          previousQuestion: localItem,
        });
      }
    }

    const rawRemoteRev = Number(delta.revision);
    const hasChanges =
      addedQuestions.length > 0 || editedQuestions.length > 0 || deletedQuestions.length > 0;

    // Strict Version Monotonicity Invariant:
    // Two banks with non-zero canonical content divergence (hasChanges === true) can NEVER
    // share the same revision number (e.g., "Local v6.0 -> Global v6.0" with +106 added questions).
    // If bundled seed expansion or out-of-band canonical ingestion occurred without bumping the
    // remote counter past localRevision, advance effectiveRemoteRev to at least localRevision + 1.
    const effectiveRemoteRev = hasChanges
      ? Math.max(rawRemoteRev, localRevision + 1)
      : rawRemoteRev;
    const effectiveEtag =
      effectiveRemoteRev !== rawRemoteRev ? `W/rev-${effectiveRemoteRev}` : delta.etag;
    const effectiveDelta: BankDeltaSyncResponse =
      effectiveRemoteRev !== rawRemoteRev
        ? {
            ...delta,
            revision: effectiveRemoteRev as BankRevisionNumber,
            etag: effectiveEtag,
          }
        : delta;

    const isOutOfDate = localRevision < effectiveRemoteRev || hasChanges;

    const activeLocalCount = currentLocalQuestions.filter(
      (q) => q.status !== 'quarantined' && q.editorialStatus !== 'archived'
    ).length;

    return {
      blockId,
      localRevision,
      remoteRevision: effectiveRemoteRev,
      remoteEtag: effectiveEtag,
      localTotalCount: activeLocalCount,
      remoteCanonicalCount:
        remoteCanonicalCount ??
        activeLocalCount -
          preservedCustomQuestions.length +
          addedQuestions.length -
          deletedQuestions.length,
      isOutOfDate,
      hasChanges,
      addedQuestions,
      editedQuestions,
      deletedQuestions,
      preservedCustomQuestions,
      rawDelta: effectiveDelta,
      checkedAt: new Date().toISOString(),
    };
  }

  public mergeGlobalDeltaIntoLocal(params: {
    readonly blockId: BlockId;
    readonly currentLocalQuestions: readonly GovernedQuestion[];
    readonly incomingGlobalQuestions: readonly GovernedQuestion[];
    readonly archivedGlobalIds: readonly QuestionId[];
    readonly previousRevision?: number;
    readonly newRevision: BankRevisionNumber;
    readonly syncedAt: IsoDateTime;
  }): {
    readonly mergedQuestions: readonly GovernedQuestion[];
    readonly report: LocalBankMergeReport;
  } {
    const {
      blockId,
      currentLocalQuestions,
      incomingGlobalQuestions,
      archivedGlobalIds,
      previousRevision = 1,
      newRevision,
      syncedAt,
    } = params;

    let insertedCount = 0;
    let updatedCanonicalCount = 0;
    let archivedTombstoneCount = 0;
    let preservedLocalCustomCount = 0;

    const addedItems: QuestionDiffItem[] = [];
    const editedItems: QuestionDiffItem[] = [];
    const deletedItems: QuestionDiffItem[] = [];

    const resultMap = new Map<string, GovernedQuestion>();
    const hashToIdMap = new Map<string, string>(); // stemHash -> questionId
    const archivedSet = new Set(archivedGlobalIds);

    // 1. Index current local items by ID and by stemHash (computing on-the-fly if seed item lacks stemHash)
    for (const q of currentLocalQuestions) {
      const normalizedHash =
        q.stemHash || QuestionCanonicalHasher.computeStemHashSync(q.stem);
      const enrichedLocal: GovernedQuestion = q.stemHash
        ? q
        : {
            ...q,
            stemHash: normalizedHash,
            provenanceScope: q.provenanceScope || 'seed-bundled',
            editorialStatus: q.editorialStatus || 'published',
          };

      resultMap.set(enrichedLocal.id, enrichedLocal);
      hashToIdMap.set(normalizedHash, enrichedLocal.id);

      if (enrichedLocal.provenanceScope === 'local-custom') {
        preservedLocalCustomCount++;
      }
    }

    // 2. Process incoming global delta with deduplication & semantic reconciliation
    for (const rawIncoming of incomingGlobalQuestions) {
      const incomingHash =
        rawIncoming.stemHash || QuestionCanonicalHasher.computeStemHashSync(rawIncoming.stem);
      const incoming: GovernedQuestion = rawIncoming.stemHash
        ? rawIncoming
        : { ...rawIncoming, stemHash: incomingHash };

      const existingById = resultMap.get(incoming.id);
      const existingIdByHash = hashToIdMap.get(incomingHash);
      const existingByHash = existingIdByHash ? resultMap.get(existingIdByHash) : undefined;

      if (existingById) {
        const existingHash =
          existingById.stemHash || QuestionCanonicalHasher.computeStemHashSync(existingById.stem);
        const isSameContent = existingHash === incomingHash;

        if (isSameContent) {
          // Check if explanation, choices, or metadata changed even though stem is identical
          const changedFields = NonDestructiveBankMergeStrategy.computeChangedFields(
            existingById,
            incoming
          );
          const wasPending = existingById.provenanceScope === 'submitted-pending';
          const wasLocalCustom = existingById.provenanceScope === 'local-custom';

          if (wasLocalCustom) {
            preservedLocalCustomCount = Math.max(0, preservedLocalCustomCount - 1);
          }

          resultMap.set(incoming.id, incoming);
          hashToIdMap.set(incomingHash, incoming.id);

          if (changedFields.length > 0 || wasPending || wasLocalCustom) {
            updatedCanonicalCount++;
            if (changedFields.length > 0 || wasPending) {
              editedItems.push({
                id: incoming.id,
                concept: incoming.concept,
                subjectId: incoming.subjectId,
                chapterId: incoming.chapterId,
                stem: incoming.stem,
                previousStem: existingById.stem,
                previousBankVersion: existingById.bankVersion || 1,
                newBankVersion: incoming.bankVersion || 1,
                globalRevision: incoming.globalRevision || Number(newRevision),
                diffKind: 'edited',
                changedFields:
                  changedFields.length > 0 ? changedFields : ['promoted_to_canonical'],
                question: incoming,
                previousQuestion: existingById,
              });
            }
          }
        } else if (
          existingById.provenanceScope === 'submitted-pending' ||
          existingById.provenanceScope === 'global-canonical' ||
          existingById.provenanceScope === 'seed-bundled' ||
          !existingById.provenanceScope
        ) {
          // Canonical revision or approved submission with reviewer inline patch
          const changedFields = NonDestructiveBankMergeStrategy.computeChangedFields(
            existingById,
            incoming
          );
          resultMap.set(incoming.id, incoming);
          hashToIdMap.set(incomingHash, incoming.id);
          updatedCanonicalCount++;
          editedItems.push({
            id: incoming.id,
            concept: incoming.concept,
            subjectId: incoming.subjectId,
            chapterId: incoming.chapterId,
            stem: incoming.stem,
            previousStem: existingById.stem,
            previousBankVersion: existingById.bankVersion || 1,
            newBankVersion: incoming.bankVersion || 1,
            globalRevision: incoming.globalRevision || Number(newRevision),
            diffKind: 'edited',
            changedFields: changedFields.length > 0 ? changedFields : ['stem'],
            question: incoming,
            previousQuestion: existingById,
          });
        } else {
          // existingById.provenanceScope === 'local-custom' AND different stemHash!
          // True ID collision: User authored a different custom question with same ID string.
          // Rule: Never delete user data. Re-key local custom item, insert canonical item.
          const rekeyedId = `${existingById.id}-local-${incomingHash.slice(0, 6)}`;
          const preservedCustomItem: GovernedQuestion = {
            ...existingById,
            id: rekeyedId,
            concept: `${existingById.concept} (My Custom Copy)`,
          };
          resultMap.set(rekeyedId, preservedCustomItem);
          resultMap.set(incoming.id, incoming);
          hashToIdMap.set(existingHash, rekeyedId);
          hashToIdMap.set(incomingHash, incoming.id);
          insertedCount++;
          addedItems.push({
            id: incoming.id,
            concept: incoming.concept,
            subjectId: incoming.subjectId,
            chapterId: incoming.chapterId,
            stem: incoming.stem,
            newBankVersion: incoming.bankVersion || 1,
            globalRevision: incoming.globalRevision || Number(newRevision),
            diffKind: 'added',
            question: incoming,
          });
        }
      } else if (existingByHash) {
        // Different ID, but EXACT SAME clinical stemHash!
        if (
          existingByHash.provenanceScope === 'submitted-pending' ||
          existingByHash.provenanceScope === 'local-custom' ||
          existingByHash.provenanceScope === 'global-canonical' ||
          existingByHash.provenanceScope === 'seed-bundled' ||
          !existingByHash.provenanceScope
        ) {
          if (existingByHash.provenanceScope === 'local-custom') {
            preservedLocalCustomCount = Math.max(0, preservedLocalCustomCount - 1);
          }
          resultMap.delete(existingByHash.id);
          resultMap.set(incoming.id, incoming);
          hashToIdMap.set(incomingHash, incoming.id);
          updatedCanonicalCount++;
          editedItems.push({
            id: incoming.id,
            concept: incoming.concept,
            subjectId: incoming.subjectId,
            chapterId: incoming.chapterId,
            stem: incoming.stem,
            previousStem: existingByHash.stem,
            previousBankVersion: existingByHash.bankVersion || 1,
            newBankVersion: incoming.bankVersion || 1,
            globalRevision: incoming.globalRevision || Number(newRevision),
            diffKind: 'edited',
            changedFields: ['canonical_id_assigned'],
            question: incoming,
            previousQuestion: existingByHash,
          });
        }
      } else {
        // Brand new canonical question
        resultMap.set(incoming.id, incoming);
        hashToIdMap.set(incomingHash, incoming.id);
        insertedCount++;
        addedItems.push({
          id: incoming.id,
          concept: incoming.concept,
          subjectId: incoming.subjectId,
          chapterId: incoming.chapterId,
          stem: incoming.stem,
          newBankVersion: incoming.bankVersion || 1,
          globalRevision: incoming.globalRevision || Number(newRevision),
          diffKind: 'added',
          question: incoming,
        });
      }
    }

    // 3. Process soft-archived tombstones
    if (archivedSet.size > 0) {
      for (const [id, q] of resultMap.entries()) {
        if (
          archivedSet.has(id) &&
          q.provenanceScope !== 'local-custom' &&
          q.status !== 'quarantined' &&
          q.editorialStatus !== 'archived'
        ) {
          const archivedItem: GovernedQuestion = {
            ...q,
            status: 'quarantined',
            editorialStatus: 'archived',
            updatedAt: syncedAt,
          };
          resultMap.set(id, archivedItem);
          archivedTombstoneCount++;
          deletedItems.push({
            id: q.id,
            concept: q.concept,
            subjectId: q.subjectId,
            chapterId: q.chapterId,
            stem: q.stem,
            previousStem: q.stem,
            previousBankVersion: q.bankVersion || 1,
            newBankVersion: q.bankVersion || 1,
            globalRevision: Number(newRevision),
            diffKind: 'deleted',
            changedFields: ['archived'],
            question: archivedItem,
            previousQuestion: q,
          });
        }
      }
    }

    const mergedQuestions = Array.from(resultMap.values());

    const report: LocalBankMergeReport = {
      blockId,
      previousRevision,
      newRevision,
      insertedCount,
      updatedCanonicalCount,
      archivedTombstoneCount,
      preservedLocalCustomCount,
      addedItems,
      editedItems,
      deletedItems,
      syncedAt,
    };

    return {
      mergedQuestions,
      report,
    };
  }
}
