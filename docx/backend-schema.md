# 06_BACKEND_SCHEMA.docx – Backend Architecture, APIs, Authentication, Synchronization, and Security

**Project Name:** Mwaminifu App  
**Version:** 1.0 (MVP)  
**Status:** Draft  
**Prepared By:** [System Owner / Technical Team]  
**Date:** 2026-08-05  
**Document Version:** 1.0  

---

## Table of Contents

1. Introduction  
2. API Architecture Overview  
3. Base URL & Versioning  
4. Standard Response Format  
5. Error Codes & HTTP Status  
6. Authentication & Authorization (Deep Dive)  
7. API Endpoint Reference (Complete)  
   - Auth Module  
   - User & Profile Module  
   - Shop Module  
   - Employee & Permissions Module  
   - POS (Sales) Module  
   - Inventory Module  
   - Expenses Module  
   - Customers & Credit Module  
   - Loans Module  
   - Reports Module  
   - Sync Module  
   - Notifications & SMS Module  
   - Backup & Restore Module  
   - Admin / Agent Module  
   - Activity Logs Module  
   - Settings Module  
8. Synchronisation Protocol (Detailed)  
9. Security Implementation  
10. File Upload & Storage  
11. Background Jobs & Scheduled Tasks  
12. Environment Variables  
13. Performance & Scaling Considerations  
14. API Versioning Strategy  

---

## 1. Introduction

### 1.1 Purpose
This document provides the complete backend specification for Mwaminifu App Version 1. It defines every API endpoint, request/response payload, authentication flow, synchronisation protocol, and security mechanism. This is the authoritative contract between the Flutter mobile app, the Next.js admin dashboard, and the Node.js backend.

Developers, testers, and AI coding tools can use this as the sole source for implementing all server‑side functionality.

### 1.2 Scope
- Detailed REST API definitions (paths, methods, parameters, request bodies, responses).
- Authentication flows (OTP, PIN, JWT, refresh tokens).
- Role‑based permission system.
- Offline sync protocol (push/pull, conflict resolution).
- Security measures (hashing, encryption, rate limiting).
- File upload handling.
- Background job specifications.

### 1.3 References
- 01_PRD.docx  
- 02_TRD.docx  
- 03_DATABASE.docx (to be produced)  
- 04_UIUX.docx (to be produced)  
- 05_APP_FLOW.docx (to be produced)

---

## 2. API Architecture Overview

- **RESTful** conventions.
- **JSON** only (no XML).
- **Stateless** – each request carries authentication.
- **Idempotency** supported for critical operations via `Idempotency-Key` header.
- **Compression** – gzip enabled for all responses.
- **CORS** – configured to allow only trusted origins.

---

## 3. Base URL & Versioning

| Environment | Base URL |
|-------------|----------|
| Development | `https://api-dev.mwaminifu.com/api/v1` |
| Staging     | `https://api-staging.mwaminifu.com/api/v1` |
| Production  | `https://api.mwaminifu.com/api/v1` |

**Versioning Strategy:** URL path versioning (`/api/v1/...`).  
Breaking changes trigger a new version (`/api/v2/...`) while v1 remains supported for at least 6 months.

---

## 4. Standard Response Format

### 4.1 Success Response
```json
{
  "success": true,
  "data": { ... },           // or [] for lists
  "message": "Operation completed successfully",
  "timestamp": "2026-08-05T12:00:00.000Z",
  "pagination": {            // optional, for list endpoints
    "page": 1,
    "limit": 50,
    "total": 120,
    "nextCursor": "abc123"   // optional, for cursor pagination
  }
}
```

