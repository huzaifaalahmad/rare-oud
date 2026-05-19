-- Rare Oud V8: remove cart/payment commerce and move to direct inquiry product requests.
USE rare_oud;

DROP TABLE IF EXISTS payment_events;
DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS carts;

ALTER TABLE orders
  MODIFY status ENUM('pending','approved','rejected','in_progress','completed') DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS country VARCHAR(120) NULL AFTER customer_phone,
  MODIFY shipping_address TEXT NULL,
  MODIFY subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  MODIFY total DECIMAL(10,2) NOT NULL DEFAULT 0;

ALTER TABLE orders
  DROP INDEX IF EXISTS idx_orders_payment,
  DROP INDEX IF EXISTS idx_orders_payment_reference,
  DROP COLUMN IF EXISTS payment_method,
  DROP COLUMN IF EXISTS payment_status,
  DROP COLUMN IF EXISTS payment_provider,
  DROP COLUMN IF EXISTS payment_reference,
  DROP COLUMN IF EXISTS payment_instructions,
  DROP COLUMN IF EXISTS payment_proof_url,
  DROP COLUMN IF EXISTS transaction_info,
  DROP COLUMN IF EXISTS paid_at;

ALTER TABLE custom_orders
  MODIFY status ENUM('pending','approved','rejected','in_progress','completed') DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS admin_note TEXT NULL AFTER status,
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP NULL AFTER admin_note;

DELETE FROM site_settings WHERE setting_key IN ('sham_cash_url','sham_cash_payment','payment_review_sla');
