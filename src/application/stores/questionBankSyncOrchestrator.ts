import type { Question } from '../../domain/model/types.ts';
import { db } from '../../infrastructure/storage/db.ts';
import { defaultViteBlockPackSource } from '../../infrastructure/curriculum/ViteBlockPackSource.ts';
import { DexieBlockScopedQuestionRepository } from '../../infrastructure/storage/DexieBlockScopedRepositories.ts';
import type { BlockId } from '../../domain/curriculum/ids.ts';
import { edgeQuestionBankGateway } from '../../infrastructure/questionBank/edgeQuestionBankGateway.ts';
import { NonDestructiveBankMergeStrategy } from '../../domain/questionBank/nonDestructiveMergeStrategy.ts';
import { BankResetPlanner } from '../../domain/questionBank/bankResetPlanner.ts';
import { QuestionNormalizer } from '../../domain/questionBank/QuestionNormalizer.ts';
import { analytics } from '../../infrastructure/analytics/medQuestsAnalyticsFacade.ts';
import type {
  BankSyncCursor,
  LocalBankMergeReport,
  GovernedQuestion,
  BankRevisionNumber,
  BankVersionDiffPreview,
} from '../../../specs/005-global-question-bank-governance/contracts/question-bank-governance-ports.ts';

const mergeStrategy = new NonDestructiveBankMergeStrategy();
const resetPlanner = new BankResetPlanner(mergeStrategy);

export function filterActiveQuestions(
  list: readonly (Question | GovernedQuestion)[]
): Question[] {
  return QuestionNormalizer.filterActiveQuestions(list);
}

export function enrichBundledQuestions(rawList: readonly Question[]): GovernedQuestion[] {
  return QuestionNormalizer.enrichBundledQuestions(rawList, {
    provenanceScope: 'seed-bundled',
  });
}

export function broadcastBankSyncEvent(
  type: 'BANK_SYNCED' | 'BANK_RESET_COMPLETED',
  blockId: string,
  revision: number | BankRevisionNumber
): void {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      const channel = new BroadcastChannel('medquests_bank_sync');
      channel.postMessage({ type, blockId, revision });
      channel.close();
    } catch {
      // Ignore
    }
  }
}

export async function hydrateLocalBlockBank(targetBlockId: BlockId): Promise<{
  activeStored: Question[];
  cursor: BankSyncCursor;
}> {
  const repo = new DexieBlockScopedQuestionRepository(targetBlockId);
  let stored = (await repo.all()) as Question[];

  if (stored.length === 0) {
    const canonical = edgeQuestionBankGateway.getLocalCanonicalBank(targetBlockId);
    if (canonical.length > 0) {
      await repo.put(canonical as unknown as Question[]);
      stored = (await repo.all()) as Question[];
      if (stored.length === 0) {
        stored = canonical as unknown as Question[];
      }
    } else {
      const rawBank = await defaultViteBlockPackSource.loadBank(targetBlockId);
      if (Array.isArray(rawBank) && rawBank.length > 0) {
        const enrichedSeed = enrichBundledQuestions(rawBank as Question[]);
        await repo.put(enrichedSeed as unknown as Question[]);
        stored = enrichedSeed as unknown as Question[];
      }
    }
  } else {
    const canonical = edgeQuestionBankGateway.getLocalCanonicalBank(targetBlockId);
    if (canonical.length > 0) {
      const storedIds = new Set(stored.map((q) => q.id));
      const missingFromDb = canonical.filter((q) => !storedIds.has(q.id));
      if (missingFromDb.length > 0) {
        await repo.put(missingFromDb as unknown as Question[]);
        const refreshed = (await repo.all()) as Question[];
        stored =
          refreshed.length > 0
            ? refreshed
            : [...stored, ...(missingFromDb as unknown as Question[])];
      }
    }

    const rawBank = await defaultViteBlockPackSource.loadBank(targetBlockId);
    if (Array.isArray(rawBank) && rawBank.length > 0) {
      const bundledMap = new Map((rawBank as Question[]).map((q) => [q.id, q]));
      const toUpgrade: Question[] = [];
      for (const q of stored) {
        const governed = q as GovernedQuestion;
        if (governed.provenanceScope !== 'local-custom' && (governed.bankVersion || 1) < 2) {
          const bundled = bundledMap.get(q.id);
          if (bundled && (bundled.bankVersion || 1) >= 2) {
            toUpgrade.push({
              ...q,
              choices: bundled.choices,
              bankVersion: bundled.bankVersion || 2,
            });
          }
        }
      }
      if (toUpgrade.length > 0) {
        await repo.put(toUpgrade);
        stored = (await repo.all()) as Question[];
      }
    }
  }

  const cursorRecord = await db.bankSyncMeta.get(targetBlockId).catch(() => null);
  const activeStored = filterActiveQuestions(stored);
  const cursor: BankSyncCursor = cursorRecord
    ? {
        blockId: targetBlockId,
        serverRevision: cursorRecord.serverRevision as BankRevisionNumber,
        lastSyncedAt: cursorRecord.lastSyncedAt,
        etag: cursorRecord.etag,
        totalCanonicalCount: cursorRecord.totalCanonicalCount,
      }
    : {
        blockId: targetBlockId,
        serverRevision: 1 as BankRevisionNumber,
        lastSyncedAt: new Date().toISOString(),
        etag: 'W/rev-1',
        totalCanonicalCount: activeStored.length,
      };

  if (!cursorRecord) {
    await db.bankSyncMeta
      .put({
        blockId: targetBlockId,
        serverRevision: 1,
        lastSyncedAt: cursor.lastSyncedAt,
        etag: cursor.etag,
        totalCanonicalCount: activeStored.length,
      })
      .catch(() => {});
  }

  return { activeStored, cursor };
}

