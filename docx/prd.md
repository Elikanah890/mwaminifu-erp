# 01_PRD.docx – Product Requirements Document

**Project Name:** Mwaminifu App  
**Version:** 1.0 (MVP)  
**Status:** Draft  
**Prepared By:** [System Owner / Product Team]  
**Date:** 2026-08-05  

---

## Table of Contents

1. Introduction  
2. Product Overview  
3. Business Goals  
4. User Roles  
5. User Journey  
6. Core Features  
7. Functional Requirements  
8. Non‑Functional Requirements  
9. User Permissions  
10. Business Rules  
11. Success Metrics  
12. Assumptions  
13. Risks  
14. Future Roadmap  
15. Acceptance Criteria  

---

## 1. Introduction

### 1.1 Purpose
Mwaminifu App is an offline‑first ERP system designed specifically for small and medium‑sized enterprises (SMEs) in Tanzania. It replaces paper‑based records and basic accounting tools with a modern, mobile‑first platform that works even when internet connectivity is unreliable.

The purpose of this document is to define the complete product requirements for Version 1 (MVP). It serves as the single source of truth for designers, developers, testers, and stakeholders, ensuring that everyone understands what the product does, why it exists, and how it should behave.

### 1.2 Vision
To become the most trusted business management tool for Tanzanian SMEs – empowering shop owners to run their operations efficiently, make data‑driven decisions, and grow their businesses, regardless of their location or technical expertise.

### 1.3 Objectives
- Digitize daily business operations (sales, inventory, expenses, credit).  
- Enable offline operation with automatic synchronisation.  
- Provide real‑time visibility into business health.  
- Reduce manual errors and bookkeeping effort.  
- Improve inventory accuracy and reduce stock‑outs.  
- Simplify customer credit (deni) tracking and collection.  
- Prepare businesses for future growth with a scalable architecture.

### 1.4 Scope (Version 1)
The MVP includes:
- Authentication (PIN + OTP for business owners, PIN for employees).  
- Multi‑shop management (up to 5 shops per business owner).  
- Employee management (up to 5 employees per shop).  
- Point of Sale (POS) with split payments, receipts, and suspend/resume.  
- Inventory management (products, categories, suppliers, low stock alerts).  
- Expense tracking with categories and receipt photos.  
- Customer credit (deni) with repayment history.  
- Business loans management.  
- Comprehensive reports (sales, inventory, profit, cash flow, etc.) with export to PDF, Excel, CSV.  
- Offline‑first architecture with background sync.  
- Responsive design (mobile app + admin web dashboard).  
- System Owner, Agent, Business Owner, and Employee roles.  
- Free subscription (payment enforcement disabled).  
- SMS communication (Tanzanian gateway).  
- Backup & restore.

### 1.5 Out of Scope (Future Versions)
- WhatsApp and email marketing (Coming Soon).  
- Barcode scanning (camera).  
- Tax integration (VAT).  
- Purchase orders.  
- Supplier management.  
- Advanced AI insights.  
- Batch/expiry tracking.  
- Loyalty points.  
- Unlimited employees (Premium plan).  
- Payment gateway integration (ClickPesa, etc.).

---

## 2. Product Overview

### What is Mwaminifu App?
Mwaminifu App is a comprehensive business management solution that combines POS, inventory, accounting, and customer relationship tools into a single, easy‑to‑use application. It is built for Tanzanian SMEs and designed to work seamlessly online and offline.

### Who is it for?
- **Shop Owners** – running retail stores, pharmacies, grocery shops, hardware stores, etc.  
- **Employees** – cashiers and store assistants.  
- **Agents** – who onboard business owners and provide support.  
- **System Owner** – who manages the overall platform.

### Problems it solves
- Lost sales due to poor inventory management.  
- Forgotten credit (deni) and delayed repayments.  
- Manual, error‑prone bookkeeping.  
- No visibility into business performance.  
- Difficulty managing multiple shops.  
- Unreliable internet – work offline, sync later.  
- No standardised way to track expenses and loans.

