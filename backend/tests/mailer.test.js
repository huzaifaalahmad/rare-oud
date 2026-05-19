describe('mailer delivery strategy', () => {
  const originalEnv = process.env;
  let enqueueEmail;
  let emailJob;
  let logger;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    enqueueEmail = jest.fn();
    emailJob = { run: jest.fn().mockResolvedValue({ messageId: 'direct-message' }) };
    logger = { warn: jest.fn() };

    jest.doMock('../services/queueService', () => ({ enqueueEmail }));
    jest.doMock('../jobs/emailJob', () => emailJob);
    jest.doMock('../utils/logger', () => logger);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.dontMock('../services/queueService');
    jest.dontMock('../jobs/emailJob');
    jest.dontMock('../utils/logger');
    jest.resetModules();
  });

  test('sends synchronously by default so email is not stranded without workers', async () => {
    delete process.env.EMAIL_QUEUE_ENABLED;
    process.env.DISABLE_QUEUES = 'false';
    const mailer = require('../utils/mailer');

    await expect(mailer.sendQueuedEmail({ to: 'user@example.com', subject: 'Test', text: 'Hello' }))
      .resolves.toEqual({ messageId: 'direct-message' });

    expect(emailJob.run).toHaveBeenCalledWith({
      data: { to: 'user@example.com', subject: 'Test', text: 'Hello' }
    });
    expect(enqueueEmail).not.toHaveBeenCalled();
  });

  test('queues email only when EMAIL_QUEUE_ENABLED is explicitly true', async () => {
    process.env.EMAIL_QUEUE_ENABLED = 'true';
    process.env.DISABLE_QUEUES = 'false';
    enqueueEmail.mockResolvedValue({ id: 'email-1', name: 'contact-message-confirmation' });
    const mailer = require('../utils/mailer');

    await expect(mailer.sendQueuedEmail(
      { to: 'user@example.com', subject: 'Test', text: 'Hello' },
      { name: 'contact-message-confirmation' }
    )).resolves.toEqual({
      queued: true,
      jobId: 'email-1',
      name: 'contact-message-confirmation'
    });

    expect(enqueueEmail).toHaveBeenCalledWith(
      'contact-message-confirmation',
      { to: 'user@example.com', subject: 'Test', text: 'Hello' },
      {}
    );
    expect(emailJob.run).not.toHaveBeenCalled();
  });

  test('falls back to direct sending when queue enqueue fails', async () => {
    process.env.EMAIL_QUEUE_ENABLED = 'true';
    process.env.DISABLE_QUEUES = 'false';
    enqueueEmail.mockRejectedValue(new Error('redis unavailable'));
    const mailer = require('../utils/mailer');

    await expect(mailer.sendQueuedEmail({ to: 'user@example.com', subject: 'Test', text: 'Hello' }))
      .resolves.toEqual({ messageId: 'direct-message' });

    expect(logger.warn).toHaveBeenCalledWith(
      'Email queue unavailable; sending email synchronously',
      { error: 'redis unavailable' }
    );
    expect(emailJob.run).toHaveBeenCalled();
  });
});