export async function probeAndComputeGlobalDiff(params: {
  blockId: string;
  force?: boolean;
  currentSyncCursor: BankSyncCursor | null;
  dismissedRemoteRevision: number | null;
  onComputingDiff?: () => void;
}): Promise<{
  preview: BankVersionDiffPreview | null;
  alignedCursor?: BankSyncCursor;
  phase: 'idle' | 'changes-detected' | 'local-retained' | 'up-to-date';
  clearDismissedRevision?: boolean;
}> {
  const { blockId, force, currentSyncCursor, dismissedRemoteRevision, onComputingDiff } = params;
  const storedCursor = await db.bankSyncMeta.get(blockId);
  const cursor: BankSyncCursor | null = storedCursor
    ? {
        blockId,
        serverRevision: storedCursor.serverRevision as BankRevisionNumber,
        lastSyncedAt: storedCursor.lastSyncedAt,
        etag: storedCursor.etag,
        totalCanonicalCount: storedCursor.totalCanonicalCount,
      }
    : currentSyncCursor;

  const localRev = cursor ? Number(cursor.serverRevision) : 1;

  if (!force && storedCursor) {
    const probe = await edgeQuestionBankGateway.probeRemoteRevision(blockId);
    const countMatches = probe.canonicalCount === Number(storedCursor.totalCanonicalCount);
    if (probe.source === 'edge' && probe.revision <= localRev && countMatches) {
      const currentQuestions = (await db.questions
        .where('blockId')
        .equals(blockId)
        .toArray()) as GovernedQuestion[];
      const activeQuestions = filterActiveQuestions(currentQuestions);
      const retained =
        dismissedRemoteRevision !== null &&
        Number(dismissedRemoteRevision) === Number(probe.revision);
      const nowIso = new Date().toISOString();
      const alignedCursor: BankSyncCursor = {
        blockId,
        serverRevision: Math.max(localRev, probe.revision) as BankRevisionNumber,
        lastSyncedAt: nowIso,
        etag: probe.etag,
        totalCanonicalCount: probe.canonicalCount,
      };
      await db.bankSyncMeta.put({
        blockId,
        serverRevision: Number(alignedCursor.serverRevision),
        lastSyncedAt: nowIso,
        etag: alignedCursor.etag,
        totalCanonicalCount: alignedCursor.totalCanonicalCount,
      });
      const cleanPreview: BankVersionDiffPreview = {
        blockId,
        localRevision: Number(alignedCursor.serverRevision),
        remoteRevision: Number(alignedCursor.serverRevision),
        remoteEtag: alignedCursor.etag,
        localTotalCount: activeQuestions.length,
        remoteCanonicalCount: probe.canonicalCount,
        isOutOfDate: false,
        hasChanges: false,
        addedQuestions: [],
        editedQuestions: [],
        deletedQuestions: [],
        preservedCustomQuestions: [],
        rawDelta: {
          status: 'up-to-date',
          blockId,
          revision: alignedCursor.serverRevision,
          syncedAt: nowIso,
          etag: alignedCursor.etag,
          upsertedQuestions: [],
          archivedQuestionIds: [],
        },
        checkedAt: nowIso,
      };
      return {
        preview: cleanPreview,
        alignedCursor,
        phase: retained ? 'local-retained' : 'up-to-date',
      };
    }
  }

  const syncResult = await edgeQuestionBankGateway.fetchDeltaSync(blockId, {
    blockId,
    serverRevision: 0 as BankRevisionNumber,
    lastSyncedAt: '',
    etag: '',
    totalCanonicalCount: 0,
  });

  if (!syncResult.ok) {
    return { preview: null, phase: 'idle' };
  }

  onComputingDiff?.();
  const delta = syncResult.value;
  const currentQuestions = (await db.questions
    .where('blockId')
    .equals(blockId)
    .toArray()) as GovernedQuestion[];

  let diffPreview = mergeStrategy.computeDiffPreview({
    blockId,
    localRevision: localRev,
    currentLocalQuestions: currentQuestions,
    delta,
    remoteCanonicalCount: delta.upsertedQuestions.length,
  });

  if (diffPreview.remoteRevision > Number(delta.revision)) {
    edgeQuestionBankGateway.ensureMinimumLocalRevision(blockId, diffPreview.remoteRevision);
  }

  let alignedCursor: BankSyncCursor | undefined;
  if (!diffPreview.hasChanges && diffPreview.localRevision !== diffPreview.remoteRevision) {
    const syncedRev = Math.max(diffPreview.localRevision, diffPreview.remoteRevision);
    edgeQuestionBankGateway.ensureMinimumLocalRevision(blockId, syncedRev);
    alignedCursor = {
      blockId,
      serverRevision: syncedRev as BankRevisionNumber,
      lastSyncedAt: new Date().toISOString(),
      etag: `W/rev-${syncedRev}`,
      totalCanonicalCount: diffPreview.remoteCanonicalCount,
    };
    await db.bankSyncMeta.put({
      blockId,
      serverRevision: syncedRev,
      lastSyncedAt: alignedCursor.lastSyncedAt,
      etag: alignedCursor.etag,
      totalCanonicalCount: alignedCursor.totalCanonicalCount,
    });
    diffPreview = {
      ...diffPreview,
      localRevision: syncedRev,
      remoteRevision: syncedRev,
      isOutOfDate: false,
      hasChanges: false,
    };
  }

  const retainedByUser =
    !force &&
    dismissedRemoteRevision !== null &&
    Number(dismissedRemoteRevision) === Number(diffPreview.remoteRevision);

  if ((diffPreview.hasChanges || diffPreview.isOutOfDate) && !retainedByUser) {
    return {
      preview: diffPreview,
      alignedCursor,
      phase: 'changes-detected',
      clearDismissedRevision: Boolean(force),
    };
  }
  if (retainedByUser) {
    return { preview: diffPreview, alignedCursor, phase: 'local-retained' };
  }
  return { preview: diffPreview, alignedCursor, phase: 'up-to-date' };
}

