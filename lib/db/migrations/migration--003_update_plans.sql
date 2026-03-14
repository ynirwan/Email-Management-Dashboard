-- Safe migration: move enterprise users to pro, update enums
UPDATE users SET plan = 'pro' WHERE plan = 'enterprise';
UPDATE licenses SET plan = 'pro' WHERE plan = 'enterprise';

-- Recreate user_plan enum without enterprise
ALTER TABLE users ALTER COLUMN plan DROP DEFAULT;
ALTER TABLE users ALTER COLUMN plan TYPE text;
DROP TYPE IF EXISTS user_plan CASCADE;
CREATE TYPE user_plan AS ENUM ('free', 'starter', 'pro');
ALTER TABLE users ALTER COLUMN plan TYPE user_plan USING plan::user_plan;
ALTER TABLE users ALTER COLUMN plan SET DEFAULT 'free';

-- Recreate license_plan enum without enterprise  
ALTER TABLE licenses ALTER COLUMN plan DROP DEFAULT;
ALTER TABLE licenses ALTER COLUMN plan TYPE text;
DROP TYPE IF EXISTS license_plan CASCADE;
CREATE TYPE license_plan AS ENUM ('free', 'starter', 'pro');
ALTER TABLE licenses ALTER COLUMN plan TYPE license_plan USING plan::license_plan;
ALTER TABLE licenses ALTER COLUMN plan SET DEFAULT 'free';

-- Fix free plan limits
UPDATE users SET emails_limit = 2500 WHERE plan = 'free' AND emails_limit < 2500;

-- Add managed service columns if not present
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS is_managed           BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS managed_since        TIMESTAMPTZ;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS managed_note         TEXT;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS admin_access_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS root_domain          TEXT NOT NULL DEFAULT '';

-- Backfill root_domain
UPDATE licenses SET root_domain = regexp_replace(domain, '^(?:[^.]+\.)?([^.]+\.[^.]+)$', '\1') WHERE root_domain = '';

CREATE INDEX IF NOT EXISTS idx_licenses_managed ON licenses(is_managed) WHERE is_managed = TRUE;