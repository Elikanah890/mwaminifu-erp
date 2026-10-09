# Mwaminifu — Free-VPS Deployment (client testing)

Minimal, secure-enough setup: Postgres + backend (Express/Prisma) + frontend
(Next.js) behind nginx with HTTPS and optional HTTP Basic Auth.

> Farmlink is a separate project and is **not** part of this deployment.

## 1. Production environment

Backend: copy `backend/.env.production.example` → `backend/.env` and fill in.
Key values:

```
NODE_ENV=production
DATABASE_URL="postgresql://mwaminifu_user:STRONG@localhost:5432/mwaminifu_db?schema=public"
JWT_SECRET="$(openssl rand -hex 32)"
CORS_ORIGIN="https://YOUR_DOMAIN"
TRUST_PROXY=1
LOG_LEVEL=info
MOCK_SMS=true            # free testing (OTP always 123456)
MOCK_FCM=true
ALLOW_MOCK_MESSAGING=true # required to run mocked channels under NODE_ENV=production
```

Frontend: copy `frontend-mwaminifu/.env.production.example` → `.env.local`.
`JWT_SECRET` must match the backend.

## 2. Build & run

```bash
# Backend
cd backend
npm ci
npx prisma generate
npx prisma migrate deploy        # or: npx prisma db push
npm run build
node dist/server.js              # listens on 0.0.0.0:5000

# Frontend
cd ../frontend-mwaminifu
npm ci
npm run build
npx next start -p 3000
```

Use systemd (or pm2) to keep both alive:

```ini
# /etc/systemd/system/mwaminifu-api.service
[Unit]
Description=Mwaminifu API
After=network.target postgresql.service
[Service]
WorkingDirectory=/opt/mwaminifu/backend
EnvironmentFile=/opt/mwaminifu/backend/.env
ExecStart=/usr/bin/node dist/server.js
Restart=always
User=mwaminifu
[Install]
WantedBy=multi-user.target
```

## 3. Nginx + HTTPS (Certbot)

```nginx
# /etc/nginx/sites-available/mwaminifu.conf
limit_req_zone $binary_remote_addr zone=mwaminifu:10m rate=20r/s;

server {
    listen 80;
    server_name YOUR_DOMAIN;
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 301 https://$host$request_uri; }
}

server {
    listen 443 ssl http2;
    server_name YOUR_DOMAIN;

    ssl_certificate     /etc/letsencrypt/live/YOUR_DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/YOUR_DOMAIN/privkey.pem;

    limit_req zone=mwaminifu burst=40 nodelay;

    # --- Optional: HTTP Basic Auth gate in front of the whole app ---
    auth_basic           "Mwaminifu (testers only)";
    auth_basic_user_file /etc/nginx/.htpasswd;

    # Frontend (Next.js)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/v1/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend health check
    location = /health {
        proxy_pass http://127.0.0.1:5000/health;
        proxy_set_header Host $host;
    }
}
```

Basic Auth users (delete before public launch):

```bash
sudo apt-get install -y apache2-utils
sudo htpasswd -c /etc/nginx/.htpasswd tester1
sudo htpasswd    /etc/nginx/.htpasswd tester2
```

Free SSL with Certbot:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d YOUR_DOMAIN --redirect -m you@example.com --agree-tos
sudo systemctl enable --now certbot.timer   # auto-renew
```

Then enable the site and reload:

```bash
sudo ln -s /etc/nginx/sites-available/mwaminifu.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 4. Verify

```bash
curl -s https://YOUR_DOMAIN/health          # {"status":"ok",...} (proxied to :5000/health)
curl -s http://127.0.0.1:5000/health
```

- Logs: `backend/logs/access.log`, `backend/logs/error.log`.
- Rate limits: login (5 / 15 min), OTP (3 / phone / hour), general (100 / min), writes (60 / min).

## 5. Seed demo data (optional)

```bash
cd backend
SEED_ALLOW_PRODUCTION=true npx prisma db seed   # WIPES existing data — test server only
```

See `TESTING.md` for the client test accounts and checklist.
