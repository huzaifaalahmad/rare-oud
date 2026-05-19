require('dotenv').config();
require('./config/env').validateEnv();
const tracing = require('./config/tracing');
tracing.initTracing();

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('FATAL: JWT_SECRET is missing or too short (min 32 chars)');
if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) throw new Error('FATAL: JWT_REFRESH_SECRET is missing or too short (min 32 chars)');
if (process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET) throw new Error('FATAL: JWT_SECRET and JWT_REFRESH_SECRET must be different');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const logger = require('./utils/logger');
const crypto = require('crypto');
const metrics = require('./utils/metrics');
const { initSentry } = require('./utils/sentry');
const { pool } = require('./config/database');
const redis = require('./config/redis');
const { queueRegistry } = require('./queues');
// rateLimit is configured in middleware/security.js and applied below.
if (process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'true') { logger.error('FATAL: COOKIE_SECURE must be true in production'); process.exit(1); }
if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL && !process.env.CORS_ORIGINS) { logger.error('FATAL: FRONTEND_URL or CORS_ORIGINS must be set in production'); process.exit(1); }
if (process.env.NODE_ENV === 'production' && !process.env.CDN_BASE_URL) { logger.warn('CDN_BASE_URL is not set. Uploads will be served locally.'); }
const { globalLimiter, adminLimiter, uploadLimiter, corsOptions, strictSecurityHeaders } = require('./middleware/security');
const { buildCspDirectives } = require('./utils/cspPolicy');
const { auditAdminAction } = require('./middleware/rbac');
const { csrfProtection } = require('./middleware/csrf');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
initSentry(app);
app.disable('x-powered-by');
app.set('etag', false);
app.set('trust proxy', 1);

app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
});

app.use(strictSecurityHeaders);
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'same-site' },
  contentSecurityPolicy: { useDefaults: true, directives: buildCspDirectives }
}));
app.use(compression());
app.use(cors(corsOptions()));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(metrics.middleware);
app.use(globalLimiter);
app.use((req, res, next) => {
  if (req.path === '/api/security/csp-report') return next();
  return csrfProtection(req, res, next);
});
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

app.use('/uploads', uploadLimiter, express.static(path.join(__dirname, 'uploads'), { maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0, immutable: process.env.NODE_ENV === 'production', dotfiles: 'deny', index: false }));
app.get('/api/metrics', (req, res, next) => {
  const token = process.env.METRICS_TOKEN;
  if (token && req.headers.authorization !== `Bearer ${token}`) return res.status(401).json({ message: 'Unauthorized', code: 'UNAUTHORIZED' });
  metrics.prometheus().then(body => res.type('text/plain').send(body)).catch(next);
});

app.get('/api/health', async (_req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'no-store');

    const [rows] = await pool.query('SELECT 1 AS ok');

    const databaseOk = rows?.[0]?.ok === 1;

    const redisEnabled =
      process.env.REDIS_ENABLED !== 'false' && !redis.disabled;

    let redisOk = true;
    let redisStatus = 'disabled';

    if (redisEnabled) {
      redisOk =
        typeof redis.isHealthy === 'function'
          ? redis.isHealthy()
          : false;

      redisStatus =
        redisOk
          ? 'connected'
          : 'degraded';
    }

    const queues = redisOk
      ? await queueRegistry
          .allStats()
          .catch(() => [])
      : [];

    res.status(200).json({
      ok: databaseOk && redisOk,
      service: 'rare-oud-api',
      database: databaseOk
        ? 'connected'
        : 'degraded',
      redis: redisStatus,
      queues
    });
  } catch (error) {
    next(error);
  }
});
app.use('/api/security', require('./routes/security'));
function noStoreApi(_req, res, next) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
}

app.use('/api/auth', noStoreApi, require('./routes/auth'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/products', require('./routes/products'));
app.use('/api/content', require('./routes/content'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/favorites', require('./routes/favorites'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/contact-messages', require('./routes/contactMessages'));
app.use('/api/custom-orders', require('./routes/customOrders'));
app.use('/api/users', noStoreApi, adminLimiter, require('./routes/users'));
app.use('/api/admin/shipping', noStoreApi, adminLimiter, auditAdminAction, require('./routes/shipping'));
app.use('/api/admin', noStoreApi, adminLimiter, auditAdminAction, require('./routes/admin'));
app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 5000;
const server = app.listen(port, () => logger.info('Rare Oud API running', { port }));

function shutdown(signal) {
  logger.info('Shutdown signal received. Closing Rare Oud API...', { signal });
  server.close(async () => { await queueRegistry.closeQueues().catch(() => {}); await redis.shutdown().catch(() => {}); await tracing.shutdownTracing().catch(() => {}); process.exit(0); });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
