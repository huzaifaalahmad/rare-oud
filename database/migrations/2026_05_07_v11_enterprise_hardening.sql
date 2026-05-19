-- Rare Oud v11 Enterprise Production Hardening
-- Apply after v10/v9 schema migrations. Safe indexes are named uniquely for repeatable review.
USE rare_oud;

-- Favorites and review paths are high-traffic product UI paths.
ALTER TABLE favorites
  ADD INDEX idx_favorites_user_product_v11 (user_id, product_id),
  ADD INDEX idx_favorites_product_user_v11 (product_id, user_id);

ALTER TABLE product_reviews
  ADD INDEX idx_reviews_product_approved_deleted_v11 (product_id, is_approved, deleted_at),
  ADD INDEX idx_reviews_user_product_deleted_v11 (user_id, product_id, deleted_at);

-- Direct inquiry orders in v8+ are searched by user/admin status and time.
ALTER TABLE orders
  ADD INDEX idx_orders_user_status_created_v11 (user_id, status, created_at),
  ADD INDEX idx_orders_status_created_v11 (status, created_at),
  ADD INDEX idx_orders_customer_phone_v11 (customer_phone);

-- Admin dashboard and CMS lookup performance.
ALTER TABLE admin_audit_logs
  ADD INDEX idx_admin_audit_created_action_v11 (created_at, action);

ALTER TABLE editable_content_blocks
  ADD INDEX idx_content_page_key_v11 (page_slug, block_key),
  ADD INDEX idx_content_updated_v11 (updated_at);

-- Notifications/archive strategy preparation.
ALTER TABLE notifications
  ADD INDEX idx_notifications_created_v11 (created_at),
  ADD INDEX idx_notifications_type_created_v11 (type, created_at);
