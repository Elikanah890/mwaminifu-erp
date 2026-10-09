# Mwaminifu — Client Testing Guide

Welcome! This is a **test environment**. Please explore freely, but don't delete
the demo data so other testers can use it too.

- URL: `https://YOUR_DOMAIN` _(replace with the link you were given)_
- If asked for a username/password by the browser, use the **Basic Auth** login
  you were provided (separate from the app login below).

## Test accounts

| Role             | Login                        | Secret        | Notes |
|------------------|------------------------------|---------------|-------|
| System Owner     | username `admin`             | password `admin123` | Platform admin dashboard |
| Agent            | username `agent1`            | password `agent123` | Registers businesses, commissions |
| Business Owner   | phone `0754000000`           | OTP `123456` / PIN `123456` | Owns "John's Grocery" |
| Manager          | phone `0754111111`           | PIN `111111`  | Full operational staff |
| Cashier          | phone `0754222222`           | PIN `222222`  | Limited staff |

> OTP is always `123456` in this test environment (mock SMS). No real SMS is sent.

## What to test

**Business Owner / staff**
- Add/edit products (including multi-unit: Bottle + Carton with base stock).
- Scan a barcode in the POS (camera or USB scanner) and complete a sale.
- Record an expense, collect a customer credit payment.
- Employees: grant/revoke permissions and confirm the staff member sees/hides
  actions after refresh (no re-login needed).

**System Owner / Agent**
- View platform dashboard, businesses, subscriptions, revenue.
- Register a new business as an agent.

**Offline (PWA)**
- Load once online, then switch off Wi‑Fi: POS should still open with cached
  products/customers; a sale should queue and sync when you reconnect.

**Swahili / English** — switch language in Settings.

## What NOT to do
- Do not delete or bulk-edit existing products/customers/sales (shared demo data).
- Do not change the System Owner / Business Owner credentials.
- Do not run the seed script yourself.

## Reporting bugs
Send: (1) what you did, (2) what you expected, (3) what happened, (4) screenshot
if possible, (5) your role + the exact time. Email/WhatsApp your contact.

Thank you for testing Mwaminifu! / Asante kwa kufanya majaribio!
