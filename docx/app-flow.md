# 05_APP_FLOW.docx – Complete User Flows (Production-Ready)

**Project Name:** Mwaminifu App  
**Version:** 1.0 (MVP)  
**Status:** Draft  
**Prepared By:** Product/Technical Team  
**Date:** 2026-08-06  

---

## Table of Contents

1. Introduction  
   - 1.1 Purpose  
   - 1.2 Scope  
   - 1.3 Roles Defined  

2. Flow Conventions  
   - 2.1 Notation  
   - 2.2 Decision Points  

3. High-Level User Journey Map  
   - 3.1 End-to-End Onboarding Journey  
   - 3.2 Daily Operations Journey  

4. Detailed Flows by Role  
   - 4.1 System Owner Flows  
     - 4.1.1 System Owner Login  
     - 4.1.2 Create Agent Account  
     - 4.1.3 View Platform Statistics  
   - 4.2 Agent Flows  
     - 4.2.1 Agent Login  
     - 4.2.2 Onboard a New Business Owner  
     - 4.2.3 View Onboarded Businesses  
   - 4.3 Business Owner Flows  
     - 4.3.1 First-Time Registration (OTP & PIN Setup)  
     - 4.3.2 Daily Login  
     - 4.3.3 Dashboard Navigation  
     - 4.3.4 Create a New Shop  
     - 4.3.5 Switch Between Shops  
     - 4.3.6 Complete a Sale (POS)  
     - 4.3.7 Suspend and Resume a Sale  
     - 4.3.8 Refund a Sale  
     - 4.3.9 Add a New Product  
     - 4.3.10 Adjust Stock  
     - 4.3.11 Record an Expense  
     - 4.3.12 Add a Customer  
     - 4.3.13 Record a Credit Repayment  
     - 4.3.14 Add a Business Loan  
     - 4.3.15 Repay a Business Loan  
     - 4.3.16 Generate and Export a Report  
     - 4.3.17 Add an Employee  
     - 4.3.18 Set Employee Permissions  
     - 4.3.19 Export Backup  
     - 4.3.20 Restore Backup  
     - 4.3.21 Send SMS to Customer  
   - 4.4 Employee Flows  
     - 4.4.1 Employee First Login  
     - 4.4.2 Employee Daily Login  
     - 4.4.3 Employee POS Workflow  
     - 4.4.4 View Own Shift Report  

5. Cross-Cutting Flows  
   - 5.1 Authentication & Session Management  
   - 5.2 Offline Synchronisation Flow  
   - 5.3 Report Generation & Export Flow  
   - 5.4 Push Notification Flow  
   - 5.5 File Upload Flow  

6. Error & Exception Flows  
   - 6.1 Network Connection Lost  
   - 6.2 Invalid PIN / Login Attempts Exceeded  
   - 6.3 Sync Conflict  
   - 6.4 Low Storage Space on Device  
   - 6.5 SMS Delivery Failure  

7. Acceptance Criteria for All Flows  

---

## 1. Introduction

### 1.1 Purpose
This document defines every user flow within the Mwaminifu App. It describes step‑by‑step interactions, screen transitions, system validations, and expected outcomes for all user roles (System Owner, Agent, Business Owner, Employee). This is the definitive source for developers, QA testers, and product managers to verify that the application behaves correctly.

### 1.2 Scope
This document covers all user journeys from first registration through daily operational tasks, offline sync, and error handling. It does not cover backend internals (covered in the TRD and Backend Schema) but focuses entirely on the user experience and system responses to user actions.

### 1.3 Roles Defined
- **System Owner:** Platform administrator. Creates Agents.
- **Agent:** Onboards Business Owners and provides support.
- **Business Owner:** Owns shops, manages inventory, employees, sales, and finances.
- **Employee:** Works in a shop; performs sales and permitted tasks.

---

## 2. Flow Conventions

### 2.1 Notation
Each flow is described using numbered steps.  
- **Action:** What the user does (tap, swipe, input).  
- **System Response:** What the app or backend does (validation, navigation, API call).  
- **Visual Feedback:** What the user sees (loading indicators, toasts, navigation).

### 2.2 Decision Points
Decision points are indicated with [Yes] or [No] branches.  
Example:  
- Step 5: Check if stock quantity is below reorder level.  
  - [Yes] – Display low stock alert.  
  - [No] – Continue normally.

