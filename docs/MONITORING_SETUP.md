# Monitoring Setup

1. Set `METRICS_TOKEN` in the API environment.
2. Configure Prometheus to scrape `/api/metrics` with `Authorization: Bearer <METRICS_TOKEN>`.
3. Import Grafana dashboards for API latency, HTTP errors, Redis health, queue failures, CPU, memory, and slow queries.
4. Configure alert manager routes to PagerDuty/Opsgenie via environment-specific receivers.
5. Keep Loki or an equivalent log backend attached to container stdout/stderr; do not persist application logs in git.
