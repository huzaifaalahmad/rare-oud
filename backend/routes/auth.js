const express = require('express');
const rateLimit = require('express-rate-limit');

const c = require('../controllers/authController');
const auth = require('../middleware/auth');
const { authLimiter, authSlowDown } = require('../middleware/security');
const { issueCsrfToken } = require('../middleware/csrf');
const { validateBody, Joi } = require('../middleware/validate');
const { PHONE_COUNTRIES } = require('../utils/inputValidation');

const router = express.Router();

const countryCodes = PHONE_COUNTRIES.map(country => country.code);

const isDev = process.env.NODE_ENV !== 'production';

const devFriendlyLimiter = isDev
  ? (_req, _res, next) => next()
  : authLimiter;

const refreshLimiter = isDev
  ? (_req, _res, next) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 120,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        message: 'Too many refresh attempts. Please try again later.',
        code: 'REFRESH_RATE_LIMITED'
      }
    });

const password = Joi.string()
  .min(10)
  .max(128)
  .pattern(/[A-Z]/, 'uppercase letter')
  .pattern(/[a-z]/, 'lowercase letter')
  .pattern(/[0-9]/, 'number')
  .pattern(/[^A-Za-z0-9]/, 'special character')
  .required()
  .messages({
    'string.min': 'Password must be at least 10 characters',
    'string.pattern.name': 'Password must include uppercase, lowercase, number, and special character',
    'any.required': 'Password is required'
  });

const phone = Joi.string()
  .trim()
  .max(40)
  .allow('', null)
  .default('');

const registerSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(120)
    .required(),

  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .max(190)
    .required(),

  phone_country_code: Joi.string()
    .valid(...countryCodes)
    .default('SY'),

  phone,

  password
}).unknown(false);

const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .max(190)
    .required(),

  password: Joi.string()
    .min(1)
    .max(128)
    .required()
}).unknown(false);

const forgotSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .max(190)
    .allow('', null),

  phone_country_code: Joi.string()
    .valid(...countryCodes)
    .default('SY'),

  phone
})
  .custom((value, helpers) => {
    const hasEmail = Boolean(String(value.email || '').trim());
    const hasPhone = Boolean(String(value.phone || '').trim());

    if (!hasEmail && !hasPhone) {
      return helpers.error('any.custom');
    }

    return value;
  })
  .messages({
    'any.custom': 'Email or phone is required'
  })
  .unknown(false);

const resetSchema = Joi.object({
  token: Joi.string()
    .min(20)
    .max(200)
    .required(),

  password
}).unknown(false);

const changePasswordSchema = Joi.object({
  current_password: Joi.string()
    .min(1)
    .max(128)
    .required(),

  password
}).unknown(false);

router.get('/csrf-token', issueCsrfToken);

router.post(
  '/register',
  devFriendlyLimiter,
  isDev ? (_req, _res, next) => next() : authSlowDown,
  validateBody(registerSchema),
  c.register
);

router.post(
  '/login',
  devFriendlyLimiter,
  isDev ? (_req, _res, next) => next() : authSlowDown,
  validateBody(loginSchema),
  c.login
);

router.post(
  '/refresh',
  refreshLimiter,
  c.refresh
);

router.post(
  '/forgot-password',
  devFriendlyLimiter,
  validateBody(forgotSchema),
  c.forgotPassword
);

router.post(
  '/reset-password',
  devFriendlyLimiter,
  validateBody(resetSchema),
  c.resetPassword
);

router.post(
  '/change-password',
  auth,
  devFriendlyLimiter,
  validateBody(changePasswordSchema),
  c.changePassword
);

router.get('/me', auth, c.me);
router.post('/logout', auth, c.logout);

module.exports = router;