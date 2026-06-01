const crypto = require('crypto');
const db = require('../config/database');
const { cleanText } = require('../utils/inputValidation');

let tableReady = false;

async function ensureSiteVisitsTable() {
  if (tableReady) return;
  await db.query(`
    CREATE TABLE IF NOT EXISTS site_visits (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      path VARCHAR(255) NOT NULL,
      referrer VARCHAR(500),
      user_agent VARCHAR(500),
      ip_hash CHAR(64) NOT NULL,
      visitor_id CHAR(64) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_site_visits_created (created_at),
      INDEX idx_site_visits_path_created (path, created_at),
      INDEX idx_site_visits_visitor_created (visitor_id, created_at)
    ) ENGINE=InnoDB
  `);
  tableReady = true;
}

function hashVisitValue(value) {
  const secret = process.env.JWT_SECRET || process.env.JWT_REFRESH_SECRET || 'rare-oud-site-visits';
  return crypto.createHash('sha256').update(`${secret}:${value || ''}`).digest('hex');
}

function normalizePath(value) {
  const path = cleanText(value || '/', { max: 255 });
  if (!path || !path.startsWith('/')) return '/';
  return path;
}

async function recordSiteVisit(req, payload = {}) {
  await ensureSiteVisitsTable();

  const userAgent = cleanText(req.headers['user-agent'] || '', { max: 500 });
  const rawVisitorId = cleanText(payload.visitor_id || '', { max: 160 });
  const visitorSeed = rawVisitorId || `${req.ip || ''}:${userAgent}`;

  await db.query(
    `INSERT INTO site_visits (path, referrer, user_agent, ip_hash, visitor_id)
     VALUES (:path, :referrer, :user_agent, :ip_hash, :visitor_id)`,
    {
      path: normalizePath(payload.path),
      referrer: cleanText(payload.referrer || '', { max: 500 }) || null,
      user_agent: userAgent || null,
      ip_hash: hashVisitValue(req.ip || ''),
      visitor_id: hashVisitValue(visitorSeed)
    }
  );
}

async function getSiteVisitStats() {
  await ensureSiteVisitsTable();

  const [summary, topPaths] = await Promise.all([
    db.query(`
      SELECT
        COUNT(*) total_visits,
        SUM(created_at >= CURDATE()) today_visits,
        COUNT(DISTINCT visitor_id) unique_visitors,
        COUNT(DISTINCT IF(created_at >= CURDATE(), visitor_id, NULL)) today_unique_visitors
      FROM site_visits
    `),
    db.query(`
      SELECT path, COUNT(*) visits
      FROM site_visits
      GROUP BY path
      ORDER BY visits DESC, path ASC
      LIMIT 5
    `)
  ]);

  return {
    total_visits: Number(summary[0]?.total_visits || 0),
    today_visits: Number(summary[0]?.today_visits || 0),
    unique_visitors: Number(summary[0]?.unique_visitors || 0),
    today_unique_visitors: Number(summary[0]?.today_unique_visitors || 0),
    top_paths: topPaths.map(row => ({
      path: row.path,
      visits: Number(row.visits || 0)
    }))
  };
}

module.exports = {
  ensureSiteVisitsTable,
  recordSiteVisit,
  getSiteVisitStats
};
