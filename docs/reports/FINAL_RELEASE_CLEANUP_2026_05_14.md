# Rare Oud v15 Final Release Cleanup Report

Date: 2026-05-14

## Final Version Kept

- Active backend: `backend/server.js`, controllers, routes, services, queues, workers, middleware, tests, upload hardening, RBAC, audit logging, metrics, and OpenTelemetry bootstrap.
- Active frontend: Vite React storefront, admin dashboard, RTL/LTR, dark/light mode, reviews, favorites, notifications, custom orders, direct product requests, accessibility checks, and route-level lazy loading.
- Active infrastructure: Docker Compose, production Compose, Kubernetes starter, Terraform readiness notes, Prometheus, Grafana, Loki, OpenTelemetry configs, disaster recovery docs, deployment docs, and QA docs.
- Active data layer: `database/schema.sql` and governed migration history.

## Removed

- Old top-level phase/version reports: v5, v9, v11, v13, v14, phase notes, release notes, and legacy remediation summaries.
- Old report set under `docs/reports`; replaced with this final cleanup report.
- Empty or obsolete folders: `deployment`, `frontend/public/fonts`, empty upload runtime folders, generated logs, and generated frontend build output.
- Obsolete notes: `backend/scripts_cleanup_uploads_note.txt`.
- Duplicate production README: `README_PRODUCTION.md`; consolidated into `README.md` and production docs.
- Legacy media queue placeholder: `backend/jobs/mediaJob.js`, `backend/queues/mediaQueue.js`, `backend/workers/mediaWorker.js`, compose worker entry, package script, and related queue exports/tests.
- Legacy cart/payment system that did not match final schema: backend cart/payment controllers/routes/payment gateway, frontend cart/checkout pages/context, admin payment tab/component, and navigation cart entry.
- Demo product seeding: `backend/seeders/seedData.js` now seeds only baseline categories and site settings.

## Dependency Cleanup

Backend packages removed:

- `@opentelemetry/core`
- `@sentry/profiling-node`
- `glob`
- `slugify`
- `uuid`
- `playwright`
- `supertest`

Frontend packages removed:

- `@testing-library/jest-dom`
- `@testing-library/react`

## Critical Fixes Applied

- Synced frontend auth token state with the API token store on boot, login, registration, logout, and refresh failure.
- Fixed admin guard loading state and language key usage.
- Aligned frontend admin navigation with the centralized `isAdmin` session rule.
- Fixed 404 page language handling.
- Removed duplicate font import.
- Updated project validation to require the consolidated production docs instead of the removed duplicate README.

## Validation Results

- Backend install: `npm install --no-audit --no-fund --loglevel=error` passed.
- Frontend install: `npm install --no-audit --no-fund --loglevel=error` passed.
- Backend tests: `npm test -- --runInBand` passed, 5 suites / 10 tests.
- Frontend tests: `npm test` passed, 2 files / 2 tests.
- Project validation: `node scripts/validate-project.js` passed.
- Secret scan: `node scripts/secret-scan.js` passed.
- Frontend production build: `npm run build` passed.
- Playwright E2E: `npm run test:e2e -- --reporter=line` passed.
- Playwright accessibility smoke: `npm run test:a11y -- --reporter=line` passed.
- Playwright reduced-motion check: `npm run test:motion -- --reporter=line` passed.
- Backend startup: API started on a temporary local port with Redis disabled and returned HTTP 200 for `/api/metrics`.
- Worker startup: `workers/allWorkers.js` loaded successfully with Redis disabled and cleanly skipped Redis-backed workers.
- Frontend startup: `npm run preview -- --host 127.0.0.1 --port 5520` returned HTTP 200.
- Docker/Kubernetes/monitoring config syntax: YAML parsed successfully for compose, production compose, Kubernetes, Prometheus, Loki, and OpenTelemetry configs.
- Dependency audit: backend and frontend `npm audit --audit-level=moderate` both found 0 vulnerabilities.

## Remaining Risks

- Docker CLI is not installed on this workstation, so `docker compose config` and container startup were not executed here.
- MySQL, Redis, ClamAV, object storage, SMTP, and production domains were not available locally; full integration health must be run in staging with real services.
- `k6` and `lighthouse` CLIs are not installed locally; load and Lighthouse runs should be executed in staging using `tests/load` and the deployed frontend URL.

## Final Packaging

The final ZIP excludes `node_modules`, build output, coverage output, logs, Playwright artifacts, caches, old archives, and temporary files. Dependencies are restored with `npm install` or `npm ci` from the retained lockfiles.
