# Rare Oud Security Hardening

Implemented in this release:

- Access JWT with 15-minute default lifetime.
- HTTP-only refresh-token cookie with server-side token hashes and rotation.
- Token revocation on logout and password reset.
- Temporary account lockout after repeated failed login attempts.
- Auth rate limiting and progressive slowdown.
- Double-submit CSRF token for state-changing requests.
- Helmet with CSP, no X-Powered-By, safe static upload serving.
- CORS whitelist through `CORS_ORIGINS`.
- Centralized safe error handler.
- Granular admin permission checks through `admin_permissions`.
- IDOR fix for order details: non-admin users can only read their own orders.
- Image upload validation by extension, MIME type, and magic bytes; SVG disabled.
- Product requests use direct inquiry workflows only; sensitive financial data is never collected.

Before production:

1. Replace all secrets with 64+ character random values.
2. Set `COOKIE_SECURE=true` and use HTTPS only.
3. Configure `CORS_ORIGINS` with exact production domains.
4. Connect a real email/SMS provider for password reset delivery.
5. Add Sentry or another error-monitoring provider.
6. Put uploads behind a CDN or object storage.
