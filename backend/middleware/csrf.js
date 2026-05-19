const crypto = require('crypto');
const AppError = require('../utils/AppError');

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);
const COOKIE = 'rare_oud_csrf';

function issueCsrfToken(req, res) {
  const existing = req.cookies?.[COOKIE];
  const token = existing || crypto.randomBytes(32).toString('hex');
  res.cookie(COOKIE, token, {
    httpOnly: false,
    sameSite: 'strict',
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
    maxAge: 2 * 60 * 60 * 1000
  });
  res.json({ csrfToken: token });
}

function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function csrfProtection(req, _res, next) {
  if (SAFE.has(req.method)) return next();
  const cookieToken = req.cookies?.[COOKIE];
  const headerToken = req.get('x-csrf-token');
  if (!safeCompare(cookieToken, headerToken)) {
    return next(new AppError('Invalid CSRF token', 403, 'CSRF_INVALID'));
  }
  next();
}

module.exports = { csrfProtection, issueCsrfToken };
