# Rare Oud v15 Production Release

Rare Oud is a production-ready luxury oud storefront and administration platform. The final codebase contains one active version with React, Node.js, Express, MySQL, Redis queues, hardened uploads, admin RBAC, monitoring assets, Docker deployment files, and release validation scripts.

## Project Structure

```txt
backend/     Express API, auth, RBAC, uploads, queues, workers, tests
frontend/    React storefront, admin dashboard, accessibility and E2E tests
database/    MySQL schema and governed migrations
docs/        Deployment, security, monitoring, disaster recovery, QA docs
infra/       Terraform readiness notes
k8s/         Kubernetes deployment starter
monitoring/  Prometheus, Grafana, Loki, OpenTelemetry configs
scripts/     Validation and release safety scripts
tests/       Root smoke, load, and visual validation entry points
```

## Local Validation

```bash
cd backend
npm install
npm test -- --runInBand
npm run validate

cd ../frontend
npm install
npm test
npm run build
npm run test:e2e -- --reporter=line
npm run test:a11y -- --reporter=line
npm run test:motion -- --reporter=line
```

## Production Setup

1. Copy `backend/.env.production.example` into the production secret store.
2. Set unique 64+ character values for `JWT_SECRET` and `JWT_REFRESH_SECRET`.
3. Set `COOKIE_SECURE=true`, strict `CORS_ORIGINS`, and the public `FRONTEND_URL`.
4. Set frontend `VITE_API_URL` to the deployed API URL.
5. Configure MySQL, Redis, SMTP, object storage, ClamAV, and observability endpoints.
6. Run `backend/scripts/migrate.js` against staging before production.
7. Start the API, workers, frontend, and monitoring stack through `docker-compose.prod.yml` or equivalent orchestration.

## Release Commands

```bash
node scripts/secret-scan.js
node scripts/validate-project.js

cd backend
npm run healthcheck
npm run worker:all

cd ../frontend
npm run build
npm run preview
```

## Documentation

- Deployment: `docs/DEPLOYMENT_PRODUCTION.md`
- Security: `docs/SECURITY_HARDENING.md`
- Monitoring: `docs/MONITORING_SETUP.md`
- Disaster recovery: `docs/DISASTER_RECOVERY.md`
- QA checklist: `docs/QA_CHECKLIST.md`
- Final cleanup report: `docs/reports/FINAL_RELEASE_CLEANUP_2026_05_14.md`

## Release Status

This repository is consolidated to a single production source version. Generated dependency folders, old release reports, old archives, logs, coverage, Playwright artifacts, and build outputs are excluded from the final clean ZIP.
