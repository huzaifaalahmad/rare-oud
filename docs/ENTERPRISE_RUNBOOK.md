# Rare Oud Enterprise Runbook

## Services
- `backend`: Express API.
- `worker-email`: BullMQ email worker with rate limiting and exponential retries.
- `worker-notification`: in-app/admin notification worker.
- `worker-audit`: audit log writer.
- `redis`: queue, cache, hot query, and session support.
- `mysql`: primary SQL database.
- `prometheus` and `grafana`: optional monitoring profile.

## Commands
```bash
cd backend && npm install && npm run validate && npm test
cd frontend && npm install && npm run build && npm test

docker compose up --build
NODE_ENV=production docker compose -f docker-compose.prod.yml --profile monitoring up --build -d
```

## Required production controls
- Use 64+ byte independent JWT secrets.
- Set `COOKIE_SECURE=true` behind HTTPS.
- Configure `CORS_ORIGINS`, `FRONTEND_URL`, `CDN_BASE_URL`, `S3_*`, `SMTP_*`, `REDIS_URL`, and `METRICS_TOKEN`.
- Enable upload AV scanning with ClamAV or an equivalent scanner.
- Back up MySQL and Redis append-only files.
- Rotate secrets at least quarterly and immediately after staff changes.

## Rollback
1. Keep previous image tags for backend, workers, and frontend.
2. Deploy DB migrations only after backups.
3. Roll back app containers first.
4. Roll back DB only from a verified backup if schema downgrade is required.

## Queue recovery
- Admin dashboard: `/admin` > System Health > retry failed jobs.
- API: `POST /api/admin/system/queues/:name/retry-failed`.
