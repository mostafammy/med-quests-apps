/**
 * Worker Repository: D1 Curator & Faculty Review Queue Operations
 * Encapsulates all SQL statements for review queue, canonical questions, and editorial audit logs.
 */

import type { GovernedQuestion } from '../../../specs/005-global-question-bank-governance/contracts/question-bank-governance-ports.ts';
import { QuestionD1Mapper } from '../../infrastructure/questionBank/QuestionD1Mapper.ts';
import type { D1DatabaseBinding } from '../types.ts';
import { mapRowToGovernedQuestion } from './d1QuestionBankRepository.ts';

export interface ReviewSubmissionRow {
  ticket_id: string;
  block_id: string;
  question_id: string;
  question_payload_json: string;
  editorial_status: string;
  stem_hash: string;
  submitted_by_user_id: string;
  submitted_by_display_name: string;
  submitted_by_role: string;
  submitted_at: string;
  reviewed_by_user_id: string | null;
  reviewed_by_display_name: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
}

export interface ReviewQueueItemDto {
  ticketId: string;
  question: Record<string, unknown>;
  submittedByUserId: string;
  submittedByDisplayName: string;
  submittedByRole: string;
  submittedAt: string;
  editorialStatus: string;
  reviewedByUserId: string | null;
  reviewedByDisplayName: string | null;
  reviewedAt: string | null;
  reviewerNotes: string | null;
}

export interface EditorialAuditEntryDto {
  id: string;
  questionId: string;
  blockId: string;
  action: string;
  actorUserId: string;
  actorDisplayName: string;
  actorRole: string;
  previousStatus: string | null;
  nextStatus: string;
  revisionAfter: number;
  summary: string;
  occurredAt: string;
}

export class D1CuratorRepository {
  public static async fetchReviewQueue(
    db: D1DatabaseBinding,
    blockId: string
  ): Promise<ReviewQueueItemDto[]> {
    try {
      const rows = await db
        .prepare(
          `SELECT * FROM question_review_submissions
           WHERE block_id = ?
           ORDER BY submitted_at DESC LIMIT 200`
        )
        .bind(blockId)
        .all<ReviewSubmissionRow>();

      return (rows.results || []).map((r) => {
        const rawQ = JSON.parse(r.question_payload_json) as Record<string, unknown>;
        return {
          ticketId: r.ticket_id,
          question: {
            ...rawQ,
            editorialStatus: r.editorial_status,
            provenanceScope: 'submitted-pending',
            stemHash: r.stem_hash,
            authorId: r.submitted_by_user_id,
            authorDisplayName: r.submitted_by_display_name,
            reviewedById: r.reviewed_by_user_id,
            reviewedByDisplayName: r.reviewed_by_display_name,
            reviewerNotes: r.reviewer_notes,
            submittedAt: r.submitted_at,
          },
          submittedByUserId: r.submitted_by_user_id,
          submittedByDisplayName: r.submitted_by_display_name,
          submittedByRole: r.submitted_by_role,
          submittedAt: r.submitted_at,
          editorialStatus: r.editorial_status,
          reviewedByUserId: r.reviewed_by_user_id,
          reviewedByDisplayName: r.reviewed_by_display_name,
          reviewedAt: r.reviewed_at,
          reviewerNotes: r.reviewer_notes,
        };
      });
    } catch {
      return [];
    }
  }

  public static async fetchReviewSubmission(
    db: D1DatabaseBinding,
    questionId: string,
    ticketId?: string
  ): Promise<ReviewSubmissionRow | null> {
    const row = await db
      .prepare(
        'SELECT * FROM question_review_submissions WHERE question_id = ? OR ticket_id = ? LIMIT 1'
      )
      .bind(questionId, ticketId || questionId)
      .first<ReviewSubmissionRow>();
    return row ?? null;
  }

  public static async updateReviewSubmissionStatus(
    db: D1DatabaseBinding,
    params: {
      ticketId: string;
      editorialStatus: string;
      reviewerUserId: string;
      reviewerDisplayName: string;
      reviewedAt: string;
      reviewerNotes: string | null;
    }
  ): Promise<void> {
    await db
      .prepare(
        `UPDATE question_review_submissions
         SET editorial_status = ?, reviewed_by_user_id = ?, reviewed_by_display_name = ?,
             reviewed_at = ?, reviewer_notes = ?
         WHERE ticket_id = ?`
      )
      .bind(
        params.editorialStatus,
        params.reviewerUserId,
        params.reviewerDisplayName,
        params.reviewedAt,
        params.reviewerNotes,
        params.ticketId
      )
      .run();
  }

  public static async fetchBlockRevision(
    db: D1DatabaseBinding,
    blockId: string
  ): Promise<number> {
    const row = await db
      .prepare('SELECT revision_number FROM bank_revisions WHERE block_id = ?')
      .bind(blockId)
      .first<{ revision_number: number }>();
    return Number(row?.revision_number ?? 1);
  }