### Benefits
- **Real‑time insights** – dashboard shows sales, profit, low stock, credit.  
- **Offline capability** – keep working even without internet.  
- **Simplified credit management** – track every customer’s balance.  
- **Accurate inventory** – low stock alerts and reorder levels.  
- **Multi‑shop support** – manage all shops from one account.  
- **Comprehensive reports** – export data for tax or analysis.  
- **Employee control** – set permissions for each employee.  
- **Secure authentication** – OTP + PIN for safe access.

---

## 3. Business Goals

- **Empower SMEs** – provide affordable, easy‑to‑use digital tools.  
- **Reduce manual workload** – automate daily accounting tasks.  
- **Improve decision‑making** – give owners clear data on sales, profit, and trends.  
- **Build trust** – reliable offline sync and data safety.  
- **Prepare for scaling** – architecture supports future premium features and growth.

---

## 4. User Roles

### 4.1 System Owner
- Manages the entire Mwaminifu platform.  
- Creates and manages Agents.  
- Has full access to all systems (super admin).  
- Handles platform‑level support and monitoring.  
- Authenticates via username + password (web dashboard).

### 4.2 Agent
- Onboards Business Owners.  
- Provides first‑level support and training.  
- Can view performance of businesses they have onboarded.  
- Authenticates via username + password (web dashboard/mobile app – optional).  
- Does **not** have access to business data unless granted.

### 4.3 Business Owner
- Owns and manages one or more shops.  
- Creates shops, employees, and sets permissions.  
- Views all reports and analytics.  
- Manages inventory, expenses, credit, loans.  
- Authenticates via phone number + OTP (first login) and PIN (daily).  
- Has full control over their business data.

### 4.4 Employee
- Works in a specific shop.  
- Performs sales, records expenses (if permitted), and views assigned data.  
- Cannot access financial reports or system settings.  
- Authenticates via phone number + PIN.  
- Permissions are assigned by the Business Owner.

---

## 5. User Journey

The complete end‑to‑end flow is:

1. **System Owner** creates an Agent account (via admin web dashboard).  
2. **Agent** logs in and creates a Business Owner account (provides phone number, name, etc.).  
3. **Business Owner** receives a welcome SMS with a link to download the app.  
4. Business Owner installs the app, enters their phone number, and receives an OTP.  
5. After OTP verification, they create a 6‑digit PIN.  
6. Business Owner logs in using phone + PIN.  
7. They create their first shop (name, location, default categories).  
8. They can add products, start recording sales, add expenses, etc.  
9. They can add employees: enter employee phone number, name, and assign permissions.  
10. Employee receives an SMS invitation, installs app, enters phone number, sets PIN, and logs in.  
11. Employee can start recording sales, etc., based on permissions.  
12. Business Owner can add multiple shops and switch between them.  
13. All data is stored locally and synced to the cloud when online.  
14. Business Owner can export reports, manage credit, loans, and view dashboards.

---

## 6. Core Features

Detailed description of each major feature.

### 6.1 Authentication
- **Business Owner** – OTP on first login, new device, or PIN reset; daily login uses phone + PIN.  
- **Employee** – phone + PIN only (no OTP).  
- **Agent/System Owner** – username + password (web).  
- Secure session management with JWT.

### 6.2 Shop Management
- Create, edit, and archive shops.  
- Each shop has its own inventory, sales, expenses, employees, and settings.  
- Business Owner can switch between shops easily.  
- Shop branding (logo, cover image) appears on dashboard and receipts.

### 6.3 Employee Management
- Business Owner adds employee (name, phone, role).  
- Employee receives SMS invitation.  
- Business Owner can enable/disable employees and reset PIN.  
- Permission system: each employee has specific privileges (record sales, view inventory, record expenses, manage credit, refunds, etc.).  
- Employee can only see their own shift data and assigned shops.

### 6.4 Sales (POS)
- Search products by name, category, or SKU.  
- Add products to cart with quantity, unit (bottle/box), and discounts.  
- Split payment: cash, M‑Pesa, Airtel Money, Mixx, or credit.  
- Print receipt (Bluetooth printer) or share via WhatsApp (Coming Soon).  
- Suspend/resume sales.  
- Refund and void transactions (with appropriate permissions).  
- Display product images and fast‑selling items.

