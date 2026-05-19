const nodemailer = require('nodemailer');

let transporter;
let transporterSignature;

function buildTransportOptions() {
  const options = {
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER && process.env.SMTP_PASS
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined
  };

  if (process.env.SMTP_HOST) {
    options.host = process.env.SMTP_HOST;
  } else if (process.env.SMTP_SERVICE) {
    options.service = process.env.SMTP_SERVICE;
  }

  return options;
}

function getTransporter() {
  const options = buildTransportOptions();
  const signature = JSON.stringify(options);
  if (!transporter || transporterSignature !== signature) {
    transporter = nodemailer.createTransport(options);
    transporterSignature = signature;
  }
  return transporter;
}

function isEmailDeliveryConfigured() {
  const pass = String(process.env.SMTP_PASS || '').trim();
  const placeholderPasses = new Set(['your-app-password', 'app-password', 'changeme', 'change-me']);
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && pass && !placeholderPasses.has(pass.toLowerCase()));
}

async function send({ to, subject, html, text }) {
  if (!isEmailDeliveryConfigured()) {
    return { skipped: true, reason: 'SMTP_NOT_CONFIGURED' };
  }

  return getTransporter().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
    text
  });
}

async function verifyConnection() {
  if (!isEmailDeliveryConfigured()) {
    return { ok: false, skipped: true, reason: 'SMTP_NOT_CONFIGURED' };
  }

  await getTransporter().verify();
  return { ok: true };
}

module.exports = { send, isEmailDeliveryConfigured, verifyConnection };
