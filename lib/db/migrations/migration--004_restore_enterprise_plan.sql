-- Restore enterprise tier after migration--003 removed it from enum types.
-- Safe to run repeatedly.

ALTER TYPE user_plan ADD VALUE IF NOT EXISTS 'enterprise';
ALTER TYPE license_plan ADD VALUE IF NOT EXISTS 'enterprise';
