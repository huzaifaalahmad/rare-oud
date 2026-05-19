USE rare_oud;

ALTER TABLE orders
  MODIFY status ENUM('pending_payment','pending','paid','confirmed','processing','shipped','delivered','cancelled','refunded') DEFAULT 'pending_payment',
  MODIFY payment_status ENUM('unpaid','pending','paid','failed','refunded') DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS payment_instructions TEXT NULL AFTER payment_reference,
  ADD COLUMN IF NOT EXISTS payment_proof_url VARCHAR(700) NULL AFTER payment_instructions,
  ADD COLUMN IF NOT EXISTS transaction_info JSON NULL AFTER payment_proof_url,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP NULL AFTER transaction_info;

ALTER TABLE custom_orders
  MODIFY status ENUM('pending','approved','rejected','in_progress','completed','new','reviewing','quoted','accepted') DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS admin_note TEXT NULL AFTER request_details,
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP NULL AFTER admin_note;

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

CREATE TABLE IF NOT EXISTS payment_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  event_type VARCHAR(80) NOT NULL,
  payload JSON NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_payment_events_order (order_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO editable_pages (slug,title_ar,title_en,meta_title_ar,meta_title_en,meta_description_ar,meta_description_en,is_active) VALUES
('about','من نحن','About Rare Oud','من نحن | العود النادر','About Rare Oud','حكاية العود النادر وخبرتنا في اختيار الأعواد الفاخرة.','The Rare Oud story and our expertise in selecting luxury ouds.',TRUE),
('accessories','الأكسسوارات','Accessories','الأكسسوارات | العود النادر','Accessories | Rare Oud','أكسسوارات فاخرة لحفظ وعرض العود.','Luxury accessories for storing, presenting, and caring for oud.',TRUE),
('links','روابط مهمة','Important Links','روابط العود النادر','Rare Oud Links','روابط التواصل والدفع والسياسات.','Contact, payment, and policy links.',TRUE);

INSERT IGNORE INTO editable_content_blocks (block_key, content_ar, content_en, block_type) VALUES
('about.hero','{"title":"العود النادر","subtitle":"نختار كل قطعة عود كقطعة فنية تحمل تاريخًا وصوتًا وروحًا.","image":"/logo.svg"}','{"title":"Rare Oud","subtitle":"Every oud is curated as an art piece with history, sound, and soul.","image":"/logo.svg"}','hero'),
('about.story','نحن منصة متخصصة في الأعواد الفاخرة والنادرة، نجمع بين الخبرة الموسيقية، التوثيق، وخدمة ما بعد البيع لنقدم تجربة شراء موثوقة وراقية.','We specialize in rare luxury ouds, combining musical expertise, documentation, and after-sales service for a trusted premium experience.','html'),
('accessories.hero','{"title":"أكسسوارات فاخرة","subtitle":"حقائب، أوتار، ريش، وحلول حفظ مصممة لحماية العود وإبراز جماله.","image":"/logo.svg"}','{"title":"Luxury Accessories","subtitle":"Cases, strings, picks, and care solutions made to protect and present your oud.","image":"/logo.svg"}','hero'),
('accessories.sections','حقائب مبطنة، أوتار مختارة، ريش احترافية، قواعد عرض، ومنتجات عناية مناسبة للأعواد النادرة.','Padded cases, selected strings, professional picks, display stands, and care products for rare ouds.','html'),
('links.hero','{"title":"روابط العود النادر","subtitle":"كل الروابط المهمة في مكان واحد.","image":"/logo.svg"}','{"title":"Rare Oud Links","subtitle":"All important links in one place.","image":"/logo.svg"}','hero');

INSERT IGNORE INTO site_settings (setting_key,value_ar,value_en,value_json) VALUES
('whatsapp_phone','963000000000','963000000000',NULL),
('sham_cash_payment','تعليمات شام كاش: امسح رمز QR أو استخدم رابط الدفع، ثم ارفع إثبات الدفع من صفحة الطلب.','Sham Cash instructions: scan the QR or use the payment link, then upload proof from your order page.', JSON_OBJECT('qrUrl','/logo.svg','paymentLink','','accountName','Rare Oud'));
