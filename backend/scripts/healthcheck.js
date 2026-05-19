require('dotenv').config();
const { pool } = require('../config/database');
const redis = require('../config/redis');

(async () => {
  try {
    const [rows] = await pool.query('SELECT 1 AS ok');
    if (!rows || rows[0].ok !== 1) throw new Error('Unexpected database healthcheck response');
    const redisOk = typeof redis.pingHealth === 'function'
      ? await redis.pingHealth()
      : (await redis.ping()) === 'PONG';
    if (!redisOk && process.env.REQUIRE_REDIS_HEALTH !== 'false') throw new Error('Redis healthcheck failed');
    console.log('OK: API dependencies healthy');
    await redis.shutdown().catch(() => {});
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error(`FAIL: API healthcheck failed: ${error.message}`);
    try { await redis.shutdown(); } catch {}
    try { await pool.end(); } catch {}
    process.exit(1);
  }
})();
