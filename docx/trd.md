
---
## Table of Contents

1. Introduction  
2. System Architecture Overview  
3. Technology Stack (Locked)  
4. Backend Architecture  
5. Database Schema Overview  
6. API Design  
7. Authentication & Authorization  
8. Offline Sync Architecture  
9. Push Notifications  
10. SMS Gateway Integration  
11. File Storage  
12. Admin Dashboard Architecture  
13. Mobile App Architecture  
14. Security  
15. Deployment Strategy  
16. Performance Considerations  
17. Monitoring & Logging  
18. Testing Strategy  
19. Version Control & CI/CD  
20. Development Environment Setup  

---

## 1. Introduction

### 1.1 Purpose
This Technical Requirements Document (TRD) translates the product requirements (PRD) into a concrete technical specification. It defines the system architecture, technology stack, data models, API contracts, synchronization logic, security measures, and deployment procedures for Mwaminifu App Version 1.

This document is intended for developers, architects, DevOps engineers, and technical stakeholders. It serves as the blueprint for implementation and ensures that all technical decisions are aligned with the product vision.

### 1.2 Scope
The TRD covers:
- End‑to‑end system architecture.
- All backend services and their responsibilities.
- Mobile app architecture (Flutter).
- Admin dashboard architecture (Next.js).
- Database design (PostgreSQL).
- Offline sync mechanism.
- Authentication and authorisation.
- Integration with third‑party services (SMS, notifications, storage).
- Deployment and hosting.
- Security and performance guidelines.

### 1.3 References
- 01_PRD.docx – Product Requirements Document.
- 03_DATABASE.docx (to be produced).
- 04_UIUX.docx (to be produced).
- 05_APP_FLOW.docx (to be produced).
- 06_BACKEND_SCHEMA.docx (to be produced).

---

## 2. System Architecture Overview

### 2.1 High‑Level Architecture Diagram

```
                    ┌───────────────────────┐
                    │     Flutter Mobile    │
                    │   (Business Owner &   │
                    │      Employee)        │
                    └───────────┬───────────┘
                                │ HTTPS / WebSocket
                                ▼
                    ┌───────────────────────┐
                    │   Admin Web Dashboard │
                    │    (Next.js / React)  │
                    └───────────┬───────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │  Node.js Backend API  │
                    │  (Express.js / TypeScript)│
                    └───────────┬───────────┘
                                │
         ┌──────────────────────┼──────────────────────┐
         │                      │                      │
         ▼                      ▼                      ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   PostgreSQL    │  │  Supabase       │  │  Firebase Cloud │
│   (Supabase)    │  │  Storage        │  │  Messaging      │
│   - Primary DB  │  │  - Images       │  │  - Push Notif.  │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │
         ▼
┌─────────────────┐
│  SMS Gateway    │
│ (Tanzanian      │
│  Provider)      │
└─────────────────┘
```

### 2.2 Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| **Flutter Mobile App** | UI rendering, offline data storage (Drift SQLite), local business logic, background sync, camera (future), barcode (future). |
| **Next.js Admin Dashboard** | Web interface for System Owner and Agents; user management, system monitoring, onboarding. |
| **Node.js Backend (Express)** | RESTful API, business logic orchestration, authentication, validation, database operations, sync endpoints, SMS dispatching, push notifications, file upload handling. |
| **PostgreSQL (Supabase)** | Primary relational database; stores all business data, user accounts, transactions, sync metadata. |
| **Supabase Storage** | Stores product images, shop logos, expense receipts, and other binary assets. |
| **Firebase Cloud Messaging** | Sends push notifications for low stock, sync completion, reminders. |
| **SMS Gateway** | Sends OTPs, invitation messages, and customer communication. |

### 2.3 Data Flow
- **Online flow:** App → Backend → DB → Response → App.
- **Offline flow:** App → Local SQLite → (later) Sync queue → Backend when online.
- **Sync flow:** Backend exposes `/sync/pull` and `/sync/push` endpoints. The client sends local changes (with timestamps) and receives incremental updates.

---

## 3. Technology Stack (Locked)