---

## 3. High-Level User Journey Map

### 3.1 End-to-End Onboarding Journey
```
System Owner creates Agent (Web Dashboard)
         │
         ▼
Agent logs in (Web Dashboard)
         │
         ▼
Agent onboards Business Owner (phone, name, shop name)
         │
         ▼
Business Owner receives SMS (download link + account setup)
         │
         ▼
Business Owner installs app, requests OTP
         │
         ▼
Business Owner verifies OTP, sets PIN
         │
         ▼
Business Owner creates first shop (auto-created)
         │
         ▼
Business Owner adds employees (optional)
         │
         ▼
Employees receive SMS, set PIN, and start working
```

### 3.2 Daily Operations Journey
```
User logs in (Phone + PIN)
         │
         ▼
Dashboard loads (KPI, charts, alerts)
         │
         ├──> New Sale → POS → Complete → Receipt → Sync
         ├──> Add Product → Inventory → Save → Sync
         ├──> Record Expense → Input → Save → Sync
         ├──> Customer Credit → Record Payment → Update Balance → Sync
         └──> View Reports → Filter → Export → PDF/Excel/CSV
```

---

## 4. Detailed Flows by Role

### 4.1 System Owner Flows

#### 4.1.1 System Owner Login
| Step | Action | System Response | Visual Feedback |
|------|--------|-----------------|-----------------|
| 1 | Navigate to web admin login page. | Displays login form. | Login screen. |
| 2 | Enter username and password. | Validates input. | Show loading spinner. |
| 3 | Tap "Login". | Calls `/admin/login` API. | — |
| 4 | — | Backend validates credentials. | — |
| 5 | — | [Yes] credentials valid → Issue JWT, redirect to Dashboard. | Dashboard loads. |
| 6 | — | [No] credentials invalid → Return error. | Error toast: "Invalid username or password." |

#### 4.1.2 Create Agent Account
| Step | Action | System Response | Visual Feedback |
|------|--------|-----------------|-----------------|
| 1 | On System Owner Dashboard, tap "New Agent" (Gold button). | Opens modal form. | Modal appears. |
| 2 | Fill in full name, phone, email (optional). | Validates phone uniqueness. | — |
| 3 | Tap "Create Agent". | Sends request to `/admin/agents`. | Loading spinner. |
| 4 | — | Backend creates agent user with hashed password. | — |
| 5 | — | Backend sends SMS with credentials. | — |
| 6 | — | Returns success with agent details. | Toast: "Agent created successfully." |

#### 4.1.3 View Platform Statistics
| Step | Action | System Response | Visual Feedback |
|------|--------|-----------------|-----------------|
| 1 | Login as System Owner. | Redirects to Dashboard. | Cards show: Total Businesses, Total Agents, Total Sales Today. |
| 2 | Scroll down. | Fetches list of recent businesses. | Table loads with pagination. |
| 3 | Tap on a business name. | Redirects to business detail view. | Shows agent, owner, shop info, activity. |

---

### 4.2 Agent Flows

#### 4.2.1 Agent Login
| Step | Action | System Response | Visual Feedback |
|------|--------|-----------------|-----------------|
| 1 | Navigate to web admin login. | Displays login form. | Login screen. |
| 2 | Enter username and password. | Validates. | Loading spinner. |
| 3 | Tap "Login". | Calls `/auth/agent/login`. | — |
| 4 | — | Backend validates role = AGENT. | — |
| 5 | — | [Yes] → Redirect to Agent Dashboard. | Dashboard loads with onboarded businesses. |
| 6 | — | [No] → Error. | Toast: "Invalid credentials." |

#### 4.2.2 Onboard a New Business Owner
| Step | Action | System Response | Visual Feedback |
|------|--------|-----------------|-----------------|
| 1 | On Agent Dashboard, tap "Onboard Business" (Gold button). | Opens form. | Modal appears. |
| 2 | Enter Business Owner phone, name, email, shop name, shop address. | Validates phone (must be unique). | — |
| 3 | Tap "Create Business". | Calls `/agents/onboard`. | Loading spinner. |
| 4 | — | Backend creates Business Owner user (inactive, no PIN). | — |
| 5 | — | Backend creates first shop linked to owner. | — |
| 6 | — | Backend sends welcome SMS with download link. | — |
| 7 | — | Returns success. | Toast: "Business created. SMS sent." |

