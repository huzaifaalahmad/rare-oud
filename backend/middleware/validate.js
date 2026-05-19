const Joi = require('joi');
const AppError = require('../utils/AppError');

function validateBody(schema) {
  return (req, _res, next) => {
    const { value, error } = schema.validate(req.body || {}, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });
    if (error) {
      const err = new AppError('Validation failed', 422, 'VALIDATION_ERROR');
      err.errors = error.details.map(d => ({ path: d.path.join('.'), message: d.message }));
      return next(err);
    }
    req.body = value;
    return next();
  };
}

function validateParams(schema) {
  return (req, _res, next) => {
    const { value, error } = schema.validate(req.params || {}, { abortEarly: false, stripUnknown: true, convert: true });
    if (error) {
      const err = new AppError('Validation failed', 422, 'VALIDATION_ERROR');
      err.errors = error.details.map(d => ({ path: d.path.join('.'), message: d.message }));
      return next(err);
    }
    req.params = value;
    return next();
  };
}

module.exports = { validateBody, validateParams, Joi };