| Layer | Technology | Version | Rationale |
|-------|------------|---------|-----------|
| **Mobile Framework** | Flutter | 3.22+ | Cross‑platform, fast UI, strong offline support. |
| **Mobile State Management** | BLoC / Cubit | 8.0+ | Predictable state; excellent for complex business logic. |
| **Local Database** | Drift (SQLite) | 2.0+ | Type‑safe, reactive, Flutter‑first ORM. |
| **Backend Runtime** | Node.js | 20.x LTS | High performance, large ecosystem. |
| **Backend Framework** | Express.js | 4.18+ | Lightweight, flexible, middleware support. |
| **Language** | TypeScript | 5.0+ | Static typing for maintainability. |
| **ORM** | Prisma | 5.0+ | Type‑safe queries, migrations, excellent PostgreSQL support. |
| **Primary Database** | PostgreSQL | 15+ | Robust, ACID compliant, JSON support, great with Prisma. |
| **Database Hosting** | Supabase PostgreSQL | – | Managed, built‑in backups, easy scaling. |
| **Authentication** | JWT + bcrypt | – | Stateless, scalable, secure. |
| **Push Notifications** | Firebase Cloud Messaging (FCM) | – | Reliable, cross‑platform, free tier. |
| **SMS Gateway** | Tanzanian Provider (e.g., Africa’s Talking, MobTech, or custom) | – | Local rates, reliable delivery. |
| **File Storage** | Supabase Storage (S3‑compatible) | – | Integrated with PostgreSQL, simple SDK. |
| **Admin Dashboard** | Next.js | 14+ | React framework with SSR/SSG, SEO, and API routes. |
| **Dashboard UI** | Tailwind CSS + shadcn/ui | – | Rapid, customisable UI. |
| **Hosting (Backend)** | Render | – | Free tier, auto‑deploy, easy environment variables. |
| **Hosting (Dashboard)** | Render / Vercel | – | Vercel for Next.js recommended. |
| **Version Control** | Git + GitHub | – | Standard. |
| **CI/CD** | GitHub Actions | – | Automated testing and deployment. |

---

## 4. Backend Architecture

### 4.1 Folder Structure (Node.js / Express / TypeScript)

```
backend/
├── src/
│   ├── config/              # Configuration files (env, DB, logging)
│   ├── controllers/         # Request handlers (route logic)
│   │   ├── auth.controller.ts
│   │   ├── shop.controller.ts
│   │   ├── sale.controller.ts
│   │   ├── inventory.controller.ts
│   │   ├── employee.controller.ts
│   │   ├── customer.controller.ts
│   │   ├── expense.controller.ts
│   │   ├── loan.controller.ts
│   │   ├── report.controller.ts
│   │   ├── sync.controller.ts
│   │   ├── notification.controller.ts
│   │   └── ...
│   ├── services/            # Business logic layer
│   │   ├── auth.service.ts
│   │   ├── shop.service.ts
│   │   ├── sale.service.ts
│   │   ├── inventory.service.ts
│   │   ├── employee.service.ts
│   │   ├── customer.service.ts
│   │   ├── expense.service.ts
│   │   ├── loan.service.ts
│   │   ├── report.service.ts
│   │   ├── sync.service.ts
│   │   ├── sms.service.ts
│   │   ├── notification.service.ts
│   │   └── ...
│   ├── repositories/        # Database access (Prisma clients)
│   │   ├── user.repository.ts
│   │   ├── shop.repository.ts
│   │   ├── sale.repository.ts
│   │   └── ...
│   ├── middlewares/         # Express middlewares
│   │   ├── auth.middleware.ts
│   │   ├── role.middleware.ts
│   │   ├── validation.middleware.ts
│   │   ├── rateLimit.middleware.ts
│   │   └── errorHandler.middleware.ts
│   ├── routes/              # Route definitions
│   │   ├── auth.routes.ts
│   │   ├── shop.routes.ts
│   │   ├── sale.routes.ts
│   │   └── ...
│   ├── utils/               # Helpers, constants, validators
│   │   ├── jwt.util.ts
│   │   ├── bcrypt.util.ts
│   │   ├── otp.util.ts
│   │   ├── logger.util.ts
│   │   └── ...
│   ├── validators/          # Request validation schemas (Joi / Zod)
│   └── app.ts               # Express app setup
├── prisma/
│   ├── schema.prisma        # Database schema definition
│   └── migrations/          # Auto‑generated migration files
├── .env.example
├── package.json
├── tsconfig.json
└── ...
```

