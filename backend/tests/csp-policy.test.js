describe('content security policy builder', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
  });

  test('validates origins conservatively', () => {
    jest.resetModules();
    const { isValidOrigin } = require('../utils/cspPolicy');

    expect(isValidOrigin('https://rare-oud.example')).toBe(true);
    expect(isValidOrigin('http://localhost:5173')).toBe(true);
    expect(isValidOrigin('javascript:alert(1)')).toBe(false);
    expect(isValidOrigin('https://safe.example; script-src *')).toBe(false);
  });

  test('production allowlists keep only https origins', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      CSP_CONNECT_ORIGINS: 'https://api.rare-oud.example,http://localhost:5173,not-a-url'
    };
    jest.resetModules();
    const { parseAllowlist } = require('../utils/cspPolicy');

    expect(parseAllowlist('CSP_CONNECT_ORIGINS', { localhost: true }))
      .toEqual(['https://api.rare-oud.example']);
  });

  test('builds nonce-based directives with drive media support', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'development',
      FRONTEND_URL: 'http://localhost:5173',
      CDN_BASE_URL: 'https://cdn.rare-oud.example'
    };
    jest.resetModules();
    const { buildCspDirectives } = require('../utils/cspPolicy');
    const res = { locals: {} };
    const directives = buildCspDirectives({}, res);

    expect(res.locals.cspNonce).toHaveLength(24);
    expect(directives.scriptSrc).toContain(`'nonce-${res.locals.cspNonce}'`);
    expect(directives.mediaSrc).toContain('https://drive.google.com');
    expect(directives.imgSrc).toContain('https://cdn.rare-oud.example');
    expect(directives.objectSrc).toEqual(["'none'"]);
  });
});
