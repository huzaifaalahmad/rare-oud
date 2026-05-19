-- Rare Oud v7: security, integrity, audit, and performance hardening

-- Financial precision and non-negative values.
ALTER TABLE products MODIFY price DECIMAL(10,2) NOT NULL;
ALTER TABLE products MODIFY compare_at_price DECIMAL(10,2) NULL;
ALTER TABLE products MODIFY stock INT NOT NULL DEFAULT 0;

ALTER TABLE products ADD CONSTRAINT chk_products_price_non_negative CHECK (price >= 0);
ALTER TABLE products ADD CONSTRAINT chk_products_compare_price_non_negative CHECK (compare_at_price IS NULL OR compare_at_price >= 0);
ALTER TABLE products ADD CONSTRAINT chk_products_stock_non_negative CHECK (stock >= 0);

-- Query performance for category browsing and name search/autocomplete.
-- category_id already has idx_products_category in the base schema.
CREATE INDEX idx_products_name_en ON products(name_en);
CREATE INDEX idx_products_name_ar ON products(name_ar);

-- General admin audit log table requested for security/compliance reporting.
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_id BIGINT UNSIGNED NULL,
  action VARCHAR(120) NOT NULL,
  target_id VARCHAR(80),
  target_type VARCHAR(80),
  details JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_logs_admin FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_logs_admin_created (admin_id, created_at),
  INDEX idx_audit_logs_target (target_type, target_id)
) ENGINE=InnoDB;

-- User ownership cleanup. Constraint names differ between MySQL installations,
-- so drop the current FK dynamically before creating the intended cascade constraints.
SET @fk_orders = (
  SELECT CONSTRAINT_NAME
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'orders'
    AND COLUMN_NAME = 'user_id'
    AND REFERENCED_TABLE_NAME = 'users'
  LIMIT 1
);
SET @sql = IF(@fk_orders IS NOT NULL, CONCAT('ALTER TABLE orders DROP FOREIGN KEY ', @fk_orders), 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
ALTER TABLE orders ADD CONSTRAINT fk_orders_user_cascade FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

SET @fk_custom = (
  SELECT CONSTRAINT_NAME
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'custom_orders'
    AND COLUMN_NAME = 'user_id'
    AND REFERENCED_TABLE_NAME = 'users'
  LIMIT 1
);
SET @sql2 = IF(@fk_custom IS NOT NULL, CONCAT('ALTER TABLE custom_orders DROP FOREIGN KEY ', @fk_custom), 'SELECT 1');
PREPARE stmt2 FROM @sql2; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;
ALTER TABLE custom_orders ADD CONSTRAINT fk_custom_orders_user_cascade FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Optional tables if present in your installed schema.
-- ALTER TABLE payments DROP FOREIGN KEY payments_ibfk_1;
-- ALTER TABLE payments ADD CONSTRAINT fk_payments_user_cascade FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
-- ALTER TABLE site_reviews DROP FOREIGN KEY site_reviews_ibfk_1;
-- ALTER TABLE site_reviews ADD CONSTRAINT fk_site_reviews_user_cascade FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
