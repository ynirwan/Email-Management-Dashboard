-- migration--006_add_install_tracking.sql
--
-- Adds installation and per-ping IP tracking to the licenses table.
-- These fields allow the dashboard to detect license reuse (same license.json
-- deployed to multiple servers) and tie each license to its real installation.

ALTER TABLE licenses
  ADD COLUMN IF NOT EXISTS installed_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS installed_ip   TEXT,
  ADD COLUMN IF NOT EXISTS install_count  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ip_mismatch    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_ping_ip   TEXT;
