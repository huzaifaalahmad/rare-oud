const { csrfProtection, issueCsrfToken } = require('../middleware/csrf');

function responseMock() {
  return {
    cookie: jest.fn(),
    json: jest.fn()
  };
}

describe('csrf middleware', () => {
  const originalCookieSecure = process.env.COOKIE_SECURE;

  afterEach(() => {
    process.env.COOKIE_SECURE = originalCookieSecure;
  });

  test('issues a reusable double-submit csrf token cookie', () => {
    process.env.COOKIE_SECURE = 'false';
    const req = { cookies: { rare_oud_csrf: 'existing-token' } };
    const res = responseMock();

    issueCsrfToken(req, res);

    expect(res.cookie).toHaveBeenCalledWith(
      'rare_oud_csrf',
      'existing-token',
      expect.objectContaining({
        httpOnly: false,
        sameSite: 'lax',
        path: '/'
      })
    );
    expect(res.json).toHaveBeenCalledWith({ csrfToken: 'existing-token' });
  });

  test('uses cross-site secure cookies for production deployments', () => {
    process.env.COOKIE_SECURE = 'true';
    const req = { cookies: { rare_oud_csrf: 'existing-token' } };
    const res = responseMock();

    issueCsrfToken(req, res);

    expect(res.cookie).toHaveBeenCalledWith(
      'rare_oud_csrf',
      'existing-token',
      expect.objectContaining({
        sameSite: 'none',
        secure: true
      })
    );
  });

  test('allows safe methods and matching csrf header/cookie pairs', () => {
    const next = jest.fn();
    csrfProtection({ method: 'GET' }, {}, next);
    expect(next).toHaveBeenCalledWith();

    const postNext = jest.fn();
    csrfProtection({
      method: 'POST',
      cookies: { rare_oud_csrf: 'token-123' },
      get: (name) => (name === 'x-csrf-token' ? 'token-123' : undefined)
    }, {}, postNext);
    expect(postNext).toHaveBeenCalledWith();
  });

  test('rejects missing or mismatched csrf tokens', () => {
    const next = jest.fn();
    csrfProtection({
      method: 'POST',
      cookies: { rare_oud_csrf: 'cookie-token' },
      get: () => 'header-token'
    }, {}, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      status: 403,
      code: 'CSRF_INVALID'
    }));
  });
});
