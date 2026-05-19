require('dotenv').config();

const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { pool } = require('../config/database');

async function ensure(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      checksum CHAR(64) NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      execution_ms INT NOT NULL,
      status ENUM('applied','rolled_back') DEFAULT 'applied'
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS migration_locks (
      id TINYINT PRIMARY KEY,
      locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      owner VARCHAR(128) NOT NULL
    )
  `);
}

function shouldIgnoreMigrationError(error) {
  const ignorableCodes = new Set([
    'ER_CANT_DROP_FIELD_OR_KEY', // DROP INDEX/COLUMN غير موجود
    'ER_DUP_KEYNAME',            // index موجود مسبقًا
    'ER_DUP_FIELDNAME',          // column موجود مسبقًا
    'ER_TABLE_EXISTS_ERROR',     // table موجود مسبقًا
    'ER_BAD_TABLE_ERROR',        // DROP TABLE غير موجود
  ]);

  return ignorableCodes.has(error.code);
}

async function executeStatement(conn, statement, file) {
  try {
    await conn.query(statement);
  } catch (error) {
    if (shouldIgnoreMigrationError(error)) {
      console.warn(
        `[migration warning] ignored ${error.code} in ${file}: ${error.sqlMessage || error.message}`
      );
      return;
    }

    throw error;
  }
}

function splitSqlStatements(sql) {
  return sql
    .split(/;\s*(?:\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function tableExists(conn, tableName) {
  const [rows] = await conn.query(
    'SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1',
    [tableName]
  );
  return rows.length > 0;
}

async function hasFinalBaselineSchema(conn) {
  const requiredTables = [
    'users',
    'products',
    'refresh_tokens',
    'admin_audit_logs',
    'analytics_daily_snapshots',
    'suspicious_events'
  ];

  for (const table of requiredTables) {
    if (!(await tableExists(conn, table))) return false;
  }

  const legacyTables = ['carts', 'cart_items', 'payment_events'];
  for (const table of legacyTables) {
    if (await tableExists(conn, table)) return false;
  }

  return true;
}

async function markBaselineMigrationsApplied(conn, files, dir) {
  if (!(await hasFinalBaselineSchema(conn))) return false;

  const legacyFiles = files.filter(file => !file.startsWith('2026_05_08_'));

  for (const file of legacyFiles) {
    const fullPath = path.join(dir, file);
    const sql = await fs.readFile(fullPath, 'utf8');
    const checksum = crypto
      .createHash('sha256')
      .update(sql)
      .digest('hex');

    await conn.query(
      `INSERT INTO schema_migrations (filename, checksum, execution_ms, status)
       VALUES (?, ?, 0, 'applied')
       ON DUPLICATE KEY UPDATE checksum = VALUES(checksum), status = 'applied'`,
      [file, checksum]
    );
  }

  console.log('Final baseline schema detected; legacy migration history marked as applied.');
  return false;
}

async function main() {
  const dir = path.resolve(__dirname, '../../database/migrations');
  const files = (await fs.readdir(dir))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const conn = await pool.getConnection();

  try {
    await ensure(conn);

    const owner = `${process.pid}:${Date.now()}`;

    const [lock] = await conn.query(
      'INSERT IGNORE INTO migration_locks (id, owner) VALUES (1, ?)',
      [owner]
    );

    if (lock.affectedRows !== 1) {
      throw new Error('Migration lock is held by another process');
    }

    await markBaselineMigrationsApplied(conn, files, dir);

    for (const file of files) {
      const fullPath = path.join(dir, file);
      const sql = await fs.readFile(fullPath, 'utf8');

      const checksum = crypto
        .createHash('sha256')
        .update(sql)
        .digest('hex');

      const [existing] = await conn.query(
        'SELECT checksum FROM schema_migrations WHERE filename = ? AND status = "applied"',
        [file]
      );

      if (existing.length) {
        if (existing[0].checksum !== checksum) {
          throw new Error(`Migration checksum mismatch: ${file}`);
        }

        console.log(`skipped ${file}`);
        continue;
      }

      const start = Date.now();

      await conn.beginTransaction();

      try {
        const statements = splitSqlStatements(sql);

        for (const statement of statements) {
          await executeStatement(conn, statement, file);
        }

        await conn.query(
          'INSERT INTO schema_migrations (filename, checksum, execution_ms) VALUES (?, ?, ?)',
          [file, checksum, Date.now() - start]
        );

        await conn.commit();

        console.log(`applied ${file}`);
      } catch (error) {
        await conn.rollback();
        throw error;
      }
    }
  } finally {
    await conn.query('DELETE FROM migration_locks WHERE id = 1').catch(() => {});
    conn.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