export async function applyGlobalMergeToLocalDb(
  blockId: string,
  preview: BankVersionDiffPreview
): Promise<{
  activeQuestions: Question[];
  newCursor: BankSyncCursor;
  updatedPreview: BankVersionDiffPreview;
  report: LocalBankMergeReport;
}> {
  const currentQuestions = (await db.questions
    .where('blockId')
    .equals(blockId)
    .toArray()) as GovernedQuestion[];

  const mergeOutcome = mergeStrategy.mergeGlobalDeltaIntoLocal({
    blockId,
    currentLocalQuestions: currentQuestions,
    incomingGlobalQuestions: preview.rawDelta.upsertedQuestions,
    archivedGlobalIds: preview.rawDelta.archivedQuestionIds,
    previousRevision: preview.localRevision,
    newRevision: preview.rawDelta.revision,
    syncedAt: preview.rawDelta.syncedAt,
  });

  await db.questions.bulkPut([...mergeOutcome.mergedQuestions] as unknown as Question[]);

  const activeQuestions = filterActiveQuestions(mergeOutcome.mergedQuestions);

  const newCursor: BankSyncCursor = {
    blockId,
    serverRevision: preview.rawDelta.revision,
    lastSyncedAt: preview.rawDelta.syncedAt,
    etag: preview.rawDelta.etag,
    totalCanonicalCount: activeQuestions.filter(
      (q) => (q as GovernedQuestion).provenanceScope !== 'local-custom'
    ).length,
  };

  await db.bankSyncMeta.put({
    blockId,
    serverRevision: Number(newCursor.serverRevision),
    lastSyncedAt: newCursor.lastSyncedAt,
    etag: newCursor.etag,
    totalCanonicalCount: newCursor.totalCanonicalCount,
  });

  const updatedPreview: BankVersionDiffPreview = {
    ...preview,
    localRevision: Number(newCursor.serverRevision),
    remoteRevision: Number(newCursor.serverRevision),
    localTotalCount: activeQuestions.length,
    isOutOfDate: false,
    hasChanges: false,
    addedQuestions: [],
    editedQuestions: [],
    deletedQuestions: [],
    checkedAt: new Date().toISOString(),
  };

  analytics.capture('bank:global_sync_executed', {
    block_id: blockId,
    sync_outcome: 'delta-merged',
    remote_revision: Number(preview.rawDelta.revision),
    added_count: mergeOutcome.report.insertedCount,
    updated_count: mergeOutcome.report.updatedCanonicalCount,
    retained_local_custom_count: mergeOutcome.report.preservedLocalCustomCount,
    sync_duration_ms: 24,
  });

  broadcastBankSyncEvent('BANK_SYNCED', blockId, newCursor.serverRevision);

  return {
    activeQuestions,
    newCursor,
    updatedPreview,
    report: mergeOutcome.report,
  };
}

