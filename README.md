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

### Setting env vars (do **not** use committed files)

- **Contabo / VPS (production):** copy `backend/.env.production.example` to
  `backend/.env` and `frontend-mwaminifu/.env.production.example` to
  `frontend-mwaminifu/.env.local`, then fill in real values. See
  `deploy/README.md` for the full runbook.
- **Local development:** `cp .env.example .env` and fill in local values.

### Rotating the database credentials

1. On the PostgreSQL server (or managed provider) rotate/reset the DB user
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

> This repository is already connected to
> `github.com/Elikanah890/mwaminifu-erp`. Before committing, confirm
> `git status` shows no `.env` files (the root `.gitignore` excludes them).

---

## 2. Subscriptions

Shop subscriptions are enforced by the backend (`requireActiveSubscription`):

- **Active / within 5-day grace** → full access.
- **Past grace** → read-only (all writes return `402 Payment Required`).
- System Owner and Agent are never blocked.
- Status: `GET /api/v1/subscriptions/status`.

---

## 3. Git & collaboration workflow

### Branch strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code. Protected. Only receives merges from `develop` (release) or hotfixes. |
| `develop` | Integration branch. Auto-deploys to **staging**. |
| `feature/<ticket>-<short-desc>` | New features, branched from `develop`. |
| `bugfix/<ticket>-<short-desc>` | Non-urgent fixes, branched from `develop`. |
| `hotfix/<ticket>-<short-desc>` | Urgent production fixes, branched from `main`; merged to both `main` and `develop`. |

Examples: `feature/POS-142-offline-customers`, `bugfix/POS-151-csv-export`, `hotfix/POS-160-login-loop`.

### Pull request process

1. Branch from `develop` (`git checkout develop && git pull && git checkout -b feature/...`).
2. Commit in small, focused units; keep the tree building.
3. Push and open a PR **into `develop`**. PRs into `main` come only from `develop` (release) or a hotfix branch.
4. CI (`.github/workflows/ci.yml`) must be green — backend lint + tests with coverage, frontend lint + typecheck + build, Flutter analyze + test. **A failing check blocks merge.**
5. Require at least **1 approving review**; resolve all conversations.
6. Use squash-merge for features/bugfixes; keep a merge commit for `develop → main` releases.
7. Delete the branch after merge.

### Commit message conventions (Conventional Commits)

```
<type>(<scope>): <short summary>

[optional body]

[optional footer: BREAKING CHANGE / Refs #123]
```

Allowed types: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `chore`, `build`, `ci`, `style`, `revert`.
Example: `fix(auth): block OTP brute-force after 5 attempts`.

### Releasing

- Merge `develop → main` (PR) to release; then run the **Deploy Production** workflow (manual, gated).
- Tag releases: `git tag -a v1.0.0 -m "Release v1.0.0" && git push origin v1.0.0`.

### Connecting a remote (GitHub)

```bash
# Create a PRIVATE repo (replace <org>/<name>), then:
git remote add origin git@github.com:<org>/mwaminifu_app.git
git push -u origin main
git push -u origin develop
# Protect main/develop in Settings → Branches (require PR + status checks).
```

---

## 4. CI/CD (GitHub Actions)

Workflows live in `.github/workflows/`:

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | Every PR, and pushes to `develop` / `main` | Backend lint + tests (with coverage thresholds) + build; frontend lint + typecheck + build; Flutter analyze + test. **Blocks merge on failure.** |

> **Vercel and Render are not supported.** Production runs on the Contabo VPS
> only. `vercel.json` disables automatic PaaS deployments, and the middleware
> redirects any `*.vercel.app` / `*.onrender.com` host to the canonical domain.

### Deployment (Contabo VPS)

Hosting is done on a VPS with Nginx + PM2, not on a PaaS. Everything needed
lives in `deploy/`:

| File | Purpose |
|------|---------|
| `deploy/setup-vps.sh` | Installs Node 20, PostgreSQL, Nginx, Certbot, PM2 and creates the DB |
| `deploy/nginx/mwaminifu.conf` | Nginx site: `/` → Next.js, `/api/v1` → API, HTTPS |
| `deploy/ecosystem.config.js` | PM2 processes for API and dashboard |
| `deploy/deploy.sh` | Pull, install, migrate, build, reload, health check |
| `deploy/README.md` | Step-by-step Contabo runbook |

Runtime secrets (DB, JWT, SMS, email) live in `backend/.env` and
`frontend-mwaminifu/.env.local` on the server, **never** in GitHub.

### Test coverage

Backend `npm run test:coverage` enforces minimum coverage on the critical paths
(auth, sales, sync, subscriptions, employees, permission middleware) and fails
the build if thresholds are not met.

---

## 5. Quick start

```bash
# Backend
cd backend && npm install && cp .env.example .env
npx prisma generate && npx prisma db push && npm run prisma:seed
npm run dev            # http://localhost:5000

# Frontend
cd frontend-mwaminifu && npm install && cp .env.example .env.local
npm run dev            # http://localhost:3000
```
