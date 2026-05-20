-- Migration 009: Add payment_requests table
-- Stores manual payment submissions from users, reviewed by admin.

CREATE TYPE payment_request_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE payment_request_type   AS ENUM ('license', 'delivery', 'renewal');

CREATE TABLE IF NOT EXISTS payment_requests (
  id                serial PRIMARY KEY,
  user_id           integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type              payment_request_type NOT NULL DEFAULT 'license',
  license_id        integer REFERENCES licenses(id) ON DELETE SET NULL,
  delivery_plan_id  text,
  amount            numeric(10, 2) NOT NULL,
  currency          text NOT NULL DEFAULT 'USD',
  payment_method    text NOT NULL,      -- e.g. "bank_transfer", "crypto", "paypal"
  transaction_ref   text,               -- reference/txn ID the user provides
  proof_image_url   text,               -- base64 data-url of payment screenshot
  notes             text,               -- any extra notes from user
  status            payment_request_status NOT NULL DEFAULT 'pending',
  admin_note        text,               -- admin's reason when rejecting
  invoice_id        integer REFERENCES invoices(id) ON DELETE SET NULL,
  created_at        timestamp NOT NULL DEFAULT now(),
  resolved_at       timestamp
);

CREATE INDEX IF NOT EXISTS idx_payment_requests_user_id   ON payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status    ON payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_license   ON payment_requests(license_id);
