CREATE DATABASE IF NOT EXISTS rare_oud CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE rare_oud;

CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  phone VARCHAR(40),
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user','admin') NOT NULL DEFAULT 'user',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  failed_login_count INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMP NULL,
  token_version INT NOT NULL DEFAULT 0,
  last_login_at TIMESTAMP NULL,
  last_login_ip VARCHAR(80) NULL,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role (role),
  INDEX idx_users_deleted (deleted_at),
  INDEX idx_users_active_locked (is_active, locked_until)
) ENGINE=InnoDB;

CREATE TABLE admin_permissions (
  user_id BIGINT UNSIGNED NOT NULL,
  permission VARCHAR(80) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, permission),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE categories (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(120) NOT NULL UNIQUE,
  name_ar VARCHAR(160) NOT NULL,
  name_en VARCHAR(160) NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  image_url VARCHAR(500),
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_categories_active_sort (is_active, sort_order)
) ENGINE=InnoDB;

CREATE TABLE products (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id BIGINT UNSIGNED NOT NULL,
  slug VARCHAR(160) NOT NULL UNIQUE,
  sku VARCHAR(80) UNIQUE,
  name_ar VARCHAR(220) NOT NULL,
  name_en VARCHAR(220) NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  compare_at_price DECIMAL(10,2) CHECK (compare_at_price IS NULL OR compare_at_price >= 0),
  stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  condition_status ENUM('new','used') NOT NULL DEFAULT 'new',
  dimensions VARCHAR(255),
  woods_ar TEXT, woods_en TEXT,
  included_accessories_ar TEXT, included_accessories_en TEXT,
  origin_country_ar VARCHAR(160), origin_country_en VARCHAR(160),
  maker_identity_ar VARCHAR(220), maker_identity_en VARCHAR(220),
  historical_geographic_classification_ar VARCHAR(255), historical_geographic_classification_en VARCHAR(255),
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX idx_products_category (category_id),
  INDEX idx_products_name_en (name_en),
  INDEX idx_products_name_ar (name_ar),
  INDEX idx_products_active (is_active, deleted_at),
  INDEX idx_products_price (price),
  INDEX idx_products_stock (stock),
  INDEX idx_products_condition (condition_status),
  INDEX idx_products_featured_created (is_featured, created_at)
) ENGINE=InnoDB;

CREATE TABLE product_images (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT UNSIGNED NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  storage_key VARCHAR(700) NULL,
  variants_json JSON NULL,
  alt_ar VARCHAR(220), alt_en VARCHAR(220),
  sort_order INT DEFAULT 0,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_images_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_product_images_product_sort (product_id, is_primary, sort_order),
  INDEX idx_product_images_storage_key (storage_key)
) ENGINE=InnoDB;