### 4.2 Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more fields are invalid",
    "details": [
      { "field": "phone", "issue": "Phone number must be 10 digits" }
    ],
    "requestId": "req_abc123"
  },
  "timestamp": "2026-08-05T12:00:00.000Z"
}
```

---

## 5. Error Codes & HTTP Status

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | `VALIDATION_ERROR` | Request body/query params fail validation. |
| 400 | `MISSING_PARAMETER` | Required parameter missing. |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT. |
| 401 | `TOKEN_EXPIRED` | JWT expired; refresh required. |
| 403 | `FORBIDDEN` | Authenticated but insufficient permissions. |
| 404 | `NOT_FOUND` | Resource does not exist. |
| 409 | `CONFLICT` | Resource already exists or sync conflict. |
| 422 | `BUSINESS_RULE_VIOLATION` | Action violates a business rule (e.g., exceeds employee limit). |
| 429 | `RATE_LIMITED` | Too many requests. Retry after `X-Retry-After` header. |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected server error. |
| 503 | `SERVICE_UNAVAILABLE` | Dependency (SMS, DB) unavailable. |

---

## 6. Authentication & Authorization (Deep Dive)

### 6.1 Authentication Flow Overview

| User Type | First Login | Daily Login | Credentials |
|-----------|-------------|-------------|-------------|
| Business Owner | OTP + set PIN | PIN | Phone + PIN |
| Employee | PIN set via invitation | PIN | Phone + PIN |
| Agent | Username + Password | Username + Password | Username + Password |
| System Owner | Username + Password | Username + Password | Username + Password |

### 6.2 OTP Flow (Business Owner)
```
Step 1: POST /auth/otp/request  →  Send OTP via SMS.
Step 2: POST /auth/otp/verify   →  OTP validated → returns `tempToken` (short‑lived, 10 min).
Step 3: POST /auth/pin/set      →  Send PIN + tempToken → returns `accessToken` (30 days) + `refreshToken`.
```

### 6.3 PIN Login
```
POST /auth/login
Body: { "phone": "2557XXXXXXXX", "pin": "123456" }
Response: { "accessToken": "...", "refreshToken": "...", "user": { ... } }
```
- PIN is hashed with bcrypt (salt rounds 10) and stored in `users.pinHash`.
- Rate limit: 5 attempts per 15 minutes per phone.

### 6.4 Employee Login (First Time)
- Employee receives SMS with a temporary PIN (auto‑generated, 6 digits).
- On first login, they are forced to change PIN via `POST /auth/employee/change-pin`.

### 6.5 JWT Token Specifications
- **Algorithm:** HS256 (symmetric) – can move to RS256 later.
- **Payload:**
```json
{
  "sub": "user_123",
  "role": "BUSINESS_OWNER",
  "shopId": "shop_456",     // optional; used for employee scoping
  "permissions": ["pos:write", "inventory:read"], // for employees
  "iat": 1620000000,
  "exp": 1622592000
}
```
- **Access Token Expiry:** 30 days (mobile) / 1 hour (web dashboard).
- **Refresh Token Expiry:** 60 days (mobile) / 7 days (web).
- **Storage:** Mobile – `flutter_secure_storage`; Web – HTTP‑only cookie (dashboard) or localStorage (optional).

### 6.6 Refresh Token Flow
```
POST /auth/refresh
Header: Authorization: Bearer <refresh_token>
Response: { "accessToken": "...", "refreshToken": "..." }
```
- Refresh tokens are stored in DB (`refresh_tokens` table) with `deviceId`, `ip`, `expiresAt`.

### 6.7 Employee Permission System
Employees have a `permissions` JSON array stored in `employees` table.  
**Permission Strings (MVP):**

| Permission | Description |
|------------|-------------|
| `pos:write` | Can create, suspend, resume sales. |
| `pos:refund` | Can refund sales. |
| `pos:void` | Can void sales. |
| `inventory:read` | Can view products and stock levels. |
| `inventory:write` | Can adjust stock, add/edit products. |
| `expenses:write` | Can record expenses. |
| `credit:write` | Can create customers, record credit sales, take repayments. |
| `reports:read` | Can view their own shift report (not full business reports). |

- Middleware (`permission.guard.ts`) checks these on each request.

### 6.8 Agent / System Owner Auth
- Traditional username + password with bcrypt.
- Web dashboard uses session‑based auth (NextAuth) or JWT stored in cookie.

---

## 7. API Endpoint Reference (Complete)

### 7.1 Auth Module

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/otp/request` | Request OTP for Business Owner | ❌ |
| POST | `/auth/otp/verify` | Verify OTP, get temp token | ❌ |
| POST | `/auth/pin/set` | Set PIN (first login) | ✅ (temp token) |
| POST | `/auth/login` | Login with phone + PIN | ❌ |
| POST | `/auth/employee/login` | Employee login (phone + PIN) | ❌ |
| POST | `/auth/employee/change-pin` | Change employee PIN (first login) | ✅ (temp token from SMS) |
| POST | `/auth/refresh` | Refresh access token | ✅ (refresh token) |
| POST | `/auth/logout` | Invalidate tokens | ✅ |
| POST | `/auth/pin/reset` | Request PIN reset (OTP) | ❌ |