### 6.5 Inventory
- Add, edit, delete products (name, SKU, category, supplier, brand, images).  
- Set cost price, selling price, min/max price, reorder level.  
- Track stock levels with low stock alerts.  
- Record stock adjustments (add, remove, transfer).  
- View stock history, valuation, and expiry (future).  
- Bulk import/export (future).

### 6.6 Expenses
- Record daily expenses (amount, category, description, receipt photo).  
- View expense history with filters (today, week, month, custom).  
- Analytics: monthly expense breakdown by category.

### 6.7 Customer Credit (Deni)
- Maintain customer list (name, phone, email, address, notes).  
- Record sales on credit – automatically adds to customer balance.  
- Accept partial repayments and track payment history.  
- View outstanding balances and send reminders (SMS).  
- Customer purchase history.

### 6.8 Business Loans
- Record loans taken (amount, lender, interest rate, due date).  
- Track repayments and remaining balance.  
- Loan history and reminders.

### 6.9 Reports
Exportable to PDF, Excel, CSV:
- Sales reports (daily, weekly, monthly, custom).  
- Inventory report (stock levels, valuation, fast/slow‑moving).  
- Profit report (estimated).  
- Expense report.  
- Credit (deni) report.  
- Business loan report.  
- Employee performance report.  
- Shift reports.  
- Cash flow and business valuation.  
- Payment method breakdown.

### 6.10 Dashboard
- KPI cards: today’s sales, profit, cash in hand, mobile money received, credit given, expenses, low stock items, pending orders.  
- Charts: sales trend (7/30 days), top‑selling products, payment method breakdown, monthly revenue.  
- Quick actions: new sale, add product, restock, add expense, record payment, add customer, add employee, reports.

### 6.11 Notifications
- Low stock and out‑of‑stock alerts.  
- Subscription/expiry reminders (future).  
- Loan and credit repayment reminders.  
- Sync status and failed sync alerts.

### 6.12 Support Center
- Private chat between System Owner ↔ Agent and Agent ↔ Business Owner.  
- Employees contact their Business Owner, who escalates to Agent if needed.  
- FAQ and video tutorials.

### 6.13 Backup & Restore
- Business Owner can export a full backup (JSON) and later restore it.  
- This complements automatic cloud sync and helps with device migration.

### 6.14 Offline Mode
- All data stored locally using SQLite (Drift).  
- Background sync with retry queue.  
- Conflict handling (server wins by default; later with manual merge).

### 6.15 Multi‑Shop Management
- Switch between shops without logging out.  
- Combined dashboard and reports for all shops (owner only).  
- Compare shop performance.

### 6.16 Settings
- Business profile (logo, name, address).  
- Receipt settings (header, footer, tax number).  
- Printer configuration (Bluetooth).  
- Language (English/Swahili).  
- Currency.  
- Backup/restore.  
- Change PIN/password.  
- Theme (light/dark).

### 6.17 Messaging (SMS)
- Send promotional or reminder SMS to customers.  
- Use local Tanzanian SMS gateway.  
- WhatsApp and email are flagged as “Coming Soon”.

### 6.18 Subscription (Future)
- Version 1 is free; however, database tables are ready.  
- Plans: Basic (free, 5 employees/shop) and Premium (paid, unlimited).  
- Payment enforcement is disabled for MVP.

---

## 7. Functional Requirements

This section lists the high‑level functional requirements for each module.

