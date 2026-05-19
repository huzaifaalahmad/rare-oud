const r = require('express').Router();
const { body, param, query } = require('express-validator');
const { normalizePhone, normalizeCountryCode, cleanText, PHONE_COUNTRIES } = require('../utils/inputValidation');
const c = require('../controllers/userController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { requirePermission } = admin;

const updateValidation = [
  param('id').isInt({ min: 1 }),
  body('name').customSanitizer(value => cleanText(value, { max: 120 })).isLength({ min: 2, max: 120 }).escape(),
  body('phone_country_code').optional({ checkFalsy: true }).isIn(PHONE_COUNTRIES.map(c => c.code)).customSanitizer(value => normalizeCountryCode(value, 'SY')),
  body('phone').optional({ checkFalsy: true }).customSanitizer((value, { req }) => normalizePhone(value, req.body.phone_country_code || 'SY')),
  body('is_active').isBoolean().toBoolean(),
  body('role').isIn(['user', 'admin'])
];

r.get('/', auth, requirePermission('users.read'), [query('limit').optional().isInt({ min: 1, max: 200 }), query('offset').optional().isInt({ min: 0 })], c.adminList);
r.put('/:id', auth, requirePermission('users.write'), updateValidation, c.update);
r.delete('/:id', auth, requirePermission('users.delete'), [param('id').isInt({ min: 1 })], c.remove);
module.exports = r;
