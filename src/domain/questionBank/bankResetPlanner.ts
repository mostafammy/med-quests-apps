/**
 * Domain Service: Non-Destructive Bank Reset Planner
 * Layer: Domain
 *
 * A reset must never destroy learner-owned data. This planner restores the authoritative
 * canonical questions while:
 *   1. Preserving every local-custom question and pending review submission.
 *   2. Soft-archiving stale canonical/seed questions instead of deleting rows.
 *      Historical Attempts and ReviewCards keep resolving after a reset.
 *   3. Reusing the same dual-index (id + stemHash) reconciliation as delta sync so
 *      ID collisions and duplicate stems behave identically in both flows.
 */

import type {
  BlockId,
  IsoDateTime,
} from '../model/types.ts';
import type {
  BankRevisionNumber,
  GovernedQuestion,
  LocalBankMergeReport,
  QuestionDiffItem,
} from '../../../specs/005-global-question-bank-governance/contracts/question-bank-governance-ports.ts';
import { NonDestructiveBankMergeStrategy } from './nonDestructiveMergeStrategy.ts';

export interface BankResetPlan {
  readonly questions: readonly GovernedQuestion[];
  readonly report: LocalBankMergeReport;
  readonly restoredCanonicalCount: number;
  readonly preservedLocalCount: number;
  readonly archivedStaleCount: number;
}

export class BankResetPlanner {
  private readonly mergeStrategy: NonDestructiveBankMergeStrategy;

  public constructor(mergeStrategy = new NonDestructiveBankMergeStrategy()) {
    this.mergeStrategy = mergeStrategy;
  }

  public buildPlan(params: {
    readonly blockId: BlockId;
    readonly currentLocalQuestions: readonly GovernedQuestion[];
    readonly canonicalQuestions: readonly GovernedQuestion[];
    readonly previousRevision: number;
    readonly newRevision: BankRevisionNumber;
    readonly syncedAt: IsoDateTime;
  }): BankResetPlan {
    const {
      blockId,
      currentLocalQuestions,
      canonicalQuestions,
      previousRevision,
      newRevision,
      syncedAt,
    } = params;

    // Reuse the production merge algorithm rather than inventing a second reconciliation path.
    // No tombstones are supplied: stale rows are handled below as soft archives, not deletes.
    const { mergedQuestions } = this.mergeStrategy.mergeGlobalDeltaIntoLocal({
      blockId,
      currentLocalQuestions,
      incomingGlobalQuestions: canonicalQuestions,
      archivedGlobalIds: [],
      previousRevision,
      newRevision,
      syncedAt,
    });

    const canonicalIds = new Set(canonicalQuestions.map((question) => question.id));
    const archivedDiffItems: QuestionDiffItem[] = [];

    let archivedStaleCount = 0;
    const questions = mergedQuestions.map((question) => {
      const isLearnerOwned =
        question.provenanceScope === 'local-custom' ||
        question.provenanceScope === 'submitted-pending';

      const isStaleCanonical =
        !canonicalIds.has(question.id) &&
        !isLearnerOwned &&
        question.editorialStatus !== 'archived';

      if (!isStaleCanonical) {
        return question;
      }

      archivedStaleCount++;
      const archived: GovernedQuestion = {
        ...question,
        status: 'quarantined',
        editorialStatus: 'archived',
        updatedAt: syncedAt,
      };

      archivedDiffItems.push({
        id: question.id,
        concept: question.concept,
        subjectId: question.subjectId,
        chapterId: question.chapterId,
        stem: question.stem,
        previousStem: question.stem,
        previousBankVersion: question.bankVersion || 1,
        newBankVersion: question.bankVersion || 1,
        globalRevision: Number(newRevision),
        diffKind: 'deleted',
        changedFields: ['reset_retired'],
        question: archived,
        previousQuestion: question,
      });

      return archived;
    });

    const preservedLocalCount = questions.filter(
      (question) =>
        question.provenanceScope === 'local-custom' ||
        question.provenanceScope === 'submitted-pending'
    ).length;

    const report: LocalBankMergeReport = {
      blockId,
      previousRevision,
      newRevision,
      // A reset installs the authoritative snapshot. Counts are deliberately simple and
      // explicit so the UI can communicate exactly what happened.
      insertedCount: canonicalQuestions.length,
      updatedCanonicalCount: 0,
      archivedTombstoneCount: archivedStaleCount,
      preservedLocalCustomCount: preservedLocalCount,
      addedItems: [],
      editedItems: [],
      deletedItems: archivedDiffItems,
      syncedAt,
    };

    return {
      questions,
      report,
      restoredCanonicalCount: canonicalQuestions.length,
      preservedLocalCount,
      archivedStaleCount,
    };
  }
}
