USE rare_oud;

-- تسريع استعلام unread notifications
ALTER TABLE notifications
  ADD INDEX idx_notif_user_read (user_id, is_read);

-- تسريع الاستعلامات المستقبلية حسب تاريخ رد الإدارة
ALTER TABLE custom_orders
  ADD INDEX idx_custom_orders_responded (responded_at);
