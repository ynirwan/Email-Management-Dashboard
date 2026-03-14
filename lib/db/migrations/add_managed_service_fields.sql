-- Migration: add managed service fields to licenses
-- Run: psql $DATABASE_URL -f lib/db/migrations/add_managed_service_fields.sql

ALTER TABLE licenses
  ADD COLUMN IF NOT EXISTS is_managed           BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS managed_since        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS managed_note         TEXT,
  ADD COLUMN IF NOT EXISTS admin_access_enabled BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS root_domain          TEXT        NOT NULL DEFAULT '';

-- Index for quick lookup of managed licenses
CREATE INDEX IF NOT EXISTS idx_licenses_managed ON licenses(is_managed) WHERE is_managed = TRUE;

-- Backfill root_domain from domain for existing rows
UPDATE licenses
SET root_domain = regexp_replace(domain, '^(?:[^.]+\.)?([^.]+\.[^.]+)$', '\1')
WHERE root_domain = '';