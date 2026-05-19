# Production Deployment Guide

## Frontend on Vercel

- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Env:
  - `VITE_API_URL=https://api.yourdomain.com/api`
  - `VITE_BACKEND_URL=https://api.yourdomain.com`

## Backend on VPS/Render/Railway

Use Node 20+ and MySQL 8+.

Required backend env:

```env
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://yourdomain.com
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
DB_HOST=...
DB_PORT=3306
DB_USER=...
DB_PASSWORD=...
DB_NAME=rare_oud
JWT_SECRET=<64+ random chars>
JWT_REFRESH_SECRET=<different 64+ random chars>
COOKIE_SECURE=true
CDN_BASE_URL=https://cdn.yourdomain.com
```

## HTTPS assumptions

- Terminate TLS at Nginx/Caddy/Cloudflare/Render/Vercel.
- Keep `COOKIE_SECURE=true` in production.
- Redirect HTTP to HTTPS.

## Backups

- Daily MySQL dump.
- Daily upload folder/object-storage backup.
- Test restore once before launch.

## Image/CDN pipeline

- Local XAMPP: backend stores `/backend/uploads/products`.
- Production: replace local storage with S3-compatible storage or mount persistent volume.
- Serve optimized image variants via CDN when traffic grows.
