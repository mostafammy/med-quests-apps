import Dexie, { type EntityTable } from 'dexie';
import { Question, Attempt, ReviewCard } from '../../domain/model/types.ts';
import type { AiSettings } from '../../domain/ai/settings.ts';
import type { ChatMessage, MessagePart } from '../../domain/ai/conversation.ts';

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

export interface AiSettingsRecord {
  key: string; // 'ai-settings'
  settings: AiSettings;
  updatedAt: string;
}

export interface AiThreadRecord {
  threadId: string; // e.g. 'question:q-cvs-ana-001' or 'session:practice'
  questionId: string | null;
  blockId: string;
  messages: ChatMessage[];
  updatedAt: string;
}

export interface SrsFlashcardRecord {
  id: string;
  questionId: string | null;
  highYieldTopicId: string;
  frontPrompt: string;
  backAnswer: string;
  intervalDays: number;
  nextReviewAt: string; // ISO-8601
  createdAt: string;
}

export interface AiPowerActionCacheRecord {
  cacheKey: string; // `${questionId}:${actionKey}`
  questionId: string;
  actionKey: string;
  prompt: string;
  responseParts: MessagePart[];
  engine: string | null;
  cachedAt: string; // ISO-8601
}

export interface BankSyncMetaRecord {
  blockId: string;
  serverRevision: number;
  lastSyncedAt: string;
  etag: string;
  totalCanonicalCount: number;
}

export interface StudioSubmissionRecord {
  ticketId: string;
  questionId: string;
  blockId: string;
  editorialStatus: string;
  submittedAt: string;
  payloadJson: string;
  reviewerNotes: string | null;
}

class MedQuestsDB extends Dexie {
  questions!: EntityTable<Question, 'id'>;
  attempts!: EntityTable<Attempt, 'id'>;
  reviewCards!: EntityTable<ReviewCard, 'questionId'>;
  bookmarks!: EntityTable<BookmarkRecord, 'questionId'>;
  notes!: EntityTable<QuestionNoteRecord, 'questionId'>;
  aiSettings!: EntityTable<AiSettingsRecord, 'key'>;
  aiThreads!: EntityTable<AiThreadRecord, 'threadId'>;
  srsCards!: EntityTable<SrsFlashcardRecord, 'id'>;
  aiCache!: EntityTable<AiPowerActionCacheRecord, 'cacheKey'>;
  bankSyncMeta!: EntityTable<BankSyncMetaRecord, 'blockId'>;
  studioSubmissions!: EntityTable<StudioSubmissionRecord, 'ticketId'>;

  constructor() {
    super('MedQuestsDB');
    this.version(1).stores({
      questions: 'id, blockId, subjectId, chapterId, topicId, highYield, difficulty',
      attempts: 'id, questionId, blockId, sessionId, mode, isCorrect, confidence, answeredAt',
      reviewCards: 'questionId, blockId, dueAt, repetitions, lapses',
      bookmarks: 'questionId, blockId, bookmarkedAt',
      notes: 'questionId, blockId, updatedAt',
    });

    this.version(2).stores({
      aiSettings: 'key',
      aiThreads: 'threadId, questionId, blockId, updatedAt',
    });

    this.version(3).stores({
      srsCards: 'id, questionId, highYieldTopicId, nextReviewAt, createdAt',
    });

    this.version(4).stores({
      aiCache: 'cacheKey, questionId, actionKey, cachedAt',
    });

    this.version(5).stores({
      questions: 'id, blockId, subjectId, chapterId, topicId, highYield, difficulty, provenanceScope, editorialStatus',
      bankSyncMeta: 'blockId, serverRevision, lastSyncedAt',
      studioSubmissions: 'ticketId, questionId, blockId, editorialStatus, submittedAt',
    });
  }
}

export const db = new MedQuestsDB();
