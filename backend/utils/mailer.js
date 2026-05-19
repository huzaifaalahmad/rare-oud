const { enqueueEmail } = require('../services/queueService');
const emailJob = require('../jobs/emailJob');
const logger = require('./logger');

function escapeHtml(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function textToHtml(value = '') {
  return escapeHtml(value).replace(/\n/g, '<br>');
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toISOString().replace('T', ' ').slice(0, 19);
}

async function sendQueuedEmail(payload, opts = {}) {
  const queueEnabled = process.env.EMAIL_QUEUE_ENABLED === 'true' && process.env.DISABLE_QUEUES !== 'true';
  if (!queueEnabled || opts.sync === true) return emailJob.run({ data: payload });

  try {
    const job = await enqueueEmail(opts.name || 'transactional-email', payload, opts.jobOptions || {});
    return { queued: true, jobId: job.id, name: job.name || opts.name || 'transactional-email' };
  } catch (error) {
    logger.warn('Email queue unavailable; sending email synchronously', { error: error.message });
    return emailJob.run({ data: payload });
  }
}

function baseShell(title, innerHtml) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.7;color:#2D2933;background:#FCF9F5;padding:24px">
      <div style="max-width:680px;margin:auto;background:#ffffff;border:1px solid #E8DFD0;border-radius:18px;padding:24px">
        <p style="margin:0 0 8px;color:#D4AF37;font-weight:700;letter-spacing:.08em">RARE OUD</p>
        <h1 style="margin:0 0 18px;color:#4A144D;font-size:24px">${escapeHtml(title)}</h1>
        ${innerHtml}
      </div>
    </div>`;
}

function detailsTable(rows) {
  return `
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tbody>
        ${rows.map(([label, value]) => `
          <tr>
            <th style="text-align:left;vertical-align:top;padding:10px;border-bottom:1px solid #E8DFD0;color:#4A144D;width:160px">${escapeHtml(label)}</th>
            <td style="padding:10px;border-bottom:1px solid #E8DFD0">${textToHtml(value || '-')}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

function orderHtml(order) {
  return baseShell('Rare Oud order received', `<p>Rare Oud received your request <strong>${escapeHtml(order.order_number || order.id)}</strong>.</p>`);
}

function customOrderHtml(order) {
  return baseShell('Rare Oud custom order update', `
    <p>Your custom order status is <strong>${escapeHtml(order.status)}</strong>.</p>
    ${detailsTable([
      ['Request ID', order.id],
      ['Name', order.name],
      ['Email', order.email],
      ['Details', order.request_details],
      ['Admin note', order.admin_note]
    ])}`);
}

function contactMessageRows(message) {
  return [
    ['Message ID', message.id],
    ['Name', message.name],
    ['Email', message.email || message.account_email],
    ['Phone', message.phone],
    ['Subject', message.subject],
    ['Message', message.message],
    ['Status', message.status],
    ['Created at', formatDate(message.created_at)]
  ];
}

function contactConfirmationHtml(message) {
  return baseShell('We received your message', `
    <p>Thank you for contacting Rare Oud. Your message is now in the admin dashboard.</p>
    <p>نسخة كاملة من تفاصيل رسالتك محفوظة أدناه.</p>
    ${detailsTable(contactMessageRows(message))}`);
}

function contactAdminHtml(message) {
  return baseShell('New contact message', `
    <p>A new contact message has been submitted and is available in the admin dashboard.</p>
    ${detailsTable(contactMessageRows(message))}`);
}

function contactReplyHtml(message) {
  return baseShell('Rare Oud replied to your message', `
    <p>Rare Oud replied to your contact message.</p>
    ${detailsTable([
      ...contactMessageRows(message),
      ['Admin reply', message.admin_reply]
    ])}`);
}

function contactText(message, includeReply = false) {
  const lines = contactMessageRows(message).map(([label, value]) => `${label}: ${value || '-'}`);
  if (includeReply) lines.push(`Admin reply: ${message.admin_reply || '-'}`);
  return lines.join('\n');
}

async function sendOrderConfirmationEmail(to, order) {
  return sendQueuedEmail({
    to,
    subject: `Rare Oud order ${order.order_number || order.id}`,
    html: orderHtml(order)
  }, { name: 'order-confirmation' });
}

async function sendCustomOrderStatusEmail(to, order) {
  return sendQueuedEmail({
    to,
    subject: `Rare Oud custom order ${order.status}`,
    html: customOrderHtml(order)
  }, { name: 'custom-order-status' });
}

async function sendContactMessageConfirmationEmail(to, message) {
  return sendQueuedEmail({
    to,
    subject: `Rare Oud received your message #${message.id}`,
    html: contactConfirmationHtml(message),
    text: contactText(message)
  }, { name: 'contact-message-confirmation' });
}

async function sendContactAdminNotificationEmail(to, message) {
  return sendQueuedEmail({
    to,
    subject: `New Rare Oud contact message #${message.id}`,
    html: contactAdminHtml(message),
    text: contactText(message)
  }, { name: 'contact-message-admin' });
}

async function sendContactReplyEmail(to, message) {
  return sendQueuedEmail({
    to,
    subject: `Rare Oud reply to your message #${message.id}`,
    html: contactReplyHtml(message),
    text: contactText(message, true)
  }, { name: 'contact-message-reply' });
}

async function sendResetEmail(to, token, frontendUrl) {
  const base = (frontendUrl || process.env.FRONTEND_URL || '').replace(/\/$/, '');
  const resetUrl = `${base}/reset-password?token=${encodeURIComponent(token)}`;
  return sendQueuedEmail({
    to,
    subject: 'Rare Oud password reset',
    html: baseShell('Password reset', `<p>Use this secure link to reset your password:</p><p><a href="${escapeHtml(resetUrl)}">Reset password</a></p>`),
    text: `Reset your password: ${resetUrl}`
  }, { name: 'password-reset' });
}

module.exports = {
  sendQueuedEmail,
  sendOrderConfirmationEmail,
  sendCustomOrderStatusEmail,
  sendContactMessageConfirmationEmail,
  sendContactAdminNotificationEmail,
  sendContactReplyEmail,
  sendResetEmail
};