### 4.2 Layered Architecture
- **Controller Layer** – Handles HTTP requests, validates input, calls services, returns HTTP responses.
- **Service Layer** – Contains all business logic. Orchestrates repositories and external services.
- **Repository Layer** – Encapsulates Prisma database operations. Each repository maps to a main domain entity.

### 4.3 API Design Principles
- **RESTful** conventions (resources, HTTP methods, status codes).
- **JSON** payloads throughout.
- **Versioned** API: `/api/v1/...`
- **Standardised error responses** (see section 6.5).
- **Authentication** via Bearer token (JWT) for all protected endpoints.
- **Rate limiting** per IP / per user to prevent abuse.
- **Idempotency** keys for sensitive operations (sales, payments) to prevent duplicates.

### 4.4 External Service Integrations
All external services (SMS, FCM, Supabase Storage) are wrapped in dedicated service classes with interfaces, allowing easy mocking for tests and future replacements.

---

## 5. Database Schema Overview

(Full schema will be detailed in `03_DATABASE.docx`. This section provides a high‑level entity relationship overview.)

### 5.1 Core Entities

- **users** – System Owner, Agent, Business Owner, Employee.  
  `id`, `phone`, `email`, `name`, `role`, `pinHash`, `isActive`, `createdAt`, `updatedAt`.

- **shops** – Business locations.  
  `id`, `ownerId` (references users), `name`, `address`, `logoUrl`, `coverUrl`, `currency`, `isArchived`, `createdAt`.

- **employees** – Junction between users and shops with permissions.  
  `id`, `userId`, `shopId`, `role` (e.g., cashier, manager), `permissions` (JSON array), `isActive`, `createdAt`.

- **categories** – Product categories (default + custom).  
  `id`, `shopId`, `name`, `isDefault`, `isArchived`, `createdAt`.

- **products** – Inventory items.  
  `id`, `shopId`, `name`, `sku`, `categoryId`, `supplier`, `brand`, `costPrice`, `sellingPrice`, `minPrice`, `maxPrice`, `reorderLevel`, `stockQuantity`, `unit` (single, bottle, box), `unitConversion` (e.g., 12 bottles per box), `images` (JSON array), `isActive`, `createdAt`, `updatedAt`.

- **stock_adjustments** – History of stock changes.  
  `id`, `productId`, `quantityChange`, `reason`, `performedBy` (userId), `createdAt`.

- **customers** – Credit customers.  
  `id`, `shopId`, `name`, `phone`, `email`, `address`, `notes`, `createdAt`, `updatedAt`.

- **sales** – POS transactions.  
  `id`, `shopId`, `userId` (employee/owner who made sale), `customerId` (optional), `saleDate`, `totalAmount`, `discount`, `taxAmount`, `grandTotal`, `paymentMethod` (cash, mpesa, airtel, mixx, credit), `paymentDetails` (JSON), `status` (completed, suspended, refunded, voided), `receiptNumber`, `syncStatus` (pending, synced, failed), `createdAt`, `updatedAt`.

- **sale_items** – Line items of each sale.  
  `id`, `saleId`, `productId`, `quantity`, `unitPrice`, `discount`, `total`.

- **expenses** – Business expenses.  
  `id`, `shopId`, `userId` (recorded by), `category`, `amount`, `description`, `receiptUrl`, `expenseDate`, `createdAt`.

- **loans** – Business loans taken.  
  `id`, `shopId`, `lender`, `amount`, `interestRate`, `dueDate`, `remainingBalance`, `status` (active, paid), `createdAt`.

- **loan_repayments** – Repayments made.  
  `id`, `loanId`, `amount`, `repaymentDate`, `createdAt`.

- **credit_payments** – Customer credit repayments.  
  `id`, `customerId`, `saleId` (optional – if repaying a specific sale), `amount`, `paymentDate`, `method` (cash, mpesa, etc.), `createdAt`.

- **sync_metadata** – Client sync tracking.  
  `id`, `shopId`, `deviceId`, `lastSyncTimestamp`, `pendingUploads` (count), `createdAt`, `updatedAt`.

- **subscriptions** (future) – `id`, `shopId`, `plan`, `startDate`, `endDate`, `status`.

- **notifications** – Push / in‑app notifications.  
  `id`, `userId`, `title`, `body`, `data` (JSON), `isRead`, `createdAt`.

