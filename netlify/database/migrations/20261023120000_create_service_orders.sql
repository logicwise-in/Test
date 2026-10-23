CREATE TABLE IF NOT EXISTS service_orders (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  firebase_uid TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  project_type TEXT NOT NULL,
  project_name TEXT NOT NULL,
  project_brief TEXT NOT NULL DEFAULT '',
  preferred_domain TEXT NOT NULL DEFAULT '',
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal_paise INTEGER NOT NULL,
  discount_code TEXT,
  discount_paise INTEGER NOT NULL DEFAULT 0,
  total_paise INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  razorpay_order_id TEXT UNIQUE,
  razorpay_payment_id TEXT UNIQUE,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  order_status TEXT NOT NULL DEFAULT 'awaiting_payment',
  email_customer_sent_at TIMESTAMPTZ,
  email_admin_sent_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS service_orders_uid_created_idx
  ON service_orders (firebase_uid, created_at DESC);
CREATE INDEX IF NOT EXISTS service_orders_status_created_idx
  ON service_orders (payment_status, created_at DESC);
