#!/usr/bin/env bash
set -euo pipefail

fail() { echo "❌ $1" >&2; exit 1; }
warn() { echo "⚠️  $1" >&2; }

# Load .env when present. Exported environment variables take precedence.
if [ -f ".env" ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
elif [ -f "backend/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source backend/.env
  set +a
fi

jwt_secret="${JWT_SECRET:-}"
jwt_refresh_secret="${JWT_REFRESH_SECRET:-}"

[ "${#jwt_secret}" -ge 64 ] || fail "JWT_SECRET must be at least 64 characters."
[ "${#jwt_refresh_secret}" -ge 64 ] || fail "JWT_REFRESH_SECRET must be at least 64 characters."
[ "$jwt_secret" != "$jwt_refresh_secret" ] || fail "JWT_SECRET and JWT_REFRESH_SECRET must be different."
[ "${COOKIE_SECURE:-}" = "true" ] || fail "COOKIE_SECURE must be true in production."
[ -n "${SMTP_HOST:-${SMTP_SERVICE:-}}" ] || fail "SMTP_HOST or SMTP_SERVICE is required because customer emails are required."
[ -n "${CORS_ORIGINS:-}" ] || fail "CORS_ORIGINS must not be empty."

if [ -z "${CDN_BASE_URL:-}" ]; then
  warn "CDN_BASE_URL is empty. Uploaded local images may not persist across stateless deployments."
fi

echo "✅ Pre-deploy checks passed."
