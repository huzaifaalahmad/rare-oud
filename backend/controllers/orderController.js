const { validationResult } = require('express-validator');
const crypto = require('crypto');
const db = require('../config/database');
const { transaction } = db;
const { audit } = require('../utils/audit');
const AppError = require('../utils/AppError');
const { createNotification } = require('../utils/notifications');
const { sendAdminWhatsAppMessage, formatDirectOrderWhatsAppMessage } = require('../utils/whatsapp');
const logger = require('../utils/logger');
let sendOrderConfirmationEmail = null;
let sendOrderAdminNotificationEmail = null;
try { ({ sendOrderConfirmationEmail, sendOrderAdminNotificationEmail } = require('../utils/mailer')); } catch {}

function fail(req) {
  const e = validationResult(req);
  if (!e.isEmpty()) throw new AppError('Validation failed', 422, 'VALIDATION_ERROR');
}
function page(req, max = 100) {
  return {
    limit: Math.min(Math.max(parseInt(req.query.limit || 50, 10), 1), max),
    offset: Math.max(parseInt(req.query.offset || 0, 10), 0)
  };
}

const VALID_ORDER_STATUS = ['pending', 'approved', 'rejected', 'in_progress', 'completed'];
const ORDER_PUBLIC_FIELDS = 'id, order_number, status, customer_name, customer_phone, country, shipping_address, notes, subtotal, total, created_at, updated_at';
const ORDER_ADMIN_FIELDS = 'id, user_id, order_number, status, customer_name, customer_email, customer_phone, country, shipping_address, notes, subtotal, total, created_at, updated_at';

async function getOrderItems(orderIds = []) {
  const ids = [...new Set(orderIds.map(Number).filter(Boolean))];
  if (!ids.length) return new Map();

  const params = {};
  const placeholders = ids.map((id, index) => {
    const key = `id${index}`;
    params[key] = id;
    return `:${key}`;
  }).join(',');

  const rows = await db.query(
    `SELECT
       oi.*,
       p.slug product_slug,
       p.sku product_sku,
       p.name_ar product_current_name_ar,
       p.name_en product_current_name_en,
       p.condition_status product_condition_status,
       p.dimensions product_dimensions,
       p.woods_ar product_woods_ar,
       p.woods_en product_woods_en,
       p.origin_country_ar product_origin_country_ar,
       p.origin_country_en product_origin_country_en,
       p.maker_identity_ar product_maker_identity_ar,
       p.maker_identity_en product_maker_identity_en
     FROM order_items oi
     LEFT JOIN products p ON p.id=oi.product_id
     WHERE oi.order_id IN (${placeholders})
     ORDER BY oi.id ASC`,
    params
  );

  return rows.reduce((map, item) => {
    const key = Number(item.order_id);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
    return map;
  }, new Map());
}

async function attachOrderItems(orders = []) {
  const itemMap = await getOrderItems(orders.map(order => order.id));
  return orders.map(order => ({
    ...order,
    items: itemMap.get(Number(order.id)) || []
  }));
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
  await Promise.allSettled(admins.map(admin => createNotification(admin.id, {
    type: 'direct_order_admin',
    title_ar: 'طلب منتج جديد',
    title_en: 'New product request',
    body_ar: `${order.customer_name} أرسل طلب منتج جديد ${order.order_number}.`,
    body_en: `${order.customer_name} submitted product request ${order.order_number}.`,
    link_url: '/admin?tab=orders'
  })));
}

