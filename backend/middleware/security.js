const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { redisStore } = require('./rateLimitStore');

function limit(name, windowMs, max, message) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    store: redisStore(name),
    keyGenerator: (req) => `${req.ip}:${req.user?.id || 'anon'}`,
    message,
  });
}

const globalLimiter = limit(
  'global',
  15 * 60 * 1000,
  Number(process.env.GLOBAL_RATE_LIMIT || 700),
  {
    message: 'Too many requests. Try again later.',
    code: 'GLOBAL_RATE_LIMITED',
  }
);

const authLimiter = limit(
  'auth',
  15 * 60 * 1000,
  Number(process.env.AUTH_RATE_LIMIT || 10),
  {
    message: 'Too many auth attempts. Try again later.',
    code: 'AUTH_RATE_LIMITED',
  }
);

const reviewLimiter = limit(
  'reviews',
  60 * 60 * 1000,
  Number(process.env.REVIEW_RATE_LIMIT || 20),
  {
    message: 'Too many review actions. Try again later.',
    code: 'REVIEW_RATE_LIMITED',
  }
);

const notificationLimiter = limit(
  'notifications',
  60 * 1000,
  Number(process.env.NOTIFICATION_RATE_LIMIT || 120),
  {
    message: 'Too many notification actions.',
    code: 'NOTIFICATION_RATE_LIMITED',
  }
);

const customOrderLimiter = limit(
  'custom-orders',
  60 * 60 * 1000,
  Number(process.env.CUSTOM_ORDER_RATE_LIMIT || 10),
  {
    message: 'Too many custom order requests. Please try again later.',
    code: 'CUSTOM_ORDER_RATE_LIMITED',
  }
);

const directOrderLimiter = limit(
  'direct-orders',
  60 * 1000,
  Number(process.env.DIRECT_ORDER_RATE_LIMIT || 8),
  {
    message: 'Too many product requests. Please try again shortly.',
    code: 'DIRECT_ORDER_RATE_LIMITED',
  }
);

const adminLimiter = limit(
  'admin',
  15 * 60 * 1000,
  Number(process.env.ADMIN_RATE_LIMIT || 250),
  {
    message: 'Too many admin actions.',
    code: 'ADMIN_RATE_LIMITED',
  }
);

const uploadLimiter = limit(
  'uploads',
  15 * 60 * 1000,
  Number(process.env.UPLOAD_RATE_LIMIT || 30),
  {
    message: 'Too many upload attempts. Try again later.',
    code: 'UPLOAD_RATE_LIMITED',
  }
);

const emailLimiter = limit(
  'email',
  60 * 60 * 1000,
  Number(process.env.EMAIL_RATE_LIMIT || 15),
  {
    message: 'Too many email actions.',
    code: 'EMAIL_RATE_LIMITED',
  }
);

const authSlowDown = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 5,
  delayMs: (hits) => Math.min(hits * 250, 3000),
});

function normalizeOrigin(value) {
  return String(value || '').trim().replace(/\/$/, '');
}

function getAllowedOrigins() {
  const defaults =
    process.env.NODE_ENV === 'production'
      ? []
      : [
          'http://localhost:5173',
          'http://127.0.0.1:5173',
          'http://localhost:3000',
          'http://127.0.0.1:3000',
          'http://localhost:5000',
          'http://127.0.0.1:5000',
        ];

  const configured = [
    process.env.CORS_ORIGINS,
    process.env.FRONTEND_URL,
    process.env.CLIENT_URL,
    process.env.ADMIN_URL,
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).split(','))
    .map(normalizeOrigin)
    .filter(Boolean);

  return Array.from(new Set([...defaults, ...configured]));
}

function corsOptions() {
  const allowedOrigins = getAllowedOrigins();

  return {
    origin(origin, cb) {
      // يسمح بطلبات السيرفر المباشرة / Postman / فتح API من المتصفح بدون Origin
      if (!origin) {
        return cb(null, true);
      }

      const normalized = normalizeOrigin(origin);

      if (allowedOrigins.includes(normalized)) {
        return cb(null, true);
      }

      console.warn(
        `[CORS] blocked origin: ${normalized}. Allowed origins: ${allowedOrigins.join(', ')}`
      );

      // مهم: لا نرمي Error حتى لا يتحول إلى 500
      // فقط نرفض CORS بهدوء
      return cb(null, false);
    },

    credentials: true,

    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-CSRF-Token',
      'X-Requested-With',
      'Accept',
    ],

    exposedHeaders: ['X-CSRF-Token'],

    optionsSuccessStatus: 204,
  };
}

function strictSecurityHeaders(req, res, next) {
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()'
  );

  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

  res.setHeader(
    'Cross-Origin-Embedder-Policy',
    process.env.CROSS_ORIGIN_EMBEDDER_POLICY || 'credentialless'
  );

  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');

  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  next();
}

module.exports = {
  globalLimiter,
  authLimiter,
  authSlowDown,
  adminLimiter,
  uploadLimiter,
  reviewLimiter,
  notificationLimiter,
  customOrderLimiter,
  directOrderLimiter,
  emailLimiter,
  corsOptions,
  strictSecurityHeaders,
};