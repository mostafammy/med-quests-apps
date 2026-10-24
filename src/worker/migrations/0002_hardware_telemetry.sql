-- Migration 0002: Add hardware_telemetry_json to session for background hardware signals
-- Allows storing CPU cores, memory tier, effective network, DPR, and display specs silently

ALTER TABLE session ADD COLUMN hardware_telemetry_json TEXT DEFAULT '{}';
