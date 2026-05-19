const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

function notFound(req, _res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND'));
}

function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';
  const requestMeta = {
    status,
    code: err.code || 'ERROR',
    method: req.method,
    path: req.originalUrl,
    userId: req.user?.id || null,
    ip: req.ip,
    requestId: req.id || null
  };

  if (status >= 500) logger.error(err.message, { ...requestMeta, stack: err.stack });
  else logger.warn(err.message, requestMeta);

  const safeMessage = status >= 500 && isProd ? 'Internal server error' : err.message;
  res.status(status).json({
    message: safeMessage,
    code: err.code || 'ERROR',
    request_id: req.id || null,
    ...(isProd ? {} : { details: err.errors || undefined, stack: status >= 500 ? err.stack : undefined })
  });
}

module.exports = { notFound, errorHandler };
