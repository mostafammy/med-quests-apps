/**
 * Block Hydration Participants (Two-Phase Prepare/Commit)
 * SPEC-010: Multi-Block Curriculum Architecture
 */

import type { BlockId } from '../../domain/curriculum/ids.ts';
import type { Question } from '../../domain/model/types.ts';
import type { IBlockPackSource } from '../../infrastructure/curriculum/InMemoryBlockPackSource.ts';
import {
  DexieBlockScopedQuestionRepository,
  DexieBlockScopedAttemptRepository,
  DexieBlockScopedReviewCardRepository,
} from '../../infrastructure/storage/DexieBlockScopedRepositories.ts';
import type { IBlockMementoStore, BlockSessionMemento } from '../../infrastructure/curriculum/LocalStorageBlockMementoStore.ts';
import { useQuestionStore } from '../stores/useQuestionStore.ts';
import { useStatsStore } from '../stores/useStatsStore.ts';
import { analytics } from '../../infrastructure/analytics/medQuestsAnalyticsFacade.ts';
import { edgeQuestionBankGateway } from '../../infrastructure/questionBank/edgeQuestionBankGateway.ts';

export interface IBlockHydrationParticipant {
  readonly name: 'questions' | 'stats' | 'copilot' | 'memento' | 'analytics';
  prepare(blockId: BlockId, signal: AbortSignal): Promise<unknown>;
  commit(prepared: unknown): void;
}

export class QuestionHydrationParticipant implements IBlockHydrationParticipant {
  public readonly name = 'questions';

  constructor(private packSource: IBlockPackSource) {}

  public async prepare(blockId: BlockId, signal: AbortSignal): Promise<{ blockId: BlockId; questions: Question[] }> {
    if (signal.aborted) {
      throw new DOMException('Preparation aborted', 'AbortError');
    }

    const repo = new DexieBlockScopedQuestionRepository(blockId);
    let stored = (await repo.all()) as Question[];

    const canonical = edgeQuestionBankGateway.getLocalCanonicalBank(blockId);
    if (canonical.length > 0) {
      const storedIds = new Set(stored.map((q) => q.id));
      const missingFromDb = canonical.filter((q) => !storedIds.has(q.id));
      if (missingFromDb.length > 0) {
        await repo.put(missingFromDb as unknown as Question[]);
        const refreshed = (await repo.all()) as Question[];
        stored = refreshed.length > 0 ? refreshed : [...stored, ...(missingFromDb as unknown as Question[])];
      }
    } else if (stored.length === 0) {
      // Lazy fetch from bundled bank chunk
      const rawBank = await this.packSource.loadBank(blockId, signal);
      if (Array.isArray(rawBank) && rawBank.length > 0) {
        await repo.put(rawBank as Question[]);
        stored = (await repo.all()) as Question[];
      }
    }

    if (signal.aborted) {
      throw new DOMException('Preparation aborted', 'AbortError');
    }

    return { blockId, questions: stored };
  }

  public commit(prepared: unknown): void {
    const { blockId, questions } = prepared as { blockId: BlockId; questions: Question[] };
    useQuestionStore.setState({
      questions,
      activeBlockId: blockId,
      isLoading: false,
    });
  }
}

export class StatsHydrationParticipant implements IBlockHydrationParticipant {
  public readonly name = 'stats';

  public async prepare(blockId: BlockId, signal: AbortSignal): Promise<{ blockId: BlockId }> {
    if (signal.aborted) {
      throw new DOMException('Preparation aborted', 'AbortError');
    }
    // Eagerly verify repository availability for the block
    const attemptRepo = new DexieBlockScopedAttemptRepository(blockId);
    const reviewRepo = new DexieBlockScopedReviewCardRepository(blockId);
    await Promise.all([attemptRepo.count(), reviewRepo.count()]);

    return { blockId };
  }

  public commit(): void {
    const questions = useQuestionStore.getState().questions;
    useStatsStore.getState().refreshStats(questions);
  }
}

export class MementoHydrationParticipant implements IBlockHydrationParticipant {
  public readonly name = 'memento';

  constructor(private mementoStore: IBlockMementoStore) {}

  public async prepare(blockId: BlockId): Promise<BlockSessionMemento | null> {
    return this.mementoStore.load(blockId);
  }

  public commit(): void {
    // Memento applied reactively by consumer components (TestHub, ReviewHub)
  }
}

export class AnalyticsHydrationParticipant implements IBlockHydrationParticipant {
  public readonly name = 'analytics';

  public async prepare(): Promise<null> {
    return null;
  }

  public commit(prepared: unknown): void {
    const payload = prepared as { from: string; to: string; durationMs: number; cold: boolean } | null;
    if (payload) {
      analytics.capture(
        'block:switched' as unknown as Parameters<typeof analytics.capture>[0],
        {
          from: payload.from,
          to: payload.to,
          duration_ms: payload.durationMs,
          cold: payload.cold,
          outcome: 'committed',
        } as unknown as Parameters<typeof analytics.capture>[1]
      );
    }
  }
}
