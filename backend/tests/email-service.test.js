describe('email service configuration', () => {
  const originalEnv = process.env;
  let sendMail;
  let verify;

  beforeEach(() => {
    jest.resetModules();
    sendMail = jest.fn().mockResolvedValue({ messageId: 'test-message' });
    verify = jest.fn().mockResolvedValue(true);
    jest.doMock('nodemailer', () => ({
      createTransport: jest.fn(() => ({ sendMail, verify }))
    }));
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.dontMock('nodemailer');
    jest.resetModules();
  });

  test('skips sending when SMTP is not fully configured', async () => {
    process.env = { ...originalEnv, SMTP_HOST: '', SMTP_USER: '', SMTP_PASS: '' };
    const service = require('../services/emailService');

    expect(service.isEmailDeliveryConfigured()).toBe(false);
    await expect(service.send({ to: 'user@example.com', subject: 'Test' }))
      .resolves.toEqual({ skipped: true, reason: 'SMTP_NOT_CONFIGURED' });
    expect(sendMail).not.toHaveBeenCalled();
  });

  test('rejects placeholder SMTP passwords', () => {
    process.env = {
      ...originalEnv,
      SMTP_HOST: 'smtp.example.com',
      SMTP_USER: 'sender@example.com',
      SMTP_PASS: 'change-me'
    };
    const service = require('../services/emailService');

    expect(service.isEmailDeliveryConfigured()).toBe(false);
  });

  test('sends through configured SMTP transporter', async () => {
    process.env = {
      ...originalEnv,
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '587',
      SMTP_USER: 'sender@example.com',
      SMTP_PASS: 'real-app-password',
      SMTP_FROM: 'Rare Oud <sender@example.com>'
    };
    const service = require('../services/emailService');

    expect(service.isEmailDeliveryConfigured()).toBe(true);
    await expect(service.send({
      to: 'customer@example.com',
      subject: 'Rare Oud',
      html: '<p>Hello</p>',
      text: 'Hello'
    })).resolves.toEqual({ messageId: 'test-message' });
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: 'Rare Oud <sender@example.com>',
      to: 'customer@example.com',
      subject: 'Rare Oud'
    }));
  });

  test('verifies configured SMTP connection', async () => {
    process.env = {
      ...originalEnv,
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '587',
      SMTP_USER: 'sender@example.com',
      SMTP_PASS: 'real-app-password'
    };
    const service = require('../services/emailService');

    await expect(service.verifyConnection()).resolves.toEqual({ ok: true });
    expect(verify).toHaveBeenCalled();
  });
});
