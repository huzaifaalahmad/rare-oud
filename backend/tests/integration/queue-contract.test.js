describe('enterprise queue contracts', () => {
  test('all enterprise queues are exported', () => {
    const queues = require('../../queues');
    expect(queues.emailQueue.name).toBe('email');
    expect(queues.notificationQueue.name).toBe('notification');
    expect(queues.auditQueue.name).toBe('audit');
  });
});
