# Laboratory Information & Inventory Management System (LIMS-Inventory)

A web application that replaces the **Laboratory Inventory Management System.xlsx** workbook with a client-server system: a Django REST API backend and a React (Vite) frontend.

---

## 1. What Problem This System Solves

Managing laboratory inventory through spreadsheets like Excel leads to stockouts, expired reagents, formula corruption, and zero chain-of-custody accountability. This system transforms static spreadsheet mechanics into an auditable, real-time transactional platform.

* **Eliminating Double Bookkeeping & Manual Formulas:** Spreadsheets require manual updates across multiple tabs (`Item Master`, `Current Stock`, `Stock Receipts`), risking human error and broken formulas. This system uses a dynamic ledger model where available inventory is mathematically calculated from inbound and outbound transactions.
* **Preventing Stockouts & Expired Reagent Wastage:** Medical and research labs rely on reagents with strict shelf lives. Background workers continuously evaluate stock levels and batch expiry dates to alert staff before items run out or expire on the shelf.
* **Strict Chain of Custody & Compliance:** Every single stock movement (who received a batch, who dispensed a reagent to which department) is tied to authenticated user profiles and logged in immutable audit records.
* **Controlled Vocabularies:** Eliminates data entry fragmentation by enforcing strict reference standards for item categories, measurement units, and approved suppliers.

---

## 2. System Objects & Data Entities

The backend models (`api/models.py`) represent the system objects that govern data integrity and workflows:

### Auxiliary & Configuration Objects
* **`TimeStampedModel` (Abstract Base):** Mixin that automatically stamps `created_at`, `updated_at`, and `created_by` across core transactional entities.
* **`Category`:** Controlled taxonomy for grouping inventory (e.g., Reagents, Consumables, Glassware).
* **`Unit`:** Standardized units of measurement (e.g., Box, Vial, mL, Kit).
* **`Supplier`:** Vendor directory holding supplier contact information and linking to supplied items and receipts.

### User & Identity Management
* **`StaffProfile`:** Extends Django's `User` model with laboratory-specific attributes (`staff_id`, `role` [Manager, Technologist, Admin], `department`, `phone`, `signature_initials`, `is_active`). Acts as the identity stamp for all receipts, dispenses, and audit logs.

### Inventory Core
* **`Item` (Item Master):** The master definition of an inventory product. Contains identifying details (`item_code`, `item_name`), relationships (`category`, `unit`, `supplier`), operational thresholds (`minimum_stock_level`, `reorder_quantity`), physical `storage_location`, and active status.

### Transaction Ledger
* **`StockReceipt`:** Records inbound inventory additions. Tracks unique `receipt_id`, date received, item reference, supplier, `batch_lot`, `expiry_date`, quantity received, unit cost, and the receiving staff member.
* **`DispenseLog`:** Records outbound inventory usage. Tracks unique `dispense_id`, date dispensed, item reference, `batch_lot`, quantity dispensed, dispensing staff member, `recipient_department`, and purpose. Blocks attempts to dispense quantities greater than available stock.

### Performance Caching & Alerting
* **`StockSnapshot`:** A read-optimized, cached representation of the current stock state for an item. Contains precalculated totals (`total_received`, `total_dispensed`, `available_quantity`), status flags (`OK`, `Low Stock`, `Out of Stock`), and the `earliest_expiry` date across active batches. Refreshed automatically by background workers.
* **`Notification`:** System and flash alerts delivered to staff (`INFO`, `SUCCESS`, `WARNING`, `ERROR`). Supports both user-specific and broadcast messages (e.g., low-stock warnings, expiring lot alerts).
* **`AuditLog`:** An append-only audit trail recording every entity creation, modification, or deletion alongside the triggering user, action type, target model, target ID, and JSON payload change details.

---

## 3. End-to-End System Workflow

```
[ Admin / Manager ] ──► Setup Vocabularies & Staff Profiles
                              │
                              ▼
[ Manager ]          ──► Define Item Master (Min Levels & Reorder Qty)
                              │
                              ▼
[ Technologist ]     ──► Log Stock Receipt ──► Creates StockReceipt Ledger Entry
                              │
                              ▼
[ Technologist ]     ──► Log Dispense      ──► Creates DispenseLog Ledger Entry
                              │
                              ▼
[ Background Job / ] ──► Calculates: (Received - Dispensed)
[ services.py      ] ──► Updates StockSnapshot & Evaluates Thresholds
                              │
                  ┌───────────┴───────────┐
                  ▼                       ▼
      [ Low Stock / Expiry ]     [ Dashboard & Reports ]
        Triggers Notification       Displays Real-Time KPIs
```

