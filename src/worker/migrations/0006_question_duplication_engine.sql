-- ============================================================================
-- Migration 0006: Question Duplication Detection Engine (QDD)
-- Tables: question_fingerprints, question_lsh_bands, qdd_pair_verdicts,
--         question_duplicate_links, qdd_verdict_log, qdd_audit_jobs,
--         qdd_audit_pairs, qdd_resolutions, qdd_ai_budget
-- ============================================================================

-- 1. Question Fingerprints (1:1 with global_questions; also stores submission fingerprints)
CREATE TABLE IF NOT EXISTS question_fingerprints (
  question_id         TEXT PRIMARY KEY,
  subject_kind        TEXT NOT NULL DEFAULT 'canonical' CHECK (subject_kind IN ('canonical', 'submission')),
  block_id            TEXT NOT NULL DEFAULT 'cvs',
  chapter_id          TEXT NOT NULL,
  topic_id            TEXT NOT NULL,
  editorial_status    TEXT NOT NULL,
  normalizer_version  TEXT NOT NULL,
  stem_hash           TEXT NOT NULL,
  item_hash           TEXT NOT NULL,
  answer_key_hash     TEXT NOT NULL,
  minhash             BLOB NOT NULL,
  discriminators_json TEXT NOT NULL,
  embedding_model     TEXT,
  embedded_at         TEXT,
  content_version     INTEGER NOT NULL DEFAULT 1,
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_fp_item_published
  ON question_fingerprints (block_id, item_hash)
  WHERE subject_kind = 'canonical' AND editorial_status = 'published';

CREATE INDEX IF NOT EXISTS ix_fp_stem
  ON question_fingerprints (block_id, stem_hash);

CREATE INDEX IF NOT EXISTS ix_fp_embedding
  ON question_fingerprints (embedding_model, embedded_at);

-- 2. Inverted LSH Bands Table for Fast Candidate Probing (32 band keys per question)
CREATE TABLE IF NOT EXISTS question_lsh_bands (
  question_id TEXT NOT NULL,
  block_id    TEXT NOT NULL DEFAULT 'cvs',
  band_key    TEXT NOT NULL,
  PRIMARY KEY (question_id, band_key)
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS ix_lsh_lookup
  ON question_lsh_bands (block_id, band_key);

-- 3. Pair Verdict Cache (Never pay for reranking or LLM arbitration twice)
CREATE TABLE IF NOT EXISTS qdd_pair_verdicts (
  pair_key       TEXT PRIMARY KEY,
  relation       TEXT NOT NULL,
  confidence     REAL NOT NULL,
  rationale      TEXT NOT NULL,
  model_id       TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  source         TEXT NOT NULL CHECK (source IN ('llm', 'reranker', 'human')),
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 4. Question Duplicate & Variant Links
CREATE TABLE IF NOT EXISTS question_duplicate_links (
  id          TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  related_id  TEXT NOT NULL,
  link_type   TEXT NOT NULL CHECK (link_type IN ('SIBLING', 'DUPLICATE_OF')),
  created_by  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (question_id, related_id, link_type)
);

-- 5. Shadow-Mode & Submission Evidence Verdict Log
CREATE TABLE IF NOT EXISTS qdd_verdict_log (
  id                 TEXT PRIMARY KEY,
  subject_id         TEXT NOT NULL,
  tier               TEXT NOT NULL,
  mode               TEXT NOT NULL CHECK (mode IN ('shadow', 'enforce')),
  decision           TEXT NOT NULL,
  relation           TEXT NOT NULL,
  verdict_json       TEXT NOT NULL,
  engine_version     TEXT NOT NULL,
  thresholds_version TEXT NOT NULL,
  latency_ms         INTEGER NOT NULL,
  degraded           INTEGER NOT NULL DEFAULT 0,
  created_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS ix_verdict_subject
  ON qdd_verdict_log (subject_id, created_at DESC);

-- 6. Resumable Block Health Audit Jobs
CREATE TABLE IF NOT EXISTS qdd_audit_jobs (
  id             TEXT PRIMARY KEY,
  block_id       TEXT NOT NULL DEFAULT 'cvs',
  status         TEXT NOT NULL,
  phase          TEXT NOT NULL CHECK (phase IN ('lexical', 'semantic', 'escalation', 'clustering', 'done')),
  cursor         TEXT,
  processed      INTEGER NOT NULL DEFAULT 0,
  total          INTEGER NOT NULL DEFAULT 0,
  clusters_found INTEGER NOT NULL DEFAULT 0,
  started_by     TEXT NOT NULL,
  started_at     TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at    TEXT,
  error          TEXT
);

CREATE TABLE IF NOT EXISTS qdd_audit_pairs (
  job_id      TEXT NOT NULL,
  pair_key    TEXT NOT NULL,
  a_id        TEXT NOT NULL,
  b_id        TEXT NOT NULL,
  relation    TEXT,
  fused_score REAL,
  status      TEXT NOT NULL DEFAULT 'pending',
  PRIMARY KEY (job_id, pair_key)
) WITHOUT ROWID;

-- 7. Reviewer Resolutions
CREATE TABLE IF NOT EXISTS qdd_resolutions (
  id              TEXT PRIMARY KEY,
  pair_key        TEXT NOT NULL,
  subject_id      TEXT NOT NULL,
  matched_id      TEXT NOT NULL,
  engine_relation TEXT NOT NULL,
  human_relation  TEXT NOT NULL,
  action          TEXT NOT NULL,
  reviewer_id     TEXT NOT NULL,
  note            TEXT,
  resolved_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 8. Daily AI Free-Tier Budget Counters (UTC day)
CREATE TABLE IF NOT EXISTS qdd_ai_budget (
  day      TEXT NOT NULL,
  resource TEXT NOT NULL,
  units    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, resource)
) WITHOUT ROWID;
