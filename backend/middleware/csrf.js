const crypto = require('crypto');
const AppError = require('../utils/AppError');

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);
const COOKIE = 'rare_oud_csrf';
const TOKEN_TTL_MS = 2 * 60 * 60 * 1000;
const FALLBACK_SECRET = crypto.randomBytes(32).toString('hex');

function cookieSameSite() {
  return process.env.COOKIE_SECURE === 'true' ? 'none' : 'lax';
}

function csrfSecret() {
  return process.env.CSRF_SECRET || process.env.JWT_SECRET || process.env.JWT_REFRESH_SECRET || FALLBACK_SECRET;
}

function signPayload(payload) {
  return crypto
    .createHmac('sha256', csrfSecret())
    .update(payload)
    .digest('base64url');
}

function createSignedToken() {
  const payload = `${Date.now().toString(36)}.${crypto.randomBytes(32).toString('hex')}`;
  return `${payload}.${signPayload(payload)}`;
}

function isSignedToken(token) {
  if (typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [issuedAt, nonce, signature] = parts;
  if (!issuedAt || !nonce || !signature) return false;

  const issuedMs = Number.parseInt(issuedAt, 36);
  if (!Number.isFinite(issuedMs)) return false;

  const age = Date.now() - issuedMs;
  if (age < -5 * 60 * 1000 || age > TOKEN_TTL_MS) return false;

  return safeCompare(signature, signPayload(`${issuedAt}.${nonce}`));
}

function issueCsrfToken(req, res) {
  const existing = req.cookies?.[COOKIE];
  const token = isSignedToken(existing) ? existing : createSignedToken();
  res.cookie(COOKIE, token, {
    httpOnly: false,
    sameSite: cookieSameSite(),
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
  if (!safeCompare(cookieToken, headerToken) && !isSignedToken(headerToken)) {
    return next(new AppError('Invalid CSRF token', 403, 'CSRF_INVALID'));
  }
  next();
}

module.exports = { csrfProtection, issueCsrfToken };
