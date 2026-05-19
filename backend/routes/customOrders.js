const r = require('express').Router();
const { body, param, query, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const c = require('../controllers/customOrderController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { requirePermission } = admin;
const { customOrderLimiter } = require('../middleware/security');
const {
  normalizePhone,
  normalizeCountryCode,
  cleanText,
  PHONE_COUNTRIES
} = require('../utils/inputValidation');

function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return next();

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'rare-oud-api',
      audience: 'rare-oud-web'
    });
  } catch {
    req.user = null;
  }

  return next();
}

function sendValidationErrors(req, res, next) {
  const result = validationResult(req);

  if (result.isEmpty()) return next();

  return res.status(422).json({
    message: 'Validation failed',
    code: 'VALIDATION_ERROR',
    errors: result.array().map(error => ({
      field: error.path || error.param,
      message: error.msg
    }))
  });
}

const createValidation = [
  body('name')
    .customSanitizer(value => cleanText(value, { max: 140 }))
    .isLength({ min: 2, max: 140 })
    .withMessage('Name must be between 2 and 140 characters'),

  body('phone_country_code')
    .optional({ checkFalsy: true })
    .customSanitizer(value => normalizeCountryCode(value || 'SY', 'SY'))
    .isIn(PHONE_COUNTRIES.map(country => country.code))
    .withMessage('Invalid phone country code'),

  body('phone')
    .customSanitizer((value, { req }) => {
      return normalizePhone(value, req.body.phone_country_code || 'SY');
    })
    .notEmpty()
    .withMessage('Phone number is required'),

  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail(),

  body('request_details')
    .customSanitizer(value => cleanText(value, { max: 5000, allowNewLines: true }))
    .isLength({ min: 10, max: 5000 })
    .withMessage('Request details must be between 10 and 5000 characters')
    .escape(),

  body('budget')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Budget must be a positive number')
    .toFloat()
];

const updateValidation = [
  param('id').isInt({ min: 1 }),
  body('status').isIn([
    'pending',
    'approved',
    'rejected',
    'in_progress',
    'completed'
  ]),
  body('admin_note')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 2000 })
];

r.post(
  '/',
  customOrderLimiter,
  optionalAuth,
  createValidation,
  sendValidationErrors,
  c.create
);

r.get('/mine', auth, c.mine);

r.get(
  '/admin',
  auth,
  requirePermission('custom_orders.read'),
  [
    query('limit').optional().isInt({ min: 1, max: 200 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  c.adminList
);

r.patch(
  '/:id',
  auth,
  requirePermission('custom_orders.write'),
  updateValidation,
  sendValidationErrors,
  c.update
);

r.delete(
  '/:id',
  auth,
  requirePermission('custom_orders.write'),
  [param('id').isInt({ min: 1 })],
  sendValidationErrors,
  c.remove
);

module.exports = r;