#### 4.2.3 View Onboarded Businesses
| Step | Action | System Response | Visual Feedback |
|------|--------|-----------------|-----------------|
| 1 | Agent Dashboard loads. | Fetches list of businesses created by this agent. | List displayed with status (Active / Inactive). |
| 2 | Tap on a business. | Redirects to business detail view. | Shows owner, shop, and status. |

---

### 4.3 Business Owner Flows

#### 4.3.1 First-Time Registration (OTP & PIN Setup)
| Step | Action | System Response | Visual Feedback |
|------|--------|-----------------|-----------------|
| 1 | Open app. | Checks local storage; no token found. | Splash screen → Login screen. |
| 2 | Enter phone number (the one registered by Agent). | Validates format (10 digits after +255). | — |
| 3 | Tap "Request OTP". | Calls `/auth/otp/request`. | Loading spinner; OTP sent toast. |
| 4 | — | Backend sends OTP via SMS. | — |
| 5 | Enter 6-digit OTP in the 6 boxes. | Auto-submits when full. | — |
| 6 | — | Backend verifies OTP; returns tempToken. | — |
| 7 | — | Navigate to "Set PIN" screen. | Screen appears. |
| 8 | Enter new PIN (6 digits). | Validates length. | Show as dots. |
| 9 | Confirm PIN. | Checks match. | — |
| 10 | Tap "Save PIN". | Calls `/auth/pin/set` with tempToken. | Loading spinner. |
| 11 | — | Backend hashes PIN, stores, returns accessToken + refreshToken. | — |
| 12 | — | Save tokens securely. Navigate to Dashboard. | Dashboard loads. |

#### 4.3.2 Daily Login
| Step | Action | System Response | Visual Feedback |
|------|--------|-----------------|-----------------|
| 1 | Open app. | Checks local token. If valid → auto-login. | Splash → Dashboard. |
| 2 | If token expired → show Login screen. | Prompt for phone + PIN. | — |
| 3 | Enter phone and PIN. | Calls `/auth/login`. | Loading spinner. |
| 4 | — | Backend validates PIN hash. | — |
| 5 | — | [Yes] → Return new tokens. | Dashboard loads. |
| 6 | — | [No] → Return "Invalid PIN". | Error toast; increment attempts. |
| 7 | After 5 failed attempts. | Block for 1 hour. | Toast: "Too many attempts. Try again later." |

#### 4.3.3 Dashboard Navigation
| Step | Action | System Response | Visual Feedback |
|------|--------|-----------------|-----------------|
| 1 | Dashboard loads. | Fetches KPI data for active shop. | KPI cards populate. |
| 2 | Tap on "Today's Sales" card. | Navigates to Sales History filtered to today. | Sales list appears. |
| 3 | Tap on "Low Stock" card. | Navigates to Inventory list filtered by low stock. | Products with red stock appear. |
| 4 | Tap "New Sale" (Gold FAB). | Navigates to POS screen. | POS screen loads with product list. |
| 5 | Tap "Add Product" (Navy button). | Navigates to Add Product screen. | Form appears. |
| 6 | Tap "Employees" (Navy button). | Navigates to Employee list. | Employee list appears. |
| 7 | Tap the Shop Name dropdown (top). | Opens list of shops owned. | Dropdown expands. |
| 8 | Select another shop. | Switches context; fetches new shop's data. | Dashboard reloads with new shop data. |

#### 4.3.4 Create a New Shop
| Step | Action | System Response | Visual Feedback |
|------|--------|-----------------|-----------------|
| 1 | In More tab, tap "Shop Management". | Lists existing shops. | Shop list appears. |
| 2 | Tap "New Shop" FAB (Gold). | Opens form. | Modal appears. |
| 3 | Fill in: shop name, address, currency (default TZS). | Validates name required. | — |
| 4 | Optionally upload logo and cover image. | — | Image picker opens. |
| 5 | Tap "Save". | Calls `/shops` POST. | Loading spinner. |
| 6 | — | Backend creates shop. Returns shop ID. | — |
| 7 | — | Shop appears in dropdown and dashboard. | Toast: "Shop created successfully." |

