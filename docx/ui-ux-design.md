I understand completely! No emojis in the UI/UX document. It should look clean, professional, and text-based. I have removed every emoji and replaced them with plain text labels, simple icon placeholders (e.g., `[Icon]`), or just descriptive text.

Here is the fully revised **04_UIUX.docx** with all emojis removed.

---

# 04_UIUX.docx – UI/UX Specification (No Emojis)

**Project Name:** Mwaminifu App  
**Version:** 1.0 (MVP)  
**Status:** Draft  
**Prepared By:** Product/Design Team  
**Date:** 2026-08-06  

---

## Table of Contents

1. Introduction & Design Principles
2. Design System (Branding)
   - Color Palette (Navy, Teal, Gold, White)
   - Typography
   - Spacing & Grid
   - Iconography
   - UI Components (Buttons, Cards, Inputs, Modals, Toasts)
3. Platform-Specific Navigation
   - Mobile App (Flutter) – Bottom Tab Navigation
   - Admin Dashboard (Next.js) – Sidebar Navigation
4. Screen-by-Screen Specifications (Mobile)
   - Auth Flow (Splash, Login, OTP, Set PIN)
   - Dashboard (Home)
   - Point of Sale (POS) – Cart & Payment
   - Inventory Management (List, Add/Edit, Adjust Stock)
   - Expenses
   - Customers & Credit
   - Reports
   - Settings & Profile
5. Screen-by-Screen Specifications (Web Admin)
   - System Owner Dashboard
   - Agent Management
   - Agent Onboarding Flow
6. Interaction & State Patterns
   - Offline Indicators
   - Loading & Skeleton Screens
   - Empty States
   - Confirmation Dialogs
   - Toast Notifications
7. Accessibility Guidelines

---

## 1. Introduction & Design Principles

The UI/UX design for **Mwaminifu App** is built for Tanzanian SME owners and employees. The name **Mwaminifu** (Trustworthy) drives the design language: it must look professional, secure, and reliable while remaining warm and accessible.

**Core Principles:**
- **Clarity over Creativity:** Users are busy; information must be scannable. No hidden gestures. Clear labels (English/Swahili).
- **Offline-Conscious:** The UI must clearly indicate when the app is offline and when data is synced (Teal checkmark label) or pending (Gold cloud label).
- **Mobile-First:** All critical operations (POS, Inventory) are optimized for small screens (phones). Thumb-zone friendly (primary actions at the bottom).
- **High Contrast:** To accommodate varying lighting conditions in shops, use sufficient contrast ratios (Navy on White).
- **Trustworthy & Premium:** The combination of Navy (stability), Teal (growth), and Gold (success) builds instant confidence.

---

## 2. Design System (Branding)

### 2.1 Color Palette (Locked)

| Role | Name | Hex Code | Usage |
|------|------|----------|-------|
| **Primary (Trust)** | **Navy Blue** | `#0A1E3F` | Primary buttons, headers, active navigation states, important text. |
| **Primary Light** | Navy Tint | `#E8EDF5` | Background for hover states, selected menu items, subtle dividers. |
| **Secondary (Growth)** | **Teal** | `#0D9488` | Success states (synced), confirmation toasts, positive trends, secondary CTAs. |
| **Highlight (Premium)** | **Gold** | `#D4AF37` | Floating Action Button (FAB), notification badges, premium feature highlights, accent borders. |
| **Background** | **White** | `#FFFFFF` | Main app background, card surfaces, modal sheets. |
| **Surface Alt** | Off-White | `#F8F9FA` | Alternate background for sections (e.g., KPI cards, list tiles). |
| **Danger** | Crimson Red | `#E74C3C` | Void/Refund actions, critical low stock alerts, deletion. |
| **Text Primary** | Dark Navy | `#1A2A3A` | Main body text (using Navy instead of pure black for softness). |
| **Text Secondary** | Slate Gray | `#64748B` | Labels, subtext, placeholders. |

### 2.2 Typography

- **Mobile (Flutter):** `Inter` (Recommended for its excellent readability and modern look).
- **Web (Next.js):** `Inter` (system font stack).