1. **System Initialization:** Admins establish controlled lists (`Category`, `Unit`, `Supplier`) and provision `StaffProfile` accounts linked to authenticated users.
2. **Catalog Definition:** Lab managers populate the `Item` master list, assigning storage locations, categories, and critical stock alert thresholds (`minimum_stock_level`).
3. **Inbound Receiving:** When shipments arrive, staff log a `StockReceipt`. The system generates a tracking code (`REC-####`), links batch/lot details and expiry dates, and writes an immutable ledger entry.
4. **Outbound Dispensing:** When reagents or supplies are needed, technologists log a `DispenseLog`. The backend service (`services.py`) validates that `quantity_dispensed` does not exceed current available stock before writing the entry (`DIS-####`).
5. **Derivation & Snapshot Caching:** Rather than executing heavy aggregation queries on every dashboard request, `services.py` calculates the net available quantity (`Total Received - Total Dispensed`). A scheduled background job (`job_scheduler.py`) updates the `StockSnapshot` cache and sets the stock status (`OK`, `Low Stock`, or `Out of Stock`).
6. **Monitoring & Alerting:** During snapshot calculation, if `available_quantity <= minimum_stock_level` or an item batch is within 90 days of expiration, a system `Notification` is triggered and flagged on the frontend dashboard.
7. **Compliance Audit:** Every transaction automatically triggers `signals.py` to write an entry to `AuditLog`, recording the user ID, timestamp, model, and modified data.

---

## 4. Workbook Domain Mapping

| Spreadsheet Sheet | System Object / Equivalent | Purpose in LIMS-Inventory |
|---|---|---|
| `Item Master` | `Item` | Master catalog definition, minimum thresholds, reorder quantities |
| `Stock Receipts` | `StockReceipt` | Inbound stock transaction ledger with batch/lot and expiry tracking |
| `Dispensing Log` | `DispenseLog` | Outbound stock transaction ledger with department & usage tracking |
| `Current Stock` | `StockSnapshot` + `services.py` | Derived inventory position computed via ledger math and cached for UI speed |
| `Settings` | `Category`, `Unit`, `Supplier` | Controlled drop-down vocabularies and validation parameters |
| `Users` | `StaffProfile` | User roles (Manager, Technologist, Admin), signature initials, department tags |
| `Dashboard` | `/api/dashboard/` | Real-time aggregate KPIs, reorder watchlists, and expiry watch feeds |

---

## 5. VBA Hook to Backend Equivalents

| Excel VBA Hook | System Trigger | Backend Implementation |
|---|---|---|
| `ValidateReceiptEntry` | POST `/api/stock-receipts/` | `services.validate_receipt()` ensures item is active and dates/quantities are valid |
| `ValidateDispenseEntry` | POST `/api/dispensing-log/` | `services.validate_dispense()` prevents dispensing more than available inventory |
| `RefreshDashboard` | Scheduled / On-Demand | `job_scheduler.py` runs periodic snapshot refreshes; endpoint serves cached state |
| `ExportLowStockReport` | GET `/api/reports/low-stock/` | Service generates CSV/PDF export of items requiring reorder |
| `UserAuditStamp` | Model save / update | `TimeStampedModel` + Django signals auto-write entries to `AuditLog` |

---

## 6. Tech Stack

* **Backend:** Python 3.11+, Django 4.2+, Django REST Framework, SimpleJWT (Auth), APScheduler (Background jobs), PostgreSQL (SQLite for local dev).
* **Frontend:** React 18, Vite, React Router v6, Context API (Auth & Notifications), Axios, CSS Modules / Custom CSS.

---

## 7. Full Project Structure

