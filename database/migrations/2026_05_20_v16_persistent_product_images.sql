CREATE TABLE IF NOT EXISTS product_image_blobs (
  image_id BIGINT UNSIGNED PRIMARY KEY,
  content_type VARCHAR(100) NOT NULL DEFAULT 'image/webp',
  byte_size INT UNSIGNED NOT NULL,
  data LONGBLOB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_image_blobs_image FOREIGN KEY (image_id) REFERENCES product_images(id) ON DELETE CASCADE
) ENGINE=InnoDB;