- **activity_logs** – Audit trail for all actions.  
  `id`, `userId`, `shopId`, `action` (e.g., SALE_CREATED, PRODUCT_UPDATED), `details` (JSON), `ipAddress`, `userAgent`, `createdAt`.

### 5.2 Prisma Schema Highlights

```prisma
model User {
  id            String    @id @default(cuid())
  phone         String    @unique
  email         String?
  name          String
  role          Role      // SYSTEM_OWNER, AGENT, BUSINESS_OWNER, EMPLOYEE
  pinHash       String?
  isActive      Boolean   @default(true)
  shops         Shop[]    @relation("Owner")
  employees     Employee[]
  sales         Sale[]
  expenses      Expense[]
  activityLogs  ActivityLog[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Shop {
  id            String    @id @default(cuid())
  ownerId       String
  owner         User      @relation("Owner", fields: [ownerId], references: [id])
  name          String
  address       String?
  logoUrl       String?
  coverUrl      String?
  currency      String    @default("TZS")
  isArchived    Boolean   @default(false)
  employees     Employee[]
  products      Product[]
  categories    Category[]
  sales         Sale[]
  expenses      Expense[]
  loans         Loan[]
  customers     Customer[]
  syncMetadata  SyncMetadata?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Employee {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  shopId        String
  shop          Shop      @relation(fields: [shopId], references: [id])
  role          String    // e.g., "Cashier", "Manager"
  permissions   Json      // array of permission strings
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@unique([userId, shopId])
}
```

### 5.3 Indexes & Performance
- Index on `userId`, `shopId`, `product.sku`, `sale.saleDate`, `syncMetadata.lastSyncTimestamp`.
- Full‑text search on product name and SKU (PostgreSQL `tsvector`).
- JSONB for flexible fields (permissions, paymentDetails, activity details).

---

## 6. API Design

### 6.1 Base URL
- Development: `https://api-dev.mwaminifu.com/api/v1`
- Production: `https://api.mwaminifu.com/api/v1`

### 6.2 Authentication Header
`Authorization: Bearer <jwt_token>`

### 6.3 Standard Response Format

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful",
  "timestamp": "2026-08-05T12:00:00Z"
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid phone number format",
    "details": [ ... ]
  },
  "timestamp": "2026-08-05T12:00:00Z"
}
```

### 6.4 HTTP Status Codes Used
- `200` – Success.
- `201` – Created.
- `400` – Bad Request (validation).
- `401` – Unauthorised (missing/invalid token).
- `403` – Forbidden (insufficient permissions).
- `404` – Not Found.
- `409` – Conflict (e.g., duplicate entry).
- `422` – Unprocessable Entity (business rule violation).
- `429` – Too Many Requests.
- `500` – Internal Server Error.

### 6.5 Key API Endpoints (High‑Level)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/otp/request` | Request OTP for Business Owner | No |
| POST | `/auth/otp/verify` | Verify OTP, return temporary token | No |
| POST | `/auth/pin/set` | Set PIN (first login) | Yes (temp token) |
| POST | `/auth/login` | Login with phone + PIN | No |
| POST | `/auth/refresh` | Refresh JWT | Yes |
| POST | `/auth/employee/login` | Employee login (phone + PIN) | No |
| POST | `/auth/logout` | Logout | Yes |
| GET | `/users/me` | Get current user profile | Yes |
| POST | `/agents/onboard` | Agent creates Business Owner | Agent only |
| GET | `/shops` | List shops (owner) | Yes |
| POST | `/shops` | Create shop | Yes |
| PUT | `/shops/:id` | Update shop | Yes |
| GET | `/shops/:id/dashboard` | Dashboard KPI | Yes |
| POST | `/shops/:id/employees` | Add employee | Yes |
| GET | `/shops/:id/employees` | List employees | Yes |
| PUT | `/employees/:id/permissions` | Update permissions | Yes |
| POST | `/shops/:id/sales` | Create sale (POS) | Yes |
| GET | `/shops/:id/sales` | List sales with filters | Yes |
| PUT | `/sales/:id/refund` | Refund a sale | Yes |
| PUT | `/sales/:id/void` | Void a sale | Yes |
| GET | `/shops/:id/products` | List products (search/filter) | Yes |
| POST | `/shops/:id/products` | Create product | Yes |
| PUT | `/products/:id` | Update product | Yes |
| POST | `/products/:id/adjust-stock` | Stock adjustment | Yes |
| POST | `/shops/:id/expenses` | Record expense | Yes |
| GET | `/shops/:id/customers` | List customers | Yes |
| POST | `/shops/:id/customers` | Create customer | Yes |
| POST | `/customers/:id/credit-payment` | Record credit repayment | Yes |
| GET | `/shops/:id/loans` | List loans | Yes |
| POST | `/shops/:id/loans` | Add loan | Yes |
| POST | `/loans/:id/repay` | Repay loan | Yes |
| GET | `/shops/:id/reports/sales` | Sales report | Yes |
| GET | `/shops/:id/reports/inventory` | Inventory report | Yes |
| GET | `/shops/:id/reports/profit` | Profit report | Yes |
| POST | `/sync/push` | Upload local changes | Yes |
| GET | `/sync/pull` | Download server changes (since timestamp) | Yes |
| POST | `/notifications/send-sms` | Send SMS to customer | Yes |
| GET | `/notifications` | List in‑app notifications | Yes |
| POST | `/backup/export` | Generate backup JSON | Yes |
| POST | `/backup/restore` | Restore from backup | Yes |

