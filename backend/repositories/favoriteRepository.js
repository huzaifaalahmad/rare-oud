const db = require('../config/database');

async function listForUser(userId) {
  return db.query(
    `SELECT p.*,
            c.name_ar category_name_ar,
            c.name_en category_name_en,
            pi.image_url primary_image,
            COALESCE(stats.likes_count, 0) likes_count,
            stats.avg_rating
     FROM favorites f
     JOIN products p ON p.id=f.product_id
     JOIN categories c ON c.id=p.category_id
     LEFT JOIN (
       SELECT ranked.product_id, ranked.image_url
       FROM (
         SELECT product_id, image_url,
                ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY is_primary DESC, sort_order ASC, id ASC) rn
         FROM product_images
       ) ranked
       WHERE ranked.rn=1
     ) pi ON pi.product_id=p.id
     LEFT JOIN (
       SELECT product_id,
              COUNT(*) likes_count,
              NULL avg_rating
       FROM favorites
       GROUP BY product_id
     ) stats ON stats.product_id=p.id
     WHERE f.user_id=:user_id AND p.deleted_at IS NULL AND p.is_active=TRUE
     ORDER BY f.created_at DESC`,
    { user_id: userId }
  );
}

async function getProduct(productId) {
  const rows = await db.query('SELECT id FROM products WHERE id=:id AND deleted_at IS NULL AND is_active=TRUE LIMIT 1', { id: productId });
  return rows[0] || null;
}

async function isFavorite(userId, productId) {
  const rows = await db.query('SELECT 1 FROM favorites WHERE user_id=:u AND product_id=:p LIMIT 1', { u: userId, p: productId });
  return Boolean(rows.length);
}

async function add(userId, productId) {
  return db.query('INSERT IGNORE INTO favorites (user_id,product_id) VALUES (:u,:p)', { u: userId, p: productId });
}

async function remove(userId, productId) {
  return db.query('DELETE FROM favorites WHERE user_id=:u AND product_id=:p', { u: userId, p: productId });
}

async function countForProduct(productId) {
  const rows = await db.query('SELECT COUNT(*) likes_count FROM favorites WHERE product_id=:p', { p: productId });
  return rows[0]?.likes_count || 0;
}

module.exports = { listForUser, getProduct, isFavorite, add, remove, countForProduct };
