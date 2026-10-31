-- Migration 0005: Real User Study & Cognitive Telemetry Snapshot in Cloudflare D1
-- Stores real synchronized attempts, accuracy, mastery, weak topics, due reviews, AI quota usage, and pacing

ALTER TABLE user ADD COLUMN study_telemetry_json TEXT DEFAULT '{}';
