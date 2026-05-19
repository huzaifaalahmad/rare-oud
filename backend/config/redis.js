const IORedis = require('ioredis');
const logger = require('../utils/logger');

const redisDisabled =
  process.env.REDIS_ENABLED === 'false' ||
  process.env.NODE_ENV === 'test';

function createDisabledClient() {
  const disabledClient = {
    disabled: true,
    status: 'disabled',
    async get() { return null; },
    async set() { return null; },
    async del() { return 0; },
    async scan() { return ['0', []]; },
    async ping() { return false; },
    async pingHealth() { return false; },
    async quit() { return null; },
    disconnect() {},
    on() { return disabledClient; }
  };

  disabledClient.isHealthy = () => false;
  disabledClient.shutdown = disabledClient.quit;
  return disabledClient;
}

function createRedisClient() {
  let healthy = false;
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  const redis = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: false,
    retryStrategy(times) {
      return Math.min(500 + times * 250, 10000);
    },
    reconnectOnError(err) {
      const msg = String(err?.message || '').toLowerCase();
      return msg.includes('readonly') || msg.includes('connection');
    }
  });

  redis.on('connect', () => {
    logger.info('Redis connecting', {
      redisUrl: redisUrl.replace(/:\/\/.*@/, '://***@')
    });
  });

  redis.on('ready', () => {
    healthy = true;
    logger.info('Redis ready');
  });

  redis.on('close', () => {
    healthy = false;
    logger.warn('Redis connection closed');
  });

  redis.on('reconnecting', () => {
    logger.warn('Redis reconnecting');
  });

  redis.on('error', err => {
    healthy = false;
    logger.error('Redis error', { error: err.message });
  });

  redis.pingHealth = async function pingHealth() {
    try {
      const result = await redis.ping();
      healthy = result === 'PONG' || result === true;
      return healthy;
    } catch (error) {
      healthy = false;
      logger.error('Redis ping failed', { error: error.message });
      return false;
    }
  };

  redis.isHealthy = () => healthy;
  redis.shutdown = async () => {
    try {
      await redis.quit();
    } catch {
      redis.disconnect();
    }
  };

  return redis;
}

const redis = redisDisabled ? createDisabledClient() : createRedisClient();

module.exports = redis;
module.exports.pingHealth = redis.pingHealth || redis.ping.bind(redis);
module.exports.isHealthy = redis.isHealthy;
module.exports.shutdown = redis.shutdown;