**Request / Response Examples:**

**POST /auth/otp/request**
```json
// Request
{ "phone": "255712345678" }
// Response
{ "success": true, "message": "OTP sent", "resendAfter": 60 }
```

**POST /auth/otp/verify**
```json
// Request
{ "phone": "255712345678", "otp": "123456" }
// Response
{ "success": true, "tempToken": "eyJ...", "expiresIn": 600 }
```

**POST /auth/pin/set**
```json
// Request
{ "pin": "123456" }
// Header: Authorization: Bearer <tempToken>
// Response
{ "accessToken": "eyJ...", "refreshToken": "eyJ...", "user": { "id": "u1", "phone": "...", "name": "...", "role": "BUSINESS_OWNER" } }
```

**POST /auth/login**
```json
// Request
{ "phone": "255712345678", "pin": "123456" }
// Response (same as above)
```

---

### 7.2 User & Profile Module

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/users/me` | Get current user profile | ✅ |
| PUT | `/users/me` | Update profile (name, email) | ✅ |
| POST | `/users/me/avatar` | Upload avatar | ✅ |
| POST | `/users/me/change-phone` | Request phone change (OTP) | ✅ |
| POST | `/users/me/verify-phone` | Verify new phone | ✅ |

**GET /users/me** Response:
```json
{
  "id": "u1",
  "phone": "255712345678",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "role": "BUSINESS_OWNER",
  "avatarUrl": "https://...",
  "isActive": true,
  "createdAt": "2026-01-01T00:00:00Z"
}
```

---

### 7.3 Shop Module

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/shops` | List all shops (owner) | ✅ |
| GET | `/shops/:id` | Get shop details | ✅ |
| POST | `/shops` | Create a new shop | ✅ |
| PUT | `/shops/:id` | Update shop | ✅ |
| DELETE | `/shops/:id` | Archive shop (soft delete) | ✅ |
| POST | `/shops/:id/switch` | Set active shop for session | ✅ |
| GET | `/shops/:id/dashboard` | Dashboard KPIs | ✅ |
| GET | `/shops/combined-dashboard` | Combined KPIs for all shops | ✅ |

**POST /shops** Request:
```json
{
  "name": "Main Street Grocery",
  "address": "Plot 12, Main Street, Dar es Salaam",
  "currency": "TZS",
  "logoFile": (multipart file, optional),
  "coverFile": (multipart file, optional)
}
```

**GET /shops/:id/dashboard** Response:
```json
{
  "todaySales": 450000,
  "todayProfit": 120000,
  "cashInHand": 300000,
  "mobileMoneyReceived": 150000,
  "creditGivenToday": 45000,
  "expensesToday": 25000,
  "lowStockItems": 5,
  "pendingOrders": 3,
  "subscriptionStatus": "active",
  "lastSyncStatus": "synced",
  "salesTrend": [ /* 7 days data */ ],
  "topProducts": [ { "name": "Coca Cola", "quantity": 45 } ],
  "paymentMethodBreakdown": { "cash": 60, "mpesa": 30, "credit": 10 }
}
```

---

