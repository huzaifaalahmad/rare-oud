const r = require('express').Router();
const jwt = require('jsonwebtoken');
const { body, param, query, validationResult } = require('express-validator');
const c = require('../controllers/contactMessageController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { requirePermission } = admin;
const { emailLimiter } = require('../middleware/security');
const { cleanText } = require('../utils/inputValidation');

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

  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail(),

  body('phone')
    .optional({ checkFalsy: true })
    .customSanitizer(value => cleanText(value, { max: 40 }))
    .isLength({ max: 40 })
    .withMessage('Phone is too long'),

  body('subject')
    .optional({ checkFalsy: true })
    .customSanitizer(value => cleanText(value, { max: 180 }))
    .isLength({ max: 180 })
    .withMessage('Subject is too long'),

  body('message')
    .customSanitizer(value => cleanText(value, { max: 5000, allowNewLines: true }))
    .isLength({ min: 10, max: 5000 })
    .withMessage('Message must be between 10 and 5000 characters')
];

const adminListValidation = [
  query('status')
    .optional({ checkFalsy: true })
    .isIn(['new', 'read', 'replied', 'archived']),
  query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt()
];

const updateValidation = [
  param('id').isInt({ min: 1 }).toInt(),
  body('status').isIn(['new', 'read', 'replied', 'archived']),
  body('admin_reply')
    .optional({ checkFalsy: true })
    .customSanitizer(value => cleanText(value, { max: 5000, allowNewLines: true }))
    .isLength({ max: 5000 })
    .withMessage('Reply is too long')
];

r.post('/', emailLimiter, optionalAuth, createValidation, sendValidationErrors, c.create);
r.get('/mine', auth, [
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt()
], sendValidationErrors, c.mine);
r.get('/admin', auth, requirePermission('contact_messages.read'), adminListValidation, sendValidationErrors, c.adminList);
r.patch('/:id', auth, requirePermission('contact_messages.write'), updateValidation, sendValidationErrors, c.update);

module.exports = r;
