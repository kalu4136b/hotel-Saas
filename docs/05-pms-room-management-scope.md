# Hotel SaaS — Phase 2: PMS Room Management & Reservations Scope

**Document:** 05-pms-room-management-scope.md  
**Version:** 1.0  
**Status:** In Progress / Specification & Implementation  
**Project:** Hotel Management Multi-Tenant SaaS  
**Phase:** Phase 2 — Core Property Management System (PMS)  
**Dependencies:** Phase 1 Multi-Tenant Core, Auth Engine, Billing, and POS Outlets  

---

## 1. Phase 2 Objectives

Phase 2 expands the platform from F&B / Restaurant POS into complete **Hotel Accommodation & Front Desk Operations**.

The system must allow a hotel property to:
1. Define **Room Types** (Deluxe Suite, Ocean Villa, Mountain Loft, Garden Bungalow) with nightly pricing and amenities.
2. Manage a physical inventory of **Rooms** with dual-axis state machines:
   - **Occupancy Status:** `AVAILABLE`, `OCCUPIED`, `RESERVED`, `MAINTENANCE`, `OUT_OF_SERVICE`.
   - **Housekeeping / Cleanliness Status:** `CLEAN`, `DIRTY`, `IN_CLEANING`, `INSPECTED`.
3. Register and look up **Guest Profiles** (name, passport/ID, email, phone, nationality).
4. Process **Reservations & Bookings**:
   - Booking sources: `DIRECT`, `WALK_IN`, `PHONE`, `CORPORATE`.
   - Date range validation (check-in / check-out), automated nights calculation, rate calculation, and deposit tracking.
5. Provide **Front Desk Operations**:
   - Express **Check-In**: Assign physical room, generate initial folio with room charge & lodging tax.
   - **Guest Folio & Billing**: Track room charges, laundry, minibar, and **transferred restaurant POS orders**.
   - Express **Check-Out**: Settle folio balance, invoice generation, and auto-flagging room as `DIRTY` for housekeeping.

---

## 2. Phase 2 Relational Database Schema (MySQL)

```
                    ┌─────────────────────────┐
                    │       room_types        │
                    ├─────────────────────────┤
                    │ id (UUID, PK)           │
                    │ tenant_id (FK)          │
                    │ property_id (FK)        │
                    │ name                    │
                    │ code                    │
                    │ base_price_per_night    │
                    │ max_occupancy           │
                    │ bed_type                │
                    │ amenities (JSON/TEXT)   │
                    └────────────┬────────────┘
                                 │ 1
                                 │ has many
                                 │ N
                    ┌────────────▼────────────┐
                    │          rooms          │
                    ├─────────────────────────┤
                    │ id (UUID, PK)           │
                    │ tenant_id (FK)          │
                    │ property_id (FK)        │
                    │ room_type_id (FK)       │
                    │ room_number             │
                    │ floor                   │
                    │ occupancy_status        │
                    │ cleanliness_status      │
                    └────────────┬────────────┘
                                 │
                                 │ assigned to
                                 │
┌──────────────┐    ┌────────────▼────────────┐    ┌─────────────────────────┐
│    guests    │    │      reservations       │    │      guest_folios       │
├──────────────┤    ├─────────────────────────┤    ├─────────────────────────┤
│ id (PK)      │ 1  │ id (PK)                 │ 1  │ id (PK)                 │
│ tenant_id    ├───►│ tenant_id               ├───►│ tenant_id               │
│ property_id  │ N  │ property_id             │ 1  │ property_id             │
│ full_name    │    │ guest_id (FK)           │    │ reservation_id (FK)     │
│ email        │    │ room_id (FK, nullable)  │    │ guest_id (FK)           │
│ phone        │    │ check_in_date           │    │ room_id (FK)            │
│ passport_id  │    │ check_out_date          │    │ total_charges           │
│ nationality  │    │ nights_count            │    │ total_payments          │
└──────────────┘    │ nightly_rate            │    │ balance_due             │
                    │ total_amount            │    │ status [OPEN, SETTLED]  │
                    │ deposit_paid            │    └────────────┬────────────┘
                    │ status                  │                 │
                    │ booking_source          │                 │ contains
                    └─────────────────────────┘                 │
                                                   ┌────────────▼────────────┐
                                                   │       folio_items       │
                                                   ├─────────────────────────┤
                                                   │ id (PK)                 │
                                                   │ folio_id (FK)           │
                                                   │ charge_type             │
                                                   │ description             │
                                                   │ amount                  │
                                                   │ reference_id (POS order)│
                                                   │ posted_at               │
                                                   └─────────────────────────┘
```

---

## 3. State Machines

### 3.1 Reservation Lifecycle
```
[CONFIRMED]
    │
    ▼ (Guest Arrives at Front Desk & Presents ID)
[CHECKED_IN] ─── Room status set to [OCCUPIED]
    │        ─── Guest Folio opened with Room Nights charge
    │
    ▼ (Guest Check-Out & Folio Balance Settled)
[CHECKED_OUT] ─── Room status set to [AVAILABLE]
              ─── Housekeeping status set to [DIRTY]
              ─── Guest Folio marked [SETTLED]
```

### 3.2 Housekeeping & Cleanliness Lifecycle
```
[DIRTY]
   │
   ▼ (Housekeeper starts room cleaning)
[IN_CLEANING]
   │
   ▼ (Cleaning finished, linens replaced)
[CLEAN]
   │
   ▼ (Supervisor or Head Housekeeper inspects)
[INSPECTED] ─── Ready for next guest arrival
```

---

## 4. Endpoints & REST API Contracts

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/pms/room-types` | List all room types with base nightly rates |
| `POST` | `/api/pms/room-types` | Create a new room type |
| `GET` | `/api/pms/rooms` | List all rooms with occupancy & cleanliness statuses |
| `POST` | `/api/pms/rooms` | Register a new room number & floor |
| `PATCH` | `/api/pms/rooms/:id/cleanliness` | Update housekeeping status (`CLEAN`, `DIRTY`, `IN_CLEANING`, `INSPECTED`) |
| `GET` | `/api/pms/reservations` | List reservations with guest and room joins (filter by status or query) |
| `POST` | `/api/pms/reservations` | Create a new reservation with dates, guest info, and room type |
| `POST` | `/api/pms/reservations/:id/check-in` | Execute Front Desk Check-in (assigns room, opens folio) |
| `POST` | `/api/pms/reservations/:id/check-out` | Execute Front Desk Check-out (settles folio, flags room dirty) |
| `GET` | `/api/pms/folios/:reservationId` | Get guest folio details with itemized charges and payments |
| `POST` | `/api/pms/folios/:reservationId/charges` | Post ad-hoc charge (minibar, room service, or POS transfer) |
| `POST` | `/api/pms/folios/:reservationId/payments` | Post folio payment settlement |
