const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/database');
const AppError = require('../utils/AppError');
const { sendResetEmail } = require('../utils/mailer');
const logger = require('../utils/logger');
const { recordSuspiciousEvent } = require('../services/securityEventService');
const { fingerprint } = require('../utils/deviceFingerprint');
const { cleanText, normalizePhone } = require('../utils/inputValidation');

function validationErrors(_req) {
  // Joi route validation already sanitized request bodies.
}

function signAccess(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
      algorithm: 'HS256',
      issuer: 'rare-oud-api',
      audience: 'rare-oud-web'
    }
  );
}

function makeRefreshToken(user, familyId, nonce) {
  return jwt.sign(
    {
      id: user.id,
      tokenVersion: user.token_version || 0,
      familyId,
      nonce
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: `${Number(process.env.REFRESH_TOKEN_DAYS || 30)}d`,
      algorithm: 'HS256',
      issuer: 'rare-oud-api',
      audience: 'rare-oud-web-refresh'
    }
  );
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function setRefreshCookie(res, token) {
  res.cookie('rare_oud_refresh', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/api/auth',
    maxAge:
      Number(process.env.REFRESH_TOKEN_DAYS || 30) *
      24 *
      60 *
      60 *
      1000
  });
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || null,
    role: user.role
  };
}

async function issueTokens(res, user, req, options = {}) {
  const accessToken = signAccess(user);
  const familyId = options.familyId || crypto.randomUUID();
  const nonce = crypto.randomUUID();
  const refreshToken = makeRefreshToken(user, familyId, nonce);
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(
    Date.now() +
      Number(process.env.REFRESH_TOKEN_DAYS || 30) *
        24 *
        60 *
        60 *
        1000
  );

  const ua = (req.headers['user-agent'] || '').slice(0, 500);
  const ip = req.ip;
  const device = fingerprint(req);

  if (options.replaceRefreshId) {
    await db.transaction(async conn => {
      await conn.execute(
        `UPDATE refresh_tokens
         SET revoked_at=NOW(), replaced_by_token_hash=?
         WHERE id=? AND revoked_at IS NULL`,
        [tokenHash, options.replaceRefreshId]
      );

      await conn.execute(
        `INSERT INTO refresh_tokens
         (user_id, token_hash, user_agent, ip_address, device_fingerprint, token_family_id, expires_at)
         VALUES (?,?,?,?,?,?,?)`,
        [user.id, tokenHash, ua, ip, device, familyId, expiresAt]
      );
    });
  } else {
    await db.query(
      `INSERT INTO refresh_tokens
       (user_id, token_hash, user_agent, ip_address, device_fingerprint, token_family_id, expires_at)
       VALUES (:user_id,:token_hash,:ua,:ip,:device,:family_id,:expires_at)`,
      {
        user_id: user.id,
        token_hash: tokenHash,
        ua,
        ip,
        device,
        family_id: familyId,
        expires_at: expiresAt
      }
    );
  }

  setRefreshCookie(res, refreshToken);

  return accessToken;
}

async function recordFailedLogin(user) {
  await db.query(
    `UPDATE users
     SET failed_login_count=failed_login_count+1,
         locked_until=IF(
           failed_login_count+1 >= 8,
           DATE_ADD(NOW(), INTERVAL 15 MINUTE),
           locked_until
         )
     WHERE id=:id`,
    { id: user.id }
  );
}

exports.register = async (req, res, next) => {
  try {
    validationErrors(req);

    const { name, email, password, phone } = req.body;

    const exists = await db.query(
      'SELECT id FROM users WHERE email=:email LIMIT 1',
      { email }
    );

    if (exists.length) {
      throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');
    }

    const password_hash = await bcrypt.hash(password, 12);

    const r = await db.query(
      `INSERT INTO users
       (name,email,phone,password_hash,role)
       VALUES (:name,:email,:phone,:password_hash,"user")`,
      {
        name,
        email,
        phone: phone || null,
        password_hash
      }
    );

    const user = {
      id: r.insertId,
      name,
      email,
      phone: phone || null,
      role: 'user',
      token_version: 0
    };

    const token = await issueTokens(res, user, req);

    res.status(201).json({
      user: publicUser(user),
      token
    });
  } catch (e) {
    next(e);
  }
};

