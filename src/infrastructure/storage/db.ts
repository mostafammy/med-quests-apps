import Dexie, { type EntityTable } from 'dexie';
import { Question, Attempt, ReviewCard } from '../../domain/model/types.ts';

export interface BookmarkRecord {
  questionId: string;
  blockId: string;
  bookmarkedAt: string;
}

export interface QuestionNoteRecord {
  questionId: string;
  blockId: string;
  note: string;
  updatedAt: string;
}

class MedQuestsDB extends Dexie {
  questions!: EntityTable<Question, 'id'>;
  attempts!: EntityTable<Attempt, 'id'>;
  reviewCards!: EntityTable<ReviewCard, 'questionId'>;
  bookmarks!: EntityTable<BookmarkRecord, 'questionId'>;
  notes!: EntityTable<QuestionNoteRecord, 'questionId'>;

  constructor() {
    super('MedQuestsDB');
    this.version(1).stores({
      questions: 'id, blockId, subjectId, chapterId, topicId, highYield, difficulty',
      attempts: 'id, questionId, blockId, sessionId, mode, isCorrect, confidence, answeredAt',
      reviewCards: 'questionId, blockId, dueAt, repetitions, lapses',
      bookmarks: 'questionId, blockId, bookmarkedAt',
      notes: 'questionId, blockId, updatedAt',
    });
  }
}

export const db = new MedQuestsDB();