---

## 7. Authentication & Authorization

### 7.1 Business Owner Flow
1. **Request OTP:** `POST /auth/otp/request` with `phone`.
   - Validate phone exists (created by Agent).
   - Generate 6‑digit OTP, store in Redis (or DB) with 5‑minute expiry.
   - Send SMS via SMS service.
2. **Verify OTP:** `POST /auth/otp/verify` with `phone` + `otp`.
   - If valid, issue a **temporary JWT** (short‑lived, 10 minutes) to allow PIN setup.
3. **Set PIN:** `POST /auth/pin/set` with `pin` (hashed with bcrypt, salt rounds 10).
   - Store `pinHash` in `users` table.
   - Issue **permanent JWT** (expires in 30 days) for daily use.
4. **Daily Login:** `POST /auth/login` with `phone` + `pin`.
   - Verify pin hash.
   - Issue new JWT.

### 7.2 Employee Flow
- Employee is created by Business Owner (no public registration).
- On first login: `POST /auth/employee/login` with `phone` + `pin` (set during first login via a separate flow; or they set it after receiving SMS).
- No OTP – PIN is set via the app (employee receives SMS with initial PIN or sets PIN on first app launch after verification).

### 7.3 Agent / System Owner Flow
- Username + password login (bcrypt hashed).
- Web dashboard only.

### 7.4 JWT Management
- **Payload:** `{ userId, role, shopId? (optional), exp, iat }`
- **Refresh:** `/auth/refresh` using a refresh token (stored in DB or as HTTP‑only cookie).
- **Revocation:** On logout, blacklist token in Redis until expiry.

### 7.5 Authorization (Role‑Based Access Control)
- Middleware `role.middleware.ts` checks the `role` from JWT and permissions.
- For employees, the `permissions` JSON field is read and checked against the required permission for each endpoint (e.g., `pos:write`, `inventory:read`, `credit:manage`).

### 7.6 OTP Storage
- Use Redis for OTP storage (fast, auto‑expiry) to reduce database load.
- Fallback: store in `otp` table with `expiresAt` if Redis unavailable.

---

## 8. Offline Sync Architecture

### 8.1 Client‑Side (Flutter + Drift)
- All transaction data (`sales`, `stock_adjustments`, `expenses`, `credit_payments`, etc.) are stored locally in SQLite using Drift.
- Each record has a `syncStatus` column: `pending` (local only), `synced` (confirmed on server), `conflict` (manual resolution needed).
- Records are assigned a **client‑generated UUID** as primary key to avoid collisions.

### 8.2 Sync Mechanism
**Two‑way incremental sync:**
1. **Push (`/sync/push`):**
   - Client sends a JSON payload of all records with `syncStatus = pending`, grouped by entity (sales, expenses, etc.).
   - Each record includes `clientId` (UUID), `lastModifiedAt` (client timestamp), and `version` (integer for optimistic locking).
   - Server validates, processes, and returns success/failure for each record.
   - On success, client updates `syncStatus = synced` and stores the server‑assigned `serverId`.

