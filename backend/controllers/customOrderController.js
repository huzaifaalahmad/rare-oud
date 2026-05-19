const { validationResult } = require('express-validator');
const db = require('../config/database');
const { audit } = require('../utils/audit');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const { createNotification } = require('../utils/notifications');

let sendCustomOrderStatusEmail = null;
try {
  ({ sendCustomOrderStatusEmail } = require('../utils/mailer'));
} catch {}

const CUSTOM_ORDER_PUBLIC_FIELDS = 'id, status, request_details, budget, admin_note, responded_at, created_at';
const VALID_STATUS = ['pending', 'approved', 'rejected', 'in_progress', 'completed'];

function normalizeStatus(status) {
  return status;
}

function fail(req) {
  const result = validationResult(req);
  if (!result.isEmpty()) throw new AppError('Validation failed', 422, 'VALIDATION_ERROR');
}

function page(req, max = 100) {
  return {
    limit: Math.min(Math.max(parseInt(req.query.limit || 50, 10), 1), max),
    offset: Math.max(parseInt(req.query.offset || 0, 10), 0)
  };
}

async function getAdminUsers() {
  return db.query(
    `SELECT id
     FROM users
     WHERE role='admin'
       AND is_active=TRUE
       AND deleted_at IS NULL`
  ).catch(() => []);
}

async function notifyAdmins(order) {
  const admins = await getAdminUsers();
  const results = await Promise.allSettled(admins.map(admin => createNotification(admin.id, {
    type: 'custom_order_admin',
    title_ar: 'طلب تخصيص جديد',
    title_en: 'New custom order',
    body_ar: `${order.name} أرسل طلب تخصيص جديد.`,
    body_en: `${order.name} submitted a new custom order.`,
    link_url: '/admin?tab=custom_orders'
  })));

  return {
    attempted: admins.length,
    created: results.filter(result => result.status === 'fulfilled').length
  };
}

exports.create = async (req, res, next) => {
  try {
    fail(req);
    const body = req.body;
    const result = await db.query(
      `INSERT INTO custom_orders
       (user_id,name,phone,email,budget,request_details,status)
       VALUES (:user_id,:name,:phone,:email,:budget,:request_details,"pending")`,
      {
        user_id: req.user?.id || null,
        name: body.name,
        phone: body.phone,
        email: body.email || req.user?.email || null,
        budget: body.budget || null,
        request_details: body.request_details
      }
    );

    const order = {
      id: result.insertId,
      user_id: req.user?.id || null,
      name: body.name,
      phone: body.phone,
      email: body.email || req.user?.email || null,
      budget: body.budget || null,
      request_details: body.request_details,
      status: 'pending'
    };

    const adminNotifications = await notifyAdmins(order).catch(error => {
      logger.error('Admin custom order notification failed', { error: error.message });
      return { attempted: 0, created: 0 };
    });

    if (req.user?.id) {
      await createNotification(req.user.id, {
        type: 'custom_order',
        title_ar: 'تم استلام طلب التخصيص',
        title_en: 'Custom order received',
        body_ar: 'سنراجع طلبك ونرسل لك التحديثات.',
        body_en: 'We will review your request and send updates.',
        link_url: '/my-orders'
      }).catch(error => logger.error('Notification creation failed', { error: error.message }));
    }

    if (order.email && sendCustomOrderStatusEmail) {
      sendCustomOrderStatusEmail(order.email, { ...order, admin_note: null })
        .catch(error => logger.error('Custom order confirm email failed', { error: error.message }));
    }

    res.status(201).json({
      id: result.insertId,
      status: 'pending',
      admin_notifications_created: adminNotifications.created
    });
  } catch (error) {
    next(error);
  }
};

exports.adminList = async (req, res, next) => {
  try {
    const { limit, offset } = page(req, 200);
    const status = VALID_STATUS.includes(req.query.status) ? normalizeStatus(req.query.status) : undefined;
    const where = status ? 'WHERE status=:status' : '';
    const params = status ? { status } : {};
    const total = await db.query(`SELECT COUNT(*) total FROM custom_orders ${where}`, params);
    const custom_orders = await db.query(
      `SELECT *
       FROM custom_orders
       ${where}
       ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    res.json({ custom_orders, total: total[0]?.total || 0, limit, offset });
  } catch (error) {
    next(error);
  }
};

exports.mine = async (req, res, next) => {
  try {
    const { limit, offset } = page(req);
    const custom_orders = await db.query(
      `SELECT ${CUSTOM_ORDER_PUBLIC_FIELDS}
       FROM custom_orders
       WHERE user_id=:user_id
       ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      { user_id: req.user.id }
    );

    res.json({ custom_orders, limit, offset });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    fail(req);
    const status = normalizeStatus(req.body.status);
    if (!VALID_STATUS.includes(status)) throw new AppError('Invalid status', 422, 'INVALID_CUSTOM_ORDER_STATUS');

    await db.query(
      `UPDATE custom_orders
       SET status=:status,
           admin_note=:admin_note,
           responded_at=NOW()
       WHERE id=:id`,
      { status, admin_note: req.body.admin_note || null, id: req.params.id }
    );

    const rows = await db.query('SELECT * FROM custom_orders WHERE id=:id', { id: req.params.id });
    const customOrder = rows[0];

    if (customOrder?.user_id) {
      const note = customOrder.admin_note ? `\n${customOrder.admin_note}` : '';
      await createNotification(customOrder.user_id, {
        type: 'custom_order_status',
        title_ar: 'تحديث طلب التخصيص',
        title_en: 'Custom order update',
        body_ar: `حالة طلبك أصبحت: ${status}${note}`,
        body_en: `Your custom order status is now: ${status}${note}`,
        link_url: '/my-orders'
      }).catch(error => logger.error('Notification creation failed', { error: error.message }));
    }

    if (customOrder?.email && sendCustomOrderStatusEmail) {
      sendCustomOrderStatusEmail(customOrder.email, customOrder)
        .catch(error => logger.error('Custom order email failed', { error: error.message }));
    }

    await audit(req, 'update', 'custom_order', req.params.id, req.body);
    res.json({ message: 'Custom order updated', status });
  } catch (error) {
    next(error);
  }
};
