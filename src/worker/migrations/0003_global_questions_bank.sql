-- ============================================================================
-- Migration 0003: Global Question Bank, Delta Sync & Editorial Governance
-- ============================================================================

-- 1. Monotonic Revision Counter per Curriculum Block
CREATE TABLE IF NOT EXISTS bank_revisions (
    block_id TEXT PRIMARY KEY,
    revision_number INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO bank_revisions (block_id, revision_number, updated_at)
VALUES ('cvs', 1, datetime('now'));

-- 2. Authoritative Canonical Questions Table
CREATE TABLE IF NOT EXISTS global_questions (
    id TEXT PRIMARY KEY,
    block_id TEXT NOT NULL DEFAULT 'cvs',
    subject_id TEXT NOT NULL,
    chapter_id TEXT NOT NULL,
    topic_id TEXT NOT NULL,
    concept TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'single-best-answer',
    stem TEXT NOT NULL,
    stem_hash TEXT NOT NULL,
    choices_json TEXT NOT NULL,
    explanation TEXT NOT NULL,
    exam_tip TEXT,
    mnemonic TEXT,
    difficulty INTEGER NOT NULL DEFAULT 2,
    cognitive_level TEXT NOT NULL DEFAULT 'understanding',
    high_yield INTEGER NOT NULL DEFAULT 1,
    origin TEXT NOT NULL DEFAULT 'authored-grounded',
    evidence_json TEXT NOT NULL,
    editorial_status TEXT NOT NULL DEFAULT 'published'
        CHECK (editorial_status IN ('published', 'archived')),
    bank_version INTEGER NOT NULL DEFAULT 1,
    global_revision INTEGER NOT NULL DEFAULT 1,
    author_id TEXT NOT NULL,
    author_display_name TEXT NOT NULL,
    reviewed_by_id TEXT,
    reviewed_by_display_name TEXT,
    reviewer_notes TEXT,
    published_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_global_questions_delta_sync
    ON global_questions (block_id, global_revision, editorial_status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_global_questions_stem_dedup
    ON global_questions (chapter_id, stem_hash)
    WHERE editorial_status = 'published';

-- 3. Staging Table: Question Review Submissions
CREATE TABLE IF NOT EXISTS question_review_submissions (
    ticket_id TEXT PRIMARY KEY,
    question_id TEXT NOT NULL,
    block_id TEXT NOT NULL DEFAULT 'cvs',
    subject_id TEXT NOT NULL,
    chapter_id TEXT NOT NULL,
    topic_id TEXT NOT NULL,
    stem_hash TEXT NOT NULL,
    question_payload_json TEXT NOT NULL,
    editorial_status TEXT NOT NULL DEFAULT 'pending_review'
        CHECK (editorial_status IN ('pending_review', 'changes_requested', 'rejected', 'published')),
    submitted_by_user_id TEXT NOT NULL,
    submitted_by_display_name TEXT NOT NULL,
    submitted_by_role TEXT NOT NULL,
    submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
    reviewed_by_user_id TEXT,
    reviewed_by_display_name TEXT,
    reviewed_at TEXT,
    reviewer_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_submissions_status_block
    ON question_review_submissions (block_id, editorial_status, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_submissions_author
    ON question_review_submissions (submitted_by_user_id, submitted_at DESC);

-- 4. Immutable Editorial Audit Trail
CREATE TABLE IF NOT EXISTS question_editorial_audit_log (
    id TEXT PRIMARY KEY,
    question_id TEXT NOT NULL,
    block_id TEXT NOT NULL DEFAULT 'cvs',
    action TEXT NOT NULL,
    actor_user_id TEXT NOT NULL,
    actor_display_name TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    previous_status TEXT,
    next_status TEXT NOT NULL,
    revision_after INTEGER NOT NULL,
    summary TEXT NOT NULL,
    occurred_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_editorial_audit_chronological
    ON question_editorial_audit_log (block_id, occurred_at DESC);
