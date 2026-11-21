#!/usr/bin/env bash
set -euo pipefail

APP_USER="${APP_USER:-mwaminifu}"
APP_DIR="${APP_DIR:-/var/www/mwaminifu}"
DB_NAME="${DB_NAME:-mwaminifu_db}"
DB_USER="${DB_USER:-mwaminifu_user}"

log() { printf '\n==> %s\n' "$*"; }

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this script with sudo." >&2
  exit 1
fi

log "Installing base packages"
apt-get update
apt-get install -y curl ca-certificates gnupg git ufw fail2ban nginx postgresql certbot python3-certbot-nginx

log "Adding Node.js 20 repository"
install -d -m 0755 /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
  | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" \
  > /etc/apt/sources.list.d/nodesource.list
apt-get update
apt-get install -y nodejs

log "Installing PM2"
npm install -g pm2

log "Creating application user and directory"
if ! id "$APP_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$APP_USER"
fi
mkdir -p "$APP_DIR"
chown -R "$APP_USER":"$APP_USER" "$APP_DIR"

log "Preparing PostgreSQL"
systemctl enable --now postgresql

if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1; then
  echo "Database role ${DB_USER} already exists — leaving its password unchanged."
  echo "If you need a new password, run: sudo -u postgres psql -c \"ALTER USER ${DB_USER} WITH PASSWORD 'NEW_PASSWORD';\""
else
  DB_PASS="$(openssl rand -hex 24)"
  sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
SQL
  echo
  echo "Store this in backend/.env as DATABASE_URL:"
  echo "postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}?schema=public"
fi

log "Firewall and SSH hardening (review before enabling)"
echo "UFW is installed but NOT enabled. Confirm your SSH port first, then run:"
echo "  ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw enable"
echo "Enable fail2ban: systemctl enable --now fail2ban"

log "Next steps"
cat <<EOF
1. Clone the repo as ${APP_USER}:
   sudo -u ${APP_USER} git clone https://github.com/Elikanah890/mwaminifu-erp.git ${APP_DIR}
2. Copy env templates and fill real values:
   sudo -u ${APP_USER} cp ${APP_DIR}/backend/.env.production.example ${APP_DIR}/backend/.env
   sudo -u ${APP_USER} cp ${APP_DIR}/frontend-mwaminifu/.env.production.example ${APP_DIR}/frontend-mwaminifu/.env.local
3. Install the Nginx site:
   sudo cp ${APP_DIR}/deploy/nginx/mwaminifu.conf /etc/nginx/sites-available/mwaminifu
   sudo ln -sf /etc/nginx/sites-available/mwaminifu /etc/nginx/sites-enabled/mwaminifu
   sudo rm -f /etc/nginx/sites-enabled/default
4. Issue TLS certificates:
   sudo certbot --nginx -d YOUR_DOMAIN
5. Deploy:
   sudo -u ${APP_USER} bash ${APP_DIR}/deploy/deploy.sh main
6. Seed the first System Owner (once):
   cd ${APP_DIR}/backend && sudo -u ${APP_USER} npx prisma db seed
7. Start PM2 on boot:
   sudo -u ${APP_USER} pm2 startup systemd -u ${APP_USER} --hp /home/${APP_USER}
   sudo -u ${APP_USER} pm2 save
EOF
