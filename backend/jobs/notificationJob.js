const notificationService = require('../services/notificationService');
async function run(job) {
  const { userId, payload } = job.data;
  return notificationService.createNotification(userId, payload);
}
module.exports = { run };
