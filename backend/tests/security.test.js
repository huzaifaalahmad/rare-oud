const { validateEnv } = require('../config/env');

describe('security hardening', () => {
  const saved = { ...process.env };
  afterEach(() => { process.env = { ...saved }; jest.resetModules(); });

  test('rejects short jwt secrets', () => {
    process.env['JWT_SECRET'] = 'short';
    process.env['JWT_REFRESH_SECRET'] = 'also-short';
    expect(() => validateEnv()).toThrow(/FATAL_ENV_VALIDATION/);
  });

  test('requires production secure cookies and metrics token', () => {
    process.env.NODE_ENV = 'production';
    process.env.DB_HOST = 'db'; process.env.DB_NAME = 'rare'; process.env.DB_USER = 'rare'; process.env['DB_PASSWORD'] = 'x'.repeat(20);
    process.env['JWT_SECRET'] = 'a'.repeat(64); process.env['JWT_REFRESH_SECRET'] = 'b'.repeat(64);
    process.env.FRONTEND_URL = 'https://example.com'; process.env.COOKIE_SECURE = 'false';
    expect(() => validateEnv()).toThrow(/COOKIE_SECURE/);
  });
});
