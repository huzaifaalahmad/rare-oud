const redis = require('../config/redis');

class RedisRateLimitStore {
  constructor(prefix = 'rl') {
    this.prefix = prefix;
  }

  async increment(key) {
    const redisKey = `${this.prefix}:${key}`;
    const totalHits = await redis.incr(redisKey);
    if (totalHits === 1) await redis.pexpire(redisKey, this.windowMs || 60000);
    const ttl = await redis.pttl(redisKey);
    return {
      totalHits,
      resetTime: new Date(Date.now() + Math.max(ttl, 0))
    };
  }

  async decrement(key) {
    await redis.decr(`${this.prefix}:${key}`).catch(() => null);
  }

  async resetKey(key) {
    await redis.del(`${this.prefix}:${key}`).catch(() => null);
  }

  init(options) {
    this.windowMs = options.windowMs;
  }
}

function redisStore(prefix) {
  return process.env.REDIS_ENABLED === 'false' ? undefined : new RedisRateLimitStore(prefix);
}

module.exports = { RedisRateLimitStore, redisStore };
