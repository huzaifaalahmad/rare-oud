const db = require('../config/database');
const { audit } = require('../utils/audit');
const AppError = require('../utils/AppError');

exports.createProductReview = async (req, res, next) => {
  try {
    const rating = Number(req.body.rating);
    const comment = req.body.comment ? String(req.body.comment).slice(0, 2000) : null;
    if (!rating || rating < 1 || rating > 5) throw new AppError('Invalid rating', 422, 'INVALID_RATING');
    const existing = await db.query('SELECT id FROM product_reviews WHERE product_id=:product_id AND user_id=:user_id AND deleted_at IS NULL LIMIT 1', { product_id: req.params.productId, user_id: req.user.id });
    if (existing.length) throw new AppError('You already reviewed this product', 409, 'DUPLICATE_REVIEW');
    const r = await db.query('INSERT INTO product_reviews (product_id,user_id,rating,comment) VALUES (:product_id,:user_id,:rating,:comment)', { product_id: req.params.productId, user_id: req.user.id, rating, comment });
    res.status(201).json({ id: r.insertId || null, message: 'Review submitted for approval' });
  } catch (e) { next(e); }
};
exports.adminList = async (req, res, next) => {
  try { const limit=Math.min(parseInt(req.query.limit||100,10),200), offset=Math.max(parseInt(req.query.offset||0,10),0); res.json({ reviews: await db.query(`SELECT r.*,u.name user_name,p.name_ar product_name_ar FROM product_reviews r JOIN users u ON u.id=r.user_id JOIN products p ON p.id=r.product_id WHERE r.deleted_at IS NULL ORDER BY r.created_at DESC LIMIT ${limit} OFFSET ${offset}`) }); }
  catch (e) { next(e); }
};
exports.approve = async (req, res, next) => { try { await db.query('UPDATE product_reviews SET is_approved=:approved WHERE id=:id', { id: req.params.id, approved: req.body.approved ?? true }); await audit(req, 'moderate', 'review', req.params.id, req.body); res.json({ message: 'Review updated' }); } catch (e) { next(e); } };
exports.remove = async (req, res, next) => { try { await db.query('UPDATE product_reviews SET deleted_at=CURRENT_TIMESTAMP WHERE id=:id', { id: req.params.id }); await audit(req, 'delete', 'review', req.params.id); res.json({ message: 'Review deleted' }); } catch (e) { next(e); } };

exports.adminSiteList = async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit || 100, 10), 1), 200);
    const offset = Math.max(parseInt(req.query.offset || 0, 10), 0);
    const reviews = await db.query(`SELECT sr.*, u.name user_name FROM site_reviews sr LEFT JOIN users u ON u.id=sr.user_id WHERE sr.deleted_at IS NULL ORDER BY sr.created_at DESC LIMIT ${limit} OFFSET ${offset}`);
    res.json({ reviews, limit, offset });
  } catch (e) { next(e); }
};

exports.approveSite = async (req, res, next) => {
  try {
    await db.query('UPDATE site_reviews SET is_approved=:approved WHERE id=:id AND deleted_at IS NULL', { id: req.params.id, approved: req.body.approved ?? true });
    await audit(req, 'moderate', 'site_review', req.params.id, req.body);
    res.json({ message: 'Site review updated' });
  } catch (e) { next(e); }
};

exports.removeSite = async (req, res, next) => {
  try {
    await db.query('UPDATE site_reviews SET deleted_at=CURRENT_TIMESTAMP WHERE id=:id', { id: req.params.id });
    await audit(req, 'delete', 'site_review', req.params.id);
    res.json({ message: 'Site review deleted' });
  } catch (e) { next(e); }
};