exports.createDirect = async (req, res, next) => {
  try {
    fail(req);
    const b = req.body;
    const quantity = Math.max(parseInt(b.quantity || 1, 10), 1);
    const orderNumber = `RO-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const result = await transaction(async (conn) => {
      const [products] = await conn.execute(
        'SELECT id,name_ar,name_en,price,stock,sku,slug,condition_status,dimensions,woods_ar,woods_en,origin_country_ar,origin_country_en,maker_identity_ar,maker_identity_en FROM products WHERE id=? AND deleted_at IS NULL AND is_active=TRUE FOR UPDATE',
        [b.product_id]
      );
      if (!products.length) throw new AppError('Product unavailable', 409, 'PRODUCT_UNAVAILABLE');
      const p = products[0];
      const subtotal = Number(p.price || 0) * quantity;

      const [r] = await conn.execute(
        `INSERT INTO orders (user_id,order_number,status,customer_name,customer_email,customer_phone,country,shipping_address,notes,subtotal,total)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [req.user?.id || null, orderNumber, 'pending', b.customer_name, b.customer_email || null, b.customer_phone, b.country || null, b.customer_address, b.notes || null, subtotal, subtotal]
      );
      await conn.execute(
        'INSERT INTO order_items (order_id,product_id,product_name_ar,product_name_en,unit_price,quantity,total) VALUES (?,?,?,?,?,?,?)',
        [r.insertId, p.id, p.name_ar, p.name_en, p.price, quantity, subtotal]
      );
      return {
        id: r.insertId,
        order_number: orderNumber,
        product: p,
        quantity,
        customer_name: b.customer_name,
        customer_email: b.customer_email || null,
        customer_phone: b.customer_phone,
        country: b.country || null,
        shipping_address: b.customer_address,
        notes: b.notes || null,
        subtotal,
        total: subtotal
      };
    });

    if (req.user?.id) {
      await createNotification(req.user.id, {
        type: 'direct_order',
        title_ar: 'تم استلام طلب المنتج',
        title_en: 'Product request received',
        body_ar: `وصل طلبك ${orderNumber}. سيتواصل معك فريق العود النادر قريباً.`,
        body_en: `Your request ${orderNumber} was received. Rare Oud will contact you soon.`,
        link_url: '/my-orders'
      }).catch(error => logger.error('Notification creation failed', { error: error.message }));
    }
    await notifyAdmins({
      order_number: orderNumber,
      customer_name: b.customer_name
    }).catch(error => logger.error('Admin direct order notification failed', { error: error.message }));
    sendAdminWhatsAppMessage(formatDirectOrderWhatsAppMessage(result), { orderNumber })
      .catch(error => logger.error('Direct order WhatsApp notification failed', { error: error.message, orderNumber }));
    if (sendOrderAdminNotificationEmail && process.env.ADMIN_EMAIL) {
      sendOrderAdminNotificationEmail(process.env.ADMIN_EMAIL, result)
        .catch(err => logger.error('Direct order admin email failed', { error: err.message, orderNumber }));
    }
    if (sendOrderConfirmationEmail && b.customer_email) {
      sendOrderConfirmationEmail(b.customer_email, result)
        .catch(err => logger.error('Direct order email failed', { error: err.message }));
    }
    res.status(201).json({ id: result.id, order_number: orderNumber, status: 'pending', message: 'Direct product request created' });
  } catch (e) { logger.error('direct order failed', { error: e.message }); next(e); }
};

exports.mine = async (req, res, next) => {
  try {
    const { limit, offset } = page(req);
    const orders = await db.query(`SELECT ${ORDER_PUBLIC_FIELDS} FROM orders WHERE user_id=:id AND deleted_at IS NULL ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`, { id: req.user.id });
    res.json({ orders, limit, offset });
  } catch (e) { next(e); }
};

exports.adminList = async (req, res, next) => {
  try {
    const { limit, offset } = page(req, 200);
    const status = VALID_ORDER_STATUS.includes(req.query.status) ? req.query.status : undefined;
    const where = status ? 'WHERE status=:status AND deleted_at IS NULL' : 'WHERE deleted_at IS NULL';
    const params = status ? { status } : {};
    const total = await db.query(`SELECT COUNT(*) total FROM orders ${where}`, params);
    const orders = await db.query(`SELECT ${ORDER_ADMIN_FIELDS} FROM orders ${where} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`, params);
    res.json({ orders: await attachOrderItems(orders), total: total[0]?.total || 0, limit, offset });
  } catch (e) { next(e); }
};

exports.get = async (req, res, next) => {
  try {
    const sql = req.user.role === 'admin'
      ? `SELECT ${ORDER_ADMIN_FIELDS} FROM orders WHERE id=:id AND deleted_at IS NULL`
      : `SELECT ${ORDER_PUBLIC_FIELDS} FROM orders WHERE id=:id AND user_id=:user_id AND deleted_at IS NULL`;
    const rows = await db.query(sql, { id: req.params.id, user_id: req.user.id });
    if (!rows.length) throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
    const itemMap = await getOrderItems([req.params.id]);
    const items = itemMap.get(Number(req.params.id)) || [];
    res.json({ order: rows[0], items });
  } catch (e) { next(e); }
};

exports.updateStatus = async (req, res, next) => {
  try {
    fail(req);
    const status = req.body.status;
    if (!VALID_ORDER_STATUS.includes(status)) throw new AppError('Invalid order status', 422, 'INVALID_ORDER_STATUS');
    await db.query('UPDATE orders SET status=:status WHERE id=:id AND deleted_at IS NULL', { id: req.params.id, status });
    const rows = await db.query('SELECT user_id,order_number FROM orders WHERE id=:id', { id: req.params.id });
    if (rows[0]?.user_id) {
      await createNotification(rows[0].user_id, {
        type:'direct_order_status',
        title_ar:'تحديث حالة طلب المنتج',
        title_en:'Product request updated',
        body_ar:`تم تحديث طلبك ${rows[0].order_number} إلى ${status}.`,
        body_en:`Your request ${rows[0].order_number} changed to ${status}.`,
        link_url:'/my-orders'
      }).catch(error => logger.error('Notification creation failed', { error: error.message }));
    }
    await audit(req, 'update_status', 'direct_order', req.params.id, req.body);
    res.json({ message: 'Order updated', status });
  } catch (e) { next(e); }
};
