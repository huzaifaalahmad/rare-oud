const createWorker = require('./createWorker');
const notificationJob = require('../jobs/notificationJob');
module.exports = createWorker('notification', notificationJob.run, { concurrency: 10 });
