# Security CI

Recommended CI gates:

```bash
cd backend && npm ci && npm run security:audit && npm test
cd frontend && npm ci && npm run security:audit && npm run build && npm test
node scripts/validate-project.js
```

Additional production scans:
- Container image scan with Trivy/Grype.
- SAST for server-side JavaScript.
- Dependency update automation.
- Upload malware scanner healthcheck.
- Manual authorization/IDOR test pass before each major release.
