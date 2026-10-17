# Project File Guide

This guide describes first-party source and configuration files. It excludes `node_modules/`, `hovenv/`, `dist/`, caches, generated bundles, and private `.env` contents. The active React/Vite frontend is the root `src/` directory; `frontend/src/` currently contains empty scaffold directories.

## Root Files

- `manage.py` - Django command-line entry point for running the server, migrations, admin tasks, and custom management commands.
- `index.html` - Vite/React HTML shell loaded by the browser.
- `package.json` - Frontend scripts and JavaScript dependencies; `npm run dev` starts Vite and `npm run build` type-checks and builds.
- `vite.config.ts` - Vite plugins, dev-server settings, and `/api` proxy to Django on port 8000.
- `tsconfig.json` - TypeScript compiler configuration.
- `requirements.txt` - Python/Django and test dependencies.
- `pytest.ini` - Pytest discovery, Django settings module, and test options.
- `metadata.json` - Project/workspace metadata used by tooling.
- `.gitignore` - Excludes local secrets, environments, generated files, and other non-source artifacts.
- `.env.example` - Safe template showing the environment variables expected by the project.
- `.env` - Local secrets and connection settings; private, ignored by Git, and intentionally not documented value-by-value here.
- `db.sqlite3` - Legacy/local SQLite database file; current Django settings use PostgreSQL, so retain this only as a backup if needed.
- `tsconfig.tsbuildinfo` - Generated TypeScript incremental-build cache.

## Django Configuration

- `config/__init__.py` - Marks `config` as a Python package.
- `config/settings.py` - Django installed apps, middleware, environment loading, PostgreSQL connection, REST authentication/permissions, static files, and locale settings.
- `config/urls.py` - Root URL router for Django admin, current-user/property endpoints, and versioned API app routes; `/` redirects to `/admin/`.
- `config/asgi.py` - ASGI application entry point for asynchronous-capable hosting.
- `config/wsgi.py` - WSGI application entry point for conventional Django hosting.

## Django Apps

### Accounts (`apps/accounts/`)

- `__init__.py` - Package marker.
- `models.py` - Custom email-based staff user, role choices, and user manager.
- `permissions.py` - Reusable role checks for front desk, finance, housekeeping, inventory, restaurant, and audit APIs.
- `auth_views.py` - Authenticated current-user endpoint used by the staff login.
- `admin.py` - Registers the custom user and its staff/role fields in Django admin.
- `tests.py` - Authentication, role, and account behavior tests.
- `migrations/__init__.py` - Migration package marker.
- `migrations/0001_initial.py` - Creates the custom user model and its initial database fields.

### Audit (`apps/audit/`)

- `__init__.py` - Package marker.
- `apps.py` - Django app metadata.
- `models.py` - Immutable audit event model, modules, severities, and queryset protections.
- `services.py` - Writes audit events with actor, request/IP, before-state, and after-state data.
- `mixins.py` - Viewset mixin that logs audited model operations.
- `serializers.py` - Read representation of audit records.
- `views.py` - Read-only audit API, restricted to general managers.
- `urls.py` - Audit API routes.
- `admin.py` - Django admin presentation for audit records.
- `migrations/__init__.py` - Migration package marker.
- `migrations/0001_initial.py` - Creates the original audit-log table.
- `migrations/0002_alter_auditlog_module.py` - Updates the audit module choices/schema.

### Billing (`apps/billing/`)