| Style | Weight | Size (Mobile) | Usage |
|-------|--------|---------------|-------|
| Headline 1 | Bold | 24px | Screen Titles (e.g., "Dashboard", "Inventory"). |
| Headline 2 | Semi-Bold | 18px | Section Headers (e.g., "Today's Sales"). |
| Body | Regular | 14px | Standard text, product names. |
| Caption | Regular | 12px | Helper text, timestamps, SKU numbers. |
| KPI Value | Bold | 22px | Dashboard numbers (Navy Blue). |
| Button | Medium | 14px | All buttons (White text on Navy/Gold/Teal). |

### 2.3 Spacing & Grid
- Use **8px** grid system (space in multiples of 4 or 8).
- **Mobile Margins:** 16px left/right.
- **Card Padding:** 16px.
- **Element Spacing:** 8px (tight), 16px (standard), 24px (large).

### 2.4 Iconography
- Use **Material Icons** (rounded style) for Flutter, and **Lucide Icons** for the Web dashboard.
- All critical action icons must have a text label. Icons will be represented by standard vector assets matching the brand colors.

### 2.5 UI Components (Atomic Design)

**Buttons:**
- **Primary:** Solid **Navy** (`#0A1E3F`), white text. (e.g., "Save", "Complete Sale").
- **Secondary:** Solid **Teal** (`#0D9488`), white text. (e.g., "Sync Now", "Confirm Payment").
- **Premium/Highlight:** Solid **Gold** (`#D4AF37`), white/dark navy text. (e.g., "Upgrade Plan" or "New Sale").
- **Danger:** Outline/Text Crimson (`#E74C3C`). (e.g., "Void Sale").
- **Floating Action Button (FAB):** **Gold** (`#D4AF37`) with a white plus icon, placed bottom-right on the Dashboard and POS to draw attention to the most profitable actions.

**Input Fields:**
- Outlined style with floating labels.
- Focus state: **Teal** border.
- Error state: Red border with helper text.

**Cards:**
- **White** background, subtle border (`#E2E8F0`), 8px border-radius, subtle drop shadow.

---

## 3. Platform-Specific Navigation

### 3.1 Mobile App (Bottom Navigation Bar)
The app has 5 main tabs. The active tab icon will be **Navy Blue**, inactive tabs are gray. Labels are used alongside icons.

1. **Dashboard** (Home – KPI & Charts)
2. **POS** (Point of Sale – Cart/Checkout) - Gold icon when active
3. **Inventory** (Products & Stock)
4. **Reports** (Sales, Profit, Credit)
5. **More** (Expenses, Customers, Loans, Settings, Employees – grouped)

### 3.2 Admin Dashboard (Sidebar)
System Owner & Agents see a sidebar. The active menu item has a **Teal** vertical bar indicator.

1. **Dashboard** (Platform stats)
2. **Agents** (Manage agents)
3. **Businesses** (View all onboarded shops)
4. **Support** (Chats/Tickets)
5. **Settings**

---

## 4. Screen-by-Screen Specifications (Mobile)

### 4.1 Splash & Auth Screens

**Splash Screen:**
- Centered App Logo (Gold "Mwaminifu" 'M' icon + Navy text "Mwaminifu App").
- Loading indicator (using **Teal** accent).

**Login Screen (Phone + PIN):**
- Input: Phone number (with +255 prefix fixed).
- Input: PIN (6 digits, obscured).
- Buttons: "Login" (**Navy** primary).
- Links: "Forgot PIN?" (leads to OTP request, **Teal** text).

**OTP Verification:**
- Title: "Enter 6-digit code" (Navy).
- 6 individual input boxes (Gold border when active).
- Timer: "Resend code in 45s".

**Set PIN (First Login):**
- Title: "Create a 6-digit PIN" (Navy).
- Hint: "This will be used for daily login".

### 4.2 Dashboard (Home) Screen
*Navigation: Bottom Tab 1*

**Header:**
- Shop Name + Switch Shop dropdown (Navy text, Gold dropdown arrow).
- Notification Bell (with Gold badge count if > 0).
- Offline/Online sync status chip: **Teal** ("Synced") or **Gold** ("Syncing...") or **Red** ("Offline").

**Scrollable Content:**
1. **KPI Row (Horizontal Scroll):**
   - Card 1: Today's Sales (TZS 450k)
   - Card 2: Profit (TZS 120k)
   - Card 3: Credit Given (TZS 45k)
   - Card 4: Low Stock (5 items)
   - *Interaction:* Tapping a card navigates to the relevant detailed list (e.g., tapping "Credit" goes to Credit List).

