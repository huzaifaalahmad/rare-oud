const createWorker = require('./createWorker');
const emailJob = require('../jobs/emailJob');
module.exports = createWorker('email', emailJob.run, { concurrency: 5, limiter: { max: Number(process.env.EMAIL_QUEUE_MAX_PER_MINUTE || 60), duration: 60000 } });
