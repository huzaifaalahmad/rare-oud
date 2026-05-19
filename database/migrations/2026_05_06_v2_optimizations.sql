-- Rare Oud / العود النادر
-- QA/Security Audit v2 migration
-- Run after the base schema on existing databases. Statements are intentionally explicit.

-- Faster token cleanup and revoked-token scans.
ALTER TABLE refresh_tokens ADD INDEX idx_refresh_cleanup (expires_at, revoked_at);

-- Soft-delete support for orders so admin can hide orders without destroying financial history.
ALTER TABLE orders ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE orders ADD COLUMN payment_provider VARCHAR(40) NULL;
ALTER TABLE orders ADD COLUMN payment_reference VARCHAR(190) NULL;
ALTER TABLE orders ADD INDEX idx_orders_deleted (deleted_at);
ALTER TABLE orders ADD INDEX idx_orders_payment_reference (payment_provider, payment_reference);

-- Faster content block filtering by type in admin/content pages.
ALTER TABLE editable_content_blocks ADD INDEX idx_blocks_type (block_type);

-- Baseline editable settings required by checkout/contact/social flows.
INSERT IGNORE INTO site_settings (setting_key, value_en, value_ar, value_json) VALUES
('sham_cash_url', '', '', NULL),
('facebook_url', '', '', NULL),
('instagram_url', '', '', NULL),
('tiktok_url', '', '', NULL),
('contact_phone', '', '', NULL),
('contact_email', '', '', NULL),
('cdn_base_url', '', '', NULL);
