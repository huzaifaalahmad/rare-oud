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