| Module | Requirement ID | Description |
|--------|---------------|-------------|
| **Authentication** | AUTH‑01 | Business Owner must register via Agent; no public self‑registration. |
| | AUTH‑02 | OTP sent via SMS for first login, new device, or PIN reset. |
| | AUTH‑03 | Daily login uses phone number + 6‑digit PIN. |
| | AUTH‑04 | Employee login uses phone number + PIN only. |
| | AUTH‑05 | Agent/System Owner login uses username + password. |
| **Shop Management** | SHOP‑01 | Business Owner can create up to 5 shops. |
| | SHOP‑02 | Each shop has name, address, logo, cover image, default currency. |
| | SHOP‑03 | Business Owner can archive a shop (hide from main view). |
| **Employee Management** | EMP‑01 | Business Owner can add up to 5 employees per shop (Basic plan). |
| | EMP‑02 | Employee receives SMS invitation with download link. |
| | EMP‑03 | Business Owner can assign permissions: POS, Inventory, Expenses, Credit, Reports, Refunds. |
| | EMP‑04 | Employee cannot access other shops or view financial analytics unless permitted. |
| **Sales (POS)** | POS‑01 | Add products to cart; support multiple units (bottle/box) with conversion. |
| | POS‑02 | Apply discount per item or total. |
| | POS‑03 | Split payment across cash, mobile money, and credit. |
| | POS‑04 | Generate receipt with shop details, items, totals, and payment breakdown. |
| | POS‑05 | Suspend sale and resume later. |
| | POS‑06 | Refund or void a sale (with permission). |
| **Inventory** | INV‑01 | Add product with name, SKU, category, supplier, images, cost price, selling price, reorder level. |
| | INV‑02 | Adjust stock (add/remove) with reason. |
| | INV‑03 | Low stock alert when quantity ≤ reorder level. |
| | INV‑04 | View stock history and valuation. |
| **Expenses** | EXP‑01 | Record expense with amount, category, description, photo. |
| | EXP‑02 | View expense list filtered by date/category. |
| **Customer Credit** | CRD‑01 | Create customer with name, phone, email, address. |
| | CRD‑02 | Record sale on credit – adds to customer’s outstanding balance. |
| | CRD‑03 | Record partial repayment and update balance. |
| | CRD‑04 | Send SMS reminder (future: automated). |
| **Business Loans** | LON‑01 | Add loan with amount, lender, interest, due date. |
| | LON‑02 | Record repayments and track remaining balance. |
| **Reports** | RPT‑01 | Generate sales report for date range. |
| | RPT‑02 | Export report to PDF, Excel, CSV. |
| | RPT‑03 | Profit report (estimated). |
| | RPT‑04 | Inventory valuation report. |
| | RPT‑05 | Credit outstanding report. |
| **Dashboard** | DSH‑01 | Show KPI cards with today’s figures. |
| | DSH‑02 | Display charts for sales trend, top products, payment methods. |
| | DSH‑03 | Quick action buttons for common tasks. |
| **Notifications** | NOT‑01 | Show low stock notification on dashboard and push notification. |
| | NOT‑02 | Show sync status and errors. |
| **Support** | SUP‑01 | In‑app chat between System Owner–Agent and Agent–Business Owner. |
| | SUP‑02 | FAQ and video tutorials accessible offline. |
| **Backup** | BAK‑01 | Export full database backup (JSON) to local storage. |
| | BAK‑02 | Restore from backup file. |
| **Offline Sync** | OFL‑01 | All transactions stored locally; sync when online. |
| | OFL‑02 | Retry queued operations on failure. |
| | OFL‑03 | Conflict resolution: server version overwrites client. |
| **Multi‑Shop** | MSH‑01 | Business Owner can switch active shop from a dropdown. |
| | MSH‑02 | Combined dashboard showing totals across all shops. |
| **Settings** | SET‑01 | Update business profile, receipt settings, printer, language, currency. |
| | SET‑02 | Change PIN/password. |
| **Messaging** | MSG‑01 | Send SMS to customers (single or bulk). |
| | MSG‑02 | WhatsApp and email buttons are “Coming Soon”. |
| **Subscription** | SUB‑01 | Version 1 is free; all accounts active. |
| | SUB‑02 | Subscription tables exist but payment logic disabled. |

---