#### 4.3.5 Switch Between Shops
| Step | Action | System Response | Visual Feedback |
|------|--------|-----------------|-----------------|
| 1 | Tap the Shop Name dropdown on Dashboard header. | Opens dropdown with all active shops. | List appears. |
| 2 | Tap another shop name. | Calls `/shops/:id/switch` (context switch). | Loading indicator on header. |
| 3 | — | Backend updates session shopId in JWT (or just client changes context). | Dashboard reloads with new shop data. |

#### 4.3.6 Complete a Sale (POS)
| Step | Action | System Response | Visual Feedback |
|------|--------|-----------------|-----------------|
| 1 | On POS screen, search or browse products. | Product list updates. | Display products. |
| 2 | Tap [+] on a product. | Adds item to cart with default quantity = 1. | Cart drawer updates; badge count increments. |
| 3 | To adjust quantity, tap on the item in the cart. | Opens quantity modal. | Modal with stepper. |
| 4 | Adjust quantity, tap "Update". | Updates cart. | Cart total updates. |
| 5 | When ready, tap "Checkout" (Gold button). | Opens Payment modal. | Bottom sheet slides up. |
| 6 | Select payment method(s): Cash, M-Pesa, Airtel, Mixx, Credit. | — | Highlight selected. |
| 7 | Enter amount for each method. | Validates sum ≤ grand total. | Shows "Remaining: TZS X". |
| 8 | When remaining = 0, tap "Complete Sale" (Teal). | Calls `/shops/:id/sales` POST. | Loading spinner. |
| 9 | — | Backend validates stock, creates sale, deducts stock, updates credit balance if applicable. | — |
| 10 | — | Returns sale details and receipt number. | Receipt preview screen appears. |
| 11 | Tap "Print" (Navy) or "Done" (Gold). | Prints via Bluetooth or navigates back. | Toast: "Sale completed." |

#### 4.3.7 Suspend and Resume a Sale
| Step | Action | System Response | Visual Feedback |
|------|--------|-----------------|-----------------|
| 1 | In POS cart, tap "Suspend" (Gray). | Calls `/sales/:id/suspend` with saleId (temp). | Sale saved as suspended. Toast: "Sale suspended." |
| 2 | From POS main screen, tap "Suspended Sales" (top). | Lists all suspended sales. | List appears. |
| 3 | Tap a suspended sale. | Calls `/sales/:id/resume`. | Cart populates with previous items. |
| 4 | Continue adding/removing items. | — | — |
| 5 | Tap "Checkout" and complete normally. | — | Sale completed. |

#### 4.3.8 Refund a Sale
| Step | Action | System Response | Visual Feedback |
|------|--------|-----------------|-----------------|
| 1 | Go to Sales History. | Find the sale to refund. | Sale list appears. |
| 2 | Tap on the sale row. | Opens sale details. | Receipt/Details view. |
| 3 | Tap "Refund" (Crimson outline button). | Opens refund modal. | Modal appears. |
| 4 | Select items to refund (or "Refund All"). | — | Checkboxes. |
| 5 | Enter reason. | — | Text field. |
| 6 | Tap "Confirm Refund". | Calls `/sales/:id/refund`. | Loading spinner. |
| 7 | — | Backend validates; reverses stock and credit. | — |
| 8 | — | Returns updated sale status. | Toast: "Refund successful." |

#### 4.3.9 Add a New Product
| Step | Action | System Response | Visual Feedback |
|------|--------|-----------------|-----------------|
| 1 | On Inventory tab, tap "Add Product" (Gold FAB). | Navigates to Add Product form. | Form appears. |
| 2 | Fill in: Name, SKU (auto-generate or manual), Category (dropdown), Brand, Supplier. | — | — |
| 3 | Fill in Pricing: Cost Price, Selling Price, Min Price, Max Price. | — | — |
| 4 | Fill in Stock: Current Quantity, Reorder Level. | — | — |
| 5 | Select Unit: Bottle, Box, etc. If Box, enter conversion (e.g., 12). | — | — |
| 6 | Tap image area to upload up to 3 images. | Opens camera/gallery picker. | Upload progress (Gold). |
| 7 | Tap "Save" (Navy button). | Calls `/shops/:id/products` POST. | Loading spinner. |
| 8 | — | Backend creates product, stores images. | — |
| 9 | — | Returns product ID. | Toast: "Product added." Navigate back to list. |

