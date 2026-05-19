# Enterprise Deployment Instructions

1. Rotate all credentials that were ever committed or shared.
2. Copy `backend/.env.production.example` to a secure secret store, not into git.
3. Provide secrets through Vault, Doppler, AWS Secrets Manager, Kubernetes secrets, CI variables, or `SECRETS_PROVIDER=file` with a mounted JSON file.
4. Required production variables include `NODE_ENV=production`, `COOKIE_SECURE=true`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `DB_*`, `CORS_ORIGINS`, `FRONTEND_URL`, `METRICS_TOKEN`, and `ADMIN_STEP_UP_SECRET`.
5. Run migrations from `database/migrations` against MySQL.
6. Enable Redis and BullMQ workers for email, notifications, media, and audit queues.
7. Enable ClamAV scanning with `ENABLE_UPLOAD_AV_SCAN=true` and install `clamscan` in the runtime image or sidecar.
8. Configure S3-compatible object storage and CDN for media.
9. Start with `docker compose -f docker-compose.prod.yml up -d --build`.
10. Verify `/api/health`, Prometheus scraping, queue workers, admin login, upload rejection/acceptance paths, and custom order flow.
11. Run backend tests, frontend tests, Playwright E2E/a11y tests, npm audit, secret scan, and Lighthouse before public DNS cutover.
