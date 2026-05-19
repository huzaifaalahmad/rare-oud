const db = require('../config/database');

async function createNotification(userId, { type = 'general', title_ar, title_en, body_ar = '', body_en = '', link_url = null }) {
  if (!userId) return null;
  const result = await db.query(
    `INSERT INTO notifications (user_id,type,title_ar,title_en,body_ar,body_en,link_url)
     VALUES (:user_id,:type,:title_ar,:title_en,:body_ar,:body_en,:link_url)`,
    { user_id: userId, type, title_ar, title_en, body_ar, body_en, link_url }
  );
  return result.insertId;
}

module.exports = { createNotification };
