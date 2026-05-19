const db = require('../config/database');
const logger = require('../utils/logger');
async function recordSuspiciousEvent({ userId=null, eventType, severity='medium', req, metadata={} }) {
  try {
    await db.query(`INSERT INTO suspicious_events (user_id,event_type,severity,ip_address,user_agent,metadata)
      VALUES (:user_id,:event_type,:severity,:ip,:ua,:metadata)`, {
      user_id: userId, event_type: eventType, severity, ip: req?.ip || null, ua: (req?.headers?.['user-agent'] || '').slice(0,500), metadata: JSON.stringify(metadata)
    });
  } catch (error) { logger.warn('Suspicious event persistence failed', { error: error.message, eventType }); }
}
module.exports = { recordSuspiciousEvent };
