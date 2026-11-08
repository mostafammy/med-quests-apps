import Dexie, { type EntityTable, type Transaction } from 'dexie';
import { Question, Attempt, ReviewCard } from '../../domain/model/types.ts';
import type { AiSettings } from '../../domain/ai/settings.ts';
import type { ChatMessage, MessagePart } from '../../domain/ai/conversation.ts';
import type { AiModelMetricRecord } from '../../domain/ai/metrics.ts';
import type { ClinicalDiscriminator } from '../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';

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
  blockId?: string;
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
  canonicalCorrectAnswer?: string;
  minhash: Uint32Array | number[];
  lshBands: string[];
  discriminators: ClinicalDiscriminator[];
  embeddingModel: string | null;
  embeddedAt: string | null;
  contentVersion: number;
  updatedAt: string;
}

export interface UpgradeV8TableLike {
  table(name: string): {
    each(cb: (item: { id: string; blockId?: string }) => void): Promise<void>;
    toCollection(): {
      modify(cb: (card: { blockId?: string; questionId?: string | null; highYieldTopicId?: string }) => void): Promise<unknown>;
    };
  };
}

export async function upgradeV8ToV9(tx: Transaction | UpgradeV8TableLike): Promise<void> {
  const questionsTable = tx.table('questions');
  const srsTable = tx.table('srsCards');

  const questionBlockMap = new Map<string, string>();
  await questionsTable.each((q: { id: string; blockId?: string }) => {
    questionBlockMap.set(q.id, q.blockId || 'cvs');
  });

  await srsTable.toCollection().modify((card: { blockId?: string; questionId?: string | null; highYieldTopicId?: string }) => {
    if (!card.blockId) {
      const inferredFromQuestion = card.questionId ? questionBlockMap.get(card.questionId) : undefined;
      const topicParts = card.highYieldTopicId?.split('-');
      const inferredFromTopic =
        topicParts && topicParts.length > 1 && (topicParts[0] === 'cvs' || topicParts[0] === 'cns')
          ? topicParts[0]
          : undefined;

      card.blockId = inferredFromQuestion || inferredFromTopic || 'cvs';
    }
  });
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

    this.version(9)
      .stores({
        questions:
          'id, blockId, [blockId+subjectId], [blockId+chapterId], [blockId+highYield], subjectId, chapterId, topicId, highYield, difficulty, provenanceScope, editorialStatus',
        attempts:
          'id, questionId, blockId, [blockId+answeredAt], [blockId+questionId], sessionId, mode, isCorrect, confidence, answeredAt',
        reviewCards:
          'questionId, blockId, [blockId+dueAt], dueAt, repetitions, lapses',
        bookmarks:
          'questionId, blockId, [blockId+bookmarkedAt], bookmarkedAt',
        notes:
          'questionId, blockId, [blockId+updatedAt], updatedAt',
        aiThreads:
          'threadId, questionId, blockId, [blockId+updatedAt], updatedAt',
        srsCards:
          'id, blockId, [blockId+nextReviewAt], questionId, highYieldTopicId, nextReviewAt, createdAt',
      })
      .upgrade(upgradeV8ToV9);
  }
}

export const db = new MedQuestsDB();

// Automatic schema integrity hook: heal any legacy alias records on database open
db.on('ready', async () => {
  try {
    const legacy = await db.questions.where('blockId').equals('cns-neuroscience').toArray();
    if (legacy.length > 0) {
      await db.questions.bulkPut(legacy.map((q) => ({ ...q, blockId: 'cns' })));
    }
  } catch {
    // Ignore in non-browser/SSR environments
  }
});
