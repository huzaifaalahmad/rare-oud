const { Worker } = require('bullmq');
const redis = require('../config/redis');
const logger = require('../utils/logger');
const metrics = require('../utils/metrics');

function createWorker(queueName, processor, options = {}) {
  if (redis.disabled) {
    logger.warn('Worker not started because Redis is disabled', { queue: queueName });
    return {
      disabled: true,
      async close() {}
    };
  }

  const worker = new Worker(queueName, async job => {
    const started = Date.now();
    try {
      const result = await processor(job);
      metrics.observe('queue_job_duration_seconds', (Date.now() - started) / 1000, { queue: queueName, name: job.name, status: 'success' });
      return result;
    } catch (error) {
      metrics.observe('queue_job_duration_seconds', (Date.now() - started) / 1000, { queue: queueName, name: job.name, status: 'failure' });
      throw error;
    }
  }, {
    connection: redis,
    concurrency: Number(process.env[`QUEUE_${queueName.toUpperCase()}_CONCURRENCY`] || options.concurrency || 5),
    limiter: options.limiter,
    lockDuration: Number(process.env.QUEUE_LOCK_DURATION_MS || 30000),
    stalledInterval: Number(process.env.QUEUE_STALLED_INTERVAL_MS || 30000)
  });
  worker.on('completed', job => logger.info('Worker completed job', { queue: queueName, jobId: job.id, name: job.name }));
  worker.on('failed', (job, err) => logger.error('Worker failed job', { queue: queueName, jobId: job?.id, name: job?.name, attemptsMade: job?.attemptsMade, error: err.message }));
  worker.on('error', err => logger.error('Worker runtime error', { queue: queueName, error: err.message }));
  worker.on('stalled', jobId => logger.warn('Worker detected stalled job', { queue: queueName, jobId }));
  async function shutdown(signal) {
    logger.info('Worker shutdown requested', { queue: queueName, signal });
    await worker.close().catch(() => {});
  }
  process.once('SIGTERM', () => shutdown('SIGTERM').finally(() => process.exit(0)));
  process.once('SIGINT', () => shutdown('SIGINT').finally(() => process.exit(0)));
  return worker;
}
module.exports = createWorker;
