const Joi = require('joi');
const { loadSecrets } = require('./secrets');

loadSecrets();

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(5000),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().default(3306),
  DB_NAME: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').when('NODE_ENV', { is: 'production', then: Joi.string().min(16).required() }),
  JWT_SECRET: Joi.string().min(64).required().invalid(Joi.ref('JWT_REFRESH_SECRET')),
  JWT_REFRESH_SECRET: Joi.string().min(64).required(),
  COOKIE_SECURE: Joi.string().valid('true','false').default('false'),
  CORS_ORIGINS: Joi.string().allow('').default(''),
  FRONTEND_URL: Joi.string().uri().allow('').default(''),
  ADMIN_STEP_UP_SECRET: Joi.string().min(32).allow(''),
  METRICS_TOKEN: Joi.string().min(24).allow(''),
  ENABLE_UPLOAD_AV_SCAN: Joi.string().valid('true','false').default('false'),
  UPLOAD_AV_COMMAND: Joi.string().default('clamscan'),
  UPLOAD_MAX_FILE_SIZE_BYTES: Joi.number().integer().min(1).max(8 * 1024 * 1024).default(2 * 1024 * 1024),
  REDIS_ENABLED: Joi.string().valid('true','false').default('true'),
  REDIS_URL: Joi.string().allow('').default('redis://127.0.0.1:6379'),
  S3_BUCKET: Joi.string().allow(''),
  AWS_REGION: Joi.string().allow(''),
  CDN_BASE_URL: Joi.string().uri().allow('')
}).unknown(true);

function validateEnv() {
  const { error, value } = schema.validate(process.env, { abortEarly: false });
  if (error) {
    const details = error.details.map(d => d.message).join('; ');
    throw new Error(`FATAL_ENV_VALIDATION: ${details}`);
  }
  if (value.NODE_ENV === 'production') {
    if (value.COOKIE_SECURE !== 'true') throw new Error('FATAL_ENV_VALIDATION: COOKIE_SECURE must be true in production');
    if (!value.CORS_ORIGINS && !value.FRONTEND_URL) throw new Error('FATAL_ENV_VALIDATION: CORS_ORIGINS or FRONTEND_URL is required in production');
    if (!value.METRICS_TOKEN) throw new Error('FATAL_ENV_VALIDATION: METRICS_TOKEN is required in production');
  }
  return value;
}

module.exports = { validateEnv };