- `__init__.py` - Package marker.
- `apps.py` - Django app metadata.
- `models.py` - Guest folios, charge line items, payments, and cashier shifts.
- `serializers.py` - API validation/representation for folios, payments, and shift operations.
- `views.py` - Folio charge/payment operations, Telebirr initiation/confirmation, and cashier shift APIs.
- `urls.py` - Billing API routes.
- `admin.py` - Billing model registrations and admin configuration.
- `services/__init__.py` - Billing services package marker.
- `services/cashier_shifts.py` - Aggregates cashier collections for shift reconciliation.
- `services/telebirr.py` - Payment-gateway abstraction with a development/mock Telebirr implementation.
- `tests.py` - Billing, folio, and payment API tests.
- `cashier_shift_tests.py` - Cashier shift opening, closing, and discrepancy tests.
- `migrations/__init__.py` - Migration package marker.
- `migrations/0001_initial.py` - Creates folio, charge, and payment tables.
- `migrations/0002_cashiershift.py` - Adds cashier shift tracking.
- `migrations/0003_payment_completed_at.py` - Adds payment completion timestamp support.

### Core (`apps/core/`)

- `__init__.py` - Package marker.
- `apps.py` - Django app metadata.
- `management/commands/seed_hotel_data.py` - Optional sample-data command that creates example property, staff, rooms, guests, and reservations.

### Feedback (`apps/feedback/`)

- `__init__.py` - Package marker.
- `apps.py` - Django app metadata.
- `models.py` - Guest-submitted feedback and its review status/metadata.
- `serializers.py` - Separate input and review serializers for public submissions and staff review.
- `views.py` - Public feedback submission plus protected manager review API.
- `urls.py` - Feedback API routes.
- `throttles.py` - Rate limit for anonymous feedback submissions.
- `admin.py` - Django admin configuration for feedback.
- `tests.py` - Feedback validation, permissions, and review tests.
- `migrations/__init__.py` - Migration package marker.
- `migrations/0001_initial.py` - Creates the guest feedback table.

### Guests (`apps/guests/`)

- `__init__.py` - Package marker.
- `apps.py` - Django app metadata.
- `models.py` - Guest identity/contact details, nationality, consent, and VIP tier.
- `serializers.py` - Guest API representation and validation.
- `views.py` - Guest CRM API with front-office permissions for changes.
- `urls.py` - Guest API routes.
- `admin.py` - Guest model admin configuration.
- `tests.py` - Guest API behavior tests.
- `migrations/__init__.py` - Migration package marker.
- `migrations/0001_initial.py` - Creates the guest table.
- `migrations/0002_alter_guest_id_number.py` - Alters the guest ID-number field.

### Housekeeping (`apps/housekeeping/`)

- `__init__.py` - Package marker.
- `apps.py` - Django app metadata.
- `models.py` - Cleaning/inspection tasks, assignment, priority, and timestamps.
- `serializers.py` - Housekeeping task API representation and validation.
- `views.py` - Task creation and guarded start/complete/inspect/reopen transitions; synchronizes room cleanliness state.
- `urls.py` - Housekeeping API routes.
- `admin.py` - Django admin setup for housekeeping tasks.
- `tests.py` - Task transitions, room-state changes, and permissions tests.
- `migrations/__init__.py` - Migration package marker.
- `migrations/0001_initial.py` - Creates the housekeeping task table.

### Inventory (`apps/inventory/`)

- `__init__.py` - Package marker.
- `apps.py` - Django app metadata.
- `models.py` - Ingredients, stock balances, recipe components, and stock movement ledger.
- `serializers.py` - Ingredient, recipe, stock movement, and receipt validation/representation.
- `views.py` - Role-protected inventory catalog, stock receipt, and recipe endpoints.
- `services.py` - Applies recipe consumption to stock when restaurant orders are settled.
- `urls.py` - Inventory API routes.
- `admin.py` - Inventory model admin configuration.
- `tests.py` - Stock receiving/consumption, recipe, and permission tests.
- `migrations/__init__.py` - Migration package marker.
- `migrations/0001_initial.py` - Creates inventory, recipe, and stock movement tables.

### Kitchen (`apps/kitchen/`)