exports.login = async (req, res, next) => {
  try {
    validationErrors(req);

    const { email, password } = req.body;

    const rows = await db.query(
      `SELECT *
       FROM users
       WHERE email=:email AND deleted_at IS NULL
       LIMIT 1`,
      { email }
    );

    if (!rows.length) {
      await recordSuspiciousEvent({
        eventType: 'login_unknown_email',
        severity: 'medium',
        req,
        metadata: { email }
      });

      throw new AppError(
        'Invalid credentials',
        401,
        'INVALID_CREDENTIALS'
      );
    }

    const user = rows[0];

    if (!user.is_active) {
      throw new AppError('Account disabled', 403, 'ACCOUNT_DISABLED');
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      throw new AppError(
        'Account temporarily locked. Try again later.',
        423,
        'ACCOUNT_LOCKED'
      );
    }

    const ok = await bcrypt.compare(password, user.password_hash);

    if (!ok) {
      await recordFailedLogin(user);

      await recordSuspiciousEvent({
        userId: user.id,
        eventType: 'login_failed_password',
        severity: user.failed_login_count >= 5 ? 'high' : 'medium',
        req,
        metadata: { email }
      });

      throw new AppError(
        'Invalid credentials',
        401,
        'INVALID_CREDENTIALS'
      );
    }

    if (
      user.last_login_at &&
      req.ip &&
      user.last_login_ip &&
      user.last_login_ip !== req.ip
    ) {
      await recordSuspiciousEvent({
        userId: user.id,
        eventType: 'login_ip_changed',
        severity: 'low',
        req
      });
    }

    await db.query(
      `UPDATE users
       SET failed_login_count=0,
           locked_until=NULL,
           last_login_at=NOW(),
           last_login_ip=:ip
       WHERE id=:id`,
      {
        id: user.id,
        ip: req.ip
      }
    );

    const token = await issueTokens(res, user, req);

    res.json({
      user: publicUser(user),
      token
    });
  } catch (e) {
    next(e);
  }
};

