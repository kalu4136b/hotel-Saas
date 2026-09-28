# Hotel SaaS — System Architecture & Technical Specifications

**Document:** 03-system-architecture.md  
**Version:** 1.0  
**Status:** Implemented & Verified  
**Project Type:** Multi-Tenant Hospitality Operations Platform  
**Phase:** Phase 1 MVP  
**Frontend Stack:** Next.js (App Router) + TypeScript + Tailwind CSS  
**Backend Stack:** NestJS + TypeORM + TypeScript  
**Database:** MySQL 8.0 (15 Core Normalized Relational Tables)  

---

## 1. High-Level Architectural Topology

```
+----------------------------------------------------------------------------------------------------+
|                                           CLIENT TIER                                              |
|                                    (Next.js App Router / React 19)                                 |
|                                                                                                    |
|  +------------------------+  +-------------------------+  +-------------------------------------+  |
|  |    Auth Engine         |  |   Point of Sale (POS)   |  |   Kitchen Display System (KDS)      |  |
|  |  /login, /signup       |  |   /dashboard/pos        |  |   /dashboard/kitchen                |  |
|  +------------------------+  +-------------------------+  +-------------------------------------+  |
|  +------------------------+  +-------------------------+  +-------------------------------------+  |
|  |   Dining Floor Map     |  |   Menu & Inventory Cat  |  |   Executive Telemetry & Reports     |  |
|  |   /dashboard/tables    |  |   /dashboard/menu       |  |   /dashboard, /dashboard/reports    |  |
|  +------------------------+  +-------------------------+  +-------------------------------------+  |
+----------------------------------------------------------------------------------------------------+
                                                |
                                                | JWT Bearer Token (Authorization: Bearer <token>)
                                                | JSON REST APIs (Cross-Origin Resource Sharing)
                                                v
+----------------------------------------------------------------------------------------------------+
|                                           BACKEND TIER                                             |
|                                   (NestJS Enterprise Platform)                                     |
|                                                                                                    |
|  +-----------------------------------------------------------------------------------------------+ |
|  |                                  JwtAuthGuard & RBAC Guard                                    | |
|  |     (Tenant & Property Context Extraction, Role Permissions: ADMIN, MANAGER, CASHIER, KITCHEN)| |
|  +-----------------------------------------------------------------------------------------------+ |
|                                                |                                                   |
|  +--------------------+ +--------------------+ +--------------------+ +--------------------------+ |
|  |    AuthModule      | |    DashboardModule | |     PosModule      | |      ReportsModule       | |
|  |  Register Tenant,  | |  Real SQL metrics, | |  Shifts, Orders,   | |  Daily Sales, Item sales,| |
|  |  Login, JWT Issuer | |  Live Table States | |  KOTs, Cash & Card | |  Cancellations, Audit Log| |
|  +--------------------+ +--------------------+ +--------------------+ +--------------------------+ |
|  +--------------------+                                                                            |
|  |   SettingsModule   |                                                                            |
|  |  Property, Staff,  |                                                                            |
|  |  Audit Log Stream  |                                                                            |
|  +--------------------+                                                                            |
+----------------------------------------------------------------------------------------------------+
                                                |
                                                | TypeORM Connection Pool (DataSource)
                                                | Strict Foreign Keys, Indexes & Constraints
                                                v
+----------------------------------------------------------------------------------------------------+
|                                         PERSISTENCE TIER                                           |
|                                         (MySQL 8.0 Engine)                                         |
|                                                                                                    |
|  [tenants]          [properties]        [pos_outlets]       [users]           [categories]         |
|  [products]         [dining_tables]     [pos_shifts]        [orders]          [order_items]        |
|  [kots]             [kot_items]         [bills]             [payments]        [audit_logs]         |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Multi-Tenancy Architecture

### 2.1 Logical Partitioning
- Multi-tenancy is implemented through strict **Discriminator Column Multi-Tenancy** (`tenant_id`).
- Every business entity (Properties, Outlets, Tables, Categories, Products, Shifts, Orders, KOTs, Bills, Payments, and Audit Logs) is keyed to both `tenantId` and `propertyId`.
- No cross-tenant reads or updates can occur; all service repository queries enforce:
  ```typescript
  where: { tenantId: user.tenantId, propertyId: user.propertyId }
  ```

### 2.2 Atomic Tenant Onboarding
During registration (`POST /api/auth/register`), a single atomic database transaction provisions:
1. `Tenant` row with unique slug and code (e.g., `NOVOTEL`).
2. Primary `Property` row with currency, tax rate, and address.
3. Default `PosOutlet` ("Main Restaurant & Bar").
4. Default Menu `Categories` (Starters, Main Courses, Desserts, Beverages).
5. Default `Products` with pricing and tax assignments.
6. Initial `DiningTables` (T-01 through T-06) with seating capacities.
7. System `User` with `ADMIN` role and bcrypt-hashed password.
8. Initial `AuditLog` entry documenting tenant initialization.

---

## 3. Database Schema & Data Dictionary

| Table Name | Primary Key | Foreign Keys | Key Columns | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `tenants` | `id` (UUID) | None | `name`, `code`, `status`, `plan` | Master customer organization account |
| `properties` | `id` (UUID) | `tenant_id` | `name`, `code`, `currency`, `default_tax_rate`, `service_charge_rate` | Physical hotel or resort branch |
| `pos_outlets` | `id` (UUID) | `tenant_id`, `property_id` | `name`, `code`, `is_active` | POS selling point (Bar, Dining Room, Pool) |
| `users` | `id` (UUID) | `tenant_id`, `property_id` | `email`, `username`, `password_hash`, `role`, `is_active` | Staff accounts & credentials |
| `categories` | `id` (UUID) | `tenant_id`, `property_id` | `name`, `code`, `sort_order`, `is_active` | Food & beverage classification |
| `products` | `id` (UUID) | `tenant_id`, `property_id`, `category_id` | `name`, `sku`, `price`, `tax_rate`, `is_available` | Sellable menu catalog items |
| `dining_tables` | `id` (UUID) | `tenant_id`, `property_id`, `outlet_id` | `table_number`, `capacity`, `status` | Seating resources & floor plan |
| `pos_shifts` | `id` (UUID) | `tenant_id`, `property_id`, `outlet_id`, `cashier_user_id` | `opened_at`, `closed_at`, `starting_float`, `expected_cash`, `actual_cash`, `status` | Cash drawer accountability sessions |
| `orders` | `id` (UUID) | `tenant_id`, `property_id`, `table_id`, `cashier_user_id` | `order_number`, `status`, `subtotal`, `tax_total`, `total_amount` | Central commercial order record |
| `order_items` | `id` (UUID) | `order_id`, `product_id` | `quantity`, `unit_price`, `subtotal`, `tax_amount`, `notes` | Line items belonging to order |
| `kots` | `id` (UUID) | `tenant_id`, `property_id`, `order_id` | `kot_number`, `status`, `printed_at` | Kitchen Order Ticket dispatch |
| `kot_items` | `id` (UUID) | `kot_id`, `product_id` | `quantity`, `special_instructions` | Food items queued for preparation |
| `bills` | `id` (UUID) | `tenant_id`, `property_id`, `order_id` | `bill_number`, `subtotal`, `discount_amount`, `tax_amount`, `total_payable`, `status` | Customer invoice record |
| `payments` | `id` (UUID) | `tenant_id`, `property_id`, `order_id`, `bill_id`, `shift_id` | `receipt_number`, `payment_method`, `amount_paid`, `change_amount`, `status` | Financial transaction proof |
| `audit_logs` | `id` (UUID) | `tenant_id`, `property_id`, `user_id` | `action`, `entity`, `entity_id`, `details`, `ip_address` | Immutable security log |

---

## 4. Operational State Machines

### 4.1 Order Lifecycle
```
[DRAFT] 
   │
   ▼  (Send to Kitchen)
