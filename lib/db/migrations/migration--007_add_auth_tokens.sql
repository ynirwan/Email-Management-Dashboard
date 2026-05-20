-- migration--007_add_auth_tokens.sql
--
-- Adds password-reset and email-verification columns to the users table.
-- These are nullable: only populated while an action is pending.
-- Run with: psql $DATABASE_URL -f migration--007_add_auth_tokens.sql

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS reset_token                TEXT,
  ADD COLUMN IF NOT EXISTS reset_token_expires_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_verified_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_verification_token   TEXT;

-- Optional: index on reset_token for fast lookup when verifying reset links.
CREATE INDEX IF NOT EXISTS idx_users_reset_token
  ON users (reset_token)
  WHERE reset_token IS NOT NULL;

-- Optional: index on email_verification_token for fast lookup during verification.
CREATE INDEX IF NOT EXISTS idx_users_email_verification_token
  ON users (email_verification_token)
  WHERE email_verification_token IS NOT NULL;
