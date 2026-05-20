ALTER TABLE licenses
  ADD COLUMN IF NOT EXISTS delivery_plan_id     TEXT        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS delivery_plan_name   TEXT        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS delivery_emails_limit INTEGER    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS delivery_infra        TEXT        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS delivery_routing      TEXT        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS delivery_active_since TIMESTAMPTZ DEFAULT NULL;
 
-- Index for quickly finding all licenses with active delivery plans
CREATE INDEX IF NOT EXISTS idx_licenses_delivery ON licenses(delivery_plan_id)
  WHERE delivery_plan_id IS NOT NULL;
 
COMMENT ON COLUMN licenses.delivery_plan_id IS
  'NULL = self-managed SMTP. Set = customer on ZeniPost managed delivery. Email app reads this to configure its sending path.';