export async function executeNonDestructiveBankReset(blockId: string): Promise<{
  activeQuestions: Question[];
  newCursor: BankSyncCursor;
  cleanPreview: BankVersionDiffPreview;
  report: LocalBankMergeReport;
  revision: number;
}> {
  const previousQuestions = (await db.questions
    .where('blockId')
    .equals(blockId)
    .toArray()) as GovernedQuestion[];
  const prevCursor = await db.bankSyncMeta.get(blockId);
  const previousRevision = prevCursor ? prevCursor.serverRevision : 1;

  const deltaRes = await edgeQuestionBankGateway.fetchDeltaSync(blockId, {
    blockId,
    serverRevision: 0 as BankRevisionNumber,
    lastSyncedAt: '',
    etag: '',
    totalCanonicalCount: 0,
  });

  let canonicalQuestions: GovernedQuestion[] = [];
  let revision = Number(previousRevision);
  let etag = prevCursor?.etag || `W/rev-${revision}`;

  if (
    deltaRes.ok &&
    deltaRes.value.upsertedQuestions &&
    deltaRes.value.upsertedQuestions.length > 0
  ) {
    canonicalQuestions = enrichBundledQuestions(
      deltaRes.value.upsertedQuestions as unknown as Question[]
    );
    revision = Number(deltaRes.value.revision);
    etag = deltaRes.value.etag;
  } else {
    const rawBank = await defaultViteBlockPackSource.loadBank(blockId as BlockId);
    if (Array.isArray(rawBank) && rawBank.length > 0) {
      canonicalQuestions = enrichBundledQuestions(rawBank as Question[]);
      revision = Number(edgeQuestionBankGateway.getLocalRevision(blockId) || 1);
      etag = `W/rev-${revision}`;
    }
  }

  if (canonicalQuestions.length === 0) {
    throw new Error(
      'Unable to retrieve the authoritative global bank. Your local bank was left untouched.'
    );
  }

  const nowIso = new Date().toISOString();

  const resetPlan = resetPlanner.buildPlan({
    blockId,
    currentLocalQuestions: previousQuestions,
    canonicalQuestions,
    previousRevision,
    newRevision: revision as BankRevisionNumber,
    syncedAt: nowIso,
  });

  const activeQuestions = filterActiveQuestions(resetPlan.questions);

  await db.transaction('rw', db.questions, db.bankSyncMeta, async () => {
    await db.questions.bulkPut([...resetPlan.questions] as unknown as Question[]);
    await db.bankSyncMeta.put({
      blockId,
      serverRevision: revision,
      lastSyncedAt: nowIso,
      etag,
      totalCanonicalCount: canonicalQuestions.length,
    });
  });

  const newCursor: BankSyncCursor = {
    blockId,
    serverRevision: revision as BankRevisionNumber,
    lastSyncedAt: nowIso,
    etag,
    totalCanonicalCount: canonicalQuestions.length,
  };

  const cleanPreview: BankVersionDiffPreview = {
    blockId,
    localRevision: revision,
    remoteRevision: revision,
    remoteEtag: etag,
    localTotalCount: activeQuestions.length,
    remoteCanonicalCount: canonicalQuestions.length,
    isOutOfDate: false,
    hasChanges: false,
    addedQuestions: [],
    editedQuestions: [],
    deletedQuestions: [],
    preservedCustomQuestions: [],
    rawDelta: {
      status: 'up-to-date',
      blockId,
      revision: revision as BankRevisionNumber,
      syncedAt: nowIso,
      etag,
      upsertedQuestions: canonicalQuestions,
      archivedQuestionIds: [],
    },
    checkedAt: nowIso,
  };

  broadcastBankSyncEvent('BANK_RESET_COMPLETED', blockId, revision);

  return {
    activeQuestions,
    newCursor,
    cleanPreview,
    report: resetPlan.report,
    revision,
  };
}
