-- Migration 0004: Add phone_number to user table for direct scholar communication channel
-- Cloudflare D1 SQLite

ALTER TABLE user ADD COLUMN phone_number TEXT;
