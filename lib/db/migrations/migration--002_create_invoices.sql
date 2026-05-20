DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('draft', 'pending', 'paid', 'overdue', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS invoices (
  id                   SERIAL PRIMARY KEY,
  customer_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invoice_no           TEXT    NOT NULL UNIQUE,
  plan                 TEXT    NOT NULL,
  amount               NUMERIC(10,2) NOT NULL,
  currency             TEXT    NOT NULL DEFAULT 'USD',
  status               invoice_status NOT NULL DEFAULT 'pending',
  description          TEXT,
  billing_period_start TIMESTAMPTZ,
  billing_period_end   TIMESTAMPTZ,
  paid_at              TIMESTAMPTZ,
  due_at               TIMESTAMPTZ NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status   ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_at   ON invoices(due_at);