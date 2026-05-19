describe('notification delivery strategy', () => {
  const originalEnv = process.env;
  let enqueueNotification;
  let notificationService;
  let logger;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    enqueueNotification = jest.fn();
    notificationService = { createNotification: jest.fn().mockResolvedValue(42) };
    logger = { warn: jest.fn() };

    jest.doMock('../services/queueService', () => ({ enqueueNotification }));
    jest.doMock('../services/notificationService', () => notificationService);
    jest.doMock('../utils/logger', () => logger);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.dontMock('../services/queueService');
    jest.dontMock('../services/notificationService');
    jest.dontMock('../utils/logger');
    jest.resetModules();
  });

  test('writes notifications synchronously by default', async () => {
    delete process.env.NOTIFICATION_QUEUE_ENABLED;
    process.env.DISABLE_QUEUES = 'false';
    const { createNotification } = require('../utils/notifications');

    await expect(createNotification(7, { type: 'contact_reply', title_en: 'Reply' }))
      .resolves.toBe(42);

    expect(notificationService.createNotification).toHaveBeenCalledWith(7, {
      type: 'contact_reply',
      title_en: 'Reply'
    });
    expect(enqueueNotification).not.toHaveBeenCalled();
  });

  test('queues notifications only when NOTIFICATION_QUEUE_ENABLED is explicitly true', async () => {
    process.env.NOTIFICATION_QUEUE_ENABLED = 'true';
    process.env.DISABLE_QUEUES = 'false';
    enqueueNotification.mockResolvedValue({ id: 'notification-1' });
    const { createNotification } = require('../utils/notifications');

    await expect(createNotification(7, { type: 'contact_reply', title_en: 'Reply' }))
      .resolves.toBe('notification-1');

    expect(enqueueNotification).toHaveBeenCalledWith(
      { userId: 7, payload: { type: 'contact_reply', title_en: 'Reply' } },
      expect.objectContaining({ jobId: expect.stringMatching(/^notification:7:contact_reply:/) })
    );
    expect(notificationService.createNotification).not.toHaveBeenCalled();
  });

  test('falls back to synchronous write when notification queue fails', async () => {
    process.env.NOTIFICATION_QUEUE_ENABLED = 'true';
    process.env.DISABLE_QUEUES = 'false';
    enqueueNotification.mockRejectedValue(new Error('redis unavailable'));
    const { createNotification } = require('../utils/notifications');

    await expect(createNotification(7, { type: 'contact_reply', title_en: 'Reply' }))
      .resolves.toBe(42);

    expect(logger.warn).toHaveBeenCalledWith(
      'Notification queue unavailable; writing notification synchronously',
      { error: 'redis unavailable' }
    );
    expect(notificationService.createNotification).toHaveBeenCalled();
  });
});
