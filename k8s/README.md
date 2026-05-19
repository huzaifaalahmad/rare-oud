# Kubernetes Readiness

Recommended workloads: frontend, api, worker-all or dedicated workers, redis if unmanaged, migration job, and monitoring sidecars/exporters. Use rolling updates, readiness probes on `/api/health`, and separate secrets for JWT, refresh JWT, DB, Redis, S3, and metrics token.
