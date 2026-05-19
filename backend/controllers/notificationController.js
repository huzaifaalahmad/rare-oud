const db = require('../config/database');

function page(req) {
  return { limit: Math.min(Math.max(parseInt(req.query.limit || 30, 10), 1), 100), offset: Math.max(parseInt(req.query.offset || 0, 10), 0) };
}

exports.list = async (req, res, next) => {
  try {
    const { limit, offset } = page(req);
    const notifications = await db.query(
      `SELECT *
       FROM notifications
       WHERE user_id=:user_id
       ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      { user_id: req.user.id }
    );
    const unreadRows = await db.query('SELECT COUNT(*) unread FROM notifications WHERE user_id=:user_id AND is_read=FALSE', { user_id: req.user.id });
    res.json({ notifications, unread: unreadRows[0]?.unread || 0, limit, offset });
  } catch (e) { next(e); }
};

exports.unread = async (req, res, next) => {
  try {
    const rows = await db.query('SELECT COUNT(*) unread FROM notifications WHERE user_id=:user_id AND is_read=FALSE', { user_id: req.user.id });
    res.json({ unread: rows[0]?.unread || 0 });
  } catch (e) { next(e); }
};

exports.markRead = async (req, res, next) => {
  try {
    await db.query('UPDATE notifications SET is_read=TRUE, read_at=NOW() WHERE user_id=:user_id AND id=:id', { user_id: req.user.id, id: req.params.id });
    res.json({ message: 'Notification updated' });
  } catch (e) { next(e); }
};

exports.markAllRead = async (req, res, next) => {
  try {
    await db.query('UPDATE notifications SET is_read=TRUE, read_at=NOW() WHERE user_id=:user_id AND is_read=FALSE', { user_id: req.user.id });
    res.json({ message: 'Notifications updated' });
  } catch (e) { next(e); }
};