2. **Pull (`/sync/pull?since=<timestamp>&shopId=...`):**
   - Client sends the `lastSyncTimestamp` (the time of the last successful pull).
   - Server returns all records (sales, inventory, customers, expenses, etc.) that were created or modified **after** that timestamp for the given shop.
   - Client merges these into the local database, resolving conflicts.

### 8.3 Conflict Resolution Strategy (MVP)
- **Server wins** by default.
- If a client attempts to update a record that has been changed on the server since the client’s last pull, the server returns a `409 CONFLICT` with the latest server version.
- Client then discards its local changes and re‑applies them on top of the server version (or notifies the user to re‑enter).
- In Version 1, manual conflict resolution is not exposed; the server version overrides.

### 8.4 Retry Queue
- If `/sync/push` fails (network error, server error), the client keeps records in `pending` state.
- A background scheduler retries every 5 minutes, with exponential backoff (max 1 hour).
- The user is shown a sync status indicator and can manually trigger sync.

### 8.5 Sync Metadata
- `sync_metadata` table stores `lastSyncTimestamp`, `deviceId`, and `pendingUploads` count for each shop+device combination.

---

## 9. Push Notifications

### 9.1 Setup
- Firebase Cloud Messaging (FCM) configured for the project.
- Flutter app integrates `firebase_messaging`.
- Backend sends notifications using FCM REST API (via `firebase-admin` SDK).

### 9.2 Notification Triggers (MVP)
- Low stock alert (when quantity ≤ reorder level).
- Out‑of‑stock alert.
- Sync failure (critical).
- Loan repayment reminder (scheduled).
- Customer credit reminder (scheduled).

### 9.3 Notification Payload
```json
{
  "to": "<fcm_token>",
  "notification": {
    "title": "Low Stock Alert",
    "body": "Product Coca Cola is below reorder level."
  },
  "data": {
    "type": "low_stock",
    "productId": "prod_123",
    "shopId": "shop_456"
  }
}
```

### 9.4 Storage
- Notifications are also stored in the `notifications` table for in‑app viewing.
- User can mark as read; unread count shown on dashboard.

---

## 10. SMS Gateway Integration

### 10.1 Provider Selection
- Use a Tanzanian SMS gateway (e.g., Africa’s Talking, MobTech, or SMS.to.tz).
- The service wrapper (`SmsService`) abstracts the provider.

### 10.2 SMS Use Cases
- OTP delivery to Business Owner.
- Welcome / invitation SMS to employees.
- Customer reminders (credit repayment, promotions).
- Business owner promotional messages.

### 10.3 Implementation
- `SmsService.send(phone, message)`: returns success/failure and messageId.
- Rate limiting: per phone number (max 5 OTP requests per hour).
- Logs all SMS attempts in an `sms_logs` table for auditing.
- Retry on failure (up to 3 attempts).

### 10.4 OTP SMS Template
```
Mwaminifu: Your OTP is 123456. Valid for 5 minutes. Do not share.
```

### 10.5 Employee Invitation SMS
```
You have been added to Mwaminifu by [Shop Name]. Download the app at [link]. Use phone [number] to login.
```

---

## 11. File Storage

### 11.1 Supabase Storage
- Buckets:
  - `shop-logos` – public (readable).
  - `product-images` – public.
  - `expense-receipts` – private (only accessible via signed URLs).
  - `backups` – private (for exported backups).

### 11.2 File Upload Flow
1. Client uploads image to Supabase Storage directly (using pre‑signed URL or client SDK) **OR** uploads to backend which then uploads to Supabase.
   - For simplicity, backend handles upload: client sends `multipart/form-data` to API endpoint `/upload`.
   - Backend validates file type (jpg, png, webp), size (max 5MB), and compresses if needed.
2. Backend uploads to Supabase, returns the public URL or signed URL.
3. URL is stored in the relevant record (e.g., `product.images`, `expense.receiptUrl`).

### 11.3 Image Optimisation
- On upload, generate multiple sizes (thumbnail, medium) using Sharp library.
- Store only the URLs of optimised versions.

---

## 12. Admin Dashboard Architecture (Next.js)

### 12.1 Folder Structure

```
admin-dashboard/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── ...
│   ├── (dashboard)/
│   │   ├── system/
│   │   │   ├── agents/
│   │   │   └── ...
│   │   ├── agent/
│   │   │   ├── businesses/
│   │   │   └── ...
│   │   └── ...
│   ├── api/                 # Server API routes (proxy to backend)
│   ├── layout.tsx
│   └── page.tsx
├── components/              # Reusable UI components (shadcn/ui)
├── lib/                     # Utilities, API client
├── types/                   # TypeScript types
├── public/
├── tailwind.config.js
└── ...
```