```
lab-inventory-system/
│
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env.example
│   │
│   ├── config/                      # Django core project configuration
│   │   ├── __init__.py
│   │   ├── settings.py              # DB, DRF, JWT, CORS, scheduler settings
│   │   ├── urls.py                  # Root route definitions
│   │   ├── wsgi.py
│   │   └── asgi.py
│   │
│   └── inventory/                   # LIMS core application
│       ├── __init__.py
│       ├── apps.py
│       ├── admin.py                 # Django Admin portal registration
│       ├── models.py                # Item, StockReceipt, DispenseLog, StockSnapshot,
│       │                            # StaffProfile, Category, Unit, Supplier,
│       │                            # Notification, AuditLog
│       ├── serializers.py           # DRF serializers for API payloads
│       ├── services.py              # Stock calculations, validation, dashboard logic
│       ├── utils.py                 # ID generators (LAB-###, REC-###), status helpers
│       ├── job_scheduler.py         # Scheduled tasks for snapshots and expiry checks
│       ├── views.py                 # API ViewSets and Endpoints
│       ├── urls.py                  # Application route registry
│       ├── permissions.py           # Role-based access control (RBAC)
│       ├── validators.py            # Custom validation logic
│       ├── signals.py               # Post-save handlers for audit logs & caching
│       ├── migrations/
│       └── tests/
│
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── .env.example
    │
    └── src/
        ├── main.jsx                 # React DOM root entry
        ├── App.jsx                  # Application routing & protection shells
        ├── services/
        │   └── api.js               # Axios instance with auth interceptors
        ├── context/
        │   ├── AuthContext.jsx      # JWT auth management
        │   └── NotificationContext.jsx # Flash/toast notification context
        ├── components/
        │   ├── Navbar.jsx
        │   ├── Sidebar.jsx
        │   ├── StatCard.jsx
        │   ├── StockStatusBadge.jsx
        │   ├── DataTable.jsx
        │   ├── Modal.jsx
        │   └── FlashNotification.jsx
        ├── layout/
        │   └── DashboardLayout.jsx
        ├── pages/
        │   ├── Login.jsx
        │   ├── Dashboard.jsx
        │   ├── ItemMaster.jsx
        │   ├── StockReceipts.jsx
        │   ├── DispensingLog.jsx
        │   ├── CurrentStock.jsx
        │   ├── ExpiryWatch.jsx
        │   ├── Reports.jsx
        │   ├── Users.jsx
        │   └── Settings.jsx
        └── hooks/
            ├── useAuth.js
            ├── useNotification.js
            ├── useFetch.js
            └── useDebounce.js
```

---

## 8. API Endpoints Overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login/` | Authenticate user and issue JWT access/refresh tokens |
| GET / POST | `/api/items/` | List item master catalog or create new inventory item |
| GET / PATCH | `/api/items/{item_code}/` | Retrieve details, update parameters, or deactivate an item |
| GET / POST | `/api/stock-receipts/` | Retrieve inbound receipt log or register a new shipment |
| GET / POST | `/api/dispensing-log/` | Retrieve outbound log or record stock usage (with validation) |
| GET | `/api/current-stock/` | Read cached `StockSnapshot` data with search and category filters |
| GET | `/api/dashboard/` | Aggregate KPIs, stock status distributions, and reorder alerts |
| GET | `/api/reports/low-stock/` | Download CSV/PDF report of items requiring reorder |
| GET | `/api/reports/expiry-watch/` | Fetch list of lot numbers expiring within the next 90 days |
| GET / POST | `/api/users/` | Manage lab staff profiles and assign permissions |
| GET / POST | `/api/settings/categories/` | CRUD endpoints for controlled categories |
| GET / POST | `/api/settings/units/` | CRUD endpoints for controlled measurement units |
| GET / POST | `/api/settings/suppliers/` | CRUD endpoints for supplier directory |

---

## 9. Getting Started

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env      # Ensure VITE_API_BASE_URL=http://localhost:8000/api
npm run dev
```

---

## 10. Implementation Assumptions & Rules

* **Auth & Profiles:** Django's built-in `User` handles authentication credentials, while `StaffProfile` holds domain-specific properties like staff IDs and roles (`Manager`, `Technologist`, `Admin`).
* **Role Permissions:** Managers have permission to modify the `Item` catalog and generate administrative reports. Technologists are restricted to logging receipts and dispensing stock.
* **Non-Destructive Deletions:** Items and user profiles are flagged as `is_active=False` rather than hard-deleted to preserve ledger integrity.
* **Formula Integrity:** Stock availability is strictly derived from `StockReceipt` minus `DispenseLog` totals and updated via `StockSnapshot`. Direct modification of stock balances is forbidden.
