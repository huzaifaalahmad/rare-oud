-- Rare Oud v13 enterprise remediation: idempotent security, scalability and observability additions.

SET @db := DATABASE();

SET @sql := IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='refresh_tokens' AND COLUMN_NAME='device_fingerprint')=0,
  'ALTER TABLE refresh_tokens ADD COLUMN device_fingerprint CHAR(64) NULL AFTER ip_address',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='refresh_tokens' AND COLUMN_NAME='token_family_id')=0,
  'ALTER TABLE refresh_tokens ADD COLUMN token_family_id CHAR(36) NULL AFTER device_fingerprint',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF((SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='refresh_tokens' AND INDEX_NAME='idx_refresh_family')=0,
  'ALTER TABLE refresh_tokens ADD INDEX idx_refresh_family (token_family_id, revoked_at, expires_at)',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS admin_permissions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  permission VARCHAR(120) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_admin_permission (user_id, permission),
  INDEX idx_admin_permissions_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(190) NOT NULL,
  entity_type VARCHAR(80) NULL,
  entity_id VARCHAR(80) NULL,
  ip_address VARCHAR(80) NULL,
  user_agent VARCHAR(500) NULL,
  metadata JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_admin_audit_admin_created (admin_id, created_at),
  INDEX idx_admin_audit_entity (entity_type, entity_id),
  INDEX idx_admin_audit_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS media_security_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  filename VARCHAR(255) NULL,
  event_type VARCHAR(80) NOT NULL,
  severity ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  metadata JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_media_security_created (created_at),
  INDEX idx_media_security_type (event_type, created_at)
) ENGINE=InnoDB;

SET @sql := IF((SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='favorites' AND INDEX_NAME='idx_favorites_user_product')=0,
  'ALTER TABLE favorites ADD UNIQUE INDEX idx_favorites_user_product (user_id, product_id)',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF((SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='product_reviews' AND INDEX_NAME='idx_reviews_product_created')=0,
  'ALTER TABLE product_reviews ADD INDEX idx_reviews_product_created (product_id, created_at)',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF((SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='notifications' AND INDEX_NAME='idx_notifications_user_read')=0,
  'ALTER TABLE notifications ADD INDEX idx_notifications_user_read (user_id, is_read, created_at)',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