- `__init__.py` - Package marker.
- `apps.py` - Django app metadata.
- `models.py` - Kitchen display tickets and station/status timestamps.
- `serializers.py` - Ticket and ticket-item API representation.
- `views.py` - Read-only kitchen ticket API for restaurant staff.
- `urls.py` - Kitchen API routes.
- `migrations/__init__.py` - Migration package marker.
- `migrations/0001_initial.py` - Initial kitchen schema migration.
- `migrations/0002_initial.py` - Follow-up initial schema migration for related models.
- `migrations/0003_kitchenticket_items.py` - Adds ticket-to-order-item associations.

### Properties (`apps/properties/`)

- `__init__.py` - Package marker.
- `apps.py` - Django app metadata.
- `models.py` - Hotel property identity, contact details, tax/currency, business date, timezone, and payment-provider identifiers.
- `serializers.py` - Property settings API representation.
- `views.py` - Current-property settings endpoint; authenticated reads and general-manager updates, with audit logging.
- `admin.py` - Property admin configuration.
- `tests.py` - Property defaults, validation, permissions, and update tests.
- `migrations/__init__.py` - Migration package marker.
- `migrations/0001_initial.py` - Creates the property configuration table.
- `migrations/0002_alter_property_current_business_date.py` - Adjusts the property business-date field.

### Reporting (`apps/reporting/`)

- `__init__.py` - Package marker.
- `models.py` - Night-audit closure snapshots, business-date roll, financial metrics, and integrity checksum.
- `serializers.py` - Night-audit input and report representation.
- `views.py` - Audit checklist, execution, date closing, report, and reopen API operations.
- `urls.py` - Reporting API routes.
- `admin.py` - Night-audit report admin configuration.
- `tests.py` - Night-audit calculations, state transitions, and authorization tests.
- `management/__init__.py` - Management command package marker.
- `management/commands/__init__.py` - Command package marker.
- `management/commands/run_night_audit.py` - Runs the night-audit workflow from Django's command line.
- `migrations/__init__.py` - Migration package marker.
- `migrations/0001_initial.py` - Creates the night-audit session table.

### Reservations (`apps/reservations/`)

- `__init__.py` - Package marker.
- `apps.py` - Django app metadata.
- `models.py` - Reservations, booking sources/statuses, and temporary room holds.
- `serializers.py` - Reservation/public booking/deposit/room-hold validation and mapping.
- `views.py` - Public availability quote/booking plus staff reservation CRUD, room reassignment, deposit, check-in/out, cancellation, and no-show actions.
- `urls.py` - Reservation and room-hold API router.
- `throttles.py` - Separate anonymous rate limits for public reads and booking creation.
- `admin.py` - Reservation admin configuration.
- `public_booking_tests.py` - Public booking validation, quoting, deposits, and conflict tests.
- Reservation API tests shared with the room feature are in `apps/rooms/tests.py`; this app has no `tests.py` file.
- `management/__init__.py` - Management command package marker.
- `management/commands/__init__.py` - Command package marker.
- `management/commands/sync_reservations.py` - Imports exported reservation JSON into Django using confirmation codes for upsert matching.
- `migrations/__init__.py` - Migration package marker.
- `migrations/0001_initial.py` - Creates reservation and room-hold tables.

### Restaurant (`apps/restaurant/`)

- `__init__.py` - Package marker.
- `apps.py` - Django app metadata.
- `models.py` - Restaurant menu items, orders, and order-line status/payment data.
- `serializers.py` - Menu/order request validation and nested API representations.
- `views.py` - Menu management, POS order lifecycle, kitchen dispatch, settlement, room posting, and void operations.
- `urls.py` - Restaurant API routes.
- `admin.py` - Restaurant model admin configuration.
- `tests.py` - Menu, order, kitchen workflow, stock consumption, and settlement tests.
- `management/commands/seed_restaurant_menu.py` - Loads the sample restaurant menu.
- `migrations/__init__.py` - Migration package marker.
- `migrations/0001_initial.py` - Creates restaurant order schema.
- `migrations/0002_restaurantmenuitem.py` - Adds restaurant menu items.
- `migrations/0003_restaurantorder_settled_by.py` - Tracks which staff member settled an order.