### 7.4 Employee & Permissions Module

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/shops/:id/employees` | List employees | ✅ (Owner) |
| POST | `/shops/:id/employees` | Add employee | ✅ (Owner) |
| GET | `/employees/:id` | Get employee details | ✅ (Owner/self) |
| PUT | `/employees/:id` | Update employee (name, role) | ✅ (Owner) |
| PUT | `/employees/:id/permissions` | Update permissions | ✅ (Owner) |
| PUT | `/employees/:id/toggle` | Enable/Disable employee | ✅ (Owner) |
| POST | `/employees/:id/reset-pin` | Reset PIN (send new one) | ✅ (Owner) |
| DELETE | `/employees/:id` | Remove employee | ✅ (Owner) |

**POST /shops/:id/employees** Request:
```json
{
  "phone": "255712345679",
  "name": "John Cashier",
  "role": "Cashier",
  "permissions": ["pos:write", "inventory:read"]
}
```
- System generates a temporary PIN and sends SMS invitation.

---

### 7.5 POS (Sales) Module

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/shops/:id/sales` | Create a new sale | ✅ |
| GET | `/shops/:id/sales` | List sales (filters) | ✅ |
| GET | `/sales/:id` | Get sale details | ✅ |
| PUT | `/sales/:id/suspend` | Suspend sale | ✅ |
| PUT | `/sales/:id/resume` | Resume suspended sale | ✅ |
| PUT | `/sales/:id/refund` | Refund a completed sale | ✅ (requires `pos:refund`) |
| PUT | `/sales/:id/void` | Void a sale | ✅ (requires `pos:void`) |
| GET | `/shops/:id/sales/current-shift` | Get current shift sales | ✅ |
| POST | `/shops/:id/sales/close-shift` | Close shift (report) | ✅ |
| GET | `/shops/:id/sales/receipt/:receiptNumber` | Get receipt data | ✅ |

**POST /shops/:id/sales** Request:
```json
{
  "customerId": "cust_123",          // optional
  "items": [
    { "productId": "prod_1", "quantity": 2, "unit": "bottle", "discount": 0 }
  ],
  "discount": 0,                     // total discount
  "tax": 0,                          // future
  "payments": [
    { "method": "cash", "amount": 30000 },
    { "method": "mpesa", "amount": 20000 }
  ],
  "suspended": false,
  "receiptNumber": "INV-001"          // auto‑generated if omitted
}
```
**Response:**
```json
{
  "saleId": "sale_123",
  "receiptNumber": "INV-001",
  "totalAmount": 50000,
  "grandTotal": 50000,
  "changeDue": 0,
  "createdAt": "2026-08-05T12:00:00Z"
}
```

**PUT /sales/:id/refund** Request:
```json
{
  "reason": "Customer returned item",
  "items": [ { "productId": "prod_1", "quantity": 1 } ]  // optional; if not provided, full refund
}
```

---

### 7.6 Inventory Module

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/shops/:id/products` | List products (search, filter) | ✅ |
| GET | `/shops/:id/products/low-stock` | Get low stock items | ✅ |
| GET | `/products/:id` | Get product details | ✅ |
| POST | `/shops/:id/products` | Create product | ✅ |
| PUT | `/products/:id` | Update product | ✅ |
| DELETE | `/products/:id` | Archive product | ✅ |
| POST | `/products/:id/adjust-stock` | Stock adjustment | ✅ |
| GET | `/products/:id/stock-history` | Stock adjustment history | ✅ |
| GET | `/shops/:id/inventory/valuation` | Stock valuation report | ✅ |
| POST | `/shops/:id/categories` | Create category | ✅ |
| GET | `/shops/:id/categories` | List categories | ✅ |

**POST /shops/:id/products** Request:
```json
{
  "name": "Coca Cola 500ml",
  "sku": "CC-500-01",
  "categoryId": "cat_1",
  "supplier": "ABC Distributors",
  "brand": "Coca-Cola",
  "costPrice": 800,
  "sellingPrice": 1500,
  "minPrice": 1200,
  "maxPrice": 1800,
  "reorderLevel": 20,
  "stockQuantity": 100,
  "unit": "bottle",
  "unitConversion": null,            // e.g., 12 for box
  "images": [ /* file uploads */ ]
}
```

**POST /products/:id/adjust-stock** Request:
```json
{
  "quantityChange": 10,               // positive = add, negative = remove
  "reason": "Restock from supplier"
}
```

---

### 7.7 Expenses Module

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/shops/:id/expenses` | Record expense | ✅ |
| GET | `/shops/:id/expenses` | List expenses (filters) | ✅ |
| GET | `/expenses/:id` | Get expense details | ✅ |
| PUT | `/expenses/:id` | Update expense | ✅ |
| DELETE | `/expenses/:id` | Delete expense | ✅ |
| GET | `/shops/:id/expenses/categories` | List expense categories | ✅ |
| POST | `/shops/:id/expenses/categories` | Create expense category | ✅ |

