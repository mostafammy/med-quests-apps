/**
 * Dexie Block-Scoped Repositories & Specifications
 * Ensures cross-block data leakage is unrepresentable by construction.
 * SPEC-010: Multi-Block Curriculum Architecture
 */

import { db } from './db.ts';
import type { Question, Attempt, ReviewCard } from '../../domain/model/types.ts';
import type { SrsFlashcardRecord } from './db.ts';
import type { BlockId, ChapterId, SubjectRef } from '../../domain/curriculum/ids.ts';

export type ScopeSpecification =
  | { readonly kind: 'in-block'; readonly blockId: BlockId }
  | { readonly kind: 'in-blocks'; readonly blockIds: readonly BlockId[] }
  | { readonly kind: 'in-subject'; readonly ref: SubjectRef }
  | { readonly kind: 'in-chapter'; readonly blockId: BlockId; readonly chapterId: ChapterId }
  | { readonly kind: 'high-yield' }
  | { readonly kind: 'and'; readonly specs: readonly ScopeSpecification[] };

export interface IBlockScopedRepository<T> {
  readonly blockId: BlockId;
  all(): Promise<readonly T[]>;
  count(): Promise<number>;
  find(spec?: ScopeSpecification): Promise<readonly T[]>;
  put(items: readonly T[]): Promise<void>;
}

export interface ILearnerGlobalActivityReader {
  answeredAtTimestamps(sinceIso?: string): Promise<readonly string[]>;
  allAttempts(): Promise<readonly Attempt[]>;
}

export class DexieBlockScopedQuestionRepository implements IBlockScopedRepository<Question> {
  constructor(public readonly blockId: BlockId) {}

  public async all(): Promise<readonly Question[]> {
    try {
      if (this.blockId === 'cns') {
        const direct = await db.questions.where('blockId').equals('cns').toArray();
        const legacy = await db.questions.where('blockId').equals('cns-neuroscience').toArray();
        if (legacy.length > 0) {
          // Auto-heal legacy alias to canonical 'cns'
          const migrated = legacy.map((q) => ({ ...q, blockId: 'cns' as BlockId }));
          await db.questions.bulkPut(migrated);
          return [...direct, ...migrated];
        }
        return direct;
      }
      return await db.questions.where('blockId').equals(this.blockId).toArray();
    } catch {
      // In environments without IndexedDB (e.g. Node tests / SSR), fallback gracefully
      return [];
    }
  }

  public async count(): Promise<number> {
    try {
      if (this.blockId === 'cns') {
        const c1 = await db.questions.where('blockId').equals('cns').count();
        const c2 = await db.questions.where('blockId').equals('cns-neuroscience').count();
        return c1 + c2;
      }
      return await db.questions.where('blockId').equals(this.blockId).count();
    } catch {
      return 0;
    }
  }

  public async find(spec?: ScopeSpecification): Promise<readonly Question[]> {
    if (!spec) {
      return this.all();
    }

    if (spec.kind === 'in-subject') {
      return db.questions
        .where('[blockId+subjectId]')
        .equals([this.blockId, spec.ref.subjectId])
        .toArray();
    }

    if (spec.kind === 'in-chapter') {
      return db.questions
        .where('[blockId+chapterId]')
        .equals([this.blockId, spec.chapterId])
        .toArray();
    }

    if (spec.kind === 'high-yield') {
      return db.questions
        .where('[blockId+highYield]')
        .equals([this.blockId, 1 as any])
        .toArray();
    }

    // Default filtered block query
    const base = await this.all();
    return this.applySpecInMemory(base, spec);
  }

  public async put(items: readonly Question[]): Promise<void> {
    try {
      // Invariant: all items must belong to this repository's block
      const verified = items.map((q) => ({
        ...q,
        blockId: this.blockId,
      }));
      await db.questions.bulkPut(verified as Question[]);
    } catch {
      // Gracefully handle missing IndexedDB driver in Node/SSR
    }
  }

  private applySpecInMemory(questions: readonly Question[], spec: ScopeSpecification): readonly Question[] {
    if (spec.kind === 'high-yield') {
      return questions.filter((q) => q.highYield);
    }
    if (spec.kind === 'in-subject') {
      return questions.filter((q) => q.subjectId === spec.ref.subjectId);
    }
    if (spec.kind === 'in-chapter') {
      return questions.filter((q) => q.chapterId === spec.chapterId);
    }
    if (spec.kind === 'and') {
      let filtered = questions;
      for (const sub of spec.specs) {
        filtered = this.applySpecInMemory(filtered, sub);
      }
      return filtered;
    }
    return questions;
  }
}

export class DexieBlockScopedAttemptRepository implements IBlockScopedRepository<Attempt> {
  constructor(public readonly blockId: BlockId) {}

  public async all(): Promise<readonly Attempt[]> {
    return db.attempts.where('blockId').equals(this.blockId).toArray();
  }

  public async count(): Promise<number> {
    return db.attempts.where('blockId').equals(this.blockId).count();
  }

  public async find(): Promise<readonly Attempt[]> {
    return this.all();
  }

  public async put(items: readonly Attempt[]): Promise<void> {
    const verified = items.map((a) => ({
      ...a,
      blockId: this.blockId,
    }));
    await db.attempts.bulkPut(verified as Attempt[]);
  }
}

export class DexieBlockScopedReviewCardRepository implements IBlockScopedRepository<ReviewCard> {
  constructor(public readonly blockId: BlockId) {}

  public async all(): Promise<readonly ReviewCard[]> {
    return db.reviewCards.where('blockId').equals(this.blockId).toArray();
  }

  public async count(): Promise<number> {
    return db.reviewCards.where('blockId').equals(this.blockId).count();
  }

  public async find(): Promise<readonly ReviewCard[]> {
    return this.all();
  }

  public async put(items: readonly ReviewCard[]): Promise<void> {
    const verified = items.map((r) => ({
      ...r,
      blockId: this.blockId,
    }));
    await db.reviewCards.bulkPut(verified as ReviewCard[]);
  }
}

export class DexieBlockScopedSrsRepository implements IBlockScopedRepository<SrsFlashcardRecord> {
  constructor(public readonly blockId: BlockId) {}

  public async all(): Promise<readonly SrsFlashcardRecord[]> {
    return db.srsCards.where('blockId').equals(this.blockId).toArray();
  }

  public async count(): Promise<number> {
    return db.srsCards.where('blockId').equals(this.blockId).count();
  }

  public async find(): Promise<readonly SrsFlashcardRecord[]> {
    return this.all();
  }

  public async put(items: readonly SrsFlashcardRecord[]): Promise<void> {
    const verified = items.map((s) => ({
      ...s,
      blockId: this.blockId,
    }));
    await db.srsCards.bulkPut(verified as SrsFlashcardRecord[]);
  }
}

/**
 * Learner-Global Reader (ADR-010-05)
 * The ONLY sanctioned cross-block reader, strictly for habit metrics (streaks, daily goal).
 */
export class DexieLearnerGlobalActivityReader implements ILearnerGlobalActivityReader {
  public async answeredAtTimestamps(sinceIso?: string): Promise<readonly string[]> {
    let attempts: Attempt[];
    if (sinceIso) {
      attempts = await db.attempts.where('answeredAt').aboveOrEqual(sinceIso).toArray();
    } else {
      attempts = await db.attempts.toArray();
    }
    return attempts.map((a) => a.answeredAt).filter(Boolean);
  }

  public async allAttempts(): Promise<readonly Attempt[]> {
    return db.attempts.toArray();
  }
}

export const defaultLearnerGlobalActivityReader = new DexieLearnerGlobalActivityReader();
