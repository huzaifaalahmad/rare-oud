const r = require('express').Router();
const { body, validationResult } = require('express-validator');
const c = require('../controllers/analyticsController');

const visitValidation = [
  body('path').optional({ checkFalsy: true }).isString().isLength({ max: 255 }),
  body('referrer').optional({ checkFalsy: true }).isString().isLength({ max: 500 }),
  body('visitor_id').optional({ checkFalsy: true }).isString().isLength({ max: 160 })
];

r.post('/visit', visitValidation, (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(204).end();
  return c.recordVisit(req, res, next);
});

module.exports = r;
