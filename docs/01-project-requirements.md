# Hotel SaaS — Master Project Requirements

**Document:** 01-project-requirements.md  
**Version:** 1.0  
**Status:** Initial Product Requirements  
**Project Type:** Multi-Tenant Hotel Management SaaS  
**Current Development Phase:** Phase 1 — MVP  
**Frontend:** Next.js + TypeScript  
**Backend:** NestJS + TypeScript  
**Database:** MySQL  
**Architecture:** Web-based multi-tenant SaaS  

---

# 1. Document Purpose

This document is the master product requirements document for the Hotel Management SaaS platform.

It defines:

* The overall product vision
* Target customers
* System objectives
* Major modules
* SaaS/package structure
* User types
* Core business concepts
* Phase 1 MVP scope
* Future product direction
* General functional requirements
* General non-functional requirements
* Security expectations
* Architectural principles

This document is the high-level source of truth for the project.

Detailed technical specifications will be maintained in separate documents.

---

# 2. Product Overview

The Hotel SaaS is a multi-tenant hotel and hospitality management platform designed to support properties ranging from small guest houses and villas to medium-sized hotels, luxury hotels, resorts, and eventually multi-property hotel groups.

The platform will provide a centralized system for managing hotel operations through modular functionality.

The initial MVP will focus on establishing the SaaS foundation and delivering a fully operational basic POS and management dashboard.

The platform must be designed so additional modules can be added without requiring a complete rewrite of the existing system.

---

# 3. Product Vision

The long-term goal is to provide a configurable hospitality management platform where different types of hospitality businesses can use the same core system while enabling only the features appropriate for their business size and subscription package.

The system should support:

* Small properties with simple operations
* Medium hotels with multiple operational departments
* Luxury hotels with advanced operational requirements
* Restaurants and F&B outlets attached to hotels
* Resorts and villas
* Multiple-property hotel groups

The platform must prioritize:

* Modularity
* Configurability
* Security
* Scalability
* Tenant isolation
* Operational reliability
* Ease of use
* Maintainability
* API-first backend design

---

# 4. Target Customers

## 4.1 Small Properties

Examples:

* Guest houses
* Villas
* Small hotels
* Boutique properties
* Small restaurants

Typical requirements:

* Basic room management
* Basic reservations
* Simple POS
* Basic inventory
* Basic housekeeping
* Basic reporting

---

## 4.2 Medium Properties

Examples:

* Medium-sized hotels
* Boutique hotels
* Hotels with restaurants
* Hotels with multiple operational departments

Typical requirements:

* Advanced reservations
* Front desk
* POS
* Multiple outlets
* Inventory
* Procurement
* Housekeeping
* Finance
* Reports
* Employee management

---

## 4.3 Luxury Properties

Examples:

* Four-star hotels
* Five-star hotels
* Resorts
* Large boutique hotels
* Properties with multiple F&B outlets

Typical requirements:

* Advanced PMS
* Multiple POS outlets
* Room service
* Advanced inventory
* Recipe management
* Finance
* HR
* Events
* CRM
* Guest experience
* Advanced analytics

---

## 4.4 Enterprise / Hotel Groups

Examples:

* Hotel chains
* Resort groups
* Multi-property hospitality companies

Typical requirements:

* Multiple properties
* Central management
* Central reporting
* Central purchasing
* Central inventory
* Central reservations
* Consolidated financial information
* Advanced integrations
* Enterprise APIs

---

# 5. Core Product Principles

The following principles apply throughout the system.

## 5.1 Multi-Tenant by Design

The system must be designed as a SaaS platform from the beginning.

Tenant data must be isolated.

A tenant must never be able to access another tenant's operational data.

---

## 5.2 Modular Architecture

Each major business domain should be implemented as an independent logical module.

Examples:

* Authentication
* Users
* Properties
* POS
* Inventory
* Reservations
* Housekeeping
* Finance

Modules should have clear boundaries.

---

## 5.3 Configurable Features

A module can exist for multiple package levels while exposing different capabilities.

For example, POS can support:

### Basic POS

