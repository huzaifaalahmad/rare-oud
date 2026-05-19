const mysql = require('mysql2/promise');
require('dotenv').config();
const logger = require('../utils/logger');
const metrics = require('../utils/metrics');

function parseSslOption(value) {
  const raw = String(value || '').trim();
  if (!raw || raw === 'false') return undefined;
  if (raw === 'true') return { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' };

  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null
      ? parsed
      : { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' };
  } catch {
    return { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' };
  }
}

function configFromDatabaseUrl() {
  if (!process.env.DATABASE_URL) return {};

  const url = new URL(process.env.DATABASE_URL);
  const ssl = parseSslOption(url.searchParams.get('ssl'));

  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username || ''),
    password: decodeURIComponent(url.password || ''),
    database: process.env.DB_NAME || decodeURIComponent(url.pathname.replace(/^\//, '') || ''),
    ssl
  };
}

function buildPoolConfig() {
  const urlConfig = configFromDatabaseUrl();
  const ssl = parseSslOption(process.env.DB_SSL);
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

  return {
    host: hasDatabaseUrl ? urlConfig.host : process.env.DB_HOST,
    port: Number(hasDatabaseUrl ? urlConfig.port || 3306 : process.env.DB_PORT || 3306),
    user: hasDatabaseUrl ? urlConfig.user : process.env.DB_USER,
    password: hasDatabaseUrl ? urlConfig.password : process.env.DB_PASSWORD,
    database: process.env.DB_NAME || urlConfig.database,
    ssl: ssl || urlConfig.ssl,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL_LIMIT || 10),
    queueLimit: Number(process.env.DB_POOL_QUEUE_LIMIT || 0),
    namedPlaceholders: true,
    decimalNumbers: true
  };
}

const pool = mysql.createPool(buildPoolConfig());

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
