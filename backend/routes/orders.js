const r = require('express').Router();
const { body, param, query } = require('express-validator');
const jwt = require('jsonwebtoken');
const c = require('../controllers/orderController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { requirePermission } = admin;
const { directOrderLimiter } = require('../middleware/security');
const { normalizePhone, normalizeCountryCode, cleanText, PHONE_COUNTRIES, namePattern } = require('../utils/inputValidation');

function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();
  try { req.user = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'], issuer: 'rare-oud-api', audience: 'rare-oud-web' }); }
  catch { req.user = null; }
  return next();
}

function hasThreeNameParts(value) {
  return cleanText(value, { max: 140 }).split(/\s+/).filter(Boolean).length >= 3;
}

const supportedCountryCodes = PHONE_COUNTRIES.map(country => country.code);
const directOrderValidation = [
  body('product_id').isInt({ min: 1 }).toInt(),
  body('quantity').optional({ checkFalsy: true }).isInt({ min: 1, max: 20 }).toInt(),
  body('customer_name')
    .customSanitizer(value => cleanText(value, { max: 140 }))
    .custom(value => namePattern.test(value) && hasThreeNameParts(value))
    .withMessage('A valid three-part full name is required')
    .isLength({ min: 6, max: 140 })
    .escape(),
  body('customer_email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
  body('customer_phone_country_code')
    .customSanitizer(value => normalizeCountryCode(value, ''))
    .isIn(supportedCountryCodes)
    .withMessage('A supported phone country code is required'),
  body('customer_phone')
    .customSanitizer((value, { req }) => normalizePhone(value, req.body.customer_phone_country_code))
    .notEmpty()
    .withMessage('A valid phone number with country code is required'),
  body('customer_address')
    .customSanitizer(value => cleanText(value, { max: 500, allowNewLines: true }))
    .isLength({ min: 5, max: 500 })
    .withMessage('A delivery address is required')
    .escape(),
  body('country').optional({ checkFalsy: true }).customSanitizer(value => cleanText(value, { max: 120 })).isLength({ max: 120 }).escape(),
  body('notes').optional({ checkFalsy: true }).customSanitizer(value => cleanText(value, { max: 2000, allowNewLines: true })).isLength({ max: 2000 }).escape()
];
const statusValidation = [body('status').isIn(['pending','approved','rejected','in_progress','completed'])];

r.post('/direct', directOrderLimiter, optionalAuth, directOrderValidation, c.createDirect);
r.get('/mine', auth, c.mine);
r.get('/', auth, requirePermission('orders.read'), [query('limit').optional().isInt({ min: 1, max: 200 }), query('offset').optional().isInt({ min: 0 })], c.adminList);
r.get('/:id', auth, [param('id').isInt({ min: 1 }).toInt()], c.get);
r.put('/:id/status', auth, requirePermission('orders.write'), [param('id').isInt({ min: 1 }).toInt()], statusValidation, c.updateStatus);
module.exports = r;
