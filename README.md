# Laboratory Information & Inventory Management System (LIMS-Inventory)

A web application that replaces the **Laboratory Inventory Management System.xlsx** workbook with a proper client-server system: a Django REST API backend and a React (Vite) frontend.

The data model below was reverse-engineered directly from the workbook's sheets: **Dashboard, Item Master, Stock Receipts, Dispensing Log, Current Stock, Settings, Users.**

---

## 1. What the spreadsheet tells us about the domain

| Sheet | Purpose | Becomes |
|---|---|---|
| `Item Master` | Master list of every stock item (code, name, category, unit, supplier, min stock, reorder qty, storage location, active flag) | `Item` model |
| `Stock Receipts` | Every batch of stock received (receipt ID, item, batch/lot, expiry date, supplier, qty received, unit cost, received by) | `StockReceipt` model |
| `Dispensing Log` | Every issue of stock out of the lab (dispense ID, item, batch/lot, qty dispensed, dispensed by, recipient/department, purpose) | `DispenseLog` model |
| `Current Stock` | Formula-driven view: `Available = Total Received − Total Dispensed`, plus `Stock Status` (OK / Low Stock / Out of Stock) and earliest expiry | Computed via `services.py`, exposed as a read-only endpoint (not stored as a raw table) |
| `Settings` | Controlled lists: categories, units, suppliers, stock-status meanings, plus a list of "Future VBA Hooks" (validation + notification rules) | `Category`, `Unit`, `Supplier` lookup tables + validation/notification logic in `services.py` |
| `Users` | Staff directory used by dropdowns (ID, name, role, department, active, signature initials) | `StaffProfile` model, linked 1:1 to Django's auth user |
| `Dashboard` | KPIs (active items, low-stock count, out-of-stock count, recent transactions), reorder watchlist, status summary, category received/dispensed totals, recent dispensing feed | `/api/dashboard/` aggregation endpoint |

The workbook's **"Future VBA Hook"** table on the Settings sheet maps almost 1:1 onto backend responsibilities:

| VBA Hook (spec) | Trigger | System equivalent |
|---|---|---|
| `ValidateReceiptEntry` | On receipt entry | `services.validate_receipt()` — item must exist & be active |
| `ValidateDispenseEntry` | On dispense entry | `services.validate_dispense()` — qty ≤ available stock |
| `RefreshDashboard` | On open / periodic | `/api/dashboard/` (on-demand) + `job_scheduler.py` cache refresh |
| `ExportLowStockReport` | Button click | `/api/reports/low-stock/` (CSV/PDF export) |
| `UserAuditStamp` | On change | `created_by` / `updated_at` auto-stamped in `models.py` via `services.py` |

Stock status thresholds (from `Settings`):
- **OK** — available quantity is above minimum stock level
- **Low Stock** — available quantity is at or below minimum stock level
- **Out of Stock** — available quantity is zero or below

---

## 2. Tech Stack

**Backend:** Python, Django + Django REST Framework, single `inventory` app, JWT auth (SimpleJWT), APScheduler/Celery-beat for background jobs, PostgreSQL (SQLite for local dev).

**Frontend:** React 18 + Vite, React Router, Context API for auth & flash notifications, plain CSS (no framework required), Axios for API calls.

---

## 3. Full Project Structure