2. **Quick Actions (Grid 2x3):**
   - [New Sale] (**Gold** background, white text, prominent).
   - [Add Product] (Navy outline).
   - [Restock] (Teal outline).
   - [Add Expense] (Navy outline).
   - [Add Customer] (Teal outline).
   - [Employees] (Navy outline).

3. **Charts:**
   - Tab bar: "7 Days" | "30 Days" (Active: Navy underline).
   - Line chart: Sales Trend (Teal line, Navy fill under line).
   - Below: "Top Selling Products" (Progress bars in Gold).

4. **Recent Activity (List of 3-4 items):**
   - "John sold Coca Cola" (time ago).
   - "Mary added stock: 10 units".

---

### 4.3 Point of Sale (POS) Screen
*Navigation: Bottom Tab 2*
*Goal: Minimize taps to complete a sale.*

**Top Section (Products List):**
- Search Bar (**Teal** focused border).
- Category Chips (Horizontal Scroll): "All | Grocery | Drinks | Food". Active chip has **Navy** background, white text.
- Product Tiles (Grid 2 columns):
  - Thumbnail image (top).
  - Product Name (1 line, Navy text).
  - Price (Gold text, bold).
  - [Add] button (**Teal** circle).

**Bottom Section (Cart/Drawer):**
- A persistent bottom drawer that pulls up (White background, Navy top border).
- Shows cart items: Name, Qty, Unit Price, Subtotal.
- Total Price (Navy, large font, Gold "TZS" symbol).
- Buttons: [Suspend] (Gray) | [Checkout] (**Gold** Primary).

**Payment Modal (Slide-up bottom sheet):**
- Shows Grand Total (Navy/Gold).
- Payment Methods (Grid): Cash, M-Pesa, Airtel Money, Mixx, Credit (Deni).
- For Split Payments: User taps a method, enters amount, taps "Add Payment".
- "Remaining: TZS 5,000" is displayed until balance is zero.
- [Complete Sale] button (Large, **Teal** Primary) activates only when balance is zero.

**Receipt Preview:**
- After completion, show a full-screen receipt preview (White background, Navy text, Gold accent line at top).
- Buttons: [Print] (Navy outline), [Share via WhatsApp] (Teal outline - Coming Soon), [Done] (Gold).

---

### 4.4 Inventory Management
*Navigation: Bottom Tab 3*

**Top:**
- Search Bar + Filter/Sort icon.
- [Add Product] FAB (**Gold**).

**Body (List View):**
- Product Item Row:
  - Thumbnail (left).
  - Name + SKU (middle, Navy text).
  - Stock Qty – **Crimson** text if low stock (below reorder level), **Teal** if healthy.
  - Price (right).
- *Interaction:* Swipe left on an item to reveal "Edit" and "Adjust Stock" (Teal and Navy actions).

**Add/Edit Product Screen:**
- Form fields (split into sections with Navy headers).
  - Basic: Name, SKU, Category (dropdown), Brand, Supplier.
  - Pricing: Cost Price, Selling Price, Min/Max Price.
  - Stock: Current Quantity, Reorder Level.
  - Units: Base Unit (Bottle), Conversion (e.g., 12 Bottles = 1 Box).
- Image Upload: Tap to add up to 3 images (camera/gallery) – upload progress indicated in Gold.
- Buttons: [Cancel] (Gray) | [Save Product] (**Navy**).

**Adjust Stock Modal:**
- Current stock displayed in Navy.
- Input: Quantity (with + and - stepper buttons in Teal).
- Reason: Text field ("Received from supplier", "Damaged", "Sold").
- [Confirm Adjustment] (**Teal** Primary).

---

### 4.5 Customers & Credit
*Located under the "More" tab.*

**Customer List:**
- Search + [Add Customer] FAB (Gold).
- List items: Name, Phone, Outstanding Balance (**Crimson** if overdue, Navy if current).

**Customer Profile:**
- Header: Name, Phone, Address (Navy).
- Balance Tile: **Gold** background with White text ("Total Credit: TZS 45,000").
- Tabs: [Sales History] | [Payments] (Active tab has Navy underline).
- Button: [Record Payment] (**Teal** Primary).

**Record Credit Payment Modal:**
- Customer Name, Current Balance (display only).
- Enter Amount.
- Payment Method (Cash/MPesa).
- [Confirm Payment] -> Updates balance and logs transaction.

---

