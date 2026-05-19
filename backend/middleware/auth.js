const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');

function verifyAccessToken(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new AppError('Unauthorized', 401, 'AUTH_REQUIRED'));
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'rare-oud-api',
      audience: 'rare-oud-web'
    });
    return next();
  } catch (_err) {
    return next(new AppError('Invalid or expired token', 401, 'TOKEN_INVALID'));
  }
}

function requireSelfOrAdmin(paramName = 'userId') {
  return (req, _res, next) => {
    if (!req.user) return next(new AppError('Unauthorized', 401, 'AUTH_REQUIRED'));
    if (req.user.role === 'admin') return next();
    const requestedId = Number(req.params[paramName] || req.body?.[paramName] || req.query?.[paramName]);
    if (!requestedId || requestedId !== Number(req.user.id)) {
      return next(new AppError('Forbidden resource access', 403, 'IDOR_BLOCKED'));
    }
    return next();
  };
}

verifyAccessToken.requireSelfOrAdmin = requireSelfOrAdmin;
module.exports = verifyAccessToken;
