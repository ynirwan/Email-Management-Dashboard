-- Migration: create licenses table
-- Run this against your PostgreSQL database

-- Enums
DO $$ BEGIN
  CREATE TYPE license_status AS ENUM ('active', 'expiring', 'revoked', 'expired');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE license_plan AS ENUM ('free', 'starter', 'pro', 'enterprise');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Licenses table
CREATE TABLE IF NOT EXISTS licenses (
  id                SERIAL PRIMARY KEY,
  customer_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain            TEXT NOT NULL UNIQUE,
  plan              license_plan NOT NULL DEFAULT 'free',
  emails_per_month  INTEGER NOT NULL DEFAULT 500,
  subscribers_limit INTEGER NOT NULL DEFAULT 500,
  features          TEXT NOT NULL DEFAULT '[]',
  status            license_status NOT NULL DEFAULT 'active',
  signature         TEXT,
  issued_at         TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at        TIMESTAMP NOT NULL,
  revoked_at        TIMESTAMP,
  last_ping_at      TIMESTAMP,
  ping_count        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_licenses_customer_id ON licenses(customer_id);
CREATE INDEX IF NOT EXISTS idx_licenses_domain      ON licenses(domain);
CREATE INDEX IF NOT EXISTS idx_licenses_status      ON licenses(status);
CREATE INDEX IF NOT EXISTS idx_licenses_expires_at  ON licenses(expires_at);