* Products
* Tables
* Orders
* Billing
* Payments

### Advanced POS

* Multiple outlets
* Kitchen stations
* KOT
* Room service
* Recipe costing
* Advanced discounts
* Advanced reports

The application should not create separate POS applications for different customer sizes.

Instead, functionality should be controlled through configuration, package entitlements, roles, and feature permissions.

---

## 5.4 API-Driven Architecture

The Next.js frontend must communicate with the NestJS backend through defined APIs.

Business logic must reside primarily in the backend.

The frontend must not directly access the MySQL database.

---

## 5.5 Operational Reliability

The system is intended to be used for real-world business operations.

Critical operations such as:

* Order creation
* Billing
* Payment
* Stock changes
* User actions
* Data modifications

must be handled reliably and consistently.

---

# 6. Technology Requirements

## 6.1 Frontend

The frontend must use:

* Next.js
* TypeScript
* Next.js App Router
* Tailwind CSS
* React

The frontend must NOT use:

* Vite
* Create React App
* A separate Vite build system

Next.js must be the frontend framework.

---

## 6.2 Backend

The backend must use:

* NestJS
* TypeScript
* REST APIs

The backend will provide:

* Authentication
* Authorization
* Business logic
* Database access
* Validation
* Tenant isolation
* Reporting APIs
* POS APIs
* Future module APIs

---

## 6.3 Database

The primary database must be:

* MySQL

The application must use a proper database abstraction/ORM layer in the NestJS backend.

The frontend must never connect directly to MySQL.

---

## 6.4 General Development Environment

The project must support development on Windows.

Commands and development documentation should be compatible with:

* PowerShell
* Windows Terminal
* VS Code

---

# 7. High-Level System Structure

The platform will consist of:

```text
Hotel SaaS Platform
│
├── SaaS Core
│
├── Authentication & Authorization
│
├── Property Management
│
├── Dashboard
│
├── Front Office / PMS
│
├── POS / F&B
│
├── Inventory & Procurement
│
├── Finance
│
├── HR
│
├── Housekeeping
│
├── Maintenance
│
├── CRM / Guest Experience
│
├── Events & Banquets
│
├── Sales & Distribution
│
├── Notifications
│
├── Reporting & Analytics
│
└── Enterprise / Multi-Property
```

---

# 8. Core SaaS Platform

The core SaaS platform provides the foundation required by every tenant.

## 8.1 Tenant Management

The system must support:

* Tenant creation
* Tenant identification
* Tenant status
* Tenant settings
* Tenant subscription
* Tenant package
* Tenant feature configuration

---

## 8.2 Property Management

A tenant must be associated with one or more properties depending on the subscription level.

Property information may include:

* Property name
* Property type
* Address
* Contact details
* Currency
* Time zone
* Tax configuration
* Business information
* Operational settings

---

## 8.3 User Management

The system must support:

* User creation
* User update
* User activation/deactivation
* User profile
* Role assignment
* Property assignment
* Permission management

---

## 8.4 Roles and Permissions

The system must support role-based access control.

Permissions should be configurable by module and operation.

Typical operations include:

* View
* Create
* Update
* Delete
* Approve
* Cancel
* Refund
* Export
* Manage

---

## 8.5 Package Management

The SaaS platform must support subscription packages.

Example packages:

* Starter
* Business
* Luxury
* Enterprise

Packages determine which modules/features are available to a tenant.

---

## 8.6 Feature Management

Individual features should be configurable.

Example:

```text
POS
├── Basic POS
├── Multiple Outlets
├── KOT
├── Kitchen Display
├── Room Service
├── Split Billing
├── Recipe Costing
└── Advanced Reports
```

A tenant may have the POS module but only selected POS features.

---

## 8.7 Audit Logs

Important system actions should be recorded.

Examples:

* Login
* Logout
* Product creation
* Product update
* Order creation
* Order cancellation
* Payment
* Refund
* User changes
* Permission changes
* Configuration changes

Audit records should include appropriate information such as:

* User
* Tenant
* Action
* Module
* Entity
* Timestamp