### 12.2 Features
- **System Owner view:** Manage Agents, view platform stats.
- **Agent view:** List Business Owners, onboard new ones, view basic metrics.
- **Authentication:** Username + password (session‑based with NextAuth or JWT cookies).

### 12.3 Communication with Backend
- Server‑side API routes (`app/api/...`) proxy requests to the backend to avoid CORS and manage authentication tokens.

---

## 13. Mobile App Architecture (Flutter)

### 13.1 Folder Structure

```
lib/
├── main.dart
├── app/
│   ├── app.dart           # App root with BLoC providers
│   ├── router.dart        # GoRouter / AutoRoute configuration
│   └── themes.dart
├── core/
│   ├── constants/
│   ├── utils/             # Helpers, extensions
│   ├── di/                # Dependency injection (get_it)
│   ├── network/           # HTTP client (Dio), interceptors
│   └── storage/           # SharedPreferences, secure storage
├── data/
│   ├── models/            # Domain models (User, Sale, Product)
│   ├── repositories/      # Abstract repository interfaces
│   ├── datasources/
│   │   ├── local/         # Drift database DAOs
│   │   └── remote/        # API services
│   └── repositories/impl/ # Concrete repository implementations
├── domain/
│   ├── usecases/          # Business use cases (optional, clean architecture)
│   └── entities/          # Entity classes
├── presentation/
│   ├── blocs/             # BLoC/Cubit for each screen
│   ├── pages/             # Screens (POS, Dashboard, Inventory, etc.)
│   ├── widgets/           # Reusable UI components
│   └── routes/            # Navigation setup
├── sync/                  # Sync engine (background worker, queue)
└── services/              # FCM, SMS, storage services
```

### 13.2 State Management
- **BLoC/Cubit** for global and screen‑level state.
- Events: user actions (e.g., `AddProductToCart`, `SyncPending`).
- States: `Loading`, `Loaded`, `Error`, `Synced`, `Offline`.

### 13.3 Local Database (Drift)
- Define tables as Dart classes with annotations.
- DAOs for each table with CRUD operations.
- Reactive queries: use `Stream` for real‑time UI updates (e.g., cart total, low stock list).

### 13.4 Background Sync
- Use `workmanager` or `background_fetch` to trigger sync periodically (every 15–30 minutes when the app is in background).
- Sync is also triggered on app resume and manually.

---

## 14. Security

### 14.1 Data in Transit
- All APIs served over HTTPS (TLS 1.2/1.3).
- SSL certificates managed by Render (auto‑renew).

### 14.2 Data at Rest
- PINs hashed with bcrypt (salt rounds 10).
- No sensitive data (like full credit card numbers) stored.
- JWT stored securely on mobile using `flutter_secure_storage` (encrypted keystore).

### 14.3 Input Validation
- All request payloads validated using Zod (or Joi) schemas.
- SQL injection prevented by Prisma’s parameterised queries.
- XSS protection: sanitisation of user‑generated content (product names, descriptions).

### 14.4 Rate Limiting
- `express-rate-limit` middleware on all endpoints (100 requests per minute per IP).
- Stricter limits on OTP endpoints (5 per minute per phone).

### 14.5 CORS
- Configure Express to allow only trusted origins (Render frontend URLs, localhost for development).

### 14.6 Environment Variables
- All secrets (DB URL, JWT secret, SMS API keys, FCM keys) stored in `.env` files, never committed.

### 14.7 Audit Logs
- Every state‑changing operation is logged in `activity_logs` (user, shop, action, details, timestamp).
- Logs are immutable and retained for 12 months.

---

## 15. Deployment Strategy

### 15.1 Environments
- **Development:** Local machine / Render staging.
- **Testing:** Render staging with sample data.
- **Production:** Render (backend), Vercel (admin dashboard), Supabase (database/storage).

### 15.2 Render Setup
- **Web Service (Node.js):**
  - Build command: `npm run build`
  - Start command: `npm run start`
  - Environment variables: DB_URL, JWT_SECRET, SMS_API_KEY, etc.
  - Auto‑deploy from GitHub branch (`main`).
