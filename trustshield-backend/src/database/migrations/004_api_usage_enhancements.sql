BEGIN;

-- ============================================================
-- TRUSTSHIELD — DEVELOPER API USAGE ENHANCEMENTS
-- Migration: 004_api_usage_enhancements.sql
--
-- Additive migration only.
-- Adds HTTP method tracking and analytics indexes.
-- ============================================================

ALTER TABLE api_usage_logs
ADD COLUMN IF NOT EXISTS method VARCHAR(10) NOT NULL DEFAULT 'POST';

CREATE INDEX IF NOT EXISTS idx_api_usage_user_status
ON api_usage_logs(user_id, status_code, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_usage_key_status
ON api_usage_logs(api_key_id, status_code, created_at DESC);

COMMIT;