CREATE TABLE product_image_blobs (
  image_id BIGINT UNSIGNED PRIMARY KEY,
  content_type VARCHAR(100) NOT NULL DEFAULT 'image/webp',
  byte_size INT UNSIGNED NOT NULL,
  data LONGBLOB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_image_blobs_image FOREIGN KEY (image_id) REFERENCES product_images(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE product_media_links (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT UNSIGNED NOT NULL,
  media_type ENUM('audio','video') NOT NULL,
  title_ar VARCHAR(160), title_en VARCHAR(160),
  drive_url VARCHAR(700) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_media_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_product_media_product_type (product_id, media_type)
) ENGINE=InnoDB;

CREATE TABLE product_reviews (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  is_approved BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_reviews_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_product_review_user (product_id, user_id),
  INDEX idx_reviews_approved (is_approved, deleted_at),
  INDEX idx_reviews_product_created (product_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE favorites (
  user_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, product_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE orders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  order_number VARCHAR(40) NOT NULL UNIQUE,
  status ENUM('pending','approved','rejected','in_progress','completed') DEFAULT 'pending',
  customer_name VARCHAR(140) NOT NULL,
  customer_email VARCHAR(190),
  customer_phone VARCHAR(40) NOT NULL,
  country VARCHAR(120),
  shipping_address TEXT NULL,
  notes TEXT,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  shipping_fee DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_orders_user_created (user_id, created_at),
  INDEX idx_orders_status_created (status, created_at),
  INDEX idx_orders_deleted (deleted_at)
) ENGINE=InnoDB;

CREATE TABLE order_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NULL,
  product_name_ar VARCHAR(220) NOT NULL,
  product_name_en VARCHAR(220) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  INDEX idx_order_items_order (order_id)
) ENGINE=InnoDB;

CREATE TABLE custom_orders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  name VARCHAR(140) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  email VARCHAR(190),
  budget DECIMAL(10,2),
  request_details TEXT NOT NULL,
  status ENUM('pending','approved','rejected','in_progress','completed') DEFAULT 'pending',
  admin_note TEXT NULL,
  responded_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_custom_orders_status_created (status, created_at),
  INDEX idx_custom_orders_user_created (user_id, created_at),
  INDEX idx_custom_orders_user_status (user_id, status)
) ENGINE=InnoDB;

CREATE TABLE contact_messages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  name VARCHAR(140) NOT NULL,
  email VARCHAR(190) NULL,
  phone VARCHAR(40) NULL,
  subject VARCHAR(180) NULL,
  message TEXT NOT NULL,
  status ENUM('new','read','replied','archived') NOT NULL DEFAULT 'new',
  admin_reply TEXT NULL,
  responded_by BIGINT UNSIGNED NULL,
  responded_at TIMESTAMP NULL,
  ip_address VARCHAR(80) NULL,
  user_agent VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (responded_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_contact_messages_status_created (status, created_at),
  INDEX idx_contact_messages_user_created (user_id, created_at),
  INDEX idx_contact_messages_email_created (email, created_at)
) ENGINE=InnoDB;
CREATE TABLE editable_pages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(120) NOT NULL UNIQUE,
  title_ar VARCHAR(220) NOT NULL,
  title_en VARCHAR(220) NOT NULL,
  meta_title_ar VARCHAR(220), meta_title_en VARCHAR(220),
  meta_description_ar TEXT, meta_description_en TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE editable_content_blocks (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  page_id BIGINT UNSIGNED NULL,
  block_key VARCHAR(160) NOT NULL UNIQUE,
  content_ar LONGTEXT,
  content_en LONGTEXT,
  block_type ENUM('text','html','hero','cta','faq') DEFAULT 'text',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (page_id) REFERENCES editable_pages(id) ON DELETE SET NULL,
  INDEX idx_blocks_type (block_type)
) ENGINE=InnoDB;

CREATE TABLE site_settings (
  setting_key VARCHAR(120) PRIMARY KEY,
  value_ar TEXT,
  value_en TEXT,
  value_json JSON NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE banners (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title_ar VARCHAR(220), title_en VARCHAR(220),
  subtitle_ar TEXT, subtitle_en TEXT,
  image_url VARCHAR(500), link_url VARCHAR(500),
  placement VARCHAR(80) DEFAULT 'home',
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_banners_placement (placement, is_active, sort_order)
) ENGINE=InnoDB;



CREATE TABLE shipping_zones (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name_ar VARCHAR(160) NOT NULL,
  name_en VARCHAR(160) NOT NULL,
  countries JSON NOT NULL COMMENT 'Array of ISO country codes',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_shipping_zones_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE shipping_rates (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  zone_id BIGINT UNSIGNED NOT NULL,
  min_weight DECIMAL(8,2) DEFAULT 0,
  max_weight DECIMAL(8,2) DEFAULT 9999,
  rate DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (zone_id) REFERENCES shipping_zones(id) ON DELETE CASCADE,
  INDEX idx_shipping_rates_zone (zone_id, min_weight, max_weight)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO shipping_zones (name_ar, name_en, countries, is_active) VALUES
('داخل سوريا','Inside Syria', JSON_ARRAY('SY'), TRUE),
('دولي','International', JSON_ARRAY('AE','SA','QA','KW','BH','OM','JO','LB','TR','IQ','EG','US','CA','GB','DE','FR'), TRUE);

INSERT INTO shipping_rates (zone_id, min_weight, max_weight, rate) VALUES
(1,0,9999,0.00),
(2,0,9999,35.00);

CREATE TABLE audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_id BIGINT UNSIGNED NULL,
  action VARCHAR(120) NOT NULL,
  target_id VARCHAR(80),
  target_type VARCHAR(80),
  details JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_logs_admin_created (admin_id, created_at),
  INDEX idx_audit_logs_target (target_type, target_id)
) ENGINE=InnoDB;

CREATE TABLE admin_audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_id BIGINT UNSIGNED NULL,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(80), entity_id VARCHAR(80),
  ip_address VARCHAR(64), user_agent VARCHAR(500),
  details JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_admin_created (admin_id, created_at),
  INDEX idx_audit_entity (entity_type, entity_id)
) ENGINE=InnoDB;

CREATE TABLE site_reviews (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  name VARCHAR(140),
  rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  is_approved BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_site_reviews_approved (is_approved, deleted_at)
) ENGINE=InnoDB;

CREATE TABLE category_reviews (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  is_approved BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_category_review_user (category_id, user_id),
  INDEX idx_category_reviews_approved (is_approved, deleted_at)
) ENGINE=InnoDB;

CREATE TABLE password_reset_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  channel ENUM('email','phone') NOT NULL DEFAULT 'email',
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_reset_user (user_id),
  INDEX idx_reset_expiry (expires_at)
) ENGINE=InnoDB;

CREATE TABLE refresh_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  user_agent VARCHAR(500),
  ip_address VARCHAR(64),
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP NULL,
  replaced_by_token_hash CHAR(64) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_refresh_user (user_id, revoked_at),
  INDEX idx_refresh_expiry (expires_at),
  INDEX idx_refresh_cleanup (expires_at, revoked_at)
) ENGINE=InnoDB;



CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  type VARCHAR(80) NOT NULL,
  title_ar VARCHAR(220) NOT NULL,
  title_en VARCHAR(220) NOT NULL,
  body_ar TEXT,
  body_en TEXT,
  link_url VARCHAR(500),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notifications_user_read_created (user_id, is_read, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DELIMITER $$
CREATE EVENT IF NOT EXISTS cleanup_expired_tokens
  ON SCHEDULE EVERY 1 WEEK
  DO
  BEGIN
    DELETE FROM refresh_tokens WHERE expires_at < NOW();
    DELETE FROM password_reset_tokens WHERE expires_at < NOW();
  END$$
DELIMITER ;

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

CREATE TABLE IF NOT EXISTS site_visits (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  path VARCHAR(255) NOT NULL,
  referrer VARCHAR(500),
  user_agent VARCHAR(500),
  ip_hash CHAR(64) NOT NULL,
  visitor_id CHAR(64) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_site_visits_created (created_at),
  INDEX idx_site_visits_path_created (path, created_at),
  INDEX idx_site_visits_visitor_created (visitor_id, created_at)
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
