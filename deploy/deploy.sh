#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRANCH="${1:-main}"

log() { printf '\n==> %s\n' "$*"; }

cd "$ROOT"

if [ ! -f backend/.env ]; then
  echo "ERROR: backend/.env is missing. Copy backend/.env.production.example and fill it in." >&2
  exit 1
fi
if [ ! -f frontend-mwaminifu/.env.local ]; then
  echo "ERROR: frontend-mwaminifu/.env.local is missing. Copy .env.production.example and fill it in." >&2
  exit 1
fi

log "Updating source (branch: $BRANCH)"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

log "Backend: install, generate, migrate, build"
cd "$ROOT/backend"
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build

log "Frontend: install, build"
cd "$ROOT/frontend-mwaminifu"
npm ci
npm run build

log "Reloading PM2 processes"
cd "$ROOT"
mkdir -p logs
pm2 startOrReload deploy/ecosystem.config.js --update-env
pm2 save

log "Health check"
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS http://127.0.0.1:5000/health >/dev/null 2>&1; then
    echo "API healthy."
    break
  fi
  if [ "$attempt" -eq 10 ]; then
    echo "ERROR: API health check failed. Inspect: pm2 logs mwaminifu-api" >&2
    exit 1
  fi
  sleep 2
done

if curl -fsS -o /dev/null http://127.0.0.1:3000/login; then
  echo "Web healthy."
else
  echo "ERROR: frontend health check failed. Inspect: pm2 logs mwaminifu-web" >&2
  exit 1
fi

log "Deploy complete"
pm2 list