---

# 9. Authentication

The system must provide secure authentication.

Basic functionality:

* Login
* Logout
* Password management
* Access token/session management
* Protected routes
* Authentication validation

Authentication must be implemented on the backend.

The frontend must protect authenticated application routes.

---

# 10. Hotel Management / PMS

The long-term PMS module will manage accommodation operations.

## 10.1 Room Management

Features:

* Room types
* Rooms
* Room numbers
* Room status
* Room availability
* Room pricing

---

## 10.2 Reservations

Features:

* New reservation
* Reservation search
* Reservation calendar
* Guest assignment
* Room assignment
* Reservation status
* Booking source
* Deposits
* Cancellation

---

## 10.3 Front Desk

Features:

* Check-in
* Check-out
* Room assignment
* Guest folio
* Guest charges
* Guest requests
* Room status

---

## 10.4 Guest Management

Features:

* Guest profile
* Contact information
* Guest history
* Previous stays
* Preferences
* Guest charges
* Guest feedback

---

# 11. POS / Food & Beverage

POS is a core MVP module.

The long-term POS system should support different levels of operational complexity.

## 11.1 POS Outlets

A property may have multiple outlets.

Examples:

* Main Restaurant
* Cafe
* Bar
* Pool Bar
* Room Service
* Banquet
* Takeaway

Each outlet can have its own:

* Products
* Tables
* Users
* Printers
* Kitchen stations
* Pricing
* Reports

---

## 11.2 Product Management

The POS must support:

* Products
* Categories
* Product codes
* Prices
* Tax settings
* Availability
* Product status

---

## 11.3 Table Management

Features:

* Table creation
* Table numbers
* Table status
* Table availability
* Table orders

---

## 11.4 Order Management

The POS must support:

* Order creation
* Order items
* Quantity changes
* Item removal
* Order notes
* Order status
* Order cancellation
* Order history

---

## 11.5 Order Types

The platform should support:

* Dine-in
* Takeaway

Future support:

* Delivery
* Room service
* Banquet
* Other configurable order types

---

## 11.6 Kitchen / KOT

The system should support:

* Kitchen order tickets
* Kitchen stations
* KOT status
* Order preparation status
* Completed items
* Kitchen reporting

---

## 11.7 Billing

Features:

* Bill generation
* Subtotal
* Taxes
* Discounts
* Service charges where applicable
* Final amount
* Receipt generation

---

## 11.8 Payments

The POS must support configurable payment methods.

Initial methods:

* Cash
* Card

Future methods:

* Bank transfer
* Digital payments
* Payment gateways
* Other configurable methods

---

## 11.9 Discounts

The system should support:

* Fixed discounts
* Percentage discounts
* Product-level discounts
* Order-level discounts

Discount permissions must be controlled by roles.

---

## 11.10 POS Shifts

Future POS functionality should support:

* Shift opening
* Cash opening balance
* Sales during shift
* Cash movements
* Shift closing
* Cash reconciliation

---

# 12. Inventory & Procurement

The inventory module will manage hotel and F&B stock.

## 12.1 Inventory

Features:

* Products
* Categories
* Units
* Stock levels
* Stock adjustments
* Stock transfers
* Stock counting
* Wastage
* Stock reports

---

## 12.2 Suppliers

Features:

* Supplier profiles
* Supplier contacts
* Supplier products
* Supplier pricing
* Supplier history

---

## 12.3 Procurement

Features:

* Purchase requests
* Purchase orders
* Goods received notes
* Supplier invoices
* Purchase history

---

## 12.4 Recipe Management

Advanced functionality:

* Recipes
* Ingredients
* Ingredient quantities
* Recipe costing
* Production
* Cost analysis

---

# 13. Housekeeping

The housekeeping module will manage room cleaning operations.

Features:

* Room cleaning status
* Cleaning tasks
* Staff assignment
* Cleaning schedules
* Room inspection
* Linen management
* Amenities
* Housekeeping reports

---

# 14. Maintenance

The maintenance module will manage property maintenance.

Features:

* Assets
* Maintenance requests
* Work orders
* Preventive maintenance
* Technicians
* Maintenance status
* Maintenance history

---

# 15. Finance

The finance module will manage financial operations.

Basic features:

* Income
* Expenses
* Payments
* Receivables
* Payables
* Cash management
* Taxes
* Financial reports

Advanced features:

* Chart of accounts
* General ledger
* Journal entries
* Trial balance
* Profit and loss
* Balance sheet

---

# 16. Human Resources

The HR module will manage employees.

Features:

* Employees
* Departments
* Job positions
* Attendance
* Shifts
* Leave
* Payroll
* Employee reports

HR and payroll may initially be provided as add-ons.

---

# 17. CRM / Guest Experience

The CRM module will manage guest relationships.

Features:

* Guest profiles
* Guest history
* Guest preferences
* Feedback
* Complaints
* Guest communication
* Loyalty programs
* Marketing campaigns

---

# 18. Events and Banquets

The event module will support:

* Events
* Venues
* Venue availability
* Event reservations
* Packages
* Catering
* Event orders
* Event billing

---

# 19. Sales and Distribution

Advanced distribution functionality may include:

* Online booking engine
* Booking channels
* OTA integrations
* Channel manager
* Rate management
* Corporate accounts
* Travel-agent management

---

# 20. Notifications

The platform should eventually support:

* Email
* SMS
* In-app notifications
* Push notifications
* WhatsApp integrations where appropriate

Notifications should be configurable by module and event.

Examples:

```text
New Reservation
Payment Received
Order Created
Low Stock
Maintenance Request
Guest Feedback
```

---

# 21. Reporting and Analytics

The reporting system should provide module-specific and consolidated reports.

Examples:

### POS

* Daily sales
* Product sales
* Category sales
* Payment summary
* Discount report
* Cancellation report

### Hotel

* Occupancy
* ADR
* RevPAR
* Revenue
* Reservation statistics

### Inventory

* Stock levels
* Stock movement
* Wastage
* Purchase reports

### Finance

* Income
* Expenses
* Profitability
* Receivables
* Payables

---

# 22. Dashboard

The dashboard is the primary management interface.

The MVP dashboard must provide basic operational information.

Initial dashboard metrics:

* Today's revenue
* Today's orders
* Completed orders
* Pending orders
* Cancelled orders
* Cash sales
* Card sales
* Other payment totals where applicable
* Recent orders
* Top-selling products
* Low-stock items
* Recent activity

Dashboard data must come from actual database records.

No production dashboard metrics should be hardcoded.

---

# 23. Package Structure

The long-term SaaS will use package-based feature access.

## 23.1 Starter

Target:

* Villas
* Guest houses
* Small hotels
* Small restaurants

Includes:

* Core SaaS
* Authentication
* Users
* Roles
* Property
* Dashboard
* Basic rooms
* Basic reservations
* Basic guest management
* Basic housekeeping
* Basic POS
* Basic inventory
* Basic reports

---

## 23.2 Business

Target:

* Medium hotels
* Boutique hotels
* Hotels with multiple operational departments

Includes Starter plus:

* Advanced reservations
* Front desk
* Multiple POS outlets
* Advanced POS
* KOT
* Kitchen management
* Procurement
* Advanced inventory
* Housekeeping
* Maintenance
* Finance
* Advanced reports

---

## 23.3 Luxury

Target:

* Four/five-star hotels
* Resorts
* Large hospitality properties

Includes Business plus:

* Advanced PMS
* Room service
* Multiple F&B outlets
* Recipe costing
* Advanced inventory
* Advanced finance
* HR
* CRM
* Events
* Loyalty
* Advanced analytics

---

## 23.4 Enterprise

Target:

* Hotel groups
* Multi-property organizations

Includes Luxury plus:

* Multiple properties
* Central management
* Central reservations
* Central purchasing
* Central inventory
* Central reporting
* Consolidated reporting
* Property-to-property transfers
* Enterprise API
* Advanced integrations

---

# 24. Add-On Architecture

Features that may be independently purchased should be represented as add-ons.

