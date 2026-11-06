-- Migration 0007: Authoritative Curriculum Block Registry & Per-Block Telemetry Partitioning
-- Enforces FR-050 and FR-051: unknown ?block= IDs are rejected with 404 before any D1 write.

CREATE TABLE IF NOT EXISTS curriculum_blocks (
    id              TEXT PRIMARY KEY,
    code            TEXT NOT NULL,
    short_name      TEXT NOT NULL,
    name_en         TEXT NOT NULL,
    name_ar         TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'beta', 'published', 'archived')),
    catalog_order   INTEGER NOT NULL DEFAULT 0,
    manifest_hash   TEXT NOT NULL DEFAULT 'initial',
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_curriculum_blocks_status_order
    ON curriculum_blocks (status, catalog_order ASC);

-- Seed canonical blocks: CVS (published) and CNS (beta for faculty QA until R2 GA)
INSERT OR IGNORE INTO curriculum_blocks (id, code, short_name, name_en, name_ar, status, catalog_order)
VALUES
    ('cvs', 'Block 206', 'CVS', 'Cardiovascular System', 'الجهاز القلبي الوعائي', 'published', 1),
    ('cns', 'Block 207', 'CNS', 'Central Nervous System', 'الجهاز العصبي المركزي', 'beta', 2);

-- Initialize revision cursor for CNS so delta-sync and ETag probes succeed immediately
INSERT OR IGNORE INTO bank_revisions (block_id, revision_number, updated_at)
VALUES ('cns', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