#### 4.3.10 Adjust Stock
| Step | Action | System Response | Visual Feedback |
|------|--------|-----------------|-----------------|
| 1 | On Inventory list, swipe left on a product. | Reveals action buttons: Edit, Adjust Stock. | — |
| 2 | Tap "Adjust Stock" (Teal). | Opens Adjust Stock modal. | Modal appears. |
| 3 | Use + or - stepper to set quantity change. | — | — |
| 4 | Enter reason: "Restock", "Damaged", "Sold", etc. | — | — |
| 5 | Tap "Confirm" (Teal). | Calls `/products/:id/adjust-stock`. | Loading spinner. |
| 6 | — | Backend updates stock quantity and logs adjustment. | — |
| 7 | — | Returns updated stock. | Toast: "Stock adjusted." |

#### 4.3.11 Record an Expense
| Step | Action | System Response | Visual Feedback |
|------|--------|-----------------|-----------------|
| 1 | In More tab, tap "Expenses". | Navigates to Expense list. | List appears. |
| 2 | Tap "Add Expense" FAB (Gold). | Opens Add Expense form. | Form appears. |
| 3 | Select category (dropdown). | — | — |
| 4 | Enter amount and description. | — | — |
| 5 | Optionally tap photo area to attach receipt. | Opens camera/gallery. | Upload progress. |
| 6 | Tap "Save" (Navy). | Calls `/shops/:id/expenses` POST. | Loading spinner. |
| 7 | — | Backend creates expense. | — |
| 8 | — | Returns expense ID. | Toast: "Expense recorded." |

#### 4.3.12 Add a Customer
| Step | Action | System Response | Visual Feedback |
|------|--------|-----------------|-----------------|
| 1 | In More tab, tap "Customers". | Navigates to Customer list. | List appears. |
| 2 | Tap "Add Customer" FAB (Gold). | Opens Add Customer form. | Form appears. |
| 3 | Enter name, phone, email (optional), address, notes. | — | — |
| 4 | Tap "Save" (Navy). | Calls `/shops/:id/customers` POST. | Loading spinner. |
| 5 | — | Backend creates customer. | Toast: "Customer added." |

#### 4.3.13 Record a Credit Repayment
| Step | Action | System Response | Visual Feedback |
|------|--------|-----------------|-----------------|
| 1 | From Customer list, tap a customer with outstanding balance. | Navigates to Customer Profile. | Profile loads. |
| 2 | Tap "Record Payment" (Teal button). | Opens Record Payment modal. | Modal appears. |
| 3 | Enter amount (must be ≤ outstanding balance). | Validates. | — |
| 4 | Select payment method (Cash, MPesa, etc.). | — | — |
| 5 | Tap "Confirm Payment" (Teal). | Calls `/customers/:id/credit-payment` POST. | Loading spinner. |
| 6 | — | Backend updates customer balance, logs payment. | — |
| 7 | — | Returns updated balance. | Toast: "Payment recorded." Balance updates. |

#### 4.3.14 Add a Business Loan
| Step | Action | System Response | Visual Feedback |
|------|--------|-----------------|-----------------|
| 1 | In More tab, tap "Loans". | Navigates to Loans list. | List appears. |
| 2 | Tap "Add Loan" FAB (Gold). | Opens Add Loan form. | Form appears. |
| 3 | Enter lender name, amount, interest rate (%), due date. | — | — |
| 4 | Tap "Save" (Navy). | Calls `/shops/:id/loans` POST. | Loading spinner. |
| 5 | — | Backend creates loan. | Toast: "Loan added." |

#### 4.3.15 Repay a Business Loan
| Step | Action | System Response | Visual Feedback |
|------|--------|-----------------|-----------------|
| 1 | From Loans list, tap an active loan. | Navigates to Loan Detail. | Detail loads. |
| 2 | Tap "Repay" (Teal button). | Opens Repayment modal. | Modal appears. |
| 3 | Enter amount. | Validates ≤ remaining balance. | — |
| 4 | Tap "Confirm Repayment". | Calls `/loans/:id/repay` POST. | Loading spinner. |
| 5 | — | Backend updates remaining balance. | — |
| 6 | — | Returns updated loan. | Toast: "Repayment recorded." |