[CONFIRMED] ─── Creates KOT in [PENDING] ─── Kitchen sets [IN_PREPARATION]
   │
   ▼  (Print / Generate Bill)
[BILLED] ─── Bill status: [ISSUED]
   │
   ├──────────────────────────────┐
   ▼ (Receive Payment)            ▼ (Manager Cancel)
[PAID]                         [CANCELLED]
   │                              │
   ▼                              ▼
Table Status -> [AVAILABLE]    Table Status -> [AVAILABLE]
Shift Cash Balance Updated     Audit Log Recorded
```

### 4.2 Cash Shift Lifecycle
```
[NO ACTIVE SHIFT]
   │
   ▼ (Cashier inputs Opening Float, e.g., $100.00)
[OPEN]
   │
   ├── Sells orders, accumulates cash payments into expectedCash
   │
   ▼ (Cashier counts physical cash drawer & submits Close Shift)
[CLOSED]
   │
   └── Calculates discrepancy: actualCashCount - (startingFloat + cashSales)
```

---

## 5. Security & Authentication Model

1. **Password Hashing:** Standard `bcrypt` with salt rounds = 10.
2. **Stateless JWT Authorization:** Tokens carry `userId`, `username`, `role`, `tenantId`, and `propertyId`. Signed with server secret.
3. **Role-Based Access Control (RBAC):**
   - `ADMIN`: Unrestricted platform access (Configuration, Staff, Auditing, POS, Kitchen, Reports).
   - `MANAGER`: Void orders, manage catalog, close shifts, view financial reports.
   - `CASHIER`: Open shift, take orders, accept payments, print receipts.
   - `KITCHEN`: KDS status transitions (`IN_PREPARATION`, `READY`, `SERVED`).
4. **Audit Logging:** High-impact events (`USER_REGISTER`, `PROPERTY_UPDATED`, `STAFF_CREATED`, `ORDER_CANCELLED`, `SHIFT_CLOSED`) are logged with actor ID and JSON payload.

---

## 6. Verification Checklist
- [x] Multi-tenant isolation verified via strict `tenant_id` foreign keys.
- [x] Zero dummy data — All figures come directly from SQL `SUM`, `COUNT`, `AVG`.
- [x] Real-time calculations: subtotal, dynamic tax rate, service charge, and tendered change computed on backend.
- [x] Order -> KOT -> Kitchen -> Bill -> Payment -> Receipt end-to-end loop verified.
- [x] Thermal printer CSS media queries configured for receipts and invoices.