  public static async upsertCanonicalQuestion(
    db: D1DatabaseBinding,
    question: GovernedQuestion,
    mode: 'review_publish' | 'direct_create'
  ): Promise<void> {
    const upsert = QuestionD1Mapper.buildUpsertStatement(question, mode);
    await db.prepare(upsert.sql).bind(...upsert.params).run();
  }

  public static async insertAuditLog(
    db: D1DatabaseBinding,
    entry: EditorialAuditEntryDto
  ): Promise<void> {
    await db
      .prepare(
        `INSERT INTO question_editorial_audit_log (
          id, question_id, block_id, action, actor_user_id, actor_display_name,
          actor_role, previous_status, next_status, revision_after, summary, occurred_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        entry.id,
        entry.questionId,
        entry.blockId,
        entry.action,
        entry.actorUserId,
        entry.actorDisplayName,
        entry.actorRole,
        entry.previousStatus,
        entry.nextStatus,
        entry.revisionAfter,
        entry.summary,
        entry.occurredAt
      )
      .run();
  }

  public static async fetchCanonicalCatalog(
    db: D1DatabaseBinding,
    blockId: string
  ): Promise<{
    questions: GovernedQuestion[];
    auditLogs: EditorialAuditEntryDto[];
    currentRev: number;
  }> {
    const revRow = await db
      .prepare('SELECT revision_number FROM bank_revisions WHERE block_id = ?')
      .bind(blockId)
      .first<{ revision_number: number }>();
    const currentRev = revRow ? revRow.revision_number : 1;

    const qRows = await db
      .prepare(
        'SELECT * FROM global_questions WHERE block_id = ? ORDER BY id ASC LIMIT 1000'
      )
      .bind(blockId)
      .all<Record<string, unknown>>();
    const questions = (qRows.results || []).map(mapRowToGovernedQuestion);

    const logRows = await db
      .prepare(
        'SELECT * FROM question_editorial_audit_log WHERE block_id = ? ORDER BY occurred_at DESC LIMIT 200'
      )
      .bind(blockId)
      .all<Record<string, unknown>>();

    const auditLogs: EditorialAuditEntryDto[] = (logRows.results || []).map(
      (l) => ({
        id: String(l.id || ''),
        questionId: String(l.question_id || ''),
        blockId: String(l.block_id || ''),
        action: String(l.action || ''),
        actorUserId: String(l.actor_user_id || ''),
        actorDisplayName: String(l.actor_display_name || ''),
        actorRole: String(l.actor_role || ''),
        previousStatus: l.previous_status ? String(l.previous_status) : null,
        nextStatus: String(l.next_status || ''),
        revisionAfter: Number(l.revision_after || 1),
        summary: String(l.summary || ''),
        occurredAt: String(l.occurred_at || ''),
      })
    );

    return { questions, auditLogs, currentRev };
  }

  public static async fetchCanonicalQuestion(
    db: D1DatabaseBinding,
    questionId: string
  ): Promise<GovernedQuestion | null> {
    const row = await db
      .prepare('SELECT * FROM global_questions WHERE id = ?')
      .bind(questionId)
      .first<Record<string, unknown>>();
    return row ? mapRowToGovernedQuestion(row) : null;
  }

  public static async findDuplicateStemId(
    db: D1DatabaseBinding,
    chapterId: string,
    stemHash: string,
    excludeQuestionId: string
  ): Promise<string | null> {
    const row = await db
      .prepare(
        `SELECT id FROM global_questions
         WHERE chapter_id = ? AND stem_hash = ? AND editorial_status = 'published' AND id != ?
         LIMIT 1`
      )
      .bind(chapterId, stemHash, excludeQuestionId)
      .first<{ id: string }>();
    return row?.id ?? null;
  }

  public static async updateCanonicalQuestion(
    db: D1DatabaseBinding,
    question: GovernedQuestion
  ): Promise<void> {
    const updateStmt = QuestionD1Mapper.buildCanonicalUpdateStatement(question);
    await db.prepare(updateStmt.sql).bind(...updateStmt.params).run();
  }

  public static async setCanonicalArchiveStatus(
    db: D1DatabaseBinding,
    params: {
      questionId: string;
      nextStatus: 'archived' | 'published';
      nextRev: number;
      nowIso: string;
    }
  ): Promise<void> {
    await db
      .prepare(
        `UPDATE global_questions
         SET editorial_status = ?, global_revision = ?, updated_at = ?
         WHERE id = ?`
      )
      .bind(
        params.nextStatus,
        params.nextRev,
        params.nowIso,
        params.questionId
      )
      .run();
  }

  public static async deleteCanonicalQuestion(
    db: D1DatabaseBinding,
    params: {
      questionId: string;
      permanent: boolean;
      nextRev: number;
      nowIso: string;
    }
  ): Promise<void> {
    if (params.permanent) {
      await db
        .prepare('DELETE FROM global_questions WHERE id = ?')
        .bind(params.questionId)
        .run();
    } else {
      await db
        .prepare(
          `UPDATE global_questions
           SET editorial_status = 'archived', status = 'quarantined', global_revision = ?, updated_at = ?
           WHERE id = ?`
        )
        .bind(params.nextRev, params.nowIso, params.questionId)
        .run();
    }
  }
}
