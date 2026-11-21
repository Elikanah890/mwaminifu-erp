# Deploying Mwaminifu on a Contabo VPS

Single-domain layout:

```
Internet ──HTTPS──> Nginx (443)
                      ├── /            -> Next.js  (127.0.0.1:3000)
                      ├── /api/v1/*    -> Express  (127.0.0.1:5000)
                      └── /health      -> Express
                                          └── PostgreSQL (localhost:5432)
```

Only Nginx is exposed. The API and dashboard bind to localhost and are managed
by PM2.

## 1. Prerequisites

- Contabo VPS with Ubuntu 22.04 or 24.04 LTS (2 vCPU / 4 GB RAM minimum).
- Root or sudo access over SSH.
- A domain with an **A record** pointing to the VPS public IP
  (e.g. `mwaminifu.co.tz`). Add `www` if you want it.
- Ports 22, 80 and 443 open in the Contabo control panel firewall.

## 2. Base server setup

```bash
sudo bash deploy/setup-vps.sh
```

This installs Node.js 20, PostgreSQL, Nginx, Certbot, PM2, UFW and Fail2ban,
creates the `mwaminifu` OS user and prints a generated `DATABASE_URL`.

The script does **not** enable UFW automatically. After confirming your SSH
port:

```bash
sudo ufw allow 22/tcp && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw enable
```

## 3. Get the code

```bash
sudo -u mwaminifu git clone https://github.com/Elikanah890/mwaminifu-erp.git /var/www/mwaminifu
```

## 4. Environment files

```bash
cd /var/www/mwaminifu
sudo -u mwaminifu cp backend/.env.production.example backend/.env
sudo -u mwaminifu cp frontend-mwaminifu/.env.production.example frontend-mwaminifu/.env.local
```

Backend (`backend/.env`) — required values:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | printed by `setup-vps.sh` |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `CORS_ORIGIN` | `https://YOUR_DOMAIN` |
| `TRUST_PROXY` | `1` |
| `FRONTEND_URL` | `https://YOUR_DOMAIN` |
| `RESEND_API_KEY`, `EMAIL_FROM` | real transactional email |
| `SYSTEM_OWNER_EMAIL`, `SYSTEM_OWNER_PASSWORD` | first admin account |
| `MOCK_SMS`, `MOCK_FCM` | `false` for real launch |

Frontend (`frontend-mwaminifu/.env.local`) — required values:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://YOUR_DOMAIN` |
| `BACKEND_API_URL` | `https://YOUR_DOMAIN/api/v1` |
| `NEXT_PUBLIC_API_URL` | `https://YOUR_DOMAIN/api/v1` |
| `JWT_SECRET` | **exactly the same** as the backend |

> The dashboard sets `Secure` cookies in production, so the site must be
> reached over HTTPS. Logging in over plain HTTP will silently fail.

## 5. Nginx and TLS

```bash
sudo cp deploy/nginx/mwaminifu.conf /etc/nginx/sites-available/mwaminifu
sudo sed -i 's/YOUR_DOMAIN/your.real.domain/g' /etc/nginx/sites-available/mwaminifu
sudo ln -sf /etc/nginx/sites-available/mwaminifu /etc/nginx/sites-enabled/mwaminifu
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
```

Issue certificates (Nginx is listening on port 80 at this point):

```bash
sudo certbot --nginx -d your.real.domain
sudo systemctl reload nginx
```

Certbot installs a renewal timer automatically; verify with
`systemctl list-timers | grep certbot`.

## 6. First deploy

```bash
sudo -u mwaminifu bash /var/www/mwaminifu/deploy/deploy.sh main
```

This installs dependencies, runs `prisma migrate deploy`, builds both apps,
reloads PM2 and checks `/health`.

Seed the initial System Owner **once**:

```bash
cd /var/www/mwaminifu/backend
sudo -u mwaminifu npx prisma db seed
```

Then sign in at `https://YOUR_DOMAIN/login` with `SYSTEM_OWNER_EMAIL` /
`SYSTEM_OWNER_PASSWORD`, and immediately change the password under
**Settings → Change Password**.

## 7. Keep PM2 running after reboot

```bash
sudo -u mwaminifu pm2 startup systemd -u mwaminifu --hp /home/mwaminifu
sudo -u mwaminifu pm2 save
```

## 8. Updating the app

```bash
sudo -u mwaminifu bash /var/www/mwaminifu/deploy/deploy.sh main
```

`deploy.sh` refuses to run if either env file is missing, and fails if the
API or dashboard does not come back healthy.

## 9. Operations

```bash
pm2 status
pm2 logs mwaminifu-api --lines 100
pm2 logs mwaminifu-web --lines 100
curl -fsS https://YOUR_DOMAIN/health
```

Database backup (add to cron):

```bash
sudo -u postgres pg_dump mwaminifu_db | gzip > /var/backups/mwaminifu-$(date +%F).sql.gz
```

## 10. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Login succeeds then redirects back to `/login` | Site is on HTTP; cookies are `Secure`. Use HTTPS. |
| 401 on every dashboard page | Frontend `JWT_SECRET` differs from backend. Make them identical and rebuild. |
| 502 from Nginx | PM2 process down: `pm2 logs`, then `pm2 restart all`. |
| API 500 on startup | Check `backend/.env`; the server refuses to start with unsafe production config. |
| Emails not delivered | `RESEND_API_KEY` unset; emails are only printed to the log. |
| `prisma migrate deploy` fails | DB user lacks privileges or `DATABASE_URL` is wrong. |

See `docs/VPS_DEPLOYMENT_CHECKLIST.md` for the full production checklist.
