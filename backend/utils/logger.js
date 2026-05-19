const path = require('path');
const fs = require('fs');
const { createLogger, format, transports } = require('winston');

const logDir = path.join(__dirname, '..', 'logs');
fs.mkdirSync(logDir, { recursive: true });

const redact = format((info) => {
  const sensitive = ['password', 'token', 'authorization', 'cookie', 'refreshToken', 'csrfToken'];
  for (const key of Object.keys(info)) {
    if (sensitive.includes(key.toLowerCase())) info[key] = '[REDACTED]';
  }
  return info;
});

const logger = createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: format.combine(
    redact(),
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  defaultMeta: { service: 'rare-oud-api' },
  transports: [
    new transports.File({ filename: path.join(logDir, 'error.log'), level: 'error', maxsize: 5 * 1024 * 1024, maxFiles: 5 }),
    new transports.File({ filename: path.join(logDir, 'combined.log'), maxsize: 5 * 1024 * 1024, maxFiles: 5 })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: format.combine(format.colorize(), format.simple())
  }));
}

module.exports = logger;
