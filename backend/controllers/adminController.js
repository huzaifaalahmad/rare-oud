const db = require('../config/database');

const redis = require('../config/redis');
const { queueRegistry, emailQueue, notificationQueue, auditQueue } = require('../queues');
const queuesByName = { email: emailQueue, notification: notificationQueue, audit: auditQueue };

exports.analytics = async (_req, res, next) => {
  try {
    const [sales] = await Promise.all([
      db.query(`SELECT COUNT(*) orders_count, COALESCE(SUM(total),0) revenue, SUM(status='pending') pending_orders FROM orders`)
    ]);
    const [users, products, reviews, customOrders, recentOrders, audit] = await Promise.all([
      db.query('SELECT COUNT(*) total_users, SUM(role="admin") admins FROM users WHERE deleted_at IS NULL'),
      db.query('SELECT COUNT(*) total_products, SUM(stock=0) out_of_stock, SUM(is_featured=TRUE) featured FROM products WHERE deleted_at IS NULL'),
      db.query('SELECT COUNT(*) total_reviews, SUM(is_approved=FALSE) pending_reviews FROM product_reviews WHERE deleted_at IS NULL'),
      db.query('SELECT COUNT(*) total_custom_orders, SUM(status="pending") open_custom_orders FROM custom_orders'),
      db.query('SELECT id,order_number,status,total,created_at FROM orders ORDER BY created_at DESC LIMIT 8'),
      db.query('SELECT l.*,u.name admin_name FROM admin_audit_logs l LEFT JOIN users u ON u.id=l.admin_id ORDER BY l.created_at DESC LIMIT 30')
    ]);
    res.json({ sales: sales[0], users: users[0], products: products[0], reviews: reviews[0], customOrders: customOrders[0], recentOrders, activity: audit });
  } catch (e) { next(e); }
};

exports.mediaLibrary = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || 60, 10), 200);
    const offset = Math.max(parseInt(req.query.offset || 0, 10), 0);
    const images = await db.query(`SELECT pi.*, p.name_ar, p.name_en FROM product_images pi JOIN products p ON p.id=pi.product_id ORDER BY pi.created_at DESC LIMIT ${limit} OFFSET ${offset}`);
    res.json({ images });
  } catch (e) { next(e); }
};

exports.bulkProducts = async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids.map(Number).filter(Boolean).slice(0, 200) : [];
    if (!ids.length) return res.status(422).json({ message: 'ids are required' });
    const action = req.body.action;
    const placeholders = ids.map(() => '?').join(',');
    if (action === 'activate') await db.pool.execute(`UPDATE products SET is_active=TRUE WHERE id IN (${placeholders})`, ids);
    else if (action === 'deactivate') await db.pool.execute(`UPDATE products SET is_active=FALSE WHERE id IN (${placeholders})`, ids);
    else if (action === 'delete') await db.pool.execute(`UPDATE products SET deleted_at=NOW(), is_active=FALSE WHERE id IN (${placeholders})`, ids);
    else return res.status(422).json({ message: 'Unsupported bulk action' });
    res.json({ message: 'Bulk action completed', count: ids.length });
  } catch (e) { next(e); }
};


exports.activity = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || 80, 10), 200);
    const offset = Math.max(parseInt(req.query.offset || 0, 10), 0);
    const activity = await db.query(`SELECT l.*, u.name admin_name FROM admin_audit_logs l LEFT JOIN users u ON u.id=l.admin_id ORDER BY l.created_at DESC LIMIT ${limit} OFFSET ${offset}`);
    res.json({ activity, limit, offset });
  } catch (e) { next(e); }
};


exports.systemHealth = async (_req, res, next) => {
  try {
    const redisEnabled = process.env.REDIS_ENABLED !== 'false' && !redis.disabled;
    const [dbPing, redisPing, queues] = await Promise.all([
      db.query('SELECT 1 AS ok').then(r => r[0]?.ok === 1).catch(() => false),
      redisEnabled ? redis.ping() : Promise.resolve(true),
      queueRegistry.allStats().catch(() => [])
    ]);
    res.json({ ok: Boolean(dbPing && redisPing), database: dbPing ? 'connected' : 'degraded', redis: redisEnabled ? (redisPing ? 'connected' : 'degraded') : 'disabled', queues, uptime: process.uptime(), timestamp: new Date().toISOString() });
  } catch (e) { next(e); }
};

exports.queueStats = async (_req, res, next) => {
  try { res.json({ queues: await queueRegistry.allStats() }); } catch (e) { next(e); }
};

exports.retryFailedJobs = async (req, res, next) => {
  try {
    const queue = queuesByName[req.params.name];
    if (!queue) return res.status(404).json({ message: 'Queue not found', code: 'QUEUE_NOT_FOUND' });
    const jobs = await queue.getFailed(0, Number(req.body.limit || 50));
    await Promise.all(jobs.map(job => job.retry().catch(() => null)));
    res.json({ message: 'Failed jobs retry requested', queue: req.params.name, count: jobs.length });
  } catch (e) { next(e); }
};

exports.replayDeadLetterJobs = async (req, res, next) => {
  try {
    const queue = queuesByName[req.params.name];
    if (!queue) return res.status(404).json({ message: 'Queue not found', code: 'QUEUE_NOT_FOUND' });
    if (redis.disabled || queue.disabled) return res.status(503).json({ message: 'Queue backend is disabled', code: 'QUEUE_DISABLED' });
    const { Queue } = require('bullmq');
    const limit = Math.min(Number(req.body.limit || 50), 200);
    const dlq = new Queue(`${req.params.name}-dead-letter`, { connection: redis });
    const jobs = await dlq.getJobs(['waiting', 'failed', 'delayed'], 0, limit - 1);
    let replayed = 0;
    for (const job of jobs) {
      const original = job.data || {};
      const replayId = original.originalJobId ? `replay:${req.params.name}:${original.originalJobId}` : `replay:${req.params.name}:${job.id}`;
      await queue.add(original.name || 'replayed', original.data || original, {
        jobId: replayId,
        attempts: Number(process.env.QUEUE_REPLAY_ATTEMPTS || 3),
        backoff: { type: 'exponential', delay: Number(process.env.QUEUE_BACKOFF_MS || 2000) }
      });
      await job.remove();
      replayed += 1;
    }
    await dlq.close();
    res.json({ message: 'Dead-letter jobs replayed', queue: req.params.name, replayed });
  } catch (e) { next(e); }
};

exports.uploadAudit = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || 80, 10), 200);
    const offset = Math.max(parseInt(req.query.offset || 0, 10), 0);
    const rows = await db.query(`SELECT id,user_id,request_id,original_name,mime_type,size_bytes,sha256,status,reason,ip_address,created_at FROM upload_audit_logs ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`);
    res.json({ uploads: rows, limit, offset });
  } catch (e) { next(e); }
};
