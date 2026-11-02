import Dexie, { type EntityTable } from 'dexie';
import { Question, Attempt, ReviewCard } from '../../domain/model/types.ts';
import type { AiSettings } from '../../domain/ai/settings.ts';
import type { ChatMessage, MessagePart } from '../../domain/ai/conversation.ts';
import type { AiModelMetricRecord } from '../../domain/ai/metrics.ts';

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

export interface TelemetryOutboxRecord {
  eventId: string;
  eventName: string;
  envelopeJson: string;
  timestampIso: string;
  retryCount: number;
}

export interface QuestionFingerprintRecord {
  questionId: string;
  blockId: string;
  chapterId: string;
  normalizerVersion: string;
  stemHash: string;
  itemHash: string;
  answerKeyHash: string;
  minhash: Uint32Array | number[];
  lshBands: string[];
  discriminators: any[];
  embeddingModel: string | null;
  embeddedAt: string | null;
  contentVersion: number;
  updatedAt: string;
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
  aiModelMetrics!: EntityTable<AiModelMetricRecord, 'id'>;
  telemetryOutbox!: EntityTable<TelemetryOutboxRecord, 'eventId'>;
  questionFingerprints!: EntityTable<QuestionFingerprintRecord, 'questionId'>;

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

    this.version(6).stores({
      aiModelMetrics: 'id, providerId, modelId, latencyMs, timestamp, status',
    });

    this.version(7).stores({
      telemetryOutbox: 'eventId, timestampIso',
    });

    this.version(8).stores({
      questionFingerprints: 'questionId, blockId, chapterId, stemHash, itemHash, answerKeyHash, contentVersion',
    });
  }
}

export const db = new MedQuestsDB();