## 8. Non‑Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | – App launch < 3 seconds. <br> – POS transaction processing < 1 second. <br> – Sync should complete within 30 seconds for typical daily data. |
| **Offline‑first** | – 100% of features work without internet. <br> – Sync automatically when connection is available. <br> – Clear indication of sync status. |
| **Security** | – PINs stored as hashed values (bcrypt). <br> – OTP expires in 5 minutes. <br> – All API calls over HTTPS. <br> – JWT with short expiration and refresh token. |
| **Reliability** | – Data loss protection: local database is transactional. <br> – Retry mechanism for failed sync operations. <br> – Automatic backups (optional). |
| **Usability** | – Simple, intuitive UI with Swahili and English support. <br> – Large buttons for POS. <br> – Clear error messages and confirmation dialogs. |
| **Scalability** | – Architecture supports up to 10,000 shops per system owner. <br> – Database designed for future multi‑tenant expansion. |
| **Maintainability** | – Modular code with clear separation of concerns. <br> – Well‑commented code. <br> – Comprehensive logging and monitoring. |
| **Responsiveness** | – Mobile app works on phones (4.7"–6.5") and tablets. <br> – Admin dashboard works on desktop, tablet, and mobile browsers. |
| **Compliance** | – Data privacy aligned with Tanzanian laws (future). <br> – User consent for SMS. |

---

## 9. User Permissions

High‑level permission matrix (version 1).

| Feature | System Owner | Agent | Business Owner | Employee |
|---------|-------------|-------|----------------|----------|
| Manage Agents | ✅ | ❌ | ❌ | ❌ |
| Create Business Owner | ❌ | ✅ | ❌ | ❌ |
| Manage own profile | ✅ | ✅ | ✅ | ✅ |
| Create/Manage Shops | ❌ | ❌ | ✅ (up to 5) | ❌ |
| Manage Employees | ❌ | ❌ | ✅ (up to 5 per shop) | ❌ |
| POS (Sales) | ❌ | ❌ | ✅ | ✅ (if permitted) |
| View Inventory | ❌ | ❌ | ✅ | ✅ (if permitted) |
| Manage Inventory (CRUD) | ❌ | ❌ | ✅ | ✅ (if permitted) |
| Manage Expenses | ❌ | ❌ | ✅ | ✅ (if permitted) |
| Manage Customer Credit | ❌ | ❌ | ✅ | ✅ (if permitted) |
| Manage Loans | ❌ | ❌ | ✅ | ❌ |
| View Reports | ❌ | ❌ | ✅ | ❌ (except own shift report) |
| Export Reports | ❌ | ❌ | ✅ | ❌ |
| View Analytics | ❌ | ❌ | ✅ | ❌ |
| Manage Subscriptions | ✅ | ❌ | ❌ | ❌ |
| Manage System Settings | ✅ | ❌ | ❌ | ❌ |
| Business Settings | ❌ | ❌ | ✅ | ❌ |
| Backup/Restore | ❌ | ❌ | ✅ | ❌ |
| Send SMS to Customers | ❌ | ❌ | ✅ | ❌ |
| Support Chat | ✅ (with Agent) | ✅ (with Owner & System Owner) | ✅ (with Agent) | ❌ (chat with Owner only) |

---

## 10. Business Rules

1. **No Public Registration** – Only Agents can create Business Owners.  
2. **OTP Usage** – OTP is sent only for first login, new device, app re‑installation, PIN reset, or phone number change (future).  
3. **PIN Requirement** – All users must set a 6‑digit PIN; daily login uses PIN only.  
4. **Shop Limit** – Each Business Owner can create a maximum of 5 shops in Version 1.  
5. **Employee Limit** – Each shop can have a maximum of 5 employees (Basic plan).  
6. **Version 1 is Free** – No payment required; subscription logic is disabled.  
7. **Offline by Default** – All operations work offline; sync occurs in background.  
8. **Data Ownership** – Business Owner owns all data; employees can only access what is permitted.  
9. **Synchronisation** – Server data is authoritative; local changes are merged during sync.  
10. **Reports Export** – All reports support PDF, Excel, and CSV formats.  
11. **Categories** – Shops are pre‑seeded with default categories; owners can add custom ones.  
12. **Credit** – Sales on credit update customer balance; payments can be partial.  
13. **Backup** – Backup and restore are manual actions; cloud sync is automatic.  
14. **Communication** – Employees cannot directly contact System Owner; they go through Business Owner.

