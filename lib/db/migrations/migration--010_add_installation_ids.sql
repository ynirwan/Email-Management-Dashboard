-- migration--010_add_installation_ids.sql
--
-- Adds installation_ids column to the licenses table.
-- Stores a JSON array of unique installation_id UUIDs (one per running instance).
-- Used by the ping endpoint to enforce per-plan seat limits across multiple servers.

ALTER TABLE licenses
  ADD COLUMN IF NOT EXISTS installation_ids TEXT NOT NULL DEFAULT '[]';

COMMENT ON COLUMN licenses.installation_ids IS
  'JSON array of unique installation_id UUIDs sent by each running email-app instance via /ping. '
  'Used to enforce per-plan seat limits. Example: ["uuid-a", "uuid-b"]';
