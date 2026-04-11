-- Plan model v2: remove free/enterprise, move to starter/pro/agency.
-- Safe-ish migration for existing data.

UPDATE users
SET plan = CASE
  WHEN plan = 'free' THEN 'starter'
  WHEN plan = 'enterprise' THEN 'agency'
  ELSE plan
END;

UPDATE licenses
SET plan = CASE
  WHEN plan = 'free' THEN 'starter'
  WHEN plan = 'enterprise' THEN 'agency'
  ELSE plan
END;

ALTER TABLE users ALTER COLUMN plan DROP DEFAULT;
ALTER TABLE users ALTER COLUMN plan TYPE text;
DROP TYPE IF EXISTS user_plan CASCADE;
CREATE TYPE user_plan AS ENUM ('starter', 'pro', 'agency');
ALTER TABLE users ALTER COLUMN plan TYPE user_plan USING plan::user_plan;
ALTER TABLE users ALTER COLUMN plan SET DEFAULT 'starter';

ALTER TABLE licenses ALTER COLUMN plan DROP DEFAULT;
ALTER TABLE licenses ALTER COLUMN plan TYPE text;
DROP TYPE IF EXISTS license_plan CASCADE;
CREATE TYPE license_plan AS ENUM ('starter', 'pro', 'agency');
ALTER TABLE licenses ALTER COLUMN plan TYPE license_plan USING plan::license_plan;
ALTER TABLE licenses ALTER COLUMN plan SET DEFAULT 'starter';
