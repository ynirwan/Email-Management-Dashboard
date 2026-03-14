-- Run this if licenses table doesn't exist yet
DO $$ BEGIN
  CREATE TYPE license_status AS ENUM ('active', 'expiring', 'revoked', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE license_plan AS ENUM ('free', 'starter', 'pro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS licenses (
  id                   SERIAL PRIMARY KEY,
  customer_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain               TEXT    NOT NULL UNIQUE,
  root_domain          TEXT    NOT NULL DEFAULT '',
  plan                 license_plan NOT NULL DEFAULT 'free',
  emails_per_month     INTEGER NOT NULL DEFAULT 2500,
  subscribers_limit    INTEGER NOT NULL DEFAULT 500,
  features             TEXT    NOT NULL DEFAULT '[]',
  status               license_status NOT NULL DEFAULT 'active',
  signature            TEXT,
  is_managed           BOOLEAN NOT NULL DEFAULT FALSE,
  managed_since        TIMESTAMPTZ,
  managed_note         TEXT,
  admin_access_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  issued_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at           TIMESTAMPTZ NOT NULL,
  revoked_at           TIMESTAMPTZ,
  last_ping_at         TIMESTAMPTZ,
  ping_count           INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_licenses_customer ON licenses(customer_id);
CREATE INDEX IF NOT EXISTS idx_licenses_domain   ON licenses(domain);
CREATE INDEX IF NOT EXISTS idx_licenses_managed  ON licenses(is_managed) WHERE is_managed = TRUE;