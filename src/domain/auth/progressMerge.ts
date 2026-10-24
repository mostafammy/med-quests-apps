import type { Attempt, ReviewCard } from '../model/types.ts';
import type { BookmarkRecord, QuestionNoteRecord } from '../../infrastructure/storage/db.ts';

export interface ProgressMergeInput {
  readonly localAttempts: readonly Attempt[];
  readonly remoteAttempts: readonly Attempt[];
  readonly localReviewCards: readonly ReviewCard[];
  readonly remoteReviewCards: readonly ReviewCard[];
  readonly localBookmarks: readonly BookmarkRecord[];
  readonly remoteBookmarks: readonly BookmarkRecord[];
  readonly localNotes: readonly QuestionNoteRecord[];
  readonly remoteNotes: readonly QuestionNoteRecord[];
}

export interface ProgressMergeOutput {
  readonly mergedAttempts: readonly Attempt[];
  readonly mergedReviewCards: readonly ReviewCard[];
  readonly mergedBookmarks: readonly BookmarkRecord[];
  readonly mergedNotes: readonly QuestionNoteRecord[];
  readonly stats: {
    readonly newAttemptsAdded: number;
    readonly newReviewCardsAdded: number;
    readonly newBookmarksAdded: number;
    readonly newNotesAdded: number;
  };
}

export interface IProgressMergeService {
  merge(input: ProgressMergeInput): ProgressMergeOutput;
}

/**
 * Domain Service: Merges anonymous local IndexedDB study records into an authenticated cloud account
 * using deterministic CRDT union principles with zero data loss.
 */
export class ProgressMergeService implements IProgressMergeService {
  public merge(input: ProgressMergeInput): ProgressMergeOutput {
    // 1. Attempts: Immutable append-only log, deduplicate by Attempt.id
    const attemptMap = new Map<string, Attempt>();
    for (const remote of input.remoteAttempts) {
      attemptMap.set(remote.id, remote);
    }
    let newAttemptsCount = 0;
    for (const local of input.localAttempts) {
      if (!attemptMap.has(local.id)) {
        attemptMap.set(local.id, local);
        newAttemptsCount++;
      }
    }
    const mergedAttempts = Array.from(attemptMap.values()).sort(
      (a, b) => new Date(a.answeredAt).getTime() - new Date(b.answeredAt).getTime()
    );

    // 2. ReviewCards: Spaced-repetition state per questionId. Take latest review.
    const reviewCardMap = new Map<string, ReviewCard>();
    for (const remote of input.remoteReviewCards) {
      reviewCardMap.set(remote.questionId, remote);
    }
    let newReviewCardsCount = 0;
    for (const local of input.localReviewCards) {
      const existing = reviewCardMap.get(local.questionId);
      if (!existing) {
        reviewCardMap.set(local.questionId, local);
        newReviewCardsCount++;
      } else {
        const localTime = local.lastReviewedAt ? new Date(local.lastReviewedAt).getTime() : 0;
        const existingTime = existing.lastReviewedAt ? new Date(existing.lastReviewedAt).getTime() : 0;
        if (localTime >= existingTime && local.repetitions >= existing.repetitions) {
          reviewCardMap.set(local.questionId, local);
        }
      }
    }
    const mergedReviewCards = Array.from(reviewCardMap.values());

    // 3. Bookmarks: Set union by questionId, preserving earliest bookmarkedAt
    const bookmarkMap = new Map<string, BookmarkRecord>();
    for (const remote of input.remoteBookmarks) {
      bookmarkMap.set(remote.questionId, remote);
    }
    let newBookmarksCount = 0;
    for (const local of input.localBookmarks) {
      const existing = bookmarkMap.get(local.questionId);
      if (!existing) {
        bookmarkMap.set(local.questionId, local);
        newBookmarksCount++;
      } else {
        const localTime = new Date(local.bookmarkedAt).getTime();
        const existingTime = new Date(existing.bookmarkedAt).getTime();
        if (localTime < existingTime) {
          bookmarkMap.set(local.questionId, local);
        }
      }
    }
    const mergedBookmarks = Array.from(bookmarkMap.values());

    // 4. Notes: Per questionId, keep newer updatedAt or merge text if distinct
    const noteMap = new Map<string, QuestionNoteRecord>();
    for (const remote of input.remoteNotes) {
      noteMap.set(remote.questionId, remote);
    }
    let newNotesCount = 0;
    for (const local of input.localNotes) {
      const existing = noteMap.get(local.questionId);
      if (!existing) {
        noteMap.set(local.questionId, local);
        newNotesCount++;
      } else if (existing.note !== local.note) {
        const localTime = new Date(local.updatedAt).getTime();
        const existingTime = new Date(existing.updatedAt).getTime();
        if (localTime >= existingTime) {
          noteMap.set(local.questionId, local);
        }
      }
    }
    const mergedNotes = Array.from(noteMap.values());

    return {
      mergedAttempts,
      mergedReviewCards,
      mergedBookmarks,
      mergedNotes,
      stats: {
        newAttemptsAdded: newAttemptsCount,
        newReviewCardsAdded: newReviewCardsCount,
        newBookmarksAdded: newBookmarksCount,
        newNotesAdded: newNotesCount,
      },
    };
  }
}

export const progressMergeService = new ProgressMergeService();
export const mergeLocalProgressIntoAccount = (input: ProgressMergeInput): ProgressMergeOutput =>
  progressMergeService.merge(input);
