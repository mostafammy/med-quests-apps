import { ok, type Result } from '../../../domain/shared/result.ts';
import type { BlockId } from '../../../domain/model/types.ts';
import type {
  IDownstreamBankSyncPort,
  BankSyncCursor,
  BankDeltaSyncResponse,
  BankRevisionNumber,
  GovernedQuestion,
  QuestionBankDomainError,
} from '../../../../specs/005-global-question-bank-governance/contracts/question-bank-governance-ports.ts';
import type { LocalBankStorageSimulator } from './LocalBankStorageSimulator.ts';

export class EdgeQuestionSyncClient implements IDownstreamBankSyncPort {
  constructor(private simulator: LocalBankStorageSimulator) {}

  public async fetchDeltaSync(
    blockId: BlockId,
    cursor: BankSyncCursor | null,
    signal?: AbortSignal
  ): Promise<Result<BankDeltaSyncResponse, QuestionBankDomainError>> {
    const localCanonical = this.simulator.getLocalCanonicalBank(blockId);
    const localRev = this.simulator.getLocalRevision(blockId);
    const clientRev = cursor ? Number(cursor.serverRevision) : 0;

    // 1. Try remote Cloudflare Worker edge endpoint
    try {
      const sinceRev = cursor ? Number(cursor.serverRevision) : 0;
      const headers: Record<string, string> = {};
      if (cursor?.etag && sinceRev > 0) {
        headers['If-None-Match'] = cursor.etag;
      }

      const fetchPage = (offset: number) =>
        fetch(
          `/api/bank/sync?block=${encodeURIComponent(blockId)}&sinceRev=${sinceRev}&offset=${offset}`,
          {
            method: 'GET',
            headers: offset === 0 ? headers : {},
            signal,
          }
        );

      const res = await fetchPage(0);

      if (res.status === 304) {
        if (localRev <= clientRev) {
          return ok({
            status: 'up-to-date',
            blockId,
            revision: (cursor?.serverRevision || 1) as BankRevisionNumber,
            syncedAt: new Date().toISOString(),
            etag: cursor?.etag || `W/rev-${localRev}`,
            upsertedQuestions: [],
            archivedQuestionIds: [],
          });
        }
      } else if (res.ok) {
        let pageData = (await res.json()) as BankDeltaSyncResponse;
        const remoteRev = Number(pageData.revision || 1);

        if (remoteRev >= localRev) {
          const upsertedMap = new Map<string, GovernedQuestion>();
          const archivedIds = new Set<string>();

          let pageOffset = 0;
          while (true) {
            (pageData.upsertedQuestions || []).forEach((q) => upsertedMap.set(q.id, q));
            (pageData.archivedQuestionIds || []).forEach((id) => archivedIds.add(id));

            if (!pageData.hasMore || pageData.nextOffset == null) break;

            pageOffset = pageData.nextOffset;
            const nextRes = await fetchPage(pageOffset);
            if (!nextRes.ok) {
              throw new Error(`Delta sync pagination failed at offset ${pageOffset}`);
            }
            pageData = (await nextRes.json()) as BankDeltaSyncResponse;
          }

          const combined: BankDeltaSyncResponse = {
            ...pageData,
            status:
              upsertedMap.size > 0 || archivedIds.size > 0
                ? 'delta-applied'
                : 'up-to-date',
            upsertedQuestions: Array.from(upsertedMap.values()),
            archivedQuestionIds: Array.from(archivedIds),
            hasMore: false,
            nextOffset: undefined,
          };

          if (combined.upsertedQuestions.length > 0) {
            const canonicalMap = new Map<string, GovernedQuestion>();
            localCanonical.forEach((q) => canonicalMap.set(q.id, q));
            combined.upsertedQuestions.forEach((q) => canonicalMap.set(q.id, q));
            combined.archivedQuestionIds.forEach((id) => canonicalMap.delete(id));
            this.simulator.saveLocalCanonicalBank(blockId, Array.from(canonicalMap.values()));
          }

          this.simulator.setLocalRevision(blockId, remoteRev);
          return ok(combined);
        }
      }
    } catch {
      // Offline / Local Simulator Fallback
    }

    // 2. Local Simulator fallback
    if (localRev > clientRev) {
      const activePublished = localCanonical.filter((q) => q.editorialStatus === 'published');
      return ok({
        status: 'delta-applied',
        blockId,
        revision: localRev,
        syncedAt: new Date().toISOString(),
        etag: `W/rev-${localRev}`,
        upsertedQuestions: activePublished,
        archivedQuestionIds: [],
      });
    }

    return ok({
      status: 'up-to-date',
      blockId,
      revision: localRev,
      syncedAt: new Date().toISOString(),
      etag: `W/rev-${localRev}`,
      upsertedQuestions: [],
      archivedQuestionIds: [],
    });
  }

  public async checkBankRevision(
    blockId: BlockId,
    timeoutMs = 1500
  ): Promise<{
    readonly revision: number;
    readonly etag: string;
    readonly canonicalCount: number;
    readonly source: 'edge' | 'local';
  }> {
    const localRevision = Number(this.simulator.getLocalRevision(blockId));
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller
      ? setTimeout(() => {
          controller.abort();
        }, timeoutMs)
      : null;

    try {
      const res = await fetch(
        `/api/bank/sync?block=${encodeURIComponent(blockId)}&probe=1`,
        {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller?.signal,
        }
      );
      if (res.ok) {
        const data = (await res.json()) as {
          revision?: number;
          etag?: string;
          canonicalCount?: number;
        };
        if (typeof data.revision === 'number') {
          return {
            revision: data.revision,
            etag: data.etag || `W/rev-${data.revision}`,
            canonicalCount: Number(data.canonicalCount || 0),
            source: 'edge',
          };
        }
      }
    } catch {
      // Offline / local simulator fallback below.
    } finally {
      if (timer) clearTimeout(timer);
    }

    const localCanonical = this.simulator.getLocalCanonicalBank(blockId);
    return {
      revision: localRevision,
      etag: `W/rev-${localRevision}`,
      canonicalCount: localCanonical.filter((q) => q.editorialStatus === 'published').length,
      source: 'local',
    };
  }
}