exports.refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.rare_oud_refresh;

    if (!refreshToken) {
      return res.status(401).json({
        message: 'No refresh token',
        code: 'NO_REFRESH_TOKEN'
      });
    }

    let payload;

    try {
      payload = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET,
        {
          algorithms: ['HS256'],
          issuer: 'rare-oud-api',
          audience: 'rare-oud-web-refresh'
        }
      );
    } catch (_error) {
      res.clearCookie('rare_oud_refresh', {
        path: '/api/auth',
        sameSite: 'strict',
        secure: process.env.COOKIE_SECURE === 'true'
      });

      return res.status(401).json({
        message: 'Invalid refresh token',
        code: 'REFRESH_INVALID'
      });
    }

    const tokenHash = hashToken(refreshToken);

    const rows = await db.query(
      `SELECT
         rt.id AS refresh_id,
         rt.user_id,
         rt.token_hash,
         rt.expires_at,
         rt.token_family_id,
         rt.device_fingerprint,
         u.id,
         u.name,
         u.email,
         u.phone,
         u.role,
         u.is_active,
         u.token_version
       FROM refresh_tokens rt
       JOIN users u ON u.id=rt.user_id
       WHERE rt.token_hash=:token_hash
         AND rt.revoked_at IS NULL
         AND rt.expires_at > NOW()
         AND u.deleted_at IS NULL
       LIMIT 1`,
      { token_hash: tokenHash }
    );

    if (!rows.length) {
      const decoded = payload || {};
      if (decoded.familyId) {
        await db.query(
          `UPDATE refresh_tokens SET revoked_at=NOW() WHERE token_family_id=:family_id AND revoked_at IS NULL`,
          { family_id: decoded.familyId }
        ).catch(() => null);
        await recordSuspiciousEvent({
          userId: decoded.id,
          eventType: 'refresh_replay_detected',
          severity: 'critical',
          req,
          metadata: { familyId: decoded.familyId }
        }).catch(() => null);
      }
      res.clearCookie('rare_oud_refresh', {
        path: '/api/auth',
        sameSite: 'strict',
        secure: process.env.COOKIE_SECURE === 'true'
      });

      return res.status(401).json({
        message: 'Refresh token expired or revoked',
        code: 'REFRESH_REVOKED'
      });
    }

    const user = rows[0];

    if (Number(user.token_version) !== Number(payload.tokenVersion || 0)) {
      res.clearCookie('rare_oud_refresh', {
        path: '/api/auth',
        sameSite: 'strict',
        secure: process.env.COOKIE_SECURE === 'true'
      });

      return res.status(401).json({
        message: 'Refresh token expired or revoked',
        code: 'REFRESH_REVOKED'
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        message: 'Account disabled',
        code: 'ACCOUNT_DISABLED'
      });
    }

    if (user.device_fingerprint && user.device_fingerprint !== fingerprint(req)) {
      await recordSuspiciousEvent({
        userId: user.id,
        eventType: 'refresh_device_changed',
        severity: 'high',
        req,
        metadata: { familyId: user.token_family_id }
      }).catch(() => null);
    }

    const token = await issueTokens(res, user, req, {
      replaceRefreshId: user.refresh_id,
      familyId: user.token_family_id || payload.familyId
    });

    res.json({
      user: publicUser(user),
      token
    });
  } catch (e) {
    logger.error('Refresh token flow failed', {
      error: e.message,
      code: e.code || e.errorCode
    });

    next(e);
  }
};

