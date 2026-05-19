# Rare Oud Disaster Recovery Runbook

## Recovery Objectives
- RPO target: 15 minutes with managed MySQL snapshots/binlogs.
- RTO target: 60 minutes for API/database restore.

## Required Backup Schedule
1. MySQL snapshot every 6 hours.
2. Binlog/PITR enabled continuously.
3. Object storage versioning and lifecycle lock enabled.
4. Redis is treated as recoverable queue/cache data; BullMQ jobs must use retry/DLQ replay.

## Monthly Restore Drill
1. Provision isolated restore environment.
2. Restore latest database snapshot.
3. Apply binlogs to target timestamp.
4. Restore media/object-storage prefix to test bucket.
5. Start backend with `NODE_ENV=production` and `OTEL_ENABLED=true`.
6. Run `npm run healthcheck`, production smoke tests, and queue replay dry-run.
7. Record RTO/RPO, failed objects, and schema drift.

## Queue Recovery
- Inspect `/api/admin/system/queues`.
- Replay poison messages using `/api/admin/system/queues/:name/replay-dead-letter`.
- Confirm worker heartbeats in `worker_heartbeats`.

## Rollback
- Use blue-green deployment slot switch.
- Do not roll back database migrations without approved rollback SQL.
