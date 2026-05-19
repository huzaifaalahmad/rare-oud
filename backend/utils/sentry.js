function initSentry(app) {
  if (!process.env.SENTRY_DSN) return null;
  const Sentry = require('@sentry/node');
  Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV || 'development', tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1) });
  if (app && Sentry.setupExpressErrorHandler) Sentry.setupExpressErrorHandler(app);
  return Sentry;
}
module.exports = { initSentry };
