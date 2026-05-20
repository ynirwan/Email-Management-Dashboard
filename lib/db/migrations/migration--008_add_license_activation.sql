-- migration--008_add_license_activation.sql
--
-- Adds is_activated flag to licenses.
-- Existing admin-generated licenses default to TRUE (no change in behaviour).
-- Licenses auto-created when a user registers a domain default to FALSE until
-- an admin explicitly activates them (i.e. confirms payment has been received).

ALTER TABLE licenses
  ADD COLUMN IF NOT EXISTS is_activated boolean NOT NULL DEFAULT true;
