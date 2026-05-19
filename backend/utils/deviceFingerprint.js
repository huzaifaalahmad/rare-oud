const crypto = require('crypto');

function fingerprint(req) {
  const ua = req.headers['user-agent'] || '';
  const accept = req.headers.accept || '';
  const language = req.headers['accept-language'] || '';
  const ipPrefix = String(req.ip || '').split('.').slice(0, 3).join('.');
  return crypto.createHash('sha256').update(`${ua}|${accept}|${language}|${ipPrefix}`).digest('hex');
}

module.exports = { fingerprint };
