const redis = require('../config/redis');
const logger = require('./logger');

const memoryStore = new Map();
const DEFAULT_TTL_SECONDS = Number(process.env.CACHE_TTL_SECONDS || 60);
const MAX_KEYS = Number(process.env.MEMORY_CACHE_MAX_KEYS || 500);

function memGet(key) {
  const item = memoryStore.get(key);
  if (!item) return null;
  if (item.expiresAt <= Date.now()) { memoryStore.delete(key); return null; }
  return item.value;
}
function memSet(key, value, ttlSeconds) {
  if (memoryStore.size >= MAX_KEYS) memoryStore.delete(memoryStore.keys().next().value);
  memoryStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}
async function get(key) {
  try {
    const raw = await redis.get(key);
    if (raw) return JSON.parse(raw);
  } catch (error) { logger.debug?.('Redis cache get failed', { key, error: error.message }); }
  return memGet(key);
}
async function set(key, value, ttlSeconds = DEFAULT_TTL_SECONDS) {
  memSet(key, value, ttlSeconds);
  try { await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds); } catch (error) { logger.debug?.('Redis cache set failed', { key, error: error.message }); }
}
async function del(key) {
  memoryStore.delete(key);
  try { await redis.del(key); } catch {}
}
async function delPrefix(prefix) {
  for (const key of memoryStore.keys()) if (key.startsWith(prefix)) memoryStore.delete(key);
  try {
    let cursor = '0';
    do {
      const [next, keys] = await redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 200);
      cursor = next;
      if (keys.length) await redis.del(keys);
    } while (cursor !== '0');
  } catch (error) { logger.debug?.('Redis cache prefix invalidation failed', { prefix, error: error.message }); }
}
async function remember(key, loader, ttlSeconds = DEFAULT_TTL_SECONDS) {
  const cached = await get(key);
  if (cached !== null && cached !== undefined) return cached;
  const value = await loader();
  await set(key, value, ttlSeconds);
  return value;
}
module.exports = { get, set, del, delPrefix, remember };
