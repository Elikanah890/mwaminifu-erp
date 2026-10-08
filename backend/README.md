# Mwaminifu App - Backend API

Node.js + Express + TypeScript + Prisma backend for the Mwaminifu ERP system.

## Prerequisites

- Node.js 20 LTS
- PostgreSQL 15+
- npm 10+

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Generate Prisma client
npx prisma generate

# Push database schema (creates tables)
npx prisma db push --force-reset

# Seed database with test data
npm run prisma:seed

# Start development server
npm run dev
```

The server runs on `http://localhost:5000`.

## Test Credentials

| Role | Username/Phone | Password/PIN |
|------|---------------|--------------|
| System Owner | admin | admin123 |
| Agent | agent1 | agent123 |
| Business Owner | 255712345678 | 123456 |
| Employee 1 | 255712345691 | 123456 |
| Employee 2 | 255712345692 | 123456 |
| Employee 3 | 255712345693 | 123456 |

OTP for testing is always `123456`.

## API Documentation

### Base URL
`http://localhost:5000/api/v1`

### Auth Endpoints
- `POST /api/v1/auth/otp/request` - Request OTP
- `POST /api/v1/auth/otp/verify` - Verify OTP
- `POST /api/v1/auth/pin/set` - Set PIN (first login)
- `POST /api/v1/auth/login` - Login with phone + PIN
- `POST /api/v1/auth/employee/login` - Employee login
- `POST /api/v1/auth/admin/login` - Admin login
- `POST /api/v1/auth/refresh` - Refresh token
- `POST /api/v1/auth/logout` - Logout

### Shop Endpoints
- `GET /api/v1/shops` - List shops
- `POST /api/v1/shops` - Create shop
- `GET /api/v1/shops/:id` - Get shop
- `PUT /api/v1/shops/:id` - Update shop
- `GET /api/v1/shops/:id/dashboard` - Shop dashboard

### POS Endpoints
- `POST /api/v1/shops/:shopId/sales` - Create sale
- `GET /api/v1/shops/:shopId/sales` - List sales
- `GET /api/v1/sales/:id` - Get sale
- `PUT /api/v1/sales/:id/refund` - Refund sale
- `PUT /api/v1/sales/:id/void` - Void sale

### Inventory Endpoints
- `GET /api/v1/shops/:shopId/products` - List products
- `POST /api/v1/shops/:shopId/products` - Create product
- `PUT /api/v1/products/:id` - Update product
- `POST /api/v1/products/:id/adjust-stock` - Adjust stock

### Sync Endpoints
- `POST /api/v1/sync/push` - Upload local changes
- `GET /api/v1/sync/pull` - Download server changes

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build TypeScript to JavaScript |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run format` | Run Prettier |
| `npm run test` | Run tests |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:push` | Push schema to database |
| `npm run prisma:reset` | Reset database schema |
| `npm run prisma:seed` | Run seed script |
| `npm run prisma:studio` | Open Prisma Studio |

## Environment Variables

See `.env.example` for all available variables.