**POST /shops/:id/expenses** Request:
```json
{
  "category": "Transport",
  "amount": 15000,
  "description": "Fuel for delivery",
  "expenseDate": "2026-08-05",
  "receiptFile": (multipart file, optional)
}
```

---

### 7.8 Customers & Credit Module

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/shops/:id/customers` | List customers | ✅ |
| POST | `/shops/:id/customers` | Create customer | ✅ |
| GET | `/customers/:id` | Get customer details (with balance) | ✅ |
| PUT | `/customers/:id` | Update customer | ✅ |
| DELETE | `/customers/:id` | Archive customer | ✅ |
| GET | `/customers/:id/purchase-history` | Get customer purchase history | ✅ |
| POST | `/customers/:id/credit-payment` | Record credit repayment | ✅ |
| GET | `/customers/:id/credit-history` | Get credit/payment history | ✅ |
| GET | `/shops/:id/credit/outstanding` | List all outstanding credit balances | ✅ |
| POST | `/shops/:id/credit/remind` | Send SMS reminder to customer | ✅ |

**POST /shops/:id/customers** Request:
```json
{
  "name": "Mwanamke Mjane",
  "phone": "255712345680",
  "email": "mwanamke@example.com",
  "address": "Kariakoo, Dar es Salaam",
  "notes": "Prefers morning delivery"
}
```

**POST /customers/:id/credit-payment** Request:
```json
{
  "amount": 25000,
  "paymentDate": "2026-08-05",
  "method": "cash",
  "saleId": "sale_123"              // optional – if repaying a specific sale
}
```

---

### 7.9 Loans Module

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/shops/:id/loans` | List loans | ✅ |
| POST | `/shops/:id/loans` | Add a loan | ✅ |
| GET | `/loans/:id` | Get loan details | ✅ |
| PUT | `/loans/:id` | Update loan | ✅ |
| POST | `/loans/:id/repay` | Record loan repayment | ✅ |
| GET | `/shops/:id/loans/outstanding` | List outstanding loans | ✅ |

**POST /shops/:id/loans** Request:
```json
{
  "lender": "CRDB Bank",
  "amount": 5000000,
  "interestRate": 12.5,               // percentage
  "dueDate": "2026-12-31",
  "remainingBalance": 5000000
}
```

**POST /loans/:id/repay** Request:
```json
{
  "amount": 1000000,
  "repaymentDate": "2026-08-05"
}
```

---

### 7.10 Reports Module

All reports support query parameters:
- `from` (YYYY-MM-DD)
- `to` (YYYY-MM-DD)
- `format` (json, pdf, xlsx, csv) – default `json`
- `shopId` (if calling from combined view)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/shops/:id/reports/sales` | Sales report | ✅ |
| GET | `/shops/:id/reports/inventory` | Inventory valuation | ✅ |
| GET | `/shops/:id/reports/profit` | Estimated profit report | ✅ |
| GET | `/shops/:id/reports/expenses` | Expense report | ✅ |
| GET | `/shops/:id/reports/credit` | Credit outstanding report | ✅ |
| GET | `/shops/:id/reports/loans` | Loans report | ✅ |
| GET | `/shops/:id/reports/cashflow` | Cash flow report | ✅ |
| GET | `/shops/:id/reports/employees` | Employee performance report | ✅ |
| GET | `/shops/:id/reports/business-valuation` | Business valuation report | ✅ |
| GET | `/shops/:id/reports/payment-methods` | Payment method breakdown | ✅ |
| GET | `/shops/combined-reports/sales` | Combined sales (all shops) | ✅ (Owner) |

**Response for `format=json`:**
```json
{
  "summary": {
    "totalSales": 450000,
    "totalItems": 120,
    "averageTicket": 15000
  },
  "data": [ /* rows */ ]
}
```
For `pdf`, `xlsx`, `csv` – the response is a file download with appropriate `Content-Disposition`.

---

### 7.11 Sync Module

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/sync/push` | Upload local changes | ✅ |
| GET | `/sync/pull` | Download server changes (since timestamp) | ✅ |
| GET | `/sync/status` | Get sync metadata for device | ✅ |
| POST | `/sync/force` | Force full sync (rare) | ✅ |

