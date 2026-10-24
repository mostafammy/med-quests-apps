-- Migration 0001: Better Auth + Edge Network Telemetry & RBAC Schema
-- Cloudflare D1 SQLite

-- 1. Users Table (Better Auth Core + RBAC & Account Restriction Extensions)
CREATE TABLE IF NOT EXISTS user (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  email_verified INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  university_name TEXT,
  academic_year INTEGER NOT NULL DEFAULT 2,
  role TEXT NOT NULL DEFAULT 'student-free' CHECK (role IN ('student-free', 'student-pro', 'faculty-reviewer', 'admin')),
  custom_features_json TEXT NOT NULL DEFAULT '{}',
  account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'blocked', 'suspended')),
  blocked_reason TEXT,
  blocked_until TEXT,
  blocked_by_user_id TEXT,
  last_country_code TEXT,
  last_colo TEXT,
  last_active_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_email ON user(email);
CREATE INDEX IF NOT EXISTS idx_user_role_status ON user(role, account_status);

-- 2. Enriched Edge Sessions Table (Better Auth Session + Cloudflare request.cf & Client Hints)
CREATE TABLE IF NOT EXISTS session (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  country_code TEXT NOT NULL,
  city TEXT,
  region TEXT,
  continent TEXT,
  latitude REAL,
  longitude REAL,
  postal_code TEXT,
  asn INTEGER,
  isp_organization TEXT,
  edge_colo TEXT NOT NULL,
  http_protocol TEXT,
  tls_version TEXT,
  threat_score INTEGER,
  device_category TEXT NOT NULL DEFAULT 'desktop',
  os_name TEXT NOT NULL,
  browser_name TEXT NOT NULL,
  client_timezone TEXT NOT NULL,
  client_perf_tier TEXT NOT NULL DEFAULT 'balanced',
  anomaly_flags_json TEXT NOT NULL DEFAULT '[]',
  revoked_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_session_user_id ON session(user_id);
CREATE INDEX IF NOT EXISTS idx_session_token_hash ON session(token_hash);
CREATE INDEX IF NOT EXISTS idx_session_revoked ON session(revoked_at);

-- 3. Security & Governance Audit Log
CREATE TABLE IF NOT EXISTS security_audit_log (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT NOT NULL,
  target_user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  edge_colo TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_target_user ON security_audit_log(target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON security_audit_log(action);