---

## 11. Success Metrics

For Version 1, we will measure:
- **Number of registered businesses** (target: 500 in first 3 months).  
- **Daily active users** (business owners and employees).  
- **Sales transactions recorded per day** (average).  
- **Offline usage** – percentage of transactions performed offline.  
- **Sync success rate** – > 95% of sync attempts succeed on first retry.  
- **Customer credit repayment rate** – track if credit management reduces overdue balances.  
- **User satisfaction** – feedback via in‑app surveys.  
- **Support ticket volume** – fewer than 2 tickets per business per month.

---

## 12. Assumptions

- Users have access to an Android smartphone (version 8 or higher) and basic literacy.  
- Internet connectivity is intermittent; users may be offline for hours.  
- SMS service (Tanzanian gateway) is available and reliable.  
- Businesses operate primarily in Tanzania; currency is TZS.  
- Users are comfortable with mobile apps and basic navigation.  
- The system will be deployed on a single server initially; scaling will be addressed later.  
- Payment gateway integration is not required for MVP.

---

## 13. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| SMS delivery delays or failures | Medium | High | Use multiple SMS providers; implement retry; provide fallback (resend OTP). |
| Device storage limitations | Low | Medium | Optimise database size; allow manual cleanup; compress images. |
| Poor internet connectivity | High | Medium | Offline‑first design; background sync; user awareness. |
| User training needs | High | Medium | Provide video tutorials, FAQ, and in‑app guidance. |
| Data loss due to device failure | Medium | High | Automatic cloud sync; manual backup option. |
| Performance issues with large datasets | Low | High | Database indexing; pagination; future scaling plans. |
| Security breach (PIN/OTP) | Low | Very High | Use hashed PINs; expire OTP; HTTPS; regular security reviews. |

---

## 14. Future Roadmap (Post‑MVP)

| Version | Features |
|---------|----------|
| **1.1** | – WhatsApp integration for receipts and promotions. <br> – Email campaigns. <br> – Barcode scanning (camera). <br> – Batch/expiry tracking. |
| **1.2** | – Subscription billing (Premium plan). <br> – Unlimited employees. <br> – Advanced analytics (AI insights). |
| **1.3** | – Supplier management and purchase orders. <br> – Tax (VAT) integration. <br> – Loyalty points. |
| **2.0** | – E‑commerce integration (online store). <br> – Integration with Tanzanian payment gateways (ClickPesa, Selcom). <br> – Multi‑branch inventory transfer. <br> – HR and payroll. |

---

## 15. Acceptance Criteria for Version 1

The MVP is considered complete when:

- [ ] Business Owner can register via Agent and log in with OTP + PIN.  
- [ ] Employee can log in with phone + PIN.  
- [ ] Business Owner can create up to 5 shops.  
- [ ] Business Owner can add up to 5 employees per shop and set permissions.  
- [ ] POS works offline: product search, cart, split payments, receipt printing, suspend/resume.  
- [ ] Inventory: add/edit/delete products, adjust stock, low stock alerts.  
- [ ] Expenses: record, categorize, attach photo.  
- [ ] Customer credit: create customers, record credit sales, partial repayments, view balances.  
- [ ] Loans: add loans, record repayments, view balance.  
- [ ] Dashboard displays correct KPIs and charts.  
- [ ] All reports are generated and exportable to PDF, Excel, CSV.  
- [ ] Offline sync works: data is saved locally and uploaded when online.  
- [ ] Sync status is visible; retry on failure.  
- [ ] Business Owner can switch shops and view combined dashboard.  
- [ ] Employees see only permitted features.  
- [ ] Support chat works between System Owner–Agent and Agent–Business Owner.  
- [ ] Backup and restore functions work.  
- [ ] SMS messages can be sent to customers.  
- [ ] Settings: profile, receipt, printer, language, currency, change PIN.  
- [ ] No payment enforcement; all accounts active.

-