**POST /sync/push** Request:
```json
{
  "shopId": "shop_123",
  "deviceId": "device_abc",
  "changes": {
    "sales": [
      { "clientId": "sale_cli_1", "data": { ... }, "lastModified": "2026-08-05T11:00:00Z" }
    ],
    "stockAdjustments": [ ... ],
    "expenses": [ ... ],
    "creditPayments": [ ... ]
  }
}
```

**Response:**
```json
{
  "processed": { "sales": ["sale_cli_1"], "expenses": [] },
  "failed": { "sales": [ { "clientId": "sale_cli_2", "reason": "Product not found" } ] },
  "serverVersion": "2026-08-05T11:05:00Z"
}
```

**GET /sync/pull?shopId=shop_123&since=2026-08-05T11:00:00Z&limit=500**
**Response:**
```json
{
  "changes": {
    "sales": [ /* full sale objects from server */ ],
    "products": [ /* changed products */ ],
    "customers": [ /* changed customers */ ],
    "expenses": [ /* changed expenses */ ]
  },
  "serverVersion": "2026-08-05T11:05:00Z",
  "hasMore": false
}
```

---

### 7.12 Notifications & SMS Module

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/notifications` | List in‑app notifications | ✅ |
| PUT | `/notifications/:id/read` | Mark as read | ✅ |
| PUT | `/notifications/read-all` | Mark all as read | ✅ |
| POST | `/notifications/send-sms` | Send SMS to customer(s) | ✅ |
| POST | `/notifications/send-bulk-sms` | Bulk SMS (premium) | ✅ |

**POST /notifications/send-sms** Request:
```json
{
  "shopId": "shop_123",
  "phone": "255712345680",
  "message": "Dear Mwanamke, your credit balance is TZS 45,000. Please pay by end of month."
}
```

---

### 7.13 Backup & Restore Module

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/backup/export` | Generate and download backup | ✅ |
| POST | `/backup/restore` | Restore from uploaded backup | ✅ |
| GET | `/backup/list` | List available backups (future) | ✅ |

**POST /backup/export** Request:
```json
{
  "shopId": "shop_123",
  "include": ["sales", "products", "customers", "expenses", "loans"] // all by default
}
```
Response: `application/json` file download.

**POST /backup/restore** – multipart file upload of a previously exported backup.  
Server validates schema, clears existing data (for the shop), and re‑creates records.

---

### 7.14 Admin / Agent Module

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/admin/agents` | System Owner creates Agent | ✅ (System Owner) |
| GET | `/admin/agents` | List Agents | ✅ (System Owner) |
| PUT | `/admin/agents/:id` | Update Agent | ✅ (System Owner) |
| POST | `/agents/onboard` | Agent creates Business Owner | ✅ (Agent) |
| GET | `/agents/businesses` | List businesses onboarded by Agent | ✅ (Agent) |
| GET | `/admin/platform-stats` | System stats (total shops, users, sales) | ✅ (System Owner) |

**POST /agents/onboard** Request:
```json
{
  "phone": "255712345678",
  "name": "Jane Shop Owner",
  "email": "jane@shop.com",
  "shopName": "Jane's Grocery",
  "shopAddress": "Dar es Salaam"
}
```
- Creates Business Owner user (inactive until OTP verified).
- Creates first shop.
- Sends welcome SMS with app download link.

---

### 7.15 Activity Logs Module

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/shops/:id/activity-logs` | List activity logs (with filters) | ✅ (Owner) |
| GET | `/activity-logs/:id` | Get log detail | ✅ (Owner) |

**GET /shops/:id/activity-logs?action=SALE_CREATED&from=2026-08-01&to=2026-08-05**  
**Response:** `{ data: [ { user: "John", action: "SALE_CREATED", details: { receipt: "INV-001" }, createdAt: "..." } ] }`

---

