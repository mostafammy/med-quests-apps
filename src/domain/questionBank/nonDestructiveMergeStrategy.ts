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
    const archivedSet = new Set(archivedGlobalIds);

    // 1. Index current local items
    for (const q of currentLocalQuestions) {
      resultMap.set(q.id, q);
      if (q.provenanceScope === 'local-custom') {
        preservedLocalCustomCount++;
      }
    }

    // 2. Process incoming global delta
    for (const incoming of incomingGlobalQuestions) {
      const existing = resultMap.get(incoming.id);

      if (!existing) {
        // Brand new canonical question
        resultMap.set(incoming.id, incoming);
        insertedCount++;
      } else if (existing.provenanceScope === 'local-custom') {
        // ID Collision! The user authored a custom item with the same ID as a canonical item.
        // Rule: Never delete user data. Re-key local custom item, insert canonical item.
        const rekeyedId = `${existing.id}-local-${incoming.stemHash.slice(0, 6)}`;
        const preservedCustomItem: GovernedQuestion = {
          ...existing,
          id: rekeyedId,
          concept: `${existing.concept} (My Custom Copy)`,
        };
        resultMap.set(rekeyedId, preservedCustomItem);
        resultMap.set(incoming.id, incoming);
        insertedCount++;
      } else if (
        existing.provenanceScope === 'submitted-pending' ||
        existing.provenanceScope === 'global-canonical' ||
        existing.provenanceScope === 'seed-bundled'
      ) {
        // Canonical update or approved submission
        resultMap.set(incoming.id, incoming);
        updatedCanonicalCount++;
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
