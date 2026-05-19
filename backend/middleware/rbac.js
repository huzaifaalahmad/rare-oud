const crypto = require('crypto');
const AppError = require('../utils/AppError');
const db = require('../config/database');
const logger = require('../utils/logger');
const redis = require('../config/redis');
const { ROLE_PERMISSIONS, STEP_UP_PERMISSIONS, roleLevel } = require('../config/roles');

function cacheKey(userId) { return `rbac:v2:${userId}`; }

async function invalidatePermissionCache(userId) {
  if (!userId) return;
  await redis.del(cacheKey(userId)).catch(() => null);
}

async function assertActiveAdmin(req) {
  if (!req.user || roleLevel(req.user.role) < roleLevel('admin')) {
    throw new AppError('Admin access required', 403, 'ADMIN_REQUIRED');
  }

  const rows = await db.query(
    'SELECT id,is_active,role,token_version FROM users WHERE id=:id AND deleted_at IS NULL LIMIT 1',
    { id: req.user.id }
  );

  if (!rows.length || !rows[0].is_active || roleLevel(rows[0].role) < roleLevel('admin')) {
    throw new AppError('Account disabled or admin access revoked', 403, 'ACCOUNT_DISABLED');
  }

  req.user.role = rows[0].role;
}

async function getPermissions(user) {
  const key = cacheKey(user.id);
  const cached = await redis.get(key).catch(() => null);
  if (cached) return JSON.parse(cached);

  const rows = await db.query(
    'SELECT permission FROM admin_permissions WHERE user_id=:user_id',
    { user_id: user.id }
  ).catch(() => []);

  const permissions = new Set([...(ROLE_PERMISSIONS[user.role] || []), ...rows.map(r => r.permission)]);
  const out = [...permissions].sort();
  await redis.set(key, JSON.stringify(out), Number(process.env.RBAC_CACHE_SECONDS || 300)).catch(() => null);
  return out;
}

function hasPermission(perms, permission) {
  return perms.includes('*') || perms.includes(permission) || perms.some(p => p.endsWith('.*') && permission.startsWith(p.slice(0, -1)));
}

function requireAdmin(req, _res, next) {
  assertActiveAdmin(req).then(() => next()).catch(next);
}

function expectedStepUp(userId) {
  const secret = process.env.ADMIN_STEP_UP_SECRET;
  if (!secret) return null;
  const hour = new Date().toISOString().slice(0, 13);
  return crypto.createHmac('sha256', secret).update(`${userId}:${hour}`).digest('hex');
}

function requirePermission(permission, options = {}) {
  return async (req, _res, next) => {
    try {
      await assertActiveAdmin(req);
      const perms = await getPermissions(req.user);
      if (!hasPermission(perms, permission)) {
        return next(new AppError(`Missing admin permission: ${permission}`, 403, 'PERMISSION_DENIED'));
      }

      const needsStepUp = options.stepUp || STEP_UP_PERMISSIONS.has(permission);
      if (needsStepUp) {
        const expected = expectedStepUp(req.user.id);
        const provided = req.headers['x-admin-step-up'];
        if (expected && provided !== expected) {
          await db.query(
            `INSERT INTO suspicious_events (user_id,event_type,severity,ip_address,user_agent,metadata)
             VALUES (:user_id,'admin_step_up_missing','high',:ip,:ua,:metadata)`,
            {
              user_id: req.user.id,
              ip: req.ip,
              ua: String(req.headers['user-agent'] || '').slice(0, 500),
              metadata: JSON.stringify({ permission, path: req.originalUrl, method: req.method })
            }
          ).catch(() => null);
          return next(new AppError('Step-up authentication required for this admin action', 401, 'STEP_UP_REQUIRED'));
        }
      }

      req.requiredPermission = permission;
      next();
    } catch (err) { next(err); }
  };
}

function auditAdminAction(req, res, next) {
  res.on('finish', async () => {
    if (!req.user || roleLevel(req.user.role) < roleLevel('admin')) return;
    if (req.method === 'GET' && res.statusCode < 400) return;

    try {
      await db.query(
        `INSERT INTO admin_audit_logs (admin_id, action, entity_type, entity_id, ip_address, user_agent, metadata)
         VALUES (:admin_id,:action,:entity_type,:entity_id,:ip,:ua,:metadata)`,
        {
          admin_id: req.user.id,
          action: `${req.method} ${req.originalUrl}`.slice(0, 190),
          entity_type: req.baseUrl?.split('/').filter(Boolean).pop() || 'admin',
          entity_id: req.params?.id || req.params?.imageId || null,
          ip: req.ip,
          ua: String(req.headers['user-agent'] || '').slice(0, 500),
          metadata: JSON.stringify({
            status: res.statusCode,
            permission: req.requiredPermission || null,
            requestId: req.id,
            bodyKeys: Object.keys(req.body || {}).filter(k => !/password|token|secret/i.test(k))
          })
        }
      );
    } catch (err) {
      logger.warn('Admin audit logging failed', { error: err.message, requestId: req.id });
    }
  });
  next();
}

module.exports = { requireAdmin, requirePermission, auditAdminAction, invalidatePermissionCache, getPermissions, hasPermission };
