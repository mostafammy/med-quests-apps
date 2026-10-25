/**
 * Domain Service: Non-Destructive Downstream Bank Merge Strategy
 * Layer: Domain (Protects local-custom items; handles tombstones and ID collisions)
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
} from '../../../specs/005-global-question-bank-governance/contracts/question-bank-governance-ports.ts';

export class NonDestructiveBankMergeStrategy implements IQuestionMergeStrategy {
  public mergeGlobalDeltaIntoLocal(params: {
    readonly blockId: BlockId;
    readonly currentLocalQuestions: readonly GovernedQuestion[];
    readonly incomingGlobalQuestions: readonly GovernedQuestion[];
    readonly archivedGlobalIds: readonly QuestionId[];
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
      newRevision,
      syncedAt,
    } = params;

    let insertedCount = 0;
    let updatedCanonicalCount = 0;
    let archivedTombstoneCount = 0;
    let preservedLocalCustomCount = 0;

    const resultMap = new Map<string, GovernedQuestion>();
    const hashToIdMap = new Map<string, string>(); // stemHash -> questionId
    const archivedSet = new Set(archivedGlobalIds);

    // 1. Index current local items by ID and by stemHash
    for (const q of currentLocalQuestions) {
      resultMap.set(q.id, q);
      if (q.stemHash) {
        hashToIdMap.set(q.stemHash, q.id);
      }
      if (q.provenanceScope === 'local-custom') {
        preservedLocalCustomCount++;
      }
    }

    // 2. Process incoming global delta with deduplication & semantic reconciliation
    for (const incoming of incomingGlobalQuestions) {
      const existingById = resultMap.get(incoming.id);
      const existingIdByHash = incoming.stemHash ? hashToIdMap.get(incoming.stemHash) : undefined;
      const existingByHash = existingIdByHash ? resultMap.get(existingIdByHash) : undefined;

      if (existingById) {
        // Direct ID match
        const isSameContent =
          Boolean(existingById.stemHash && incoming.stemHash && existingById.stemHash === incoming.stemHash);

        if (isSameContent) {
          // Exactly the same question! Reconcile local draft/custom/submission into canonical without duplication.
          if (existingById.provenanceScope === 'local-custom') {
            preservedLocalCustomCount = Math.max(0, preservedLocalCustomCount - 1);
          }
          resultMap.set(incoming.id, incoming);
          if (incoming.stemHash) hashToIdMap.set(incoming.stemHash, incoming.id);
          updatedCanonicalCount++;
        } else if (
          existingById.provenanceScope === 'submitted-pending' ||
          existingById.provenanceScope === 'global-canonical' ||
          existingById.provenanceScope === 'seed-bundled'
        ) {
          // Canonical revision or approved submission with reviewer inline patch
          resultMap.set(incoming.id, incoming);
          if (incoming.stemHash) hashToIdMap.set(incoming.stemHash, incoming.id);
          updatedCanonicalCount++;
        } else {
          // existingById.provenanceScope === 'local-custom' AND different stemHash!
          // True ID collision: User authored a different custom question with same ID string.
          // Rule: Never delete user data. Re-key local custom item, insert canonical item.
          const rekeyedId = `${existingById.id}-local-${incoming.stemHash ? incoming.stemHash.slice(0, 6) : 'copy'}`;
          const preservedCustomItem: GovernedQuestion = {
            ...existingById,
            id: rekeyedId,
            concept: `${existingById.concept} (My Custom Copy)`,
          };
          resultMap.set(rekeyedId, preservedCustomItem);
          resultMap.set(incoming.id, incoming);
          if (existingById.stemHash) hashToIdMap.set(existingById.stemHash, rekeyedId);
          if (incoming.stemHash) hashToIdMap.set(incoming.stemHash, incoming.id);
          insertedCount++;
        }
      } else if (existingByHash) {
        // Different ID, but EXACT SAME clinical stemHash!
        // Local question was a local draft or submission (e.g. provisional ID) now published with canonical incoming.id
        if (
          existingByHash.provenanceScope === 'submitted-pending' ||
          existingByHash.provenanceScope === 'local-custom' ||
          existingByHash.provenanceScope === 'global-canonical' ||
          existingByHash.provenanceScope === 'seed-bundled'
        ) {
          if (existingByHash.provenanceScope === 'local-custom') {
            preservedLocalCustomCount = Math.max(0, preservedLocalCustomCount - 1);
          }
          // Remove old provisional ID to prevent duplicate
          resultMap.delete(existingByHash.id);
          resultMap.set(incoming.id, incoming);
          if (incoming.stemHash) hashToIdMap.set(incoming.stemHash, incoming.id);
          updatedCanonicalCount++;
        }
      } else {
        // Brand new canonical question
        resultMap.set(incoming.id, incoming);
        if (incoming.stemHash) hashToIdMap.set(incoming.stemHash, incoming.id);
        insertedCount++;
      }
    }

    // 3. Process soft-archived tombstones
    if (archivedSet.size > 0) {
      for (const [id, q] of resultMap.entries()) {
        if (archivedSet.has(id) && q.provenanceScope !== 'local-custom') {
          resultMap.set(id, {
            ...q,
            status: 'quarantined',
            editorialStatus: 'archived',
            updatedAt: syncedAt,
          });
          archivedTombstoneCount++;
        }
      }
    }

    const mergedQuestions = Array.from(resultMap.values());

    const report: LocalBankMergeReport = {
      blockId,
      previousRevision: 0,
      newRevision,
      insertedCount,
      updatedCanonicalCount,
      archivedTombstoneCount,
      preservedLocalCustomCount,
      syncedAt,
    };

    return {
      mergedQuestions,
      report,
    };
  }
}
