const { validationResult } = require('express-validator');
const db = require('../config/database');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const { audit } = require('../utils/audit');
const { createNotification } = require('../utils/notifications');
const {
  sendContactAdminNotificationEmail,
  sendContactMessageConfirmationEmail,
  sendContactReplyEmail
} = require('../utils/mailer');
const { isEmailDeliveryConfigured } = require('../services/emailService');

const VALID_STATUSES = ['new', 'read', 'replied', 'archived'];

function validationFail(req) {
  const result = validationResult(req);
  if (result.isEmpty()) return;
  throw new AppError('Validation failed', 422, 'VALIDATION_ERROR', {
    errors: result.array().map(error => ({
      field: error.path || error.param,
      message: error.msg
    }))
  });
}

function page(req, max = 100) {
  return {
    limit: Math.min(Math.max(parseInt(req.query.limit || 50, 10), 1), max),
    offset: Math.max(parseInt(req.query.offset || 0, 10), 0)
  };
}

async function getAdminUsers() {
  return db.query(
    `SELECT id, email
     FROM users
     WHERE role='admin'
       AND is_active=TRUE
       AND deleted_at IS NULL`
  ).catch(() => []);
}

async function getAdminEmailRecipients() {
  const settings = await db.query(
    `SELECT value_en, value_ar
     FROM site_settings
     WHERE setting_key='contact_email'
     LIMIT 1`
  ).catch(() => []);

  const admins = await getAdminUsers();
  const values = [
    settings[0]?.value_en,
    settings[0]?.value_ar,
    ...admins.map(admin => admin.email)
  ]
    .filter(Boolean)
    .map(value => String(value).trim().toLowerCase())
    .filter(value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));

  return Array.from(new Set(values));
}

async function deliverEmail(task, meta) {
  try {
    const result = await task;
    if (result?.skipped) {
      logger.warn('Contact email skipped', { ...meta, reason: result.reason });
      return { sent: false, queued: false, skipped: true, reason: result.reason };
    }
    if (result?.queued) {
      return { sent: false, queued: true, jobId: result.jobId };
    }
    return { sent: true, queued: false, messageId: result?.messageId || null };
  } catch (error) {
    logger.error('Contact email failed', { ...meta, error: error.message });
    return { sent: false, queued: false, failed: true };
  }
}

async function notifyAdmins(message) {
  const admins = await getAdminUsers();
  const results = await Promise.allSettled(admins.map(admin => createNotification(admin.id, {
    type: 'contact_message',
    title_ar: 'رسالة تواصل جديدة',
    title_en: 'New contact message',
    body_ar: `${message.name} أرسل رسالة تواصل جديدة.`,
    body_en: `${message.name} sent a new contact message.`,
    link_url: '/admin?tab=contact_messages'
  }).catch(error => logger.warn('Admin contact notification failed', {
    adminId: admin.id,
    error: error.message
  }))));
  return {
    attempted: admins.length,
    created: results.filter(result => result.status === 'fulfilled').length
  };
}

exports.create = async (req, res, next) => {
  try {
    validationFail(req);

    const name = req.body.name || req.user?.name;
    const email = req.body.email || req.user?.email || null;
    const phone = req.body.phone || null;
    const subject = req.body.subject || null;
    const message = req.body.message;

    if (!name || !message) {
      throw new AppError('Name and message are required', 422, 'CONTACT_REQUIRED_FIELDS');
    }

    const result = await db.query(
      `INSERT INTO contact_messages
       (user_id, name, email, phone, subject, message, status, ip_address, user_agent)
       VALUES
       (:user_id, :name, :email, :phone, :subject, :message, 'new', :ip, :ua)`,
      {
        user_id: req.user?.id || null,
        name,
        email,
        phone,
        subject,
        message,
        ip: req.ip,
        ua: String(req.headers['user-agent'] || '').slice(0, 500)
      }
    );

    const contactMessage = {
      id: result.insertId,
      user_id: req.user?.id || null,
      name,
      email,
      phone,
      subject,
      message,
      status: 'new',
      created_at: new Date()
    };

    let adminNotifications = { attempted: 0, created: 0 };
    try {
      adminNotifications = await notifyAdmins(contactMessage);
    } catch (error) {
      logger.warn('Admin contact notification batch failed', { error: error.message });
    }

    const emailDeliveryConfigured = isEmailDeliveryConfigured();
    const adminRecipients = emailDeliveryConfigured ? await getAdminEmailRecipients() : [];

    const adminEmailResults = await Promise.all(adminRecipients.map(recipient => (
      deliverEmail(
        sendContactAdminNotificationEmail(recipient, contactMessage),
        { kind: 'admin-contact-notification', contactMessageId: contactMessage.id, to: recipient }
      )
    )));

    let userEmailResult = { sent: false, queued: false, skipped: !emailDeliveryConfigured };
    if (req.user?.email && emailDeliveryConfigured) {
      userEmailResult = await deliverEmail(
        sendContactMessageConfirmationEmail(req.user.email, contactMessage),
        { kind: 'user-contact-confirmation', contactMessageId: contactMessage.id, userId: req.user.id }
      );
    }

    res.status(201).json({
      id: contactMessage.id,
      status: contactMessage.status,
      admin_notifications_created: adminNotifications.created,
      admin_email_sent_count: adminEmailResults.filter(result => result.sent).length,
      email_copy_sent: Boolean(userEmailResult.sent),
      email_copy_queued: Boolean(userEmailResult.queued),
      email_delivery_configured: emailDeliveryConfigured,
      message: 'Contact message received'
    });
  } catch (error) {
    next(error);
  }
};

