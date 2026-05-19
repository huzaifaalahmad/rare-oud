CREATE TABLE IF NOT EXISTS security_events (id BIGINT AUTO_INCREMENT PRIMARY KEY,user_id BIGINT NULL,event_type VARCHAR(120) NOT NULL,severity ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',ip_address VARCHAR(64) NULL,user_agent VARCHAR(500) NULL,metadata JSON NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,INDEX idx_security_events_type_created (event_type, created_at),INDEX idx_security_events_user_created (user_id, created_at));
CREATE TABLE IF NOT EXISTS admin_step_up_challenges (id BIGINT AUTO_INCREMENT PRIMARY KEY,admin_id BIGINT NOT NULL,challenge_hash CHAR(64) NOT NULL,consumed_at TIMESTAMP NULL,expires_at DATETIME NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,INDEX idx_stepup_admin_expires (admin_id, expires_at));
CREATE TABLE IF NOT EXISTS media_access_tokens (id BIGINT AUTO_INCREMENT PRIMARY KEY,media_key VARCHAR(512) NOT NULL,token_hash CHAR(64) NOT NULL UNIQUE,expires_at DATETIME NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,INDEX idx_media_tokens_key (media_key(191), expires_at));
CREATE TABLE IF NOT EXISTS worker_heartbeats (worker_name VARCHAR(128) PRIMARY KEY,queue_name VARCHAR(128) NOT NULL,last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,metadata JSON NULL);
CREATE TABLE IF NOT EXISTS archived_notifications LIKE notifications;
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at);
CREATE INDEX idx_products_category_active ON products(category_id, is_active, created_at);

CREATE TABLE IF NOT EXISTS upload_audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NULL,
  request_id VARCHAR(80) NULL,
  original_name VARCHAR(255) NULL,
  stored_name VARCHAR(255) NULL,
  mime_type VARCHAR(120) NULL,
  size_bytes BIGINT NULL,
  sha256 CHAR(64) NULL,
  status ENUM('accepted','rejected','quarantined','processed') NOT NULL,
  reason VARCHAR(255) NULL,
  ip_address VARCHAR(64) NULL,
  user_agent VARCHAR(500) NULL,
  metadata JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_upload_audit_status_created (status, created_at),
  INDEX idx_upload_audit_user_created (user_id, created_at),
  INDEX idx_upload_audit_sha256 (sha256)
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  idempotency_key VARCHAR(191) NOT NULL UNIQUE,
  scope VARCHAR(120) NOT NULL,
  status ENUM('started','completed','failed') NOT NULL DEFAULT 'started',
  response_hash CHAR(64) NULL,
  locked_until TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_idempotency_scope_status (scope, status, updated_at)
);

CREATE TABLE IF NOT EXISTS query_performance_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  query_name VARCHAR(191) NOT NULL,
  duration_ms INT NOT NULL,
  rows_examined INT NULL,
  metadata JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_query_perf_name_created (query_name, created_at),
  INDEX idx_query_perf_duration (duration_ms)
);

CREATE INDEX idx_favorites_user_product ON favorites(user_id, product_id);
CREATE INDEX idx_reviews_product_created ON product_reviews(product_id, created_at);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read, created_at);
CREATE INDEX idx_audit_logs_created ON admin_audit_logs(created_at);
CREATE INDEX idx_product_images_product_sort ON product_images(product_id, is_primary, sort_order, id);
