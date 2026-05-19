const { validationResult } = require('express-validator');
const db = require('../config/database');
const { audit } = require('../utils/audit');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const { createNotification } = require('../utils/notifications');
let sendCustomOrderStatusEmail = null;
try { ({ sendCustomOrderStatusEmail } = require('../utils/mailer')); } catch {}

const CUSTOM_ORDER_PUBLIC_FIELDS = 'id, status, request_details, budget, admin_note, responded_at, created_at';
const VALID_STATUS = ['pending', 'approved', 'rejected', 'in_progress', 'completed'];
function normalizeStatus(status) { return status; }
function fail(req) { const e = validationResult(req); if (!e.isEmpty()) throw new AppError('Validation failed', 422, 'VALIDATION_ERROR'); }
function page(req, max = 100) { return { limit: Math.min(Math.max(parseInt(req.query.limit || 50, 10), 1), max), offset: Math.max(parseInt(req.query.offset || 0, 10), 0) }; }

exports.create = async (req, res, next) => {
  try {
    fail(req);
    const b = req.body;
    const r = await db.query('INSERT INTO custom_orders (user_id,name,phone,email,budget,request_details,status) VALUES (:user_id,:name,:phone,:email,:budget,:request_details,"pending")', { user_id: req.user?.id || null, name: b.name, phone: b.phone, email: b.email || null, budget: b.budget || null, request_details: b.request_details });
    if (req.user?.id) await createNotification(req.user.id, { type:'custom_order', title_ar:'تم استلام طلب التخصيص', title_en:'Custom order received', body_ar:'سنراجع طلبك ونرسل لك التحديثات.', body_en:'We will review your request and send updates.', link_url:'/my-orders' }).catch(error => logger.error('Notification creation failed', { error: error.message }));
    if (b.email && sendCustomOrderStatusEmail) {
      sendCustomOrderStatusEmail(b.email, { id: r.insertId, status: 'pending', request_details: b.request_details, admin_note: null, email: b.email, name: b.name })
        .catch(err => logger.error('Custom order confirm email failed', { error: err.message }));
    }
    res.status(201).json({ id: r.insertId, status: 'pending' });
  } catch (e) { next(e); }
};

exports.adminList = async (req, res, next) => {
  try {
    const { limit, offset } = page(req, 200);
    const status = VALID_STATUS.includes(req.query.status) ? normalizeStatus(req.query.status) : undefined;
    const where = status ? 'WHERE status=:status' : '';
    const total = await db.query(`SELECT COUNT(*) total FROM custom_orders ${where}`, { status });
    const custom_orders = await db.query(`SELECT * FROM custom_orders ${where} ORDER BY created_at DESC LIMIT :limit OFFSET :offset`, { status, limit, offset });
    res.json({ custom_orders, total: total[0]?.total || 0, limit, offset });
  } catch (e) { next(e); }
};

exports.mine = async (req, res, next) => {
  try {
    const { limit, offset } = page(req);
    const custom_orders = await db.query(`SELECT ${CUSTOM_ORDER_PUBLIC_FIELDS} FROM custom_orders WHERE user_id=:user_id ORDER BY created_at DESC LIMIT :limit OFFSET :offset`, { user_id: req.user.id, limit, offset });
    res.json({ custom_orders, limit, offset });
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    fail(req);
    const status = normalizeStatus(req.body.status);
    if (!VALID_STATUS.includes(status)) throw new AppError('Invalid status', 422, 'INVALID_CUSTOM_ORDER_STATUS');
    await db.query('UPDATE custom_orders SET status=:status, admin_note=:admin_note, responded_at=NOW() WHERE id=:id', { status, admin_note: req.body.admin_note || null, id: req.params.id });
    const rows = await db.query('SELECT * FROM custom_orders WHERE id=:id', { id: req.params.id });
    const co = rows[0];
    if (co?.user_id) await createNotification(co.user_id, { type:'custom_order_status', title_ar:'تحديث طلب التخصيص', title_en:'Custom order update', body_ar:`حالة طلبك أصبحت: ${status}`, body_en:`Your custom order status is now: ${status}`, link_url:'/my-orders' }).catch(error => logger.error('Notification creation failed', { error: error.message }));
    if (co?.email && sendCustomOrderStatusEmail) sendCustomOrderStatusEmail(co.email, co).catch(err => logger.error('Custom order email failed', { error: err.message }));
    await audit(req, 'update', 'custom_order', req.params.id, req.body);
    res.json({ message: 'Custom order updated', status });
  } catch (e) { next(e); }
};