### 4.6 Reports Screen
*Navigation: Bottom Tab 4*

**Top:**
- Date Range Picker (Today, This Week, This Month, Custom) - Navy border.
- [Export] Button (**Navy** outline, taps to open sheet: PDF, Excel, CSV).

**Content:**
- Summary Cards: Total Sales, Total Profit, Total Expenses (**Teal** progress bars for profit margins).
- List of Reports (Card style with Navy headers, Gold arrow to navigate):
  - Sales Report.
  - Inventory Valuation.
  - Expense Breakdown.
  - Credit Outstanding.
  - Employee Performance.

**Details View:**
- Table-like rows (Item Name | Qty | Amount).
- Back button to return to report list.

---

### 4.7 Settings & More
*Navigation: Bottom Tab 5 (More)*

**Header:** "Settings" (Navy).

**List View (Grouped):**
- **Business:** Profile, Shops, Receipt Settings.
- **Users:** Employees, Permissions.
- **Financial:** Expenses, Loans, Credit Customers.
- **System:** Backup, Restore, Sync Status (Teal dot if healthy).
- **Support:** FAQ, Video Tutorials, WhatsApp Support (**Teal** icon).
- **Account:** Change PIN, Theme (Light/Dark), Logout (**Crimson** text).

---

## 5. Screen-by-Screen Specifications (Web Admin)

### 5.1 System Owner Dashboard
- **Header:** Navy background, White text: "Hello, [Admin Name]" | Gold Notification Bell.
- **Platform Stats (Cards):** Total Businesses (Navy), Total Agents (Teal), Total Sales (Gold).
- **Recent Businesses List:** Table (Zebra striping - White/Off-white).
- **Action Button:** [New Agent] (**Gold** button for premium/high-value action).

### 5.2 Agent Onboarding Form (Modal)
- **Modal Header:** Navy background with White title.
- **Fields:** Agent Full Name, Agent Phone/Email.
- **Submit:** [Create Agent] (**Navy** Primary).

### 5.3 Agent Dashboard
- **List:** Businesses Onboarded with status badges (Teal = Active, Gray = Inactive).
- **Search Bar:** Teal focus state.

---

## 6. Interaction & State Patterns

### 6.1 Offline Indicators
- A persistent **Gold** banner at the top of the screen (under the app bar) stating "You are offline. Data will sync when online."
- Sync button in the "More" tab shows a Teal checkmark when successful, Gold spinner when syncing.

### 6.2 Loading & Skeleton Screens
- Use skeleton screens (gray shimmer) for lists instead of spinning loaders to reduce perceived wait time.
- Skeleton primary color: Light Navy tint (`#E8EDF5`).

### 6.3 Empty States
- When lists are empty (e.g., no products), show a friendly illustration with a Teal accent line.
- Text: "No products yet. Tap the + button to add your first item."
- CTA button: [Add Product] (Gold FAB or Navy button).

### 6.4 Confirmation Dialogs
- For destructive actions (e.g., "Void Sale", "Delete Product"):
  - Title: **Crimson** text.
  - Buttons: [Cancel] (Gray) | [Confirm] (Crimson).
- For standard actions (e.g., "Complete Sale"):
  - Teal checkmark icon.
  - "Sale completed successfully!"

### 6.5 Toast Notifications
- **Success:** Teal background, White text. (e.g., "Product saved").
- **Error:** Crimson background, White text. (e.g., "Sync failed. Retry.").
- **Info:** Navy background, White text. (e.g., "Welcome back, John!").

---

## 7. Accessibility Guidelines
- **Contrast Ratio:** Ensure all Navy/Teal/Gold text on White meets WCAG AA standards (minimum 4.5:1). Navy (`#0A1E3F`) on White passes easily. Gold (`#D4AF37`) on White is low contrast, so **Gold must always be used as a background with White text** or as a decorative accent, never for small body text on white.
- **Tap Targets:** Minimum 48px x 48px for all interactive elements.
- **Font Size:** Default body text should be at least 14px to aid readability for users with older phones.
- **Labels:** All icons must have accompanying text labels (no hidden meaning).

---

**End of UI/UX Document**

---

This document is now completely free of emojis and ready for your `docs/` folder. We are progressing perfectly. What document would you like to tackle next? 
- **03_DATABASE.docx** (Complete Database Schema)
- **05_APP_FLOW.docx** (Complete User Flows)