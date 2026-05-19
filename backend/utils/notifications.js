const logger = require('./logger');
const notificationService = require('../services/notificationService');
const { enqueueNotification } = require('../services/queueService');

async function createNotification(userId, payload) {
  if (!userId) return null;
  const queueEnabled = process.env.NOTIFICATION_QUEUE_ENABLED === 'true' && process.env.DISABLE_QUEUES !== 'true';
  if (!queueEnabled) return notificationService.createNotification(userId, payload);

  try {
    const job = await enqueueNotification({ userId, payload }, { jobId: `notification:${userId}:${payload.type}:${Date.now()}` });
    return job.id;
  } catch (error) {
    logger.warn('Notification queue unavailable; writing notification synchronously', { error: error.message });
    return notificationService.createNotification(userId, payload);
  }
}

module.exports = { createNotification };
