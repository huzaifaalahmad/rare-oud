describe('enterprise security contract', () => {
  test('mailer exposes async transactional functions', () => {
    const mailer = require('../../utils/mailer');
    expect(typeof mailer.sendQueuedEmail).toBe('function');
    expect(typeof mailer.sendResetEmail).toBe('function');
    expect(typeof mailer.sendOrderConfirmationEmail).toBe('function');
  });
});