### Rooms (`apps/rooms/`)

- `__init__.py` - Package marker.
- `apps.py` - Django app metadata.
- `models.py` - Room types, physical rooms, rate plans, and room statuses.
- `serializers.py` - Staff/public room, room-type, and rate-plan API representations.
- `services.py` - Date-overlap, room-hold, active-reservation, and maintenance-aware availability calculation.
- `views.py` - Room/rate APIs and public/staff availability endpoints with role permissions.
- `urls.py` - Room, room-type, and rate-plan API routes.
- `admin.py` - Room inventory and pricing admin configuration.
- `tests.py` - Availability, room status, reservation transition, permissions, and room reassignment API tests.
- `migrations/__init__.py` - Migration package marker.
- `migrations/0001_initial.py` - Creates room types, rooms, and rate plans.
- `migrations/0002_room_housekeeping_status.py` - Adds room housekeeping-state tracking.

### App placeholders

- `apps/common/__init__.py` - Empty package reserved for shared backend helpers.
- `apps/website/__init__.py` - Empty package placeholder; public website code currently lives in the React frontend.

## React/Vite Frontend (`src/`)

### Entry and shared infrastructure

- `src/main.tsx` - React application bootstrap; mounts `App` into the root element.
- `src/App.tsx` - Chooses guest public site versus `/staff` login/dashboard and wires dashboard modals/navigation.
- `src/index.css` - Global styles, Tailwind import/theme, and shared CSS rules.
- `src/vite-env.d.ts` - Vite client type declarations for TypeScript.
- `src/api/hotelApi.ts` - Browser API client, Basic Auth header handling, endpoint calls, and Django-to-UI data mapping.
- `src/context/HotelContext.tsx` - Shared client-side hotel data/actions, initial fetches, UI state, and feature-to-API coordination.
- `src/data/initialData.ts` - Demo defaults for rooms, reservations, guests, settings, POS, housekeeping, and example report data.
- `src/types/hotel.ts` - TypeScript domain types for staff, rooms, reservations, billing, POS, housekeeping, inventory, and reports.

### Global navigation, authentication, and overview

- `src/components/Navbar.tsx` - Staff header, identity/role display, search, clock, quick-arrival and booking actions, and logout.
- `src/components/Sidebar.tsx` - Staff feature navigation and occupancy/arrival/housekeeping indicators.
- `src/components/auth/LoginScreen.tsx` - Staff email/password login form.
- `src/components/dashboard/DashboardTab.tsx` - Operational overview of occupancy, arrivals/departures, revenue, and quick actions.
- `src/components/milestone1/Milestone1AuditTab.tsx` - Role-permission reference, property/payment architecture summary, and audit-event viewer.

### Public website and front desk

- `src/components/public/PublicBookingPage.tsx` - Guest website: property info, availability search, server quote, booking request, confirmation, and feedback form.
- `src/components/reservations/ReservationsTab.tsx` - Search/filter reservations, manage arrivals/departures, open detail/invoice, and legacy/manual sync/export tools.
- `src/components/reservations/NewReservationModal.tsx` - Front-desk booking form for guest, dates, room, rate, add-ons, deposit, and optional check-in.
- `src/components/reservations/ReservationDetailsModal.tsx` - Reservation detail, room reassignment, deposit, charges, payments, cancellation, check-in/out, and invoice actions.
- `src/components/rooms/RoomsTab.tsx` - Room inventory grid/list with floor/type/status filters and add/edit entry points.
- `src/components/rooms/RoomDetailsModal.tsx` - Detailed room view and room-status/assignment actions.
- `src/components/rooms/AddRoomModal.tsx` - Form for adding a physical room to inventory.
- `src/components/calendar/CalendarTab.tsx` - Seven-day room occupancy timeline, floor filtering, reservation inspection, and date-based booking.
- `src/components/guests/GuestsTab.tsx` - Guest directory, profile creation, VIP/preferences/stay history, and booking entry point.

