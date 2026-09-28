# Hotel SaaS — Phase 1 MVP Scope & Boundaries

**Document:** 02-mvp-scope.md  
**Version:** 1.0  
**Status:** Approved MVP Scope Specification  
**Parent Document:** [01-project-requirements.md](file:///c:/EVERBIMS/hotel-Saas/docs/01-project-requirements.md)  
**Project Type:** Multi-Tenant Hotel Management SaaS  
**Current Phase:** Phase 1 — MVP (Point of Sale & Management Core)  
**Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS  
**Backend:** NestJS + TypeScript + REST API  
**Database:** MySQL  

---

# 1. Document Purpose & Strategic Alignment

While [01-project-requirements.md](file:///c:/EVERBIMS/hotel-Saas/docs/01-project-requirements.md) defines the comprehensive multi-year vision for the entire Hotel SaaS ecosystem across all tiers (Starter, Business, Luxury, Enterprise), **this document (02-mvp-scope.md) defines exactly what is being built in Phase 1 and explicitly what is deferred to subsequent phases.**

| Document | Core Purpose | Scope Boundary |
|---|---|---|
| **01-project-requirements.md** | Complete product vision, long-term roadmap, architectural principles | Entire SaaS platform lifecycle (Phases 1–6) |
| **02-mvp-scope.md** | Exact operational boundaries, features, screens, states, business rules | **Phase 1 MVP Only** |

### Guiding Directives for MVP Scope
1. **No Speculative Engineering:** Do not build abstractions or database schemas for modules scheduled for later phases (e.g., room reservations, housekeeping, procurement, channel manager).
2. **Operational Completeness:** The features included in Phase 1 must not be prototypes, mocks, or half-built stubs; they must be fully functional, tenant-isolated, production-grade operational software.
3. **Clean Decoupling:** The MVP core must establish architectural foundations that enable subsequent phases to plug in seamlessly without rewriting Phase 1.

---

# 2. MVP Primary Objective

The primary objective of the Phase 1 MVP is to **deliver an operationally ready, multi-tenant hospitality foundation featuring an end-to-end Point of Sale (POS) and real-time Management Dashboard.**

### The MVP Must Prove That:
* A tenant can register, set up their property, configure a POS outlet, create tables, and catalog menu items.
* An authorized cashier/operator can open a shift, initiate an order for dine-in or takeaway, customize items, and dispatch order tickets to the kitchen (KOT).
* The kitchen staff can track tickets, mark items as in-preparation and ready.
* The cashier can generate an accurate bill (factoring in discounts, taxes, and service charges), process payments (cash or card), and produce a printable receipt.
* All transactions are immediately reflected in live database-driven dashboard metrics and analytical reports.
* Full tenant isolation, role-based access control (RBAC), and transactional audit logs are rigidly enforced server-side.

---

# 3. Phase 1 MVP Feature Inclusions

The following modules and features represent the complete scope of Phase 1:

```text
Phase 1 Scope
├── 1. Multi-Tenant SaaS Foundation
│   ├── Tenant Onboarding & Status Management
│   ├── Property Profile Configuration (Currency, Timezone, Tax ID)
│   ├── User Management & Authentication (JWT, bcrypt)
│   ├── Role-Based Access Control (RBAC with 5 Predefined Roles)
│   └── System Audit Trail (Logging Critical Business Actions)
│
├── 2. POS Master Data Management
│   ├── POS Outlet Configuration (Single Outlet per Tenant in MVP)
│   ├── Menu Categories (Hierarchy, Sort Order, Active Status)
│   ├── Products & Pricing (Base Price, Tax Rate, SKU, Status)
│   ├── Dining Tables (Table Number, Seating Capacity, Status)
│   └── Payment Methods (Cash & Card Support)
│
├── 3. POS Daily Operations & Shifts
│   ├── Shift Management (Open Shift with Starting Cash, Close Shift)
│   ├── Interactive Terminal (Category Filter, Search, Quick Add)
│   ├── Order Types (Dine-in with Table Selection, Direct Takeaway)
│   ├── Order Item Modifiers (Quantities, Line Item Notes)
│   └── Order Lifecycle Tracking (Draft → Open → KOT → Billed → Paid)
│
├── 4. Kitchen Order Ticket (KOT) Workflow
│   ├── Automatic KOT Ticket Generation upon Order Placement
│   ├── Kitchen Display View (Active Tickets, Elapsed Time, Notes)
│   └── Ticket Status Tracking (Pending → In Preparation → Ready)
│
├── 5. Billing & Payment Processing
│   ├── Live Bill Calculation (Subtotal, Item Discount, Order Discount, Taxes)
│   ├── Flexible Tendering (Cash with Change Calculator, Card Transaction ID)
│   ├── Bill Settlement & Locking (Prevent Post-Payment Tampering)
│   └── Thermal/Browser Printable Receipt Generation
│
├── 6. Executive & Operational Dashboard
│   ├── Today's Revenue & Completed Orders Count
│   ├── Live Open / Active Tables Indicator
│   ├── Tender Breakdown (Cash vs. Card Totals)
│   ├── Top-Selling Products by Volume & Revenue
│   └── Live Activity Log & Recent Transactions
│
└── 7. Essential POS Reporting
    ├── Daily Sales Summary Report
    ├── Detailed Order & Item Sales Breakdown
    ├── Payment Method Reconciliation Report
    ├── Category-Wise Revenue Analysis
    └── Void & Cancellation Audit Report
```

---

# 4. Explicitly Excluded Features (Out of Scope for MVP)

To maintain focus and guarantee operational excellence in Phase 1, the following capabilities are **strictly excluded** from MVP development:

| Domain | Excluded Capabilities in Phase 1 MVP | Planned Phase |
|---|---|---|
| **Property Management (PMS)** | Room types, room inventory, booking engine, guest check-in/out, folios, room keys | Phase 2 |
| **Reservations** | Room booking calendar, deposit pre-authorization, OTA booking intake | Phase 2 |
| **Inventory & Procurement** | Raw ingredient tracking, recipe deduction (BOM), purchase orders, GRN, suppliers | Phase 3 |
| **Housekeeping & Maintenance** | Room cleaning schedules, dirty/inspected room status, work orders, asset repair | Phase 2 / Phase 4 |
| **Finance & Accounting** | General ledger, chart of accounts, journal entries, balance sheet, trial balance | Phase 4 |
| **Human Resources** | Staff payroll, attendance clock-in biometric sync, leave management, shifts scheduling | Phase 4 |
| **Guest CRM & Loyalty** | Guest loyalty points, marketing email/SMS campaigns, guest preference profiles | Phase 4 / Phase 5 |
| **Events & Banquets** | Hall rentals, function catering contracts, event billing packages | Phase 5 |
| **Distribution & Channels** | Channel manager, Booking.com/Expedia/Airbnb two-way synchronization | Phase 5 |
| **Enterprise / Multi-Property** | Multi-property tenant switching, central reservations, inter-property stock transfers | Phase 6 |
| **Advanced POS Enhancements** | Table merging/splitting, split billing per seat, room-charge folio routing | Future Iteration |
| **Hardware Direct Drivers** | ESC/POS raw socket printer communication (Browser `window.print()` used for MVP) | Future Iteration |
| **AI & Predictive Analytics** | Demand forecasting, dynamic pricing algorithms, AI chatbots | Roadmap |

---

# 5. User Roles & Permission Matrix

Phase 1 implements a structured Role-Based Access Control (RBAC) model containing **five predefined tenant roles**:

```text
                        ┌────────────────────────┐
                        │      Tenant Admin      │
                        │ (Full Property Control)│
                        └───────────┬────────────┘
                                    │
                        ┌───────────┴────────────┐
                        │        Manager         │
                        │ (Operations & Voids)   │
                        └─────┬────────────┬─────┘
                              │            │
         ┌────────────────────┴─────┐ ┌────┴────────────────────┐
         │     Cashier / Operator   │ │      Kitchen Staff      │
         │  (Orders, Billing, Pay)  │ │   (KOT View & Prep)     │
         └──────────────────────────┘ └─────────────────────────┘
```

### Role Capabilities & Restrictions

| Capability / Action | Tenant Admin | Manager | Cashier / Operator | Kitchen Staff |
|---|:---:|:---:|:---:|:---:|
| Configure Tenant & Property Settings | ✅ | ❌ | ❌ | ❌ |
| Manage Users & Assign Roles | ✅ | ❌ | ❌ | ❌ |
| Manage Menu (Categories & Products) | ✅ | ✅ | ❌ | ❌ |
| Manage Tables & Outlets | ✅ | ✅ | ❌ | ❌ |
| Open & Close POS Shifts | ✅ | ✅ | ✅ | ❌ |
| Create & Update Dine-in / Takeaway Orders | ✅ | ✅ | ✅ | ❌ |
| Send Order Items to Kitchen (Dispatch KOT) | ✅ | ✅ | ✅ | ❌ |
| Cancel Order or Void Billed Items | ✅ | ✅ *(Logged)* | ❌ *(Needs Approval)*| ❌ |
| Apply Custom Manual Discounts | ✅ | ✅ | ❌ *(Fixed Limits)* | ❌ |
| Generate Bills & Process Payments | ✅ | ✅ | ✅ | ❌ |
| Reprint Receipts | ✅ | ✅ | ✅ | ❌ |
| View Kitchen Order Display (KDS / KOT) | ✅ | ✅ | ✅ | ✅ |
| Update KOT Preparation Status | ❌ | ❌ | ❌ | ✅ |
| View Financial Reports & Executive Dashboard | ✅ | ✅ | ❌ *(Shift report only)*| ❌ |
| View System Audit Trail | ✅ | ❌ | ❌ | ❌ |

---

# 6. MVP Screen Inventory & Navigation Architecture

The Next.js frontend will implement a responsive, modern application shell with a collapsible sidebar and clean view hierarchy:

```text
Application Root
│
├── /login                                    (Public authentication screen)
│
└── /dashboard (Protected App Shell)
    │
    ├── /dashboard/overview                   (High-level metrics & live stats)
    │
    ├── /dashboard/pos
    │   ├── /dashboard/pos/terminal           (Active sales grid, cart, table selector)
    │   ├── /dashboard/pos/tables             (Visual table occupancy layout)
    │   ├── /dashboard/pos/orders             (Active & historical order list)
    │   └── /dashboard/pos/kitchen            (Kitchen display board / KOT manager)
    │
    ├── /dashboard/menu
    │   ├── /dashboard/menu/categories        (Category CRUD & sorting)
    │   └── /dashboard/menu/products          (Product pricing, taxes, status)
    │
    ├── /dashboard/reports
    │   ├── /dashboard/reports/daily-sales    (Date-range filtered revenue totals)
    │   ├── /dashboard/reports/item-sales     (Quantities sold per product/category)
    │   ├── /dashboard/reports/payments       (Cash vs. Card settlement breakdown)
    │   └── /dashboard/reports/cancellations  (Voided orders audit report)
    │
    └── /dashboard/settings
        ├── /dashboard/settings/property      (Name, address, currency, tax rates)
        ├── /dashboard/settings/users         (Staff accounts & active state)
        └── /dashboard/settings/roles         (Role assignments & permissions view)
```

---

# 7. End-to-End POS Operational Workflow

Every business transaction in the MVP follows this strict sequential lifecycle:

```text
 1. Staff Authentication
    └─ Cashier enters credentials → System validates tenant, user status, and role.
 2. Shift Verification
    └─ System checks for active shift; prompts Cashier to enter starting cash float if opening a new shift.
 3. Order Inception
    └─ Cashier selects "Dine-in" (picks vacant table) or "Takeaway".
 4. Item Selection
    └─ Items clicked from category grid; quantities adjusted; optional kitchen prep notes added.
 5. Order Creation (DRAFT → OPEN)
    └─ Backend validates product prices, locks tenant ID, creates Order and OrderItems.
 6. Kitchen Dispatch (KOT)
    └─ Cashier clicks "Send to Kitchen" → System generates KOT ticket (Status: KOT_SENT).
 7. Kitchen Processing
    └─ Kitchen screen receives ticket → Kitchen marks IN_PREPARATION → Marks READY.
 8. Bill Presentation
    └─ Guest requests check → Cashier triggers "Generate Bill" (Status: BILLED).
    └─ Server calculates: Subtotal - Discounts + Tax = Total Payable. Order items locked against edits.
 9. Payment Collection
    └─ Guest tenders Cash (system shows change due) or Card (operator logs reference ID).
10. Order Settlement & Receipt (Status: PAID)
    └─ Payment record committed in database transaction; order marked PAID; Table freed to AVAILABLE.
    └─ Thermal-friendly receipt preview dialog displayed with standard browser print command.
11. Live Aggregation
    └─ Dashboard revenue counter, today's order count, and sales reports immediately reflect the sale.
```

---

# 8. Order Lifecycle & State Machine

Order state transitions are strictly governed by backend validation guards. An order cannot bypass states or transition backwards into mutable states once billed:

```text
                      ┌───────────────┐
                      │     DRAFT     │ (Cart in progress on client)
                      └───────┬───────┘
                              │ Save Order
                              ▼
                      ┌───────────────┐
                      │     OPEN      │ (Saved with Table / Customer info)
                      └───────┬───────┘
                              │ Send to Kitchen
                              ▼
                      ┌───────────────┐
                      │   KOT_SENT    │ (Dispatched to Kitchen Display)
                      └───────┬───────┘
                              │ Kitchen Acknowledges
                              ▼
                      ┌───────────────┐
                      │IN_PREPARATION │ (Food being cooked)
                      └───────┬───────┘
                              │ Kitchen Completes
                              ▼
                      ┌───────────────┐
                      │     READY     │ (Dishes plated / ready to serve)
                      └───────┬───────┘
                              │ Order Served / Finalized
                              ▼
                      ┌───────────────┐
                      │   COMPLETED   │ (Dining finished)
                      └───────┬───────┘
                              │ Request Bill
                              ▼
                      ┌───────────────┐
                      │    BILLED     │ (Items locked, Bill record created)
                      └───────┬───────┘
                              │ Settle Payment
                              ▼
                      ┌───────────────┐
                      │     PAID      │ (Final settled state — Immutable)
                      └───────────────┘

                 [ ANY ACTIVE STATE EXCEPT 'PAID' ]
                              │
                              │ Cancel / Void (Authorized Role Only)
                              ▼
                      ┌───────────────┐
                      │   CANCELLED   │ (Requires logged cancellation reason)
                      └───────────────┘
```

### State Guard Rules
* **DRAFT / OPEN:** Items may be added, updated in quantity, or removed freely.
* **KOT_SENT / IN_PREPARATION / READY:** Modifying items requires generating an updated KOT addendum.
* **BILLED:** No items can be added or deleted. If changes are mandatory, a Manager must explicitly void the bill back to OPEN (logged in AuditLog).
* **PAID:** Completely immutable. No edits, voids, or balance modifications permitted.
* **CANCELLED:** Terminal state. If order was associated with a table, the table is immediately released back to `AVAILABLE`.

---

# 9. Financial & Calculation Rules

To prevent tampering and ensure financial compliance, **all calculations are executed exclusively on the NestJS backend**. The frontend only displays server-calculated figures.

### 9.1 Formula Definitions
```text
Item Gross Amount     = Item Unit Price × Quantity
Item Discount Amount  = Line Discount (Percentage or Fixed)
Item Net Amount       = Item Gross Amount - Item Discount Amount

Subtotal              = Sum of all Item Net Amounts
Order Discount Amount = Applied Order-Level Discount (Coupon / Manager Discretion)
Taxable Base          = Subtotal - Order Discount Amount
Tax Amount            = Taxable Base × (Configured Property Tax Rate % / 100)
Service Charge Amount = Taxable Base × (Configured Property Service Charge % / 100)

Total Amount Due      = Taxable Base + Tax Amount + Service Charge Amount
```

### 9.2 Rounding & Formatting Policies
* **Precision:** All monetary amounts are stored in the database with two decimal places (`DECIMAL(10, 2)`).
* **Rounding Rule:** Standard half-up rounding (`ROUND_HALF_UP`) applied at the final total calculation.
* **Discount Constraints:**
  * Cashiers can only apply predefined percentage discounts up to 10%.
  * Custom discounts greater than 10% or fixed amount deductions require Manager authentication.
  * Total discount cannot exceed the Subtotal under any circumstance.

---

# 10. Payment & Tender Rules

### 10.1 Supported Payment Methods in Phase 1
1. **Cash:**
   * Cashier enters `Amount Tendered`.
   * System calculates `Change Due = Amount Tendered - Total Due`.
   * Amount tendered must be greater than or equal to `Total Due`.
2. **Card (Credit / Debit):**
   * Processed via external physical EDC terminal.
   * Cashier enters `Card Last 4 Digits` and optional `Transaction / Approval Code`.
   * Card amount must match `Total Due` exactly.

### 10.2 MVP Payment Policy Constraints
* **Single Tender per Transaction:** To maintain simplicity in Phase 1, each order is settled via a single payment (either 100% Cash or 100% Card). Split-tender (e.g., $20 cash + $30 card) is deferred to post-MVP.
* **No Partial Payments:** Orders must be paid in full to attain the `PAID` state. Unpaid balances remain in `BILLED` state.
* **No Unsettled Credit / Room Charges:** Folio room-routing requires the PMS module and is strictly excluded from Phase 1.

---

# 11. Shift Management (POSShift) Rules

To establish cash accountability, daily operations are anchored to cash shifts:

1. **Shift Opening:**
   * Before launching the POS Terminal, a cashier must open a shift with an initial starting cash float (e.g., $100.00).
   * A cashier may only have one active shift open at any time.
2. **Shift Operations:**
   * Every cash order processed is automatically tied to the active `shift_id`.
   * Real-time tracking calculates `Expected Cash in Drawer = Starting Float + Total Cash Sales`.
3. **Shift Closing:**
   * At shift end, cashier enters `Actual Cash Count`.
   * System records `Cash Variance = Actual Cash Count - Expected Cash`.
   * Shift is closed and locked; a summary shift report is generated for manager review.

---

# 12. Dashboard Requirements & Metrics

The Dashboard provides real-time operational awareness powered entirely by live database queries:

```text
┌─────────────────────────┬─────────────────────────┬─────────────────────────┬─────────────────────────┐
│     Today's Revenue     │      Total Orders       │       Cash Sales        │       Card Sales        │
│        $2,845.50        │       48 Orders         │        $1,420.00        │        $1,425.50        │
└─────────────────────────┴─────────────────────────┴─────────────────────────┴─────────────────────────┘
┌───────────────────────────────────────────────────┬───────────────────────────────────────────────────┐
│              Live Table Status Grid               │              Top Selling Products Today           │
│   [ T1: Occupied ]  [ T2: Available ]             │   1. Signature Burger (34 sold - $510.00)         │
│   [ T3: Billed   ]  [ T4: Available ]             │   2. Iced Latte       (28 sold - $140.00)         │
│   [ T5: Occupied ]  [ T6: Available ]             │   3. Margherita Pizza (19 sold - $285.00)         │
└───────────────────────────────────────────────────┴───────────────────────────────────────────────────┘
┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                               Recent Orders & Live Activity Feed                                      │
│   • 10:42 AM - Order #1048 settled ($45.00 via Card) by Cashier Alice                                │
│   • 10:38 AM - Order #1049 sent to Kitchen (Table 5)                                                 │
│   • 10:31 AM - Bill generated for Order #1047 (Table 1 - $82.50)                                     │
└───────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Dashboard Query Rules
* All figures are strictly scoped to the authenticated tenant's `tenant_id` and active `property_id`.
* Today's metrics calculate from `00:00:00` to `23:59:59` according to the property's configured timezone.
* Absolutely zero hardcoded, mock, or placeholder metrics in production code.

---

# 13. Phase 1 Report Specifications

Reports provide essential operational and reconciliation insights with customizable date-range filters (Today, Yesterday, Last 7 Days, Custom Range):

1. **Daily Sales Summary Report:**
   * Date, Gross Sales, Total Discounts, Total Taxes Collected, Net Revenue, Total Completed Orders.
2. **Order Sales Report:**
   * Order Number, Date/Time, Order Type (Dine-in / Takeaway), Table, Cashier Name, Bill Amount, Status.
3. **Product & Category Performance Report:**
   * Category Name, Product Name, SKU, Quantity Sold, Gross Revenue Generated.
4. **Payment Method Reconciliation Report:**
   * Payment Method (Cash / Card), Transaction Count, Total Amount Collected.
5. **Void & Cancellation Audit Report:**
   * Order Number, Cancellation Date, Reason for Void, Authorized Manager Name, Amount Voided.

---

# 14. High-Level Database Entities (Logical Models)

*Detailed physical schemas, foreign key names, and column types are documented in [08-database-design.md](file:///c:/EVERBIMS/hotel-Saas/docs/08-database-design.md). The logical entities required for Phase 1 are:*

```text
SaaS Core Entities:
├── Tenant                  (Tenant account, company name, status, subscription tier)
├── Property                (Hotel/restaurant property, address, currency, timezone, tax rates)
├── User                    (Staff credentials, hashed password, active flag)
├── Role                    (Predefined roles: Tenant Admin, Manager, Cashier, Kitchen)
└── Permission              (Granular resource action grants linked to roles)

POS Master Entities:
├── POSOutlet               (F&B outlet definition belonging to a property)
├── Category                (Menu category hierarchy, display sequence)
├── Product                 (Menu item, SKU, description, active status)
├── ProductPrice            (Current price, tax class linkage)
└── DiningTable             (Table number, seating capacity, status: AVAILABLE/OCCUPIED/RESERVED)

POS Operational Entities:
├── POSShift                (Cash drawer shift, opening float, cash counted, variance)
├── Order                   (Order header, order number, type, status, table reference, shift reference)
├── OrderItem               (Line item, product snapshot, quantity, unit price, item notes, item discount)
├── KOT                     (Kitchen ticket header, ticket number, order reference, status)
├── KOTItem                 (Individual item routed to kitchen, status, preparation notes)
├── Bill                    (Invoice snapshot, subtotal, discount total, tax total, grand total)
├── Payment                 (Payment transaction, bill reference, method: CASH/CARD, tender details)
└── AuditLog                (System audit trail: user, action, entity, timestamp, changes)
```

---

# 15. High-Level API Surface

*Detailed endpoint contracts, request/response DTOs, and status codes are documented in [09-api-specification.md](file:///c:/EVERBIMS/hotel-Saas/docs/09-api-specification.md). The Phase 1 API boundary is categorized below:*

### 15.1 SaaS Core & Administration
* `POST /api/auth/login` — Authenticate user, verify tenant, return JWT token.
* `POST /api/auth/logout` — Terminate user session.
* `GET  /api/auth/me` — Return authenticated user profile and permissions.
* `GET  /api/tenants/current` — Get tenant information and subscription status.
* `GET  /api/properties/current` — Get active property operational configuration.
* `GET/POST/PUT /api/users` — Staff member management and role allocation.
* `GET  /api/roles` — Retrieve available roles and permissions.

### 15.2 POS Master Data
* `GET/POST/PUT/DELETE /api/pos/categories` — Menu categories management.
* `GET/POST/PUT/DELETE /api/pos/products` — Menu products and pricing management.
* `GET/POST/PUT/DELETE /api/pos/tables` — Dining tables layout and status updates.
* `GET/PUT             /api/pos/outlets` — Outlet operational settings.

### 15.3 POS Operations & Transactions
* `POST /api/pos/shifts/open` — Open cash shift with starting float.
* `POST /api/pos/shifts/close` — Close active shift with cash reconciliation.
* `GET  /api/pos/shifts/current` — Check cashier's active shift status.
* `GET/POST            /api/pos/orders` — List active orders / Create new order.
* `GET/PUT             /api/pos/orders/:id` — Order details / Update items.
* `POST                /api/pos/orders/:id/cancel` — Void order (Manager only).
* `POST                /api/pos/orders/:id/kot` — Dispatch items to kitchen.
* `GET                 /api/pos/kot/active` — Kitchen display live ticket stream.
* `PUT                 /api/pos/kot/:id/status` — Update preparation status.
* `POST                /api/pos/orders/:id/bill` — Generate and lock bill.
* `POST                /api/pos/orders/:id/payment` — Settle bill with Cash or Card.
* `GET                 /api/pos/orders/:id/receipt` — Retrieve formatted receipt payload.

### 15.4 Dashboard & Reporting
* `GET /api/dashboard/stats` — Summary KPI metrics for today.
* `GET /api/dashboard/live-tables` — Real-time table occupancy status.
* `GET /api/dashboard/recent-activity` — Recent transaction event feed.
* `GET /api/reports/sales-summary` — Aggregated sales summary report.
* `GET /api/reports/product-sales` — Product volume and revenue report.
* `GET /api/reports/payments` — Payment method breakdown report.
* `GET /api/reports/cancellations` — Voided order audit report.

---

# 16. Core Business & Validation Rules

1. **Server-Enforced Tenant Isolation:** Every single database read, write, query, and aggregation must filter explicitly by `tenant_id` resolved from the verified JWT payload. Client-provided `tenant_id` parameters are never trusted.
2. **Backend Pricing Authority:** Product prices are resolved on the server at order creation time. The client cannot send arbitrary item prices.
3. **Active Entity Validation:** Inactive categories or deactivated products cannot be added to new orders. Deactivated tables cannot be assigned.
4. **Table Conflict Prevention:** A dining table with status `OCCUPIED` cannot be assigned to another order until the active order is `PAID` or `CANCELLED`.
5. **Bill Immutability:** Once an order transitions to `BILLED`, no item additions, quantity modifications, or line removals can occur unless the bill is voided by an authorized Manager.
6. **Payment Finality:** Once an order has a completed payment record and reaches `PAID`, no further payments can be accepted, and the order cannot be deleted or modified.
7. **Role-Enforced Voids:** Cashiers cannot cancel an order once items have been sent to the kitchen. Only a `Manager` or `Tenant Admin` can authorize an order void, requiring a mandatory reason recorded in the `AuditLog`.
8. **Kitchen Boundary:** Kitchen staff accounts have read and status-update access to KOT views only. They have zero access to billing, pricing, or payment endpoints.

---

# 17. Phase 1 MVP Acceptance Criteria

Phase 1 development is officially concluded and deemed operationally ready only when all of the following acceptance criteria pass in an integrated, production-like environment:

### Acceptance Test Scenario: End-to-End Operational Lifecycle
- [ ] **Onboarding & Setup:** A tenant administrator logs in, configures the property details (currency, 10% tax rate), creates 2 categories, adds 5 menu items with prices, and configures 4 dining tables.
- [ ] **Shift Initiation:** Cashier logs in, enters a starting cash float of $100.00, and successfully opens an operational shift.
- [ ] **Dine-in Order:** Cashier opens POS Terminal, selects Table #2 (table status changes to `OCCUPIED`), adds 2 Burgers and 2 Drinks with custom prep notes, and saves the order.
- [ ] **KOT Kitchen Flow:** Cashier clicks "Send to Kitchen". The kitchen display screen instantly shows the new KOT ticket. Kitchen staff updates status to `IN_PREPARATION` and then `READY`.
- [ ] **Bill Calculation:** Cashier generates the bill. The backend computes the subtotal, applies the 10% property tax, and outputs the exact total payable. Table status transitions to `BILLED`.
- [ ] **Payment Settlement:** Cashier selects "Cash", enters $50.00 tendered for a $44.00 bill; the system calculates $6.00 change due. Cashier confirms; the order transitions to `PAID`, the table is released back to `AVAILABLE`.
- [ ] **Receipt Output:** A printable receipt renders containing property details, tax invoice breakdown, payment method, and cashier identifier.
- [ ] **Takeaway & Card Flow:** Cashier creates a direct "Takeaway" order, dispatches KOT, generates bill, and settles with "Card" (entering reference ID). Order transitions to `PAID`.
- [ ] **Dashboard Verification:** The manager navigates to the Dashboard; Today's Revenue, Total Orders, Cash vs. Card totals, and Recent Activity accurately reflect both transactions with zero delay.
- [ ] **Reporting Verification:** The Daily Sales Report and Payment Method Report match the exact transaction amounts down to the penny.
- [ ] **Security & Multi-Tenant Isolation:** A second test tenant account logs in; their dashboard, menu items, table status, and orders display strictly their own isolated data with zero leakage from the first tenant.

---

# 18. Phased Development Execution Order

Development must proceed sequentially according to this dependency chain to prevent rework and architectural drift:

```text
Step 1: Workspace & Foundation
   └─ Configure monorepo structure (client/ Next.js + server/ NestJS), environment variables, linting, shared types.
Step 2: Database Layer & Migrations
   └─ Establish TypeORM / Prisma connection to MySQL; generate core tables (Tenant, Property, User, Role, Permission).
Step 3: SaaS Core & Authentication
   └─ Implement password hashing (bcrypt), JWT generation, Auth Guards, Roles Guard, and Tenant Context Interceptor.
Step 4: POS Master Data API
   └─ Build REST endpoints for Categories, Products, and Tables with tenant filtering and input validation DTOs.
Step 5: Frontend App Shell & Master Data UI
   └─ Next.js App Router layout, authentication screens, Sidebar, Category/Product management, Table setup screens.
Step 6: Shift Management & POS Terminal UI
   └─ Shift opening/closing modal, POS interactive catalog grid, cart calculation, table picker modal.
Step 7: Order Lifecycle Engine & KOT
   └─ Order creation endpoints, item modifier handling, KOT generation, Kitchen Display screen with live updates.
Step 8: Billing, Tax Engine & Payments
   └─ Backend calculation service (subtotal, discounts, taxes), bill generation, cash/card payment settlement transactions.
Step 9: Receipts & Hardware Printing
   └─ Thermal print component layout, formatted receipt data endpoint, browser print dialog integration.
Step 10: Live Dashboard & Reporting
   └─ Aggregation query services for today's KPIs, table occupancy grid, date-filtered sales and payment reports.
Step 11: Security Hardening & Audit Logging
   └─ Audit logging interceptor, rate limiting, CORS configuration, end-to-end multi-tenant isolation tests.
Step 12: End-to-End Verification & Documentation Update
   └─ Execute Acceptance Test Scenarios; verify all criteria; finalize documentation.
```

---

# 19. Next Steps & Downstream Documentation

Following approval of this scope, detailed technical specifications will be detailed in the respective specialized documents:

* **[03-system-architecture.md](file:///c:/EVERBIMS/hotel-Saas/docs/03-system-architecture.md)** — Architectural patterns, request flow, frontend/backend component boundaries.
* **[04-multi-tenancy.md](file:///c:/EVERBIMS/hotel-Saas/docs/04-multi-tenancy.md)** — Tenant data isolation strategy, tenant context resolution, security boundaries.
* **[05-authentication-authorization.md](file:///c:/EVERBIMS/hotel-Saas/docs/05-authentication-authorization.md)** — JWT lifecycle, session management, RBAC guard implementations.
* **[06-dashboard-requirements.md](file:///c:/EVERBIMS/hotel-Saas/docs/06-dashboard-requirements.md)** — Detailed KPI query specifications and widget designs.
* **[07-pos-requirements.md](file:///c:/EVERBIMS/hotel-Saas/docs/07-pos-requirements.md)** — Detailed POS interaction flows, keyboard shortcuts, terminal UI states.
* **[08-database-design.md](file:///c:/EVERBIMS/hotel-Saas/docs/08-database-design.md)** — Comprehensive MySQL DDL, indexes, constraints, and relational schemas.
* **[09-api-specification.md](file:///c:/EVERBIMS/hotel-Saas/docs/09-api-specification.md)** — OpenAPI / Swagger contracts with request/response payloads and error schemas.
* **[10-development-roadmap.md](file:///c:/EVERBIMS/hotel-Saas/docs/10-development-roadmap.md)** — Sprint-by-sprint implementation schedule and task assignments.
