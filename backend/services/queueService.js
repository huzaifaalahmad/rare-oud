const logger = require('../utils/logger');
const { emailQueue, notificationQueue, auditQueue } = require('../queues');

async function add(queue, name, data, opts = {}) {
  try {
    return await queue.add(name, data, opts);
  } catch (error) {
    logger.error('Queue add failed; falling back to request-safe execution where configured', { queue: queue.name, name, error: error.message });
    throw error;
  }
}

const enqueueEmail = (name, data, opts) => add(emailQueue, name, data, opts);
const enqueueNotification = (data, opts) => add(notificationQueue, 'create-notification', data, opts);
const enqueueAudit = (data, opts) => add(auditQueue, 'write-audit', data, opts);

module.exports = { enqueueEmail, enqueueNotification, enqueueAudit };
