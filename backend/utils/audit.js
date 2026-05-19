const logger = require('../utils/logger');
const auditJob = require('../jobs/auditJob');
const { enqueueAudit } = require('../services/queueService');

async function audit(req, action, entity_type = null, entity_id = null, details = null) {
  const payload = {
    admin_id: req.user?.id || null,
    action,
    entity_type,
    entity_id: String(entity_id || ''),
    target_type: entity_type,
    target_id: String(entity_id || ''),
    ip: req.ip,
    ua: req.headers['user-agent'] || '',
    details: details ? JSON.stringify(details) : null
  };
  try {
    if (process.env.DISABLE_QUEUES === 'true') return auditJob.run({ data: payload });
    await enqueueAudit(payload, { jobId: `audit:${action}:${entity_type || 'system'}:${entity_id || 'none'}:${Date.now()}` });
  } catch (e) {
    logger.warn('Audit queue failed; writing synchronously', { error: e.message });
    try { await auditJob.run({ data: payload }); } catch (err) { logger.error('audit failed', { error: err.message }); }
  }
}
module.exports = { audit };