exports.me = async (req, res, next) => {
  try {
    const rows = await db.query(
      `SELECT id,name,email,phone,role,created_at
       FROM users
       WHERE id=:id AND deleted_at IS NULL
       LIMIT 1`,
      { id: req.user.id }
    );

    if (!rows.length) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    res.json({ user: rows[0] });
  } catch (e) {
    next(e);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    validationErrors(req);

    const rows = await db.query(
      `SELECT id,password_hash,is_active
       FROM users
       WHERE id=:id AND deleted_at IS NULL
       LIMIT 1`,
      { id: req.user.id }
    );

    if (!rows.length || !rows[0].is_active) {
      throw new AppError('Account not found or disabled', 404, 'USER_NOT_FOUND');
    }

    const currentOk = await bcrypt.compare(req.body.current_password, rows[0].password_hash);
    if (!currentOk) {
      throw new AppError('Current password is incorrect', 401, 'CURRENT_PASSWORD_INVALID');
    }

    const password_hash = await bcrypt.hash(req.body.password, 12);

    await db.transaction(async conn => {
      await conn.execute(
        `UPDATE users
         SET password_hash=?, token_version=token_version+1
         WHERE id=?`,
        [password_hash, req.user.id]
      );

      await conn.execute(
        `UPDATE refresh_tokens
         SET revoked_at=NOW()
         WHERE user_id=? AND revoked_at IS NULL`,
        [req.user.id]
      );
    });

    res.clearCookie('rare_oud_refresh', {
      path: '/api/auth',
      sameSite: 'strict',
      secure: process.env.COOKIE_SECURE === 'true'
    });

    res.json({ message: 'Password changed. Please sign in again.', requiresLogin: true });
  } catch (e) {
    next(e);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    validationErrors(req);

    const email = String(req.body.email || '').trim().toLowerCase();
    const rawPhone = cleanText(req.body.phone || '', { max: 40 });
    const phoneCountryCode = req.body.phone_country_code || 'SY';

    let rows = [];

    if (email) {
      rows = await db.query(
        `SELECT id,email,phone
         FROM users
         WHERE email=:email AND deleted_at IS NULL
         LIMIT 1`,
        { email }
      );
    } else if (rawPhone) {
      let normalizedPhone = '';
      try {
        normalizedPhone = normalizePhone(rawPhone, phoneCountryCode);
      } catch {
        normalizedPhone = rawPhone;
      }

      const rawDigits = rawPhone.replace(/\D/g, '');
      const normalizedDigits = normalizedPhone.replace(/\D/g, '');
      const localDigits = rawDigits.replace(/^0+/, '');

      rows = await db.query(
        `SELECT id,email,phone
         FROM users
         WHERE deleted_at IS NULL
           AND (
             phone=:raw_phone
             OR phone=:normalized_phone
             OR REPLACE(REPLACE(REPLACE(phone,'+',''),' ',''),'-','') IN (:raw_digits,:normalized_digits,:local_digits)
           )
         LIMIT 1`,
        {
          raw_phone: rawPhone,
          normalized_phone: normalizedPhone,
          raw_digits: rawDigits,
          normalized_digits: normalizedDigits,
          local_digits: localDigits
        }
      );
    }

    if (rows.length) {
      const token = crypto.randomBytes(32).toString('hex');
      const token_hash = hashToken(token);
      const channel = email ? 'email' : 'phone';

      await db.query(
        `INSERT INTO password_reset_tokens
         (user_id,token_hash,channel,expires_at)
         VALUES
         (:user_id,:token_hash,:channel,DATE_ADD(NOW(), INTERVAL 30 MINUTE))`,
        {
          user_id: rows[0].id,
          token_hash,
          channel
        }
      );

      if (rows[0].email) {
        try {
          await sendResetEmail(
            rows[0].email,
            token,
            process.env.FRONTEND_URL
          );
        } catch (mailErr) {
          logger.error('Failed to send reset email', {
            error: mailErr.message
          });
        }
      }

      if (process.env.NODE_ENV !== 'production') {
        logger.debug('DEV ONLY password reset token generated', {
          email: rows[0].email,
          phone: rows[0].phone,
          token,
          resetUrl: `${(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')}/reset-password?token=${token}`
        });
      }
    }

    res.json({
      message: 'If the account exists, reset instructions will be sent.'
    });
  } catch (e) {
    next(e);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    validationErrors(req);

    const token_hash = hashToken(req.body.token);

    const rows = await db.query(
      `SELECT *
       FROM password_reset_tokens
       WHERE token_hash=:token_hash
         AND used_at IS NULL
         AND expires_at > NOW()
       LIMIT 1`,
      { token_hash }
    );

    if (!rows.length) {
      throw new AppError(
        'Invalid or expired reset token',
        400,
        'RESET_INVALID'
      );
    }

    const password_hash = await bcrypt.hash(req.body.password, 12);

    await db.transaction(async conn => {
      await conn.execute(
        `UPDATE users
         SET password_hash=?, token_version=token_version+1
         WHERE id=?`,
        [password_hash, rows[0].user_id]
      );

      await conn.execute(
        'UPDATE password_reset_tokens SET used_at=NOW() WHERE id=?',
        [rows[0].id]
      );

      await conn.execute(
        `UPDATE refresh_tokens
         SET revoked_at=NOW()
         WHERE user_id=? AND revoked_at IS NULL`,
        [rows[0].user_id]
      );
    });

    res.json({ message: 'Password updated' });
  } catch (e) {
    next(e);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.rare_oud_refresh;

    if (refreshToken) {
      await db.query(
        `UPDATE refresh_tokens
         SET revoked_at=NOW()
         WHERE token_hash=:token_hash`,
        { token_hash: hashToken(refreshToken) }
      );
    }

    res.clearCookie('rare_oud_refresh', {
      path: '/api/auth',
      sameSite: 'strict',
      secure: process.env.COOKIE_SECURE === 'true'
    });

    res.json({ message: 'Logged out' });
  } catch (e) {
    next(e);
  }
};