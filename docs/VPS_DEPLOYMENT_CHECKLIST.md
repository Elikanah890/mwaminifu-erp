# Mwaminifu VPS Production Checklist

Automated helpers live in `deploy/` (`setup-vps.sh`, `deploy.sh`,
`ecosystem.config.js`, `nginx/mwaminifu.conf`). See `deploy/README.md` for the
Contabo runbook; this file is the pre-launch checklist.

## 1. Server baseline
- Ubuntu 22.04/24.04 LTS, non-root deploy user, SSH keys only, password login disabled.
- UFW: allow 22, 80, 443 only. Fail2ban enabled for SSH.
- Timezone UTC; automatic security updates enabled.
- Node.js 20 LTS, PostgreSQL 16, Nginx, PM2 (or systemd).
- Separate OS user (`mwaminifu`) for the app; no app process as root.

## 2. PostgreSQL
- Dedicated DB user and database; strong password.
- `pg_hba.conf` restricted to localhost/VPC.
- Daily `pg_dump` backup + weekly off-server copy; test restore monthly.
- Connection limit sized to PM2 instances (Prisma pool × processes).
- Run `npx prisma migrate deploy` before starting the new release.

## 3. Backend environment
Required:
- `NODE_ENV=production`
- `DATABASE_URL`
- `JWT_SECRET` (≥32 random chars, unique per environment)
- `CORS_ORIGIN=https://YOUR_DOMAIN`
- `TRUST_PROXY=1`
- `RESEND_API_KEY`, `EMAIL_FROM`, `FRONTEND_URL`
- Real SMS/FCM values, or `MOCK_SMS=false`
- `ALLOW_MOCK_MESSAGING` unset
- `RATE_LIMIT_RELAXED` unset

Never commit `.env`.

## 4. Frontend environment
- `BACKEND_API_URL=https://api.YOUR_DOMAIN/api/v1`
- `NEXT_PUBLIC_API_URL=https://api.YOUR_DOMAIN/api/v1`
- `JWT_SECRET` = same value as backend
- `NEXT_PUBLIC_APP_URL=https://YOUR_DOMAIN`

## 5. Build & release
```bash
bash deploy/deploy.sh main
```

That script runs, in order: `git pull`, `npm ci`, `prisma generate`,
`prisma migrate deploy`, backend build, frontend build, `pm2 startOrReload`,
then health checks on `/health` and `/login`.
Run `npm run lint` + `npx tsc --noEmit` and backend tests before release.

## 6. PM2 / systemd
- `pm2 start dist/server.js --name mwaminifu-api -i 2` (or systemd unit).
- `pm2 startup` + `pm2 save`.
- Frontend: `next start -p 3000` under PM2/systemd.
- Graceful shutdown: SIGTERM handled by backend (15s drain).
- Auto-restart on failure; logs to rotating files (max 5 files × 5MB already configured).

## 7. Nginx
- TLS via Certbot; HTTP → HTTPS redirect.
- Reverse proxy `/api/v1` → backend `127.0.0.1:5000`.
- Reverse proxy `/` → frontend `127.0.0.1:3000`.
- Set `X-Forwarded-For`, `X-Forwarded-Proto`, `Host`.
- `client_max_body_size` ≥ upload limit (currently 10 MB).
- Keep rate limiting at Nginx as an extra layer:
  `limit_req_zone $binary_remote_addr zone=mwaminifu:10m rate=20r/s;`
- If running more than one PM2 instance, use Nginx (or a Redis-backed limiter) for auth/API limits. Express rate-limit counters are per process.
- Security headers are set by the frontend (`next.config.ts`) and Helmet on the backend.

## 8. Domain / SSL
- A record for app and `api` subdomain.
- Certbot auto-renew timer enabled.
- HSTS enabled after confirming HTTPS works on all subdomains.

## 9. Health & monitoring
- `GET /health` for liveness.
- Uptime monitor for frontend + `/health`.
- Error tracking (Sentry or equivalent) for backend/frontend.
- Watch disk, memory, PostgreSQL connections, 5xx rate, and failed logins.
- Alert on `ACCOUNT_DISABLED`, rate-limit spikes, and repeated `PASSWORD_CHANGE_REQUIRED`.

## 10. Security gates before launch
- Rotate all seeded/demo credentials. Sign in as System Owner, open
  **Settings → Change Password**, and replace the seeded password immediately
  (the change revokes all sessions and returns you to the login screen).
- Confirm no `.env` or `logs/` files in git.
- `npm audit` reviewed; keep critical/high findings at zero.
- Verify `MOCK_SMS` is off and real email/SMS providers work.
- Confirm CORS only contains the production domain.
- Confirm CSP/HSTS response headers are present.
- Test 2-session System Owner cap and logout/revocation.
- Test offline sync with >500 changes (cursor safety).
- Test concurrent POS sale of the last stock unit and concurrent refund.

## 11. Backups & rollback
- Keep the previous release directory and DB dump.
- Deployment: migrate → start new process → health check → switch Nginx upstream.
- Rollback: stop new release, restore previous build, restore DB only if the migration was destructive (current migrations are additive).
