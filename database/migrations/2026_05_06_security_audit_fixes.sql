ALTER TABLE refresh_tokens DROP INDEX idx_rt_expires;
ALTER TABLE password_reset_tokens DROP INDEX idx_prt_expires;
ALTER TABLE custom_orders ADD INDEX idx_custom_orders_user_status (user_id, status);