- **Free tier caveats:** Services may sleep after 15 minutes of inactivity; first request wakes them up (3–5 sec delay). Acceptable for MVP.

### 15.3 Supabase Setup
- Create project, note DB URL and credentials.
- Run Prisma migrations on deployment.
- Enable backups (point‑in‑time recovery).
- Set up storage buckets.

### 15.4 Vercel Setup (Admin Dashboard)
- Connect GitHub repository.
- Environment variables: NEXT_PUBLIC_API_URL.
- Auto‑deploy on merge to `main`.

### 15.5 Database Migrations
- Use Prisma migrations (`npx prisma migrate deploy`) as part of CI/CD.
- Never manually modify production DB.

---

## 16. Performance Considerations

| Aspect | Strategy |
|--------|----------|
| **DB Queries** | Use Prisma’s `select` to fetch only needed fields; `include` sparingly; index foreign keys and frequently queried columns. |
| **API Response** | Paginate list endpoints (limit 50 per page). Use cursor‑based pagination for large tables. |
| **Image Loading** | Lazy load product images; use thumbnails for list views. |
| **Sync Payload** | Compress JSON using gzip; send only changed records. |
| **Mobile App** | Use `ListView.builder` for large lists; dispose controllers; avoid rebuilding large widgets. |
| **Concurrency** | Use connection pooling (Prisma’s default) to handle multiple requests. |

---

## 17. Monitoring & Logging

### 17.1 Backend Logging
- Use `winston` or `pino` for structured JSON logging.
- Log levels: error, warn, info, debug.
- Log to console (Render) and optionally to a file / external service (e.g., Logtail, Datadog) later.

### 17.2 Error Tracking
- Integrate **Sentry** for capturing runtime exceptions in both backend and mobile.

### 17.3 Health Checks
- Expose `/health` endpoint returning `{ status: "ok" }` for Render monitoring.

### 17.4 Application Performance Monitoring (APM)
- Optional: use New Relic / AppSignal (post‑MVP).

---

## 18. Testing Strategy

### 18.1 Unit Tests
- **Backend:** Jest or Vitest – test services, utilities, validators.
- **Flutter:** `flutter test` – test BLoC, repository, and utility functions.
- Coverage target: 70%+.

### 18.2 Integration Tests
- **Backend:** Supertest – test API endpoints with a test database (using Prisma’s `shadow` database or Dockerised PostgreSQL).
- **Flutter:** Widget tests for key screens (POS, Dashboard).

### 18.3 End‑to‑End (E2E) Tests
- Use **Cypress** for admin dashboard.
- Use **Flutter Integration Test** (`flutter_driver` or `integration_test`) for critical user flows (login, create sale, sync).

### 18.4 Manual Testing
- QA team follows test cases derived from PRD acceptance criteria.
- Test on real devices (Android 8–14, various screen sizes).

---

## 19. Version Control & CI/CD

### 19.1 Git Branching Strategy
- `main` – production‑ready.
- `develop` – integration branch.
- `feature/*` – new features.
- `bugfix/*` – bug fixes.
- `release/*` – release candidates.

### 19.2 GitHub Actions Workflows
- **Backend:** Run tests on PR; on merge to `main`, build and deploy to Render.
- **Admin Dashboard:** Run linting + build; deploy to Vercel on merge.
- **Mobile App:** Run tests; optionally build APK for testing.

### 19.3 Semantic Versioning
- Tag releases with `v1.0.0`, `v1.0.1`, etc.

---

## 20. Development Environment Setup

### 20.1 Prerequisites
- Node.js 20 LTS, npm 10+
- PostgreSQL 15 (local or Docker)
- Flutter 3.22+ (Dart 3.4+)
- Android Studio / VS Code with Flutter extensions
- Git

### 20.2 Backend Setup
```bash
git clone <repo>
cd backend
npm install
cp .env.example .env
# Add DB_URL, JWT_SECRET, etc.
npx prisma migrate dev --name init
npm run dev
```

### 20.3 Mobile Setup
```bash
cd mobile
flutter pub get
# Generate Drift code: flutter pub run build_runner build
# Run on emulator: flutter run
```

### 20.4 Admin Dashboard Setup
```bash
cd admin-dashboard
npm install
cp .env.example .env.local
# Add NEXT_PUBLIC_API_URL
npm run dev
```

---