#### 4.3.16 Generate and Export a Report
| Step | Action | System Response | Visual Feedback |
|------|--------|-----------------|-----------------|
| 1 | Navigate to Reports tab. | Loads default report (Today's Sales). | Summary cards + list. |
| 2 | Tap Date Range Picker. | Opens calendar picker. | Select from/to dates. |
| 3 | Select dates, tap "Apply". | Refreshes report data. | Loading spinner; data updates. |
| 4 | Tap "Export" (Navy icon). | Opens Export options sheet. | Sheet appears: PDF, Excel, CSV. |
| 5 | Select format. | Calls `/shops/:id/reports/sales?format=pdf` (or xlsx/csv). | Loading spinner. |
| 6 | — | Backend generates file, streams download. | Download starts; toast: "Report downloaded." |

#### 4.3.17 Add an Employee
| Step | Action | System Response | Visual Feedback |
|------|--------|-----------------|-----------------|
| 1 | In More tab, tap "Employees". | Lists current employees. | List appears. |
| 2 | Tap "Add Employee" FAB (Gold). | Opens Add Employee form. | Form appears. |
| 3 | Enter name, phone number. | Validates phone uniqueness. | — |
| 4 | Select role (Cashier, Manager). | — | — |
| 5 | Choose permissions (checkboxes): POS, Inventory, Expenses, Credit, Refunds. | — | — |
| 6 | Tap "Save" (Navy). | Calls `/shops/:id/employees` POST. | Loading spinner. |
| 7 | — | Backend creates employee user, generates temp PIN. | — |
| 8 | — | Sends SMS with login details and download link. | — |
| 9 | — | Returns employee record. | Toast: "Employee added. SMS sent." |

#### 4.3.18 Set Employee Permissions
| Step | Action | System Response | Visual Feedback |
|------|--------|-----------------|-----------------|
| 1 | From Employee list, tap an employee. | Navigates to Employee Detail. | Profile loads. |
| 2 | Tap "Permissions" (or edit icon). | Opens Permissions editor. | List of checkboxes. |
| 3 | Check/uncheck permissions. | — | — |
| 4 | Tap "Save" (Navy). | Calls `/employees/:id/permissions` PUT. | Loading spinner. |
| 5 | — | Backend updates permissions JSON. | Toast: "Permissions updated." |

#### 4.3.19 Export Backup
| Step | Action | System Response | Visual Feedback |
|------|--------|-----------------|-----------------|
| 1 | In More tab, tap "Backup". | Opens Backup screen. | Options: Export, Restore. |
| 2 | Tap "Export Backup". | Calls `/backup/export` with shopId. | Loading spinner. |
| 3 | — | Backend gathers all data (sales, products, customers, expenses, loans). | — |
| 4 | — | Generates JSON file and streams download. | Download starts; toast: "Backup exported." |

#### 4.3.20 Restore Backup
| Step | Action | System Response | Visual Feedback |
|------|--------|-----------------|-----------------|
| 1 | In Backup screen, tap "Restore Backup". | Opens file picker. | — |
| 2 | Select a previously exported JSON file. | Validates file format. | Loading spinner. |
| 3 | Tap "Confirm Restore". | Calls `/backup/restore` with file. | Loading spinner; warning dialog appears. |
| 4 | — | Backend clears existing shop data and imports new data. | — |
| 5 | — | Returns success. | Toast: "Restore successful. App will reload." |

#### 4.3.21 Send SMS to Customer
| Step | Action | System Response | Visual Feedback |
|------|--------|-----------------|-----------------|
| 1 | From Customer Profile, tap "Send SMS" (Teal icon/button). | Opens SMS composer. | Modal appears. |
| 2 | A default reminder message is pre‑filled (e.g., "Dear [name], your balance is TZS X. Please pay by..."). | — | — |
| 3 | Edit message if needed. | — | — |
| 4 | Tap "Send" (Gold/Teal). | Calls `/notifications/send-sms`. | Loading spinner. |
| 5 | — | Backend sends SMS via gateway. | — |
| 6 | — | Returns success/failure. | Toast: "SMS sent." or "Failed. Retry." |

---

### 4.4 Employee Flows

#### 4.4.1 Employee First Login
| Step | Action | System Response | Visual Feedback |
|------|--------|-----------------|-----------------|
| 1 | Employee receives SMS with phone and temporary PIN. | — | — |
| 2 | Opens app, enters phone number and temporary PIN. | Calls `/auth/employee/login`. | Loading spinner. |
| 3 | — | Backend validates employee status and temp PIN. | — |
| 4 | — | [Yes] → Returns tempToken. | Navigate to "Change PIN" screen. |
| 5 | Enter new 6-digit PIN, confirm. | Calls `/auth/employee/change-pin`. | Loading spinner. |
| 6 | — | Backend updates PIN hash. Returns accessToken. | Toast: "PIN set. Welcome!" → Dashboard. |

#### 4.4.2 Employee Daily Login
| Step | Action | System Response | Visual Feedback |
|------|--------|-----------------|-----------------|
| 1 | Open app. | Shows Login screen. | — |
| 2 | Enter phone + PIN. | Calls `/auth/employee/login`. | Loading spinner. |
| 3 | — | Backend validates PIN and checks if employee is active. | — |
| 4 | — | [Yes] → Return tokens. | Dashboard loads (limited permissions). |
| 5 | — | [No] → Error. | Toast: "Invalid credentials or account disabled." |

#### 4.4.3 Employee POS Workflow
| Step | Action | System Response | Visual Feedback |
|------|--------|-----------------|-----------------|
| 1 | Employee sees only POS and Inventory (if permitted) in bottom nav. | — | — |
| 2 | Follows same POS flow as Business Owner (see 4.3.6). | — | — |
| 3 | When completing sale, the `userId` is automatically set to the employee's ID. | Backend logs employee performance. | — |
| 4 | Employee cannot access Reports (except own shift report) or Settings. | — | — |

#### 4.4.4 View Own Shift Report
| Step | Action | System Response | Visual Feedback |
|------|--------|-----------------|-----------------|
| 1 | Employee taps "My Shift" (available in More or POS tab). | Calls `/shops/:id/sales/current-shift` filtered by `userId`. | Shows: total sales, items sold, payments. |
| 2 | Tap "Close Shift". | Calls `/shops/:id/sales/close-shift`. | Loading spinner. |
| 3 | — | Backend finalises shift, returns summary. | Shift summary shown; employee cannot make further sales until next shift opens. |

---

## 5. Cross-Cutting Flows

### 5.1 Authentication & Session Management
| Step | Action | System Response | Visual Feedback |
|------|--------|-----------------|-----------------|
| 1 | App starts. | Checks local storage for accessToken. | — |
| 2 | — | [Yes] token exists → Validate expiry. | — |
| 3 | — | [Yes] token valid → Navigate to Dashboard. | Dashboard loads. |
| 4 | — | [No] token expired → Use refreshToken to call `/auth/refresh`. | — |
| 5 | — | [Yes] refresh success → Get new tokens → Dashboard. | — |
| 6 | — | [No] refresh fails → Logout → Navigate to Login. | Login screen. |
| 7 | On logout (user action). | Clear local tokens. Call `/auth/logout`. | Navigate to Login screen. |

### 5.2 Offline Synchronisation Flow
| Step | Action | System Response | Visual Feedback |
|------|--------|-----------------|-----------------|
| 1 | User performs an action (sale, add product, expense) while offline. | Saves record to local SQLite with `syncStatus = pending`. | Toast: "Saved locally. Will sync when online." |
| 2 | Device regains internet connection. | Background worker triggers sync. | Sync indicator shows "Syncing...". |
| 3 | — | Client calls `/sync/push` with all pending records. | — |
| 4 | — | Server processes records. | — |
| 5 | — | [Success] → Server returns success. Client updates `syncStatus = synced`. | Sync indicator: "Synced" (Teal). |
| 6 | — | [Failure] → Server returns error. Client increments retry count. | Sync indicator: "Sync failed" (Red). User can tap to retry manually. |
| 7 | Periodic pull: client calls `/sync/pull?since=...` to get latest server changes. | Merges into local DB. | — |

### 5.3 Report Generation & Export Flow
| Step | Action | System Response | Visual Feedback |
|------|--------|-----------------|-----------------|
| 1 | User selects date range and report type. | — | — |
| 2 | User taps "Export" and selects format (PDF, Excel, CSV). | Client calls API endpoint with `format` param. | Loading indicator. |
| 3 | — | Backend queries data, generates file in memory. | — |
| 4 | — | Streams file with `Content-Disposition: attachment`. | Browser/mobile download starts. |
| 5 | — | On mobile, save to device storage. | Toast: "Report downloaded." |

### 5.4 Push Notification Flow
| Step | Action | System Response | Visual Feedback |
|------|--------|-----------------|-----------------|
| 1 | Backend scheduled job detects low stock. | Calls FCM API with device tokens for that shop. | — |
| 2 | — | FCM delivers notification to device. | Device receives notification. |
| 3 | User taps notification. | App opens and navigates to Inventory list filtered by low stock. | — |
| 4 | Notification is also stored in `notifications` table. | App fetches list when user opens the "Notifications" screen. | Unread badge appears on bell icon. |

### 5.5 File Upload Flow
| Step | Action | System Response | Visual Feedback |
|------|--------|-----------------|-----------------|
| 1 | User taps image upload area (product, expense, logo). | Opens native file picker. | — |
| 2 | User selects image from gallery or camera. | — | Thumbnail preview appears. |
| 3 | User taps "Save" on the parent form. | Client sends multipart file to `/upload` endpoint. | Upload progress (Gold). |
| 4 | — | Backend validates file (type, size), compresses, uploads to Supabase Storage. | — |
| 5 | — | Returns public URL. | Form saves with URL. |

---

## 6. Error & Exception Flows

### 6.1 Network Connection Lost
| Step | Action | System Response | Visual Feedback |
|------|--------|-----------------|-----------------|
| 1 | User is performing an action (e.g., adding sale). | Client detects network loss (Dio interceptor). | Persistent Gold banner: "You are offline. Changes saved locally." |
| 2 | User continues using app. | All writes go to local DB with `pending` status. | — |
| 3 | When network restores, background sync automatically triggers. | — | Sync indicator turns to "Syncing...". |

### 6.2 Invalid PIN / Login Attempts Exceeded
| Step | Action | System Response | Visual Feedback |
|------|--------|-----------------|-----------------|
| 1 | User enters wrong PIN 3 times. | — | Toast: "Invalid PIN. X attempts remaining." |
| 2 | User enters wrong PIN 5 times. | Backend blocks login for 1 hour. | Toast: "Too many failed attempts. Try again in 1 hour." |
| 3 | User taps "Forgot PIN?" | Calls OTP request flow. | OTP sent; reset PIN flow starts. |

### 6.3 Sync Conflict
| Step | Action | System Response | Visual Feedback |
|------|--------|-----------------|-----------------|
| 1 | Client pushes a sale that has a `lastModifiedAt` older than the server version. | Server returns `409 CONFLICT` with the latest server version. | Conflict modal appears: "This record has been changed on another device. Server version will override." |
| 2 | User taps "OK". | Client overwrites local record with server version. | — |
| 3 | User re-applies their changes if needed. | — | — |

### 6.4 Low Storage Space on Device
| Step | Action | System Response | Visual Feedback |
|------|--------|-----------------|-----------------|
| 1 | App attempts to save a large image or backup. | Flutter detects insufficient storage. | Dialog: "Not enough storage. Please free up space." |
| 2 | User frees space and retries. | — | — |

### 6.5 SMS Delivery Failure
| Step | Action | System Response | Visual Feedback |
|------|--------|-----------------|-----------------|
| 1 | Backend attempts to send OTP or notification. | SMS gateway returns error (e.g., invalid number, provider down). | Backend logs error. |
| 2 | Client receives no SMS. | — | User taps "Resend OTP" after 60 seconds. |
| 3 | Backend retries up to 3 times with exponential backoff. | — | — |
| 4 | If all retries fail, log `sms_failed` and notify support. | — | — |

---

## 7. Acceptance Criteria for All Flows

For Version 1 to be complete, the following must be true:

- [ ] All flows defined above are implemented and testable.
- [ ] Every user role can complete its primary journey without errors.
- [ ] Offline sync works: actions performed offline appear online after sync.
- [ ] All error states (network, validation, conflicts) show clear user messages.
- [ ] All flows are bilingual-ready (English/Swahili placeholders exist).
- [ ] Performance: each screen loads within 3 seconds (online); operations complete within 1 second.
- [ ] Each flow has been QA-tested on Android 8–14 and on Chrome (web admin).
- [ ] No flow leads to data loss or corruption without user confirmation.

---

**End of APP_FLOW Document**

---
