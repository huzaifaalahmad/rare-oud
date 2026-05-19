USE rare_oud;

-- Final launch-ready hardening: prevent double stock restoration when orders are cancelled/refunded.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS stock_released BOOLEAN NOT NULL DEFAULT FALSE AFTER paid_at;

INSERT IGNORE INTO site_settings (setting_key,value_ar,value_en,value_json) VALUES
('support_email','support@rareoud.example','support@rareoud.example',NULL),
('payment_review_sla','تتم مراجعة إثبات الدفع عادة خلال 24 ساعة.','Payment proof is usually reviewed within 24 hours.',NULL);