Potential add-ons:

* Online Booking Engine
* Channel Manager
* Advanced Accounting
* HR & Payroll
* Loyalty
* Advanced Analytics
* SMS
* WhatsApp
* Payment Gateway Integration
* Accounting Integrations
* Custom API Integrations
* Additional POS Outlets

The package and add-on systems must be configurable.

---

# 25. Feature Entitlement Model

Access should conceptually follow:

```text
Tenant
   │
   ↓
Subscription
   │
   ↓
Package
   │
   ↓
Modules
   │
   ↓
Features
   │
   ↓
Roles / Permissions
   │
   ↓
User Access
```

Example:

```text
Tenant: Example Hotel

Package: Business

POS: Enabled
Inventory: Enabled
Housekeeping: Enabled
Finance: Enabled

Advanced Analytics: Disabled
Channel Manager: Disabled
Multi-property: Disabled
```

A feature should not be accessible merely because its frontend page exists.

The backend must enforce feature access.

---

# 26. MVP Definition

The first production-oriented MVP is **Phase 1**.

The goal is not to implement the entire hotel management platform.

The goal is to create a **basic operational SaaS foundation with a fully usable POS and management dashboard**.

The MVP must be usable as the foundation for future hotel modules.

---

# 27. Phase 1 MVP Scope

## 27.1 SaaS Foundation

Required:

* Tenant
* Property
* User
* Roles
* Permissions
* Basic feature configuration
* Basic settings
* Audit logging foundation

---

## 27.2 Authentication

Required:

* Login
* Logout
* Password management
* Authentication protection
* Role-based access

---

## 27.3 Dashboard

Required:

* Revenue summary
* Order summary
* Payment summary
* Recent orders
* Top products
* Low-stock information
* Recent activity

---

## 27.4 POS Master Data

Required:

* POS outlet
* Categories
* Products
* Product prices
* Tables
* Payment methods

---

## 27.5 POS Operations

Required:

* Create order
* Select table
* Add products
* Modify quantities
* Remove products
* Add notes
* Save order
* Update order
* Cancel order where permitted
* Order status

---

## 27.6 KOT

Required:

* Generate KOT
* KOT items
* KOT status
* Kitchen workflow
* Completed KOT

---

## 27.7 Billing

Required:

* Generate bill
* Calculate subtotal
* Calculate discounts
* Calculate taxes where configured
* Calculate final amount

---

## 27.8 Payments

Required:

* Cash payment
* Card payment
* Payment recording
* Payment status
* Payment history

---

## 27.9 Receipts

Required:

* Receipt generation
* Receipt data
* Printable receipt layout

Physical printer integration may be implemented as a separate technical task if required by the deployment environment.

---

## 27.10 Basic POS Reports

Required:

* Daily sales
* Order report
* Product sales
* Category sales
* Payment summary
* Discount summary
* Cancellation summary

---

# 28. MVP End-to-End Operational Flow

The MVP must support the following complete workflow:

```text
Tenant Created
      ↓
Property Configured
      ↓
Admin User Created
      ↓
POS Outlet Created
      ↓
Categories Created
      ↓
Products Created
      ↓
Tables Created
      ↓
POS User Logs In
      ↓
POS Opened
      ↓
Table Selected
      ↓
Products Added
      ↓
Order Created
      ↓
KOT Generated
      ↓
Kitchen Processes Order
      ↓
Order Completed
      ↓
Bill Generated
      ↓
Payment Received
      ↓
Receipt Generated
      ↓
Sale Recorded
      ↓
Dashboard Updated
      ↓
Reports Updated
```

This flow must work using real database records.

---

# 29. MVP Out of Scope

The following are intentionally excluded from Phase 1 unless explicitly added later:

* Advanced PMS
* Full room reservation system
* Advanced housekeeping
* Full accounting system
* Payroll
* Advanced HR
* Channel manager
* OTA integrations
* Online booking engine
* Loyalty system
* Advanced CRM
* Events
* Multi-property management
* Central hotel-chain management
* Advanced analytics
* AI features
* Complex external integrations

