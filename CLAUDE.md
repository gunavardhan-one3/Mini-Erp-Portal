# Project: Mini ERP + CRM Operations Portal

## Context
This is a **timed take-home assessment** (48-hour deadline) for a Full Stack
Developer role. Code should be clean, correct, and demonstrate real-world
backend/frontend/DB/deployment competence — prioritize correctness and clarity
over cleverness or premature optimization. Every core module in this spec must
work end-to-end before polishing anything.

## Business Context
A wholesale/distribution company needs an internal ERP/CRM system for its
sales, warehouse, and accounts teams to manage customers, products, stock,
sales challans, and CRM follow-ups.

## Tech Stack (decided)
- **Backend:** Node.js + TypeScript + Express.js
- **ORM:** Prisma (fast schema iteration + migrations)
- **Database:** PostgreSQL
- **Auth:** JWT, role-based middleware
- **Frontend:** React + TypeScript + Vite
- **Deployment:** Backend + Postgres → Render. Frontend → Vercel.
- Use environment variables for all secrets/config (DB URL, JWT secret, API
  base URL) — never hardcode.

## Roles
- Admin — full access
- Sales — customers, challans
- Warehouse — products, stock movements
- Accounts — view/reporting access (invoices, challans)

## Data Model

### User
- id, name, email, password (hashed), role (Admin/Sales/Warehouse/Accounts), createdAt

### Customer
- id, name, mobile, email, businessName, gstNumber (optional)
- customerType: Retail | Wholesale | Distributor
- address, status: Lead | Active | Inactive
- followUpDate, notes (support multiple follow-up notes over time)
- createdAt, updatedAt

### Product
- id, name, sku (unique), category, unitPrice
- currentStock, minStockAlert, location/warehouse
- createdAt, updatedAt

### StockMovement
- id, productId, quantityChanged, movementType: IN | OUT
- reason, createdBy (userId), timestamp

### Challan (Sales Challan)
- id, challanNumber (auto-generated, sequential, e.g. CH-2026-0001)
- customerId, status: Draft | Confirmed | Cancelled
- totalQuantity, createdBy (userId), createdAt

### ChallanItem
- id, challanId, productId
- **snapshot fields** (captured at creation, immutable): productName, sku, unitPrice
- quantity

## Critical Business Logic
1. Confirming a Draft challan must **atomically** reduce product stock (DB
   transaction) and log a corresponding StockMovement (type OUT, reason
   "Challan Confirmed").
2. Stock must **never go negative**. If any line item's quantity exceeds
   available stock, reject the whole confirm action with a clear 400 error
   listing which product(s) are insufficient — no partial confirms.
3. ChallanItems store a **snapshot** of product name/sku/price at the time of
   creation — editing a Product later must not change historical challans.
4. Challan numbers auto-increment and must be unique.

## API Conventions
- REST, JSON in/out
- Validate all input (e.g. zod or express-validator)
- Proper status codes: 200/201, 400 (validation/business rule), 401/403 (auth),
  404, 500
- Consistent error shape, e.g. `{ error: { message, details? } }`
- Pagination on list endpoints (customers, products, challans): `?page=&limit=`
- Search/filter: customers by name/mobile/status; products by name/sku/category

## Auth
- POST /auth/login → returns JWT
- Middleware checks JWT + role per route
- Seed script creates one test user per role for grading (Admin, Sales,
  Warehouse, Accounts) with known credentials, documented in README

## Deliverables Checklist
- [ ] GitHub repo, clean commit history
- [ ] Live frontend URL (Vercel)
- [ ] Live backend API URL (Render)
- [ ] Postgres DB (Render or Supabase/Neon)
- [ ] Test login credentials for all 4 roles
- [ ] Postman collection covering every endpoint
- [ ] README: setup, env vars, local run instructions, deployment steps,
      architecture explanation, assumptions made, known limitations
- [ ] Stretch/bonus (only if time allows): Docker, GitHub Actions CI/CD,
      invoice PDF export, product image upload to S3

## Non-goals for v1
- No need for a design system beyond clean, responsive, admin-style UI
- No need to build every bonus feature — spec explicitly treats these as extra