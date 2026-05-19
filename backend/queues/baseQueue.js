const { Queue, QueueEvents } = require('bullmq');
const redis = require('../config/redis');
const logger = require('../utils/logger');
const metrics = require('../utils/metrics');
const db = require('../config/database');

const registry = new Map();

function createDisabledQueue(name) {
  const safeName = name.replace(/:/g, '-');
  if (registry.has(safeName)) return registry.get(safeName).queue;

  const queue = {
    name: safeName,
    disabled: true,
    async add(jobName, data = {}, opts = {}) {
      const id = stableJobId(safeName, jobName, data, opts) || `${safeName}-${Date.now()}`;
      logger.warn('Queue disabled; job accepted as no-op', { queue: safeName, jobName, jobId: id });
      return { id, name: jobName, data, opts, disabled: true };
    },
    async getWaitingCount() { return 0; },
    async getActiveCount() { return 0; },
    async getCompletedCount() { return 0; },
    async getFailedCount() { return 0; },
    async getDelayedCount() { return 0; },
    async isPaused() { return true; },
    async getRepeatableJobs() { return []; },
    async getFailed() { return []; },
    async close() {}
  };

  registry.set(safeName, { queue, events: null, deadLetterQueue: queue, heartbeat: null });
  return queue;
}

function stableJobId(queueName, jobName, data = {}, opts = {}) {
  if (opts.jobId) return opts.jobId;
  const explicit = data.idempotencyKey || data.idempotency_key || data.requestId || data.order_id || data.orderId;
  // استبدال : بـ - لتجنب مشاكل التسمية في الـ Job ID أيضاً
  if (explicit) return `${queueName}-${jobName}-${explicit}`;
  return undefined;
}

function createQueue(name, options = {}) {
  // تنظيف الاسم الأساسي من أي : قد تأتي من متغيرات البيئة
  const safeName = name.replace(/:/g, '-');

  if (redis.disabled) return createDisabledQueue(safeName);

  if (registry.has(safeName)) return registry.get(safeName).queue;

  // الإصلاح هنا: تم تغيير : إلى - 
  const deadLetterName = `${safeName}-dead-letter`;
  
  const deadLetterQueue = new Queue(deadLetterName, {
    connection: redis,
    defaultJobOptions: { removeOnComplete: 1000, removeOnFail: 10000 }
  });

  const queue = new Queue(safeName, {
    connection: redis,
    defaultJobOptions: {
      attempts: Number(process.env.QUEUE_ATTEMPTS || options.attempts || 5),
      backoff: { type: 'exponential', delay: Number(process.env.QUEUE_BACKOFF_MS || options.backoffMs || 2000) },
      removeOnComplete: Number(process.env.QUEUE_REMOVE_COMPLETE || 1000),
      removeOnFail: Number(process.env.QUEUE_REMOVE_FAIL || 5000),
      ...options.defaultJobOptions
    }
  });

  const originalAdd = queue.add.bind(queue);
  queue.add = (jobName, data = {}, opts = {}) => originalAdd(jobName, data, { 
    ...opts, 
    jobId: stableJobId(safeName, jobName, data, opts) 
  });

  const events = new QueueEvents(safeName, { connection: redis });
  
  events.on('completed', ({ jobId }) => { 
    metrics.inc('queue_jobs_completed_total'); 
    logger.info('Queue job completed', { queue: safeName, jobId }); 
  });

  events.on('failed', async ({ jobId, failedReason }) => {
    metrics.inc('queue_jobs_failed_total');
    logger.error('Queue job failed', { queue: safeName, jobId, failedReason });
    try {
      const job = await queue.getJob(jobId);
      if (job && job.attemptsMade >= (job.opts.attempts || 1)) {
        await deadLetterQueue.add('poison-message', {
          originalQueue: safeName,
          originalJobId: job.id,
          name: job.name,
          data: job.data,
          failedReason,
          attemptsMade: job.attemptsMade
        }, { 
          // تم تغيير : إلى - هنا أيضاً
          jobId: `${safeName}-${job.id}` 
        });
        metrics.inc('queue_dead_letter_total');
      }
    } catch (error) {
      logger.warn('Failed to move poisoned job to dead-letter queue', { queue: safeName, jobId, error: error.message });
    }
  });

  events.on('stalled', ({ jobId }) => { 
    metrics.inc('queue_jobs_stalled_total'); 
    logger.warn('Queue job stalled', { queue: safeName, jobId }); 
  });

  const heartbeat = setInterval(() => {
    db.query(
      `INSERT INTO worker_heartbeats (worker_name, queue_name, last_seen_at, metadata) 
       VALUES (:worker,:queue,NOW(),:metadata) 
       ON DUPLICATE KEY UPDATE last_seen_at=NOW(), metadata=VALUES(metadata)`, 
      { 
        worker: `queue-${safeName}`, 
        queue: safeName, 
        metadata: JSON.stringify({ pid: process.pid }) 
      }
    ).catch(() => null);
  }, Number(process.env.WORKER_HEARTBEAT_MS || 30000));

  heartbeat.unref();
  registry.set(safeName, { queue, events, deadLetterQueue, heartbeat });
  return queue;
}

async function getQueueStats(queue) {
  const [waiting, active, completed, failed, delayed, paused, repeatable] = await Promise.all([
    queue.getWaitingCount(), 
    queue.getActiveCount(), 
    queue.getCompletedCount(), 
    queue.getFailedCount(), 
    queue.getDelayedCount(), 
    queue.isPaused(), 
    queue.getRepeatableJobs().catch(() => [])
  ]);
  return { name: queue.name, waiting, active, completed, failed, delayed, paused, repeatable: repeatable.length };
}

async function allStats() {
  const stats = [];
  for (const { queue, deadLetterQueue } of registry.values()) {
    stats.push(await getQueueStats(queue));
    stats.push(await getQueueStats(deadLetterQueue));
  }
  return stats;
}

async function closeQueues() {
  await Promise.all([...registry.values()].map(async ({ queue, events, deadLetterQueue, heartbeat }) => {
    if (heartbeat) clearInterval(heartbeat);
    await queue.close().catch(() => {});
    await events?.close?.().catch(() => {});
    await deadLetterQueue.close().catch(() => {});
  }));
}

module.exports = { createQueue, allStats, getQueueStats, closeQueues };
