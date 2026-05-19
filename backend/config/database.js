const mysql = require('mysql2/promise');
require('dotenv').config();
const logger = require('../utils/logger');
const metrics = require('../utils/metrics');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_LIMIT || 10),
  queueLimit: Number(process.env.DB_POOL_QUEUE_LIMIT || 0),
  namedPlaceholders: true,
  decimalNumbers: true
});

function queryName(sql) {
  return String(sql || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
}

async function recordSlowQuery(name, durationMs, metadata = {}) {
  const threshold = Number(process.env.DB_SLOW_QUERY_MS || 250);
  metrics.observe('db_query_duration_seconds', durationMs / 1000, { query: name });
  if (durationMs < threshold) return;
  logger.warn('Slow database query detected', { query: name, durationMs, ...metadata });
  try {
    await pool.execute(
      'INSERT INTO query_performance_logs (query_name, duration_ms, metadata) VALUES (?, ?, ?)',
      [name, Math.round(durationMs), JSON.stringify(metadata)]
    );
  } catch (_) {
    // Never let telemetry break request flow.
  }
}

async function query(sql, params = {}) {
  const started = Date.now();
  const name = queryName(sql);
  try {
    const [rows] = await pool.execute(sql, params);
    await recordSlowQuery(name, Date.now() - started, { rows: Array.isArray(rows) ? rows.length : undefined });
    return rows;
  } catch (error) {
    metrics.inc('db_query_errors_total');
    logger.error('Database query failed', { query: name, error: error.message });
    throw error;
  }
}

async function transaction(work) {
  const conn = await pool.getConnection();
  const started = Date.now();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    metrics.observe('db_query_duration_seconds', (Date.now() - started) / 1000, { query: 'transaction' });
    return result;
  } catch (e) {
    await conn.rollback();
    metrics.inc('db_transaction_rollbacks_total');
    throw e;
  } finally {
    conn.release();
  }
}

module.exports = { pool, query, transaction };
