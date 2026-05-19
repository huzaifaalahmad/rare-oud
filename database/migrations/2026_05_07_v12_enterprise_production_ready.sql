-- Rare Oud Enterprise production readiness additions
ALTER TABLE users ADD COLUMN last_login_ip VARCHAR(80) NULL AFTER last_login_at;

ALTER TABLE product_images
  ADD COLUMN storage_key VARCHAR(700) NULL AFTER image_url,
  ADD COLUMN variants_json JSON NULL AFTER storage_key,
  ADD INDEX idx_product_images_storage_key (storage_key);

CREATE TABLE IF NOT EXISTS analytics_daily_snapshots (
  snapshot_date DATE PRIMARY KEY,
  orders_count BIGINT UNSIGNED NOT NULL DEFAULT 0,
  revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
  pending_orders BIGINT UNSIGNED NOT NULL DEFAULT 0,
  users_count BIGINT UNSIGNED NOT NULL DEFAULT 0,
  products_count BIGINT UNSIGNED NOT NULL DEFAULT 0,
  reviews_count BIGINT UNSIGNED NOT NULL DEFAULT 0,
  custom_orders_count BIGINT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS suspicious_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  event_type VARCHAR(80) NOT NULL,
  severity ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  ip_address VARCHAR(80),
  user_agent VARCHAR(500),
  metadata JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_suspicious_type_created (event_type, created_at),
  INDEX idx_suspicious_user_created (user_id, created_at)
) ENGINE=InnoDB;
