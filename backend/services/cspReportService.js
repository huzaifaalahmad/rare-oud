const db = require('../config/database');
const logger = require('../utils/logger');
async function recordCspReport(req) {
  const report = req.body?.['csp-report'] || req.body || {};
  await db.query(`INSERT INTO security_events (event_type,severity,ip_address,user_agent,metadata) VALUES ('csp_violation','medium',:ip,:ua,:metadata)`, { ip: req.ip, ua: String(req.headers['user-agent'] || '').slice(0, 500), metadata: JSON.stringify({ report, requestId: req.id }).slice(0, 8000) }).catch(error => logger.warn('CSP report persistence failed', { error: error.message }));
}
module.exports = { recordCspReport };
