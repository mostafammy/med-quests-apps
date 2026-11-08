/**
 * Infrastructure Data Mapper: QuestionD1Mapper
 * Declarative, schema-safe mapping between GovernedQuestion domain aggregates
 * and Cloudflare D1 / SQLite `global_questions` persistence rows.
 *
 * Eliminates 28-parameter positional SQL binding bugs and duplicated row-mapping functions.
 */

import type {
  GovernedQuestion,
  QuestionEditorialStatus,
  StemSha256Hash,
} from '../../../specs/005-global-question-bank-governance/contracts/question-bank-governance-ports.ts';
import type { Question } from '../../domain/model/types.ts';
import type { UserId } from '../../domain/auth/types.ts';

export interface GlobalQuestionD1Row {
  readonly id: string;
  readonly block_id: string;
  readonly subject_id: string;
  readonly chapter_id: string;
  readonly topic_id: string;
  readonly concept: string;
  readonly type: Question['type'];
  readonly stem: string;
  readonly stem_hash: string;
  readonly choices_json: string;
  readonly explanation: string;
  readonly exam_tip: string | null;
  readonly mnemonic: string | null;
  readonly difficulty: 1 | 2 | 3;
  readonly cognitive_level: Question['cognitiveLevel'];
  readonly high_yield: number;
  readonly origin: Question['origin'];
  readonly evidence_json: string;
  readonly editorial_status: 'published' | 'archived';
  readonly bank_version: number;
  readonly global_revision: number;
  readonly author_id: string;
  readonly author_display_name: string;
  readonly reviewed_by_id: string | null;
  readonly reviewed_by_display_name: string | null;
  readonly reviewer_notes: string | null;
  readonly published_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

interface ColumnBindingDescriptor {
  readonly column: keyof GlobalQuestionD1Row;
  readonly extract: (q: GovernedQuestion) => unknown;
  /** Whether this column should be updated during an in-place canonical curator PUT */
  readonly mutableOnCuratorUpdate?: boolean;
}

/**
 * Single declarative column registry for `global_questions`.
 * Guarantees that SQL column lists, `?` placeholders, and `.bind(...)` arguments
 * can never drift out of order when adding a new field.
 */
const GLOBAL_QUESTION_COLUMN_DESCRIPTORS: readonly ColumnBindingDescriptor[] = [
  { column: 'id', extract: (q) => q.id },
  { column: 'block_id', extract: (q) => q.blockId || 'cvs' },
  { column: 'subject_id', extract: (q) => q.subjectId, mutableOnCuratorUpdate: true },
  { column: 'chapter_id', extract: (q) => q.chapterId, mutableOnCuratorUpdate: true },
  { column: 'topic_id', extract: (q) => q.topicId, mutableOnCuratorUpdate: true },
  { column: 'concept', extract: (q) => q.concept, mutableOnCuratorUpdate: true },
  { column: 'type', extract: (q) => q.type || 'single-best-answer', mutableOnCuratorUpdate: true },
  { column: 'stem', extract: (q) => q.stem, mutableOnCuratorUpdate: true },
  { column: 'stem_hash', extract: (q) => q.stemHash, mutableOnCuratorUpdate: true },
  {
    column: 'choices_json',
    extract: (q) => JSON.stringify(q.choices),
    mutableOnCuratorUpdate: true,
  },
  { column: 'explanation', extract: (q) => q.explanation, mutableOnCuratorUpdate: true },
  { column: 'exam_tip', extract: (q) => q.examTip || null, mutableOnCuratorUpdate: true },
  { column: 'mnemonic', extract: (q) => q.mnemonic || null, mutableOnCuratorUpdate: true },
  { column: 'difficulty', extract: (q) => q.difficulty || 2, mutableOnCuratorUpdate: true },
  {
    column: 'cognitive_level',
    extract: (q) => q.cognitiveLevel || 'understanding',
    mutableOnCuratorUpdate: true,
  },
  {
    column: 'high_yield',
    extract: (q) => (q.highYield !== false ? 1 : 0),
    mutableOnCuratorUpdate: true,
  },
  {
    column: 'origin',
    extract: (q) => q.origin || 'authored-grounded',
    mutableOnCuratorUpdate: true,
  },
  {
    column: 'evidence_json',
    extract: (q) => JSON.stringify(q.evidence),
    mutableOnCuratorUpdate: true,
  },
  {
    column: 'editorial_status',
    extract: (q) => (q.editorialStatus === 'archived' ? 'archived' : 'published'),
  },
  { column: 'bank_version', extract: (q) => q.bankVersion || 1, mutableOnCuratorUpdate: true },
  {
    column: 'global_revision',
    extract: (q) => q.globalRevision || 1,
    mutableOnCuratorUpdate: true,
  },
  { column: 'author_id', extract: (q) => q.authorId },
  { column: 'author_display_name', extract: (q) => q.authorDisplayName },
  {
    column: 'reviewed_by_id',
    extract: (q) => q.reviewedById || null,
    mutableOnCuratorUpdate: true,
  },
  {
    column: 'reviewed_by_display_name',
    extract: (q) => q.reviewedByDisplayName || null,
    mutableOnCuratorUpdate: true,
  },
  {
    column: 'reviewer_notes',
    extract: (q) => q.reviewerNotes || null,
    mutableOnCuratorUpdate: true,
  },
  { column: 'published_at', extract: (q) => q.publishedAt },
  { column: 'created_at', extract: (q) => q.createdAt },
  { column: 'updated_at', extract: (q) => q.updatedAt, mutableOnCuratorUpdate: true },
];

export class QuestionD1Mapper {
  /**
   * Maps a D1 `global_questions` row back to a canonical GovernedQuestion aggregate.
   */
  public static toDomain(row: GlobalQuestionD1Row | Record<string, any>): GovernedQuestion {
    return {
      id: row.id,
      blockId: row.block_id || 'cvs',
      subjectId: row.subject_id,
      chapterId: row.chapter_id,
      topicId: row.topic_id,
      concept: row.concept,
      type: row.type || 'single-best-answer',
      stem: row.stem,
      choices:
        typeof row.choices_json === 'string'
          ? JSON.parse(row.choices_json || '[]')
          : row.choices_json || [],
      explanation: row.explanation || '',
      examTip: row.exam_tip ?? null,
      mnemonic: row.mnemonic ?? null,
      difficulty: (row.difficulty || 2) as 1 | 2 | 3,
      cognitiveLevel: row.cognitive_level || 'understanding',
      highYield: Boolean(row.high_yield),
      origin: row.origin || 'authored-grounded',
      evidence:
        typeof row.evidence_json === 'string'
          ? JSON.parse(row.evidence_json || '[]')
          : row.evidence_json || [],
      status: row.editorial_status === 'archived' ? 'quarantined' : 'active',
      bankVersion: row.bank_version || 1,
      globalRevision: row.global_revision || 1,
      provenanceScope: 'global-canonical',
      editorialStatus: (row.editorial_status || 'published') as QuestionEditorialStatus,
      stemHash: row.stem_hash as StemSha256Hash,
      authorId: row.author_id as UserId,
      authorDisplayName: row.author_display_name,
      reviewedById: (row.reviewed_by_id ?? null) as UserId | null,
      reviewedByDisplayName: row.reviewed_by_display_name ?? null,
      reviewerNotes: row.reviewer_notes ?? null,
      publishedAt: row.published_at ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Builds a parameterized INSERT OR IGNORE / ON CONFLICT DO UPDATE statement
   * from the single declarative column table.
   */
  public static buildUpsertStatement(
    question: GovernedQuestion,
    mode: 'review_publish' | 'direct_create' | 'seed_ignore'
  ): { sql: string; params: unknown[] } {
    const columns = GLOBAL_QUESTION_COLUMN_DESCRIPTORS.map((d) => d.column).join(', ');
    const placeholders = GLOBAL_QUESTION_COLUMN_DESCRIPTORS.map(() => '?').join(', ');
    const params = GLOBAL_QUESTION_COLUMN_DESCRIPTORS.map((d) => d.extract(question));

    if (mode === 'seed_ignore') {
      return {
        sql: `INSERT OR IGNORE INTO global_questions (${columns}) VALUES (${placeholders})`,
        params,
      };
    }

    const conflictAssignments = [
      'stem = excluded.stem',
      'stem_hash = excluded.stem_hash',
      'choices_json = excluded.choices_json',
      'explanation = excluded.explanation',
      'exam_tip = excluded.exam_tip',
      'mnemonic = excluded.mnemonic',
      'difficulty = excluded.difficulty',
      'cognitive_level = excluded.cognitive_level',
      'high_yield = excluded.high_yield',
      'evidence_json = excluded.evidence_json',
      'bank_version = global_questions.bank_version + 1',
      'global_revision = excluded.global_revision',
      "editorial_status = 'published'",
      ...(mode === 'review_publish'
        ? [
            'reviewed_by_id = excluded.reviewed_by_id',
            'reviewed_by_display_name = excluded.reviewed_by_display_name',
            'reviewer_notes = excluded.reviewer_notes',
          ]
        : []),
      'updated_at = excluded.updated_at',
    ].join(',\n                ');

    return {
      sql: `INSERT INTO global_questions (${columns})
            VALUES (${placeholders})
            ON CONFLICT(id) DO UPDATE SET
                ${conflictAssignments}`,
      params,
    };
  }

  /**
   * Builds a parameterized UPDATE statement for in-place canonical question editing.
   */
  public static buildCanonicalUpdateStatement(question: GovernedQuestion): {
    sql: string;
    params: unknown[];
  } {
    const mutableDescriptors = GLOBAL_QUESTION_COLUMN_DESCRIPTORS.filter(
      (d) => d.mutableOnCuratorUpdate
    );
    const setClause = mutableDescriptors.map((d) => `${d.column} = ?`).join(', ');
    const params = [
      ...mutableDescriptors.map((d) => d.extract(question)),
      question.id,
    ];

    return {
      sql: `UPDATE global_questions SET ${setClause} WHERE id = ?`,
      params,
    };
  }
}