These remain future roadmap items.

---

# 30. MVP Operational Readiness

The MVP should be considered operationally ready only when:

* Authentication works reliably
* Tenant isolation works
* User permissions work
* POS data is persisted correctly
* Orders can be created
* Orders can be modified
* KOT workflow works
* Bills are calculated correctly
* Payments are recorded correctly
* Receipts can be generated
* Dashboard reflects actual transactions
* Reports reflect actual transactions
* Unauthorized users cannot access restricted operations
* Important actions are auditable
* Validation exists for important inputs
* Error handling is implemented
* Database constraints protect data integrity
* The application can be deployed to a production-like environment

---

# 31. Data Integrity Requirements

Critical business operations must maintain data consistency.

Examples:

### Order

An order must contain:

* Tenant
* Property
* Outlet
* User
* Order type
* Status
* Items
* Amounts
* Timestamps

### Payment

A payment must be associated with:

* Tenant
* Property
* Order
* Payment method
* Amount
* Status
* User
* Timestamp

### Product

A product must belong to the appropriate tenant/property scope.

Cross-tenant product access must never occur.

---

# 32. Tenant Isolation Requirements

Every tenant-owned business entity must have a clear tenant scope.

The backend must validate tenant ownership before:

* Reading
* Creating
* Updating
* Deleting
* Reporting
* Exporting

records.

The system must never trust a tenant ID supplied directly by an unauthenticated client request.

Tenant context must be derived and validated from authenticated user/session information.

---

# 33. Security Requirements

The system must implement:

* Secure password hashing
* Authentication guards
* Authorization guards
* Role-based permissions
* Input validation
* DTO validation
* SQL injection protection through proper database access methods
* Tenant isolation
* Secure API endpoints
* Appropriate error handling
* Audit logging
* Secure environment variables
* No secrets committed to source control

Production secrets must not be stored directly in source code.

---

# 34. Frontend Requirements

The frontend must:

* Use Next.js
* Use TypeScript
* Use App Router
* Use reusable components
* Use responsive layouts
* Provide loading states
* Provide error states
* Validate user input
* Handle authentication state
* Handle API errors
* Respect role/permission visibility
* Respect feature entitlements

The frontend should not contain duplicated business rules that should be enforced by the backend.

---

# 35. Backend Requirements

The backend must:

* Use NestJS
* Use TypeScript
* Expose REST APIs
* Validate request data
* Authenticate users
* Authorize users
* Enforce tenant isolation
* Implement business rules
* Handle database transactions where appropriate
* Return consistent API responses
* Handle errors appropriately
* Maintain audit information
* Keep modules logically separated

---

# 36. Database Requirements

The MySQL database must:

* Use appropriate primary keys
* Use foreign keys where appropriate
* Maintain referential integrity
* Use appropriate indexes
* Store timestamps consistently
* Avoid unnecessary duplication
* Support tenant isolation
* Support future module expansion

Database design must be derived from finalized business requirements.

---

# 37. API Requirements

APIs must be:

* RESTful
* Versionable
* Authenticated where required
* Authorized
* Tenant-aware
* Validated
* Consistent

Example API structure:

```text
/api/auth
/api/users
/api/tenants
/api/properties
/api/dashboard
/api/pos
/api/pos/products
/api/pos/categories
/api/pos/tables
/api/pos/orders
/api/pos/kot
/api/pos/payments
/api/reports
```

Exact API contracts will be defined in the API specification document.

---

# 38. Error Handling

The application must provide predictable error handling.

The backend should distinguish between:

* Validation errors
* Authentication errors
* Authorization errors
* Resource not found
* Business rule violations
* Database errors
* Unexpected server errors

The frontend should display useful user-facing messages without exposing sensitive backend information.

---

# 39. Logging

The backend should maintain appropriate application logs.

Logging should help diagnose:

* Authentication problems
* API failures
* Database failures
* Business operation failures
* Integration failures

Sensitive information such as passwords and authentication secrets must never be logged.

---

# 40. Configuration

Configuration should be environment-based.

Examples:

```text
DATABASE_HOST
DATABASE_PORT
DATABASE_NAME
DATABASE_USER
DATABASE_PASSWORD

JWT_SECRET

API_URL
FRONTEND_URL
```

Environment-specific values must not be hardcoded.

---

# 41. Development Rules

The following rules apply to the project:

1. Do not introduce Vite.
2. Next.js must remain the frontend framework.
3. NestJS must remain the backend framework.
4. MySQL must remain the primary database.
5. Frontend must communicate with backend through APIs.
6. Frontend must never directly access MySQL.
7. Business logic should reside in the backend.
8. Tenant isolation must be enforced server-side.
9. Do not implement future modules before their requirements are defined.
10. Do not create unnecessary duplicate functionality.
11. Reusable components should be preferred.
12. Database changes must be documented.
13. API changes must be documented.
14. Breaking architectural changes require updating the relevant `.md` documentation.
15. Production secrets must never be committed to Git.

---

# 42. Documentation Structure

The project documentation should eventually contain:

```text
docs/
│
├── 01-project-requirements.md
├── 02-mvp-scope.md
├── 03-system-architecture.md
├── 04-multi-tenancy.md
├── 05-authentication-authorization.md
├── 06-dashboard-requirements.md
├── 07-pos-requirements.md
├── 08-database-design.md
├── 09-api-specification.md
└── 10-development-roadmap.md
```

This master document defines the product.

The remaining documents provide detailed implementation specifications.

---

# 43. Future Product Roadmap

The long-term platform can evolve through the following phases.

## Phase 1 — MVP

```text
SaaS Foundation
Authentication
Users/Roles
Property
Dashboard
POS
KOT
Billing
Payments
Reports
```

---

## Phase 2 — Hotel Operations

```text
Rooms
Room Types
Guests
Reservations
Front Desk
Check-in
Check-out
Housekeeping
```

---

## Phase 3 — Inventory & Procurement

```text
Inventory
Suppliers
Purchase Orders
GRN
Stock
Stock Transfers
Wastage
Recipe Management
```

---

## Phase 4 — Business Management

```text
Finance
HR
Payroll
Maintenance
CRM
Advanced Reports
```

---

## Phase 5 — Hospitality Expansion

```text
Room Service
Events
Banquets
Loyalty
Online Booking
Channel Manager
OTA Integrations
```

---

## Phase 6 — Enterprise

```text
Multi-property
Hotel Groups
Central Management
Central Inventory
Central Purchasing
Central Reservations
Consolidated Reporting
Enterprise Integrations
Advanced Analytics
```

---

# 44. Success Criteria

The project will be considered successful when the platform can evolve from a basic operational MVP into a modular hotel management SaaS without requiring a fundamental architectural rewrite.

The Phase 1 MVP specifically succeeds when a configured tenant can:

```text
Login
  ↓
Access dashboard
  ↓
Configure POS
  ↓
Create products
  ↓
Create tables
  ↓
Create orders
  ↓
Generate KOT
  ↓
Process order
  ↓
Generate bill
  ↓
Receive payment
  ↓
Generate receipt
  ↓
View updated dashboard
  ↓
View sales reports
```

while maintaining:

```text
Security
+
Tenant Isolation
+
Role-based Access
+
Data Integrity
+
Auditability
+
Maintainability
```

---

# 45. Source of Truth Rule

This document represents the high-level product requirements.

If implementation decisions conflict with these requirements, the relevant documentation must be reviewed before changing the implementation.

Detailed requirements may be added to specialized documents without unnecessarily duplicating this master document.

The following documents should be derived from this document:

```text
01-project-requirements.md
        ↓
02-mvp-scope.md
        ↓
03-system-architecture.md
        ↓
04-multi-tenancy.md
        ↓
05-authentication-authorization.md
        ↓
06-dashboard-requirements.md
07-pos-requirements.md
        ↓
08-database-design.md
        ↓
09-api-specification.md
        ↓
10-development-roadmap.md
```

The implementation must follow the finalized specifications rather than inventing undocumented business behavior.
