const { validationResult } = require('express-validator');
const db = require('../config/database');
const { audit } = require('../utils/audit');
const AppError = require('../utils/AppError');

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

exports.adminList = async (req, res, next) => {
  try {
    const { limit, offset } = page(req, 200);
    const totalRows = await db.query('SELECT COUNT(*) total FROM users WHERE deleted_at IS NULL');
    const users = await db.query(
      'SELECT id,name,email,phone,role,is_active,created_at FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT :limit OFFSET :offset',
      { limit, offset }
    );
    res.json({ users, total: totalRows[0]?.total || 0, limit, offset });
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    fail(req);
    const existing = await db.query('SELECT id FROM users WHERE id=:id AND deleted_at IS NULL LIMIT 1', { id: req.params.id });
    if (!existing.length) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    const b = req.body;
    await db.query(
      'UPDATE users SET name=:name, phone=:phone, is_active=:is_active, role=:role WHERE id=:id',
      { id: req.params.id, name: b.name, phone: b.phone || null, is_active: b.is_active, role: ['user', 'admin'].includes(b.role) ? b.role : 'user' } // Defense-in-depth: never persist an unexpected role even if a future route misses validation.
    );
    await audit(req, 'update', 'user', req.params.id, { ...b, password: undefined });
    res.json({ message: 'User updated' });
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    await db.query('UPDATE users SET deleted_at=CURRENT_TIMESTAMP,is_active=FALSE WHERE id=:id', { id: req.params.id });
    await audit(req, 'soft_delete', 'user', req.params.id);
    res.json({ message: 'User disabled' });
  } catch (e) { next(e); }
};
