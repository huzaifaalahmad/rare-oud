jest.mock('../utils/logger', () => ({
  error: jest.fn()
}));

jest.mock('../queues', () => ({
  emailQueue: { name: 'email', add: jest.fn() },
  notificationQueue: { name: 'notification', add: jest.fn() },
  auditQueue: { name: 'audit', add: jest.fn() }
}));

const logger = require('../utils/logger');
const queues = require('../queues');
const queueService = require('../services/queueService');

describe('queue service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('enqueues email, notification, and audit jobs', async () => {
    queues.emailQueue.add.mockResolvedValue({ id: 'email-1' });
    queues.notificationQueue.add.mockResolvedValue({ id: 'notification-1' });
    queues.auditQueue.add.mockResolvedValue({ id: 'audit-1' });

    await expect(queueService.enqueueEmail('send', { to: 'a@example.com' }))
      .resolves.toEqual({ id: 'email-1' });
    await expect(queueService.enqueueNotification({ userId: 1 }))
      .resolves.toEqual({ id: 'notification-1' });
    await expect(queueService.enqueueAudit({ action: 'create' }))
      .resolves.toEqual({ id: 'audit-1' });

    expect(queues.emailQueue.add).toHaveBeenCalledWith('send', { to: 'a@example.com' }, {});
    expect(queues.notificationQueue.add).toHaveBeenCalledWith('create-notification', { userId: 1 }, {});
    expect(queues.auditQueue.add).toHaveBeenCalledWith('write-audit', { action: 'create' }, {});
  });

  test('logs and rethrows queue failures', async () => {
    queues.emailQueue.add.mockRejectedValue(new Error('redis down'));

    await expect(queueService.enqueueEmail('send', { to: 'a@example.com' }))
      .rejects.toThrow('redis down');
    expect(logger.error).toHaveBeenCalledWith(
      'Queue add failed; falling back to request-safe execution where configured',
      expect.objectContaining({ queue: 'email', name: 'send', error: 'redis down' })
    );
  });
});