### Housekeeping, billing, and administration

- `src/components/housekeeping/HousekeepingTab.tsx` - Cleaning task board, task dispatch/status workflow, and maintenance work-order forms.
- `src/components/billing/BillingTab.tsx` - Folio balances, revenue categories, incidental charge posting, payment collection, and invoice entry point.
- `src/components/billing/FolioInvoiceModal.tsx` - Printable guest folio invoice/details view.
- `src/components/inventory/InventoryTab.tsx` - Stock balances and reorder warnings, receiving stock, ingredient catalog, and recipe components.
- `src/components/feedback/FeedbackInboxTab.tsx` - Manager feedback queue, filters, internal notes, status changes, and review save.
- `src/components/settings/SettingsTab.tsx` - Property branding/contact, check-in/out times, tax, service charge, and configuration saving.
- `src/components/database/DatabaseAdminTab.tsx` - Backend health, reservation exports/manual sync, and data inspection utilities.

### POS, restaurant, and kitchen

- `src/components/pos/POSTab.tsx` - POS sub-navigation and dining operational counters.
- `src/components/pos/POSTerminal.tsx` - Build dine-in/room-service/takeaway orders, send to kitchen, settle, or charge a guest folio.
- `src/components/pos/KitchenDisplaySystem.tsx` - Kitchen production queue and order-item status controls.
- `src/components/pos/FloorMap.tsx` - Restaurant table/floor visual map and table selection for ordering.
- `src/components/pos/OrderHistoryTab.tsx` - Restaurant order register and receipt/history view.
- `src/components/pos/MenuEngineeringTab.tsx` - Restaurant menu item availability, categories, pricing, and menu management view.
- `src/components/pos/RoomChargeModal.tsx` - Select/validate an in-house reservation when posting an order to a room folio.
- `src/components/pos/SettleOrderModal.tsx` - Select settlement method and record direct payment for a restaurant order.

### Night audit and reports

- `src/components/nightaudit/NightAuditTab.tsx` - Night-audit navigation for closing sessions, reports, cashier shifts, and governance.
- `src/components/nightaudit/NightAuditWizardModal.tsx` - Guided pre-audit checks, nightly postings, balancing, sign-off, and business-date close.
- `src/components/nightaudit/AuditReportDetailModal.tsx` - Detailed view of a completed audit session and its metrics/seal.
- `src/components/nightaudit/CashierShiftModal.tsx` - Open or close cashier shifts and enter reconciliation details.
- `src/components/nightaudit/DailyFlashReportView.tsx` - Manager-facing daily operational/revenue snapshot.
- `src/components/nightaudit/InHousePoliceManifestView.tsx` - In-house guest manifest/report view.
- `src/components/nightaudit/TaxComplianceReportView.tsx` - Tax, VAT, service-charge, and settlement compliance report view.

## Website assets and docs

- `public/hotel-hero.jpg` - Local hero background image used by the guest booking homepage.
- `docs/tourist.jpg` - Original supplied hotel image retained in documentation/assets.
- `docs/project-file-guide.md` - This project file-by-file guide.

## Frontend scaffold and support directories

- `frontend/src/app/`, `components/`, `features/`, `pages/`, `services/`, `types/`, and `utils/` - Empty scaffold directories at the time this guide was written; they are not the active frontend implementation.
- `scripts/` - Empty directory at the time this guide was written.

## Main workflow

The React UI in `src/` calls the Django REST API using `src/api/hotelApi.ts`. Django routes in `config/urls.py` delegate to feature apps in `apps/`; app views validate/authenticate requests, serializers convert data, models define PostgreSQL tables, and migrations create/evolve those tables. Tests live beside each backend app. `manage.py` runs the backend; `npm run dev` runs the browser UI.
