# Mwaminifu ERP

Monorepo for the Mwaminifu ERP platform:

| Package | Path | Stack |
|---------|------|-------|
| Backend API | `backend/` | Node.js, Express, TypeScript, Prisma, PostgreSQL |
| Admin / Owner dashboard | `frontend-mwaminifu/` | Next.js 16 (App Router), React |
| Mobile app | `mobile/` | Flutter |

---

## 1. Secrets & environment variables

**Never commit real credentials.** All `.env` / `.env.*` files are ignored by
Git (see `.gitignore`). Only `.env.example` templates (placeholders) are
tracked.

### Required environment variables

**Backend (`backend/.env.example`)**

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `development` / `production` |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Random 256-bit (>=32 char) secret |
| `JWT_ACCESS_EXPIRY` / `JWT_REFRESH_EXPIRY` | Token lifetimes |
| `MOCK_SMS` | `true` **only** in development. Startup fails if `true` in production. |
| `MOCK_FCM` | `true` **only** in development. Startup fails if `true` in production. |
| `SMS_PROVIDER` | `mock` / `beem` / `http` — real gateway used in production |
| `SMS_API_KEY`, `SMS_API_SECRET`, `SMS_SENDER_ID`, `SMS_API_URL` | Gateway credentials |
| `FCM_SERVER_KEY` | Firebase Cloud Messaging server key |
| `CORS_ORIGIN` | Comma-separated allowed origins |
| `TRUST_PROXY` | Reverse-proxy hops (e.g. `1` on Render) |

**Frontend (`frontend-mwaminifu/.env.example`)**

| Variable | Description |
|----------|-------------|
| `BACKEND_API_URL` | Backend API base URL (server-side only) |
| `NEXT_PUBLIC_API_URL` | Public API URL (compatibility only) |
| `JWT_SECRET` | Must match backend `JWT_SECRET`; used server-side to verify sessions |

### Setting env vars on the platform (do **not** use committed files)

- **Vercel (frontend):** Project → Settings → Environment Variables → add each
  variable for Production/Preview/Development. Redeploy after changes.
- **Render (backend + database):** Dashboard → your service → Environment →
  add each variable. For the database use the Render Postgres *Internal
  Database URL* and store it as `DATABASE_URL`.
- **Local development:** `cp .env.example .env` and fill in local values.

### Rotating the database credentials

1. In the PostgreSQL provider (Render / RDS / etc.) rotate/reset the DB user
   password.
2. Update `DATABASE_URL` in the backend platform environment and redeploy.
3. If the old connection string was ever committed, treat it as compromised and
   rotate immediately — see the secret-scan step below.

### Verifying no secrets are committed

```bash
# Scan the working tree for likely secrets (run from repo root)
grep -rInE "(JWT_SECRET|DATABASE_URL|API_KEY|SECRET|PASSWORD)=" . \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.dart_tool \
  --exclude-dir=build --include="*.ts" --include="*.tsx" --include="*.js" \
  --include="*.dart" --include="*.json" --include="*.yml" --include="*.yaml"
```

Only `.env.example` placeholders should appear. If `.env` was ever committed,
remove it from history:

```bash
git rm --cached backend/.env frontend-mwaminifu/.env.local
git commit -m "chore: stop tracking env files"
# For full history removal use git-filter-repo / BFG, then rotate the secrets.
```

> This working copy is **not yet a Git repository**. Before pushing to a remote,
> run `git init` and confirm `git status` shows no `.env` files (the root
> `.gitignore` excludes them).

---

## 2. Subscriptions

Shop subscriptions are enforced by the backend (`requireActiveSubscription`):

- **Active / within 5-day grace** → full access.
- **Past grace** → read-only (all writes return `402 Payment Required`).
- System Owner and Agent are never blocked.
- Status: `GET /api/v1/subscriptions/status`.

---

## 3. CI/CD (GitHub Actions)

Workflows live in `.github/workflows/`:

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | Every PR, and pushes to `develop` / `main` | Backend lint + tests (with coverage thresholds) + build; frontend lint + typecheck + build; Flutter analyze + test. **Blocks merge on failure.** |
| `deploy-staging.yml` | Push to `develop` (or manual) | Triggers the Render (backend) and Vercel (frontend) **staging** deploy hooks. |
| `deploy-production.yml` | Manual (`workflow_dispatch`) | Gated production release; requires typing `deploy` and approval of the `production` environment. |

### Required repository secrets

Set these under **Settings → Secrets and variables → Actions**:

| Secret | Used by |
|--------|---------|
| `RENDER_STAGING_DEPLOY_HOOK` | Staging backend |
| `VERCEL_STAGING_DEPLOY_HOOK` | Staging frontend |
| `RENDER_PRODUCTION_DEPLOY_HOOK` | Production backend |
| `VERCEL_PRODUCTION_DEPLOY_HOOK` | Production frontend |

Create the Deploy Hooks in Render (Service → Settings → Deploy Hook) and Vercel
(Project → Settings → Git → Deploy Hooks). Runtime secrets (DB, JWT, SMS) are
configured on the platform, **not** in GitHub.

### Test coverage

Backend `npm run test:coverage` enforces minimum coverage on the critical paths
(auth, sales, sync, subscriptions, employees, permission middleware) and fails
the build if thresholds are not met.

---

## 4. Quick start

```bash
# Backend
cd backend && npm install && cp .env.example .env
npx prisma generate && npx prisma db push && npm run prisma:seed
npm run dev            # http://localhost:5000

# Frontend
cd frontend-mwaminifu && npm install && cp .env.example .env.local
npm run dev            # http://localhost:3000
```
