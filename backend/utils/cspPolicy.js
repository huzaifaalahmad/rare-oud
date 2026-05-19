const crypto = require('crypto');
const PROD = process.env.NODE_ENV === 'production';
const SELF = "'self'";
function isValidOrigin(value) { try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !/[\s;]/.test(value); } catch (_e) { return false; } }
function parseAllowlist(name, { localhost = false } = {}) {
  const values = new Set();
  for (const raw of String(process.env[name] || '').split(',')) {
    const item = raw.trim().replace(/\/$/, '');
    if (!item) continue;
    if (!PROD && localhost && /^http:\/\/localhost(:\d+)?$/.test(item)) values.add(item);
    else if (isValidOrigin(item) && item.startsWith('https://')) values.add(item);
  }
  return [...values];
}
function buildCspDirectives(_req, res) {
  const nonce = crypto.randomBytes(16).toString('base64');
  res.locals.cspNonce = nonce;
  const connect = [SELF, ...parseAllowlist('CSP_CONNECT_ORIGINS', { localhost: true })];
  if (!PROD) connect.push(process.env.FRONTEND_URL || 'http://localhost:5173');
  if (process.env.SENTRY_DSN) connect.push('https://*.sentry.io');
  const img = [SELF, 'data:', 'blob:', ...parseAllowlist('CSP_IMAGE_ORIGINS')];
  if (process.env.CDN_BASE_URL && isValidOrigin(process.env.CDN_BASE_URL)) img.push(process.env.CDN_BASE_URL.replace(/\/$/, ''));
  return {
    defaultSrc: [SELF], scriptSrc: [SELF, `'nonce-${nonce}'`], styleSrc: [SELF, `'nonce-${nonce}'`, ...(PROD ? [] : ["'unsafe-inline'"])],
    imgSrc: img, fontSrc: [SELF, 'data:'], connectSrc: connect,
    mediaSrc: [SELF, 'https://drive.google.com', ...parseAllowlist('CSP_MEDIA_ORIGINS')], frameSrc: [SELF, 'https://drive.google.com', ...parseAllowlist('CSP_FRAME_ORIGINS')],
    workerSrc: [SELF, 'blob:'], objectSrc: ["'none'"], frameAncestors: ["'none'"], baseUri: [SELF], formAction: [SELF], reportUri: ['/api/security/csp-report'], ...(PROD ? { upgradeInsecureRequests: [] } : {})
  };
}
module.exports = { buildCspDirectives, isValidOrigin, parseAllowlist };
