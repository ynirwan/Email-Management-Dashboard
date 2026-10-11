-- migration--011_add_license_indexes.sql
--
-- Adds DB indexes to support efficient filtering on GET /api/licenses.
-- Previously, search/status/userId filters were applied in JS after a full
-- table scan with a paginated fetch — meaning filters only saw the current page
-- and the returned total was wrong. These indexes let the WHERE clause push
-- those filters into Postgres.

CREATE INDEX IF NOT EXISTS licenses_status_idx
  ON licenses (status);

CREATE INDEX IF NOT EXISTS licenses_customer_id_idx
  ON licenses (customer_id);

COMMENT ON INDEX licenses_status_idx IS
  'Supports filtering GET /api/licenses by status (active, expiring, revoked, expired). '
  'Note: status is a stored enum; runtime status is also derived from revokedAt/expiresAt.';

COMMENT ON INDEX licenses_customer_id_idx IS
  'Supports filtering GET /api/licenses by userId (customer_id). '
  'Also speeds up foreign-key lookups from licenses → users.';