exports.adminList = async (req, res, next) => {
  try {
    const { limit, offset } = page(req, 200);
    const status = VALID_STATUSES.includes(req.query.status) ? req.query.status : null;
    const where = status ? 'WHERE cm.status=:status' : '';

    const total = await db.query(
      `SELECT COUNT(*) total
       FROM contact_messages cm
       ${where}`,
      { status }
    );

    const messages = await db.query(
      `SELECT
         cm.*,
         u.name AS account_name,
         u.email AS account_email
       FROM contact_messages cm
       LEFT JOIN users u ON u.id=cm.user_id
       ${where}
       ORDER BY cm.created_at DESC
       LIMIT :limit OFFSET :offset`,
      { status, limit, offset }
    );

    res.json({
      messages,
      total: total[0]?.total || 0,
      limit,
      offset
    });
  } catch (error) {
    next(error);
  }
};

exports.mine = async (req, res, next) => {
  try {
    const { limit, offset } = page(req, 50);
    const total = await db.query(
      `SELECT COUNT(*) total
       FROM contact_messages
       WHERE user_id=:user_id`,
      { user_id: req.user.id }
    );
    const messages = await db.query(
      `SELECT id, subject, message, status, admin_reply, responded_at, created_at
       FROM contact_messages
       WHERE user_id=:user_id
       ORDER BY created_at DESC
       LIMIT :limit OFFSET :offset`,
      { user_id: req.user.id, limit, offset }
    );

    res.json({
      messages,
      total: total[0]?.total || 0,
      limit,
      offset
    });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    validationFail(req);

    const id = Number(req.params.id);
    const status = req.body.status;
    const adminReply = req.body.admin_reply || null;

    const existing = await db.query(
      `SELECT cm.*, u.email AS account_email
       FROM contact_messages cm
       LEFT JOIN users u ON u.id=cm.user_id
       WHERE cm.id=:id
       LIMIT 1`,
      { id }
    );

    if (!existing.length) {
      throw new AppError('Contact message not found', 404, 'CONTACT_MESSAGE_NOT_FOUND');
    }

    const nextStatus = adminReply ? 'replied' : status;

    await db.query(
      `UPDATE contact_messages
       SET status=:status,
           admin_reply=:admin_reply,
           responded_by=:responded_by,
           responded_at=IF(:admin_reply IS NULL, responded_at, NOW())
       WHERE id=:id`,
      {
        id,
        status: nextStatus,
        admin_reply: adminReply,
        responded_by: adminReply ? req.user.id : null
      }
    );

    const updatedRows = await db.query(
      `SELECT cm.*, u.email AS account_email
       FROM contact_messages cm
       LEFT JOIN users u ON u.id=cm.user_id
       WHERE cm.id=:id
       LIMIT 1`,
      { id }
    );

    const updated = updatedRows[0];

    let userNotificationCreated = false;
    if (adminReply && updated.user_id) {
      const replyPreview = String(adminReply).replace(/\s+/g, ' ').trim().slice(0, 180);
      try {
        await createNotification(updated.user_id, {
          type: 'contact_reply',
          title_ar: 'تم الرد على رسالتك',
          title_en: 'Your message has a reply',
          body_ar: `رد الإدارة: ${replyPreview}`,
          body_en: `Admin reply: ${replyPreview}`,
          link_url: `/profile?section=contact-replies&message=${updated.id}`
        });
        userNotificationCreated = true;
      } catch (error) {
        logger.warn('Contact reply notification failed', { error: error.message });
      }
    }

    let replyEmailResult = { sent: false, queued: false, skipped: true };
    if (adminReply && updated.account_email && isEmailDeliveryConfigured()) {
      replyEmailResult = await deliverEmail(
        sendContactReplyEmail(updated.account_email, updated),
        { kind: 'contact-reply', contactMessageId: id, userId: updated.user_id }
      );
    }

    await audit(req, 'update', 'contact_message', id, {
      status: nextStatus,
      replied: Boolean(adminReply)
    });

    res.json({
      message: 'Contact message updated',
      status: nextStatus,
      notification_created: userNotificationCreated,
      email_reply_sent: Boolean(replyEmailResult.sent),
      email_reply_queued: Boolean(replyEmailResult.queued),
      email_delivery_configured: isEmailDeliveryConfigured()
    });
  } catch (error) {
    next(error);
  }
};