### 7.16 Settings Module

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/shops/:id/settings` | Get shop settings | ✅ |
| PUT | `/shops/:id/settings` | Update shop settings | ✅ |
| POST | `/shops/:id/settings/receipt` | Update receipt template | ✅ |
| PUT | `/users/me/pin` | Change PIN | ✅ |
| PUT | `/users/me/preferences` | Update app preferences (theme, language) | ✅ |

**PUT /shops/:id/settings** Request:
```json
{
  "currency": "TZS",
  "language": "sw",
  "receiptHeader": "Mwaminifu Shop",
  "receiptFooter": "Thank you for shopping with us!",
  "taxNumber": "123-456-789",
  "printerSettings": { "type": "bluetooth", "macAddress": "..." }
}
```

---

## 8. Synchronisation Protocol (Detailed)

### 8.1 Local Record Metadata
Every mutable entity (Sale, Product, Customer, Expense, etc.) in the client DB has:
- `clientId` (UUID) – immutable local identifier.
- `serverId` (string) – server‑assigned ID after first sync; `null` if pending.
- `lastModifiedAt` (timestamp) – client‑side version.
- `syncStatus` – `pending`, `synced`, `conflict`.
- `isDeleted` (boolean) – soft delete flag.

### 8.2 Push Flow (Client → Server)
1. Client collects all records with `syncStatus = pending`.
2. Groups by entity type and sends via `POST /sync/push`.
3. Server processes records **atomically** in a transaction per shop.
4. Server validates each record against business rules.
5. For each record, server:
   - If `clientId` is new – inserts, creates `serverId`, returns mapping.
   - If `clientId` exists and `lastModifiedAt` is newer than server’s version – updates (server wins).
   - If conflict (server version newer) – returns `conflict` with server version.
6. Client receives response, updates local records:
   - `synced` – set `serverId`, `syncStatus = synced`.
   - `conflict` – overwrite local with server version; notify user if needed.

### 8.3 Pull Flow (Server → Client)
1. Client sends `since` timestamp (last successful pull).
2. Server queries all entities (`sales`, `products`, `customers`, `expenses`, `loans`, `stockAdjustments`, `employees`) with `updatedAt > since`.
3. Server returns up to `limit` records (default 500), with a `cursor` for next page.
4. Client upserts these into local DB.

### 8.4 Conflict Resolution (MVP)
- **Server wins** automatically.
- If a client submits an update with an older `lastModifiedAt` than the server record, the server rejects with `409 CONFLICT` and returns the latest server version.
- The client then overwrites its local copy with the server version and may prompt the user to re‑apply their change (manual).

### 8.5 Sync Scheduling
- Triggered on app launch, on resume, and every 15 minutes while app is in background (using `workmanager`).
- User can manually trigger from settings.
- Exponential backoff: retry after 1, 2, 4, 8, 16, 32 minutes (max 1 hour).

### 8.6 Sync Metadata Table (`sync_metadata`)
Stored per `shopId` + `deviceId`:
- `lastPullTimestamp`
- `lastPushTimestamp`
- `pendingUploads` (count)
- `lastError` (message, timestamp)

---

## 9. Security Implementation

### 9.1 Data Encryption
- **At Rest:** PINs hashed with bcrypt; no plaintext secrets.
- **In Transit:** TLS 1.2/1.3 only (Render auto‑enforces).
- **JWT Secret:** 256‑bit random string, stored in environment.

### 9.2 Input Sanitisation
- Zod schemas for all request bodies, query params, and path params.
- Trim strings; convert phone numbers to international format.
- Escape HTML in product names/descriptions to prevent XSS (stored XSS not applicable in JSON APIs, but relevant for admin dashboard).

### 9.3 Rate Limiting
- **Global:** 100 requests per minute per IP.
- **OTP endpoints:** 5 requests per 15 minutes per phone.
- **Login (PIN):** 5 failed attempts per 15 minutes per phone; after 10, block for 1 hour.

### 9.4 CORS Configuration
```typescript
app.use(cors({
  origin: [
    'https://admin.mwaminifu.com',
    'https://app.mwaminifu.com',
    'http://localhost:3000',  // dev
    'http://localhost:8080'   // Flutter dev
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
```

### 9.5 Audit Logs
All state‑changing endpoints log to `activity_logs` table:
- `userId`, `shopId`, `action` (e.g., `PRODUCT_CREATED`, `SALE_REFUNDED`), `details` (JSON with before/after if needed), `ipAddress`, `userAgent`.

### 9.6 Session Management
- Tokens are invalidated on logout (refresh token deleted from DB).
- Short‑lived access tokens (30 days for mobile, 1 hour for web) with refresh tokens.

---

## 10. File Upload & Storage

### 10.1 Supported File Types
- Images: `jpg`, `jpeg`, `png`, `webp` (max 5MB).
- Backup files: `json` (max 50MB).

### 10.2 Upload Endpoint
```
POST /upload
Header: Authorization: Bearer <token>
Multipart form: { "file": ..., "type": "product-image" | "expense-receipt" | "shop-logo" | "backup" }
```
- Server validates file, generates a unique filename, uploads to Supabase Storage.
- Returns public URL (or signed URL for private buckets).

### 10.3 Image Optimisation
- Sharp library resizes images to:
  - Thumbnail: 150×150 (for product lists).
  - Medium: 600×600 (for detail view).
  - Original preserved (optional).
- URLs stored in DB point to the medium size; thumbnails are used in lists.

### 10.4 Supabase Storage Buckets
| Bucket | Visibility | Use |
|--------|------------|-----|
| `shop-logos` | Public | Shop logos, cover images. |
| `product-images` | Public | Product images. |
| `expense-receipts` | Private | Expense receipts (accessed via signed URLs, valid 1 hour). |
| `backups` | Private | Exported backups (only owner can download). |

---

## 11. Background Jobs & Scheduled Tasks

| Job | Schedule | Description |
|-----|----------|-------------|
| **Send Low Stock Alerts** | Daily at 08:00 | Check all shops; if product quantity ≤ reorderLevel, send push notification and save in‑app notification. |
| **Send Credit Reminders** | Daily at 09:00 | For customers with outstanding balance > 30 days, send SMS reminder (optional – owner config). |
| **Send Loan Reminders** | 3 days before due date | Send push notification to Business Owner. |
| **Clean Expired OTPs** | Hourly | Remove OTP records older than 5 minutes from Redis/DB. |
| **Clean Old Logs** | Monthly | Archive activity logs older than 12 months to cold storage. |

- Use `node-cron` or `bull` (if Redis available) for scheduling.

---

## 12. Environment Variables

All secrets and configuration are loaded via `.env` file.

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` / `production` |
| `PORT` | Server port | `5000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Secret for signing JWTs | `super_secret_key_256bits` |
| `JWT_ACCESS_EXPIRY` | Access token expiry (mobile) | `30d` |
| `JWT_REFRESH_EXPIRY` | Refresh token expiry | `60d` |
| `SMS_PROVIDER` | SMS provider | `africastalking` |
| `SMS_API_KEY` | Provider API key | `...` |
| `SMS_USERNAME` | Provider username | `...` |
| `SMS_SENDER_ID` | Sender ID | `MWAMINIFU` |
| `FCM_SERVER_KEY` | Firebase Cloud Messaging key | `...` |
| `SUPABASE_URL` | Supabase project URL | `https://project.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase public key | `...` |
| `SUPABASE_SERVICE_ROLE` | Service role key (private) | `...` |
| `SUPABASE_BUCKET_PRODUCTS` | Bucket name | `product-images` |
| `REDIS_URL` | Redis for OTP & rate limiting (optional) | `redis://localhost:6379` |
| `LOG_LEVEL` | Log level | `info` / `debug` |
| `CORS_ORIGIN` | Allowed origin | `https://admin.mwaminifu.com` |

---

## 13. Performance & Scaling Considerations

| Aspect | Strategy |
|--------|----------|
| **Database** | Use connection pooling (Prisma’s default pool size 10). Enable PgBouncer on Supabase for high concurrency. |
| **Caching** | Redis for OTP, rate limiting, and session blacklisting. |
| **Pagination** | All list endpoints support cursor‑based pagination with `limit` and `nextCursor`. |
| **Sync Payload** | Limit sync payload to 1MB per request; use gzip. For large shops, split into multiple requests. |
| **Image Serving** | Use Supabase CDN for fast image delivery; cache images on client side. |
| **Horizontal Scaling** | Node.js app is stateless; can scale to multiple instances behind a load balancer (future). |
| **Database Indexes** | Index `shopId`, `userId`, `saleDate`, `updatedAt`, `product.sku` to speed up queries. |

---

## 14. API Versioning Strategy

- **URL versioning:** `/api/v1/...`
- **Deprecation:** Announce 3 months in advance.
- **Backward compatibility:** v1 endpoints remain active for at least 6 months after v2 release.
- **Client support:** Mobile app will check API version on startup and prompt upgrade if major version mismatch.

---