```
lab-inventory-system/
│
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env.example
│   │
│   ├── config/                      # Django project (main URLs + settings)
│   │   ├── __init__.py
│   │   ├── settings.py              # DB, DRF, JWT, CORS, scheduler, apps config
│   │   ├── urls.py                  # main urlconf -> includes inventory.urls
│   │   ├── wsgi.py
│   │   └── asgi.py
│   │
│   └── inventory/                   # single API application
│       ├── __init__.py
│       ├── apps.py
│       ├── admin.py
│       ├── models.py                # Item, StockReceipt, DispenseLog, Category,
│       │                            # Unit, Supplier, StaffProfile, Notification, AuditLog
│       ├── serializers.py           # DRF serializers for every model + dashboard payloads
│       ├── services.py              # business logic: stock calc, validation, dashboard
│       │                            # aggregation, reorder logic, expiry watch
│       ├── utils.py                 # code generators (LAB-###, REC-###, DIS-###),
│       │                            # date helpers, status calculators, CSV export helpers
│       ├── job_scheduler.py         # scheduled jobs: daily low-stock scan, expiry watch,
│       │                            # dashboard cache refresh, notification dispatch
│       ├── views.py                 # ViewSets/APIViews: Items, Receipts, Dispensing,
│       │                            # CurrentStock (read-only), Dashboard, Users, Auth, Reports
│       ├── urls.py                  # app-level urlconf, wired into DRF router
│       ├── permissions.py           # role-based permissions (Manager vs Technologist)
│       ├── validators.py            # field-level validators (expiry date, positive qty, etc.)
│       ├── signals.py               # post_save hooks (audit stamps, stock recalculation)
│       ├── migrations/
│       └── tests/
│           ├── test_models.py
│           ├── test_services.py
│           └── test_views.py
│
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── .env.example
    │
    └── src/
        ├── main.jsx                        # ReactDOM root, wraps <App/> with providers
        ├── App.jsx                         # routes, protected-route wrapper
        │
        ├── services/
        │   └── api.js                      # Axios instance, interceptors, endpoint calls
        │
        ├── context/
        │   ├── AuthContext.jsx             # login/logout, current user, token refresh
        │   └── NotificationContext.jsx     # flash/toast notifications (success, error, warning)
        │
        ├── components/
        │   ├── Navbar.jsx
        │   ├── Sidebar.jsx
        │   ├── StatCard.jsx                # dashboard KPI card
        │   ├── StockStatusBadge.jsx        # OK / Low Stock / Out of Stock pill
        │   ├── DataTable.jsx               # reusable sortable/paginated table
        │   ├── Modal.jsx
        │   ├── ConfirmDialog.jsx
        │   └── FlashNotification.jsx       # renders toasts from NotificationContext
        │
        ├── layout/
        │   └── DashboardLayout.jsx         # Navbar + Sidebar + <Outlet/> shell
        │
        ├── pages/
        │   ├── Login.jsx
        │   ├── Dashboard.jsx               # KPIs, reorder watchlist, status summary, recent txns
        │   ├── ItemMaster.jsx              # list/create/edit/deactivate items
        │   ├── StockReceipts.jsx           # log incoming stock
        │   ├── DispensingLog.jsx           # log outgoing stock, blocks over-dispensing
        │   ├── CurrentStock.jsx            # read-only computed stock position + filters
        │   ├── ExpiryWatch.jsx             # batches expiring within 90 days
        │   ├── Reports.jsx                 # low-stock / category summary export
        │   ├── Users.jsx                   # staff directory, roles
        │   ├── Settings.jsx                # categories, units, suppliers CRUD
        │   └── NotFound.jsx
        │
        ├── hooks/
        │   ├── useAuth.js                  # consumes AuthContext
        │   ├── useNotification.js          # consumes NotificationContext
        │   ├── useFetch.js                 # generic data-fetching hook
        │   └── useDebounce.js              # for search inputs
        │
        └── style/
            └── main.css
```

---

## 4. Backend data model (summary)

```python
# models.py (field summary, not full code)

Category(name)
Unit(name)
Supplier(name, contact_info)

StaffProfile(user -> auth.User, staff_id, role[Manager|Technologist|Admin],
             department, phone, signature_initials, is_active)

Item(item_code, item_name, category -> Category, unit -> Unit,
     supplier -> Supplier, minimum_stock_level, reorder_quantity,
     storage_location, is_active, remarks)

StockReceipt(receipt_id, date, item -> Item, batch_lot, expiry_date,
             supplier -> Supplier, quantity_received, unit_cost,
             received_by -> StaffProfile, remarks, created_at)

DispenseLog(dispense_id, date, item -> Item, batch_lot, quantity_dispensed,
            dispensed_by -> StaffProfile, recipient_department, purpose,
            remarks, created_at)

Notification(recipient -> StaffProfile, message, level, is_read, created_at)

AuditLog(user, action, target_model, target_id, timestamp)
```

`CurrentStock` is **not** a stored table — it is computed on demand in `services.py`
(`available = sum(receipts.quantity_received) - sum(dispenses.quantity_dispensed)`) and
cached/refreshed by `job_scheduler.py`, matching the workbook's "formula-driven" design.

---

## 5. Key API endpoints (via `inventory/urls.py`)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login/` | Obtain JWT |
| GET/POST | `/api/items/` | List / create items |
| GET/PATCH | `/api/items/{item_code}/` | Retrieve / update / deactivate item |
| GET/POST | `/api/stock-receipts/` | List / log a receipt |
| GET/POST | `/api/dispensing-log/` | List / log a dispense (validated against available stock) |
| GET | `/api/current-stock/` | Computed stock position, status, earliest expiry |
| GET | `/api/dashboard/` | KPIs, reorder watchlist, status summary, category totals, recent txns |
| GET | `/api/reports/low-stock/` | Exportable low-stock/reorder report |
| GET | `/api/reports/expiry-watch/` | Batches expiring within 90 days |
| GET/POST | `/api/users/` | Staff directory |
| GET/POST | `/api/settings/categories/` `/units/` `/suppliers/` | Controlled lists |

---

## 6. Getting started

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env   # set VITE_API_BASE_URL=http://localhost:8000/api
npm run dev
```

---

## 7. Notes / assumptions

- The workbook's `Users` sheet has no login credentials, so `StaffProfile` is modeled as a profile linked to Django's built-in auth `User`, not a replacement for it.
- `Current Stock` and the `Dashboard` KPIs are derived, not duplicated tables, to avoid the double-bookkeeping risk that exists in the spreadsheet's manual formulas.
- Role-based permissions (`permissions.py`) assume **Manager** can approve/edit item master & reports, **Technologist** can log receipts/dispenses only — inferred from the `Users` sheet roles; confirm before building auth rules further.
- `job_scheduler.py` is where the workbook's `RefreshDashboard` "Workbook_Open" trigger and expiry-watch checks become real scheduled jobs (e.g., daily at 06:00).