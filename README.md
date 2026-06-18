# DibnowRepairSaaS

A production-grade, multi-tenant SaaS platform built for repair shops. DibnowRepairSaaS covers the full repair lifecycle — from customer intake and technician workflow to billing, inventory, doorstep delivery logistics, and AI-powered diagnostics — under a single, role-isolated dashboard.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Features](#features)
- [User Roles & Permissions](#user-roles--permissions)
- [Project Structure](#project-structure)
- [Database Design](#database-design)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running the App](#running-the-app)
- [Running Tests](#running-tests)
- [API Modules](#api-modules)
- [Security](#security)
- [Deployment](#deployment)

---

## Overview

DibnowRepairSaaS is a white-label platform where each repair shop signs up as a **tenant** and gets its own isolated workspace, subdomain, and configuration. The platform is modular — built across multiple versioned releases (M1–M9) — and supports multi-currency billing, real-time notifications, UK doorstep delivery logistics, Stripe/PayPal/JazzCash/EasyPaisa payments, and a Groq-powered AI assistant.

---

## Tech Stack

### Frontend
| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI Components | Custom + shadcn/ui |
| State / Data Fetching | TanStack React Query v5 |
| Animation | Framer Motion |
| Forms | React Hook Form + Zod |
| Auth | jose (JWT), js-cookie |
| AI Client | Anthropic SDK, Groq SDK |

### Backend
| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Fastify v4 |
| Language | TypeScript |
| Validation | Zod |
| ORM / Query | Mongoose (MongoDB), pg Pool (PostgreSQL) |
| Cache / Queue | ioredis (Redis) |
| File Storage | Cloudinary |
| Email | Resend |
| SMS | Twilio |

### AI Assistant
| Layer | Technology |
|---|---|
| Runtime | Python 3.10+ |
| Framework | FastAPI + Uvicorn |
| AI Model | Groq Cloud — Llama3-8b-8192 (free tier) |

### Databases
| Database | Purpose |
|---|---|
| **MongoDB Atlas** | Tenants, users, tickets, inventory, audit logs, notifications, delivery jobs |
| **PostgreSQL (Supabase)** | Financial data — estimates, invoices, payments (ACID-compliant) |
| **Redis** | Rate limiting, session cache, brute-force counters, live GPS pings |

---

## Architecture

DibnowRepairSaaS follows a **modular monorepo** approach with a clean separation between the Next.js frontend, the Fastify backend API, and a standalone Python AI service.

```
┌─────────────────────────────────────────────────────┐
│                    Client Browser                   │
│              Next.js 14 (App Router)                │
│         Role-based dashboard per tenant             │
└────────────────────┬────────────────────────────────┘
                     │ HTTPS / REST
         ┌───────────▼───────────┐
         │    Fastify API Server  │
         │  (Node.js / TypeScript)│
         │                       │
         │  ┌─────────────────┐  │
         │  │  Auth Middleware │  │
         │  │  RBAC Middleware │  │
         │  │ Tenant Middleware│  │
         │  │  Rate Limiter   │  │
         │  └────────┬────────┘  │
         │           │           │
         │  ┌────────▼────────┐  │
         │  │    Modules      │  │
         │  │ billing         │  │
         │  │ delivery        │  │
         │  │ notifications   │  │
         │  │ payments        │  │
         │  └────────┬────────┘  │
         └───────────┼───────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
   MongoDB       PostgreSQL     Redis
  (operational) (financial)   (cache/queue)
```

### Key Architectural Decisions

**Multi-tenancy** — Every database record carries a `tenantId`. The tenant middleware validates the `X-Tenant-Id` header on every request and enforces data isolation at the service layer. There is no cross-tenant data leakage by design.

**Polyglot persistence** — Operational data (tickets, users, inventory) lives in MongoDB for flexible schema evolution. Financial data (estimates, invoices, payments) lives in PostgreSQL for ACID guarantees. Redis handles ephemeral data — rate limit counters, live GPS pings, session tokens.

**Finite State Machines** — Both ticket status and delivery job status follow explicit FSM transition maps. Invalid state jumps are rejected at the service layer before touching the database.

**Event-driven notifications** — An in-process `EventEmitter`-based event bus (`notificationEventBus`) decouples business events from notification delivery. Events fan out to email (Resend), SMS (Twilio), and in-app channels based on a per-event channel map.

---

## Features

### Core Platform
- Multi-tenant architecture with subdomain routing per shop
- Three subscription plans: Free, Growth, Enterprise
- Tenant-level configuration: currency, timezone, tax rate, invoice prefix, payment gateways

### Ticket Management
- Full repair lifecycle: `received → diagnosed → estimate_sent → approved → in_repair → ready → delivered`
- Ticket assignment to technicians with status update tracking
- Photo uploads per ticket via Cloudinary

### Billing & Payments
- Estimates with line items (parts, labour, service, fees), tax, and discounts (percentage or fixed)
- Customer digital signature on estimate approval
- Invoice generation from approved estimates with auto-numbered invoice codes
- Partial payment support
- Multi-gateway: **Stripe**, **PayPal**, **JazzCash**, **EasyPaisa**
- Stripe webhook handling for asynchronous payment confirmation

### Inventory Management
- Parts catalogue per tenant
- Stock movement tracking: added, used, adjusted, returned, damaged
- Low-stock alerts via notification event bus
- Technician part requests, manager approvals

### Doorstep Delivery (UK — Module 9)
- Postcode-based service zone configuration
- Haversine distance calculation for delivery fee pricing
- FSM-guarded delivery status: `PENDING → ASSIGNED → EN_ROUTE → ARRIVED → PICKED_UP → IN_TRANSIT → DELIVERED`
- Real-time driver GPS tracking via Redis (TTL-backed live pings, MongoDB snapshot on completion)
- Proof of delivery recording
- UK GDPR / ICO right-to-erasure: `anonymiseJobForErasure`

### Notifications
- Event bus architecture — business logic emits events, notification workers consume them
- Channels: in-app, email (Resend), SMS (Twilio)
- Quiet hours support with urgent-event bypass (`payment_received`, `payment_failed`, `ready_for_pickup`)
- BullMQ-style queue with a Redis-backed notification worker

### AI Assistant (Module 8)
- Standalone FastAPI service powered by Groq Cloud (Llama3-8b — free tier)
- Streaming responses with multi-turn conversation memory per session
- Capabilities: device diagnostics, repair cost estimation, workflow automation guidance, inventory intelligence, customer FAQ, business analytics
- Role-aware context (technician, owner, manager)
- Also integrated in the Next.js frontend via Anthropic SDK for in-dashboard AI features

### Leads Management
- Lead routing to shops based on GPS proximity
- Claim/unclaim flow with auto-expiry
- Lead pipeline views for owner and manager roles

### Reporting & Analytics
- Financial reports per tenant
- Technician performance KPIs
- Revenue forecasting (owner dashboard)
- Platform-wide analytics (super admin)

### Audit Logging
- Immutable audit trail for every sensitive action (estimates approved, payments processed, settings changed)
- Stored in MongoDB with actor, IP address, action type, and before/after snapshots
- Viewable by owner and super admin

---

## User Roles & Permissions

| Role | Dashboard | Key Capabilities |
|---|---|---|
| `super_admin` | `/dashboard/super-admin` | All tenants, impersonation, platform analytics, global settings |
| `owner` | `/dashboard/owner` | Full shop access — tickets, billing, inventory, team, settings, audit logs, forecasting |
| `manager` | `/dashboard/manager` | Tickets, inventory, team, reports, leads |
| `frontdesk` | `/dashboard/frontdesk` | Create tickets, customer intake, process payments |
| `technician` | `/dashboard/technician` | Assigned tickets, inventory requests, AI diagnostics, photo uploads, time tracking |
| `customer` | `/dashboard/customer` | Repair tracker, invoice view, payment |
| `driver` | `/dashboard/driver` | Active delivery jobs, GPS ping, status updates |

Permissions are enforced on both the frontend (route guards via `middleware.ts`) and the backend (`roleMiddleware.ts`). The permission matrix is the single source of truth in `src/lib/rbac.ts`.

---

## Project Structure

```
/
├── backend/                        # Fastify API (Node.js / TypeScript)
│   └── src/
│       ├── config/                 # env.ts, mongodb.ts, postgres.ts, redis.ts
│       ├── database/
│       │   └── migrations/         # PostgreSQL SQL migrations (001–003)
│       ├── errors/                 # Typed error classes (NotFound, Forbidden, etc.)
│       ├── middleware/
│       │   ├── authMiddleware.ts   # JWT verification
│       │   ├── roleMiddleware.ts   # RBAC enforcement
│       │   ├── tenantMiddleware.ts # Tenant isolation
│       │   ├── securityMiddleware.ts # Helmet, CORS, rate limiting
│       │   └── fileUploadMiddleware.ts
│       ├── models/
│       │   ├── tenant.model.ts
│       │   └── auditLog.model.ts
│       └── modules/
│           ├── billing/            # Estimates + invoices (controller / service / routes)
│           ├── delivery/           # Doorstep logistics (controller / service / model / validators / utils)
│           ├── notifications/      # Event bus, queue, worker, providers (email/SMS/in-app)
│           └── payments/           # Stripe / PayPal / JazzCash / EasyPaisa gateways
│
├── frontend/                       # Next.js 14 App Router
│   └── src/
│       ├── app/
│       │   ├── dashboard/
│       │   │   ├── super-admin/    # Platform management
│       │   │   ├── owner/          # Shop owner workspace
│       │   │   ├── manager/        # Manager workspace
│       │   │   ├── frontdesk/      # Front desk workspace
│       │   │   ├── technician/     # Technician workspace
│       │   │   ├── customer/       # Customer portal
│       │   │   └── driver/         # Driver workspace
│       │   ├── login/
│       │   ├── register/
│       │   ├── forgot-password/
│       │   ├── reset-password/
│       │   └── sections/           # Landing page sections
│       ├── components/
│       │   ├── tickets/            # TicketForm, TicketList, TicketDetail
│       │   ├── customer/           # RepairTracker
│       │   ├── ui/                 # shadcn-style primitives
│       │   └── DashboardShell.tsx  # Authenticated layout wrapper
│       ├── lib/
│       │   ├── rbac.ts             # Permission matrix + role metadata
│       │   ├── enums.ts            # TicketStatus, Role, StockMovementType
│       │   ├── permissions.ts
│       │   └── ai/                 # Anthropic client + prompt templates
│       ├── models/                 # TypeScript interfaces for all entities
│       ├── modules/                # Client-side controllers (auth, tickets, inventory)
│       ├── services/               # API service layer
│       └── middleware.ts           # Next.js route protection + role redirect
│
├── main.py                         # FastAPI AI chatbot service (Groq / Llama3)
├── requirements.txt                # Python dependencies
├── static/
│   └── index.html                  # AI chatbot UI
├── scripts/
│   └── create-admin.mjs            # Seed script: create initial super admin
├── .env.local                      # Environment variable template
└── SETUP.md                        # AI chatbot standalone setup guide
```

---

## Database Design

### MongoDB Collections

**`tenants`** — Root of every data record. Stores subdomain, plan, settings (tax rate, invoice prefix, allowed payment gateways), and feature flags.

**`users`** — Belongs to a tenant. Stores role, hashed password, profile, and session metadata.

**`tickets`** — Core repair record. Linked to customer, technician, and tenant. FSM-controlled status field.

**`parts`** — Inventory items per tenant. Tracks stock levels, reorder thresholds, cost, and sell price.

**`stockMovements`** — Append-only ledger of every inventory change (added, used, adjusted, returned, damaged).

**`leads`** — Inbound repair enquiries. Routed to nearest shop, claimable by owner/manager.

**`deliveryJobs`** — Doorstep delivery records per tenant. Includes postcode pair, pricing, FSM status, GPS trail snapshots, and proof of delivery.

**`serviceZones`** — Postcode-district-based delivery zones per tenant with pricing rules.

**`notifications`** — In-app notification records per user.

**`auditLogs`** — Immutable event log. Actor, action, entity, before/after data, IP address, timestamp.

### PostgreSQL Tables (Financial)

**`estimates`** — Line items, subtotal, tax, discount, total, status (draft → sent → approved/rejected/expired), customer digital signature.

**`invoices`** — Generated from approved estimates. Auto-numbered (`INV-0001`). Tracks amount paid and outstanding balance.

**`payments`** — Payment transactions. Gateway, reference ID, amount, currency, status. Links to invoice.

---

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.10+
- MongoDB Atlas account (or local MongoDB)
- PostgreSQL database (Supabase recommended)
- Redis instance (Upstash or local)
- Cloudinary account
- Resend account (email)
- Stripe account

### Clone the Repository

```bash
git clone <repository-url>
cd Clicktake-tecnologies-Repair-Shop-SaaS-main
```

---

## Environment Variables

Copy `.env.local` to `.env` in both the root and `backend/` directories, then fill in all required values.

```env
# ── Server ──────────────────────────────────────────────────────
NODE_ENV=development
PORT=4000
APP_URL=http://localhost:4000

# ── JWT ─────────────────────────────────────────────────────────
JWT_SECRET=<min 32 characters>
JWT_EXPIRES_IN=30d
JWT_REFRESH_SECRET=<min 32 characters>

# ── Databases ───────────────────────────────────────────────────
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/dibnow
POSTGRES_URI=postgresql://<user>:<pass>@<host>:5432/<db>
REDIS_URL=redis://localhost:6379

# ── Encryption (AES-256-CBC) ────────────────────────────────────
ENCRYPTION_KEY=<exactly 32 characters>
ENCRYPTION_IV=<exactly 16 characters>

# ── Stripe ──────────────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# ── PayPal ──────────────────────────────────────────────────────
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_MODE=sandbox

# ── JazzCash (optional) ─────────────────────────────────────────
JAZZCASH_MERCHANT_ID=
JAZZCASH_PASSWORD=
JAZZCASH_INTEGRITY_SALT=

# ── EasyPaisa (optional) ────────────────────────────────────────
EASYPAISA_STORE_ID=
EASYPAISA_HASH_KEY=

# ── Cloudinary ──────────────────────────────────────────────────
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# ── Email (Resend) ──────────────────────────────────────────────
RESEND_API_KEY=re_...

# ── CORS ────────────────────────────────────────────────────────
ALLOWED_ORIGINS=http://localhost:3000

# ── Rate Limiting ───────────────────────────────────────────────
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60000

# ── AI Chatbot ──────────────────────────────────────────────────
GROQ_API_KEY=gsk_...
NEXT_PUBLIC_ANTHROPIC_API_KEY=sk-ant-...
```

> The backend validates all required variables with Zod on startup and exits with a descriptive error if any are missing or malformed. Never start with a bad config.

---

## Running the App

### 1. Run PostgreSQL Migrations

```bash
cd backend
npx ts-node src/database/migrate.ts
```

This runs the three migration files in order (`001_create_estimates.sql`, `002_create_invoices.sql`, `003_create_payments.sql`).

### 2. Seed the Super Admin

```bash
node scripts/create-admin.mjs
```

### 3. Start the Backend API

```bash
cd backend
npm install
npm run dev
# Starts Fastify on http://localhost:4000
```

### 4. Start the Frontend

```bash
cd frontend
npm install
npm run dev
# Starts Next.js on http://localhost:3000
```

### 5. Start the AI Chatbot Service (optional)

```bash
pip install -r requirements.txt
export GROQ_API_KEY=gsk_your_key_here
python main.py
# Starts FastAPI on http://localhost:8000
```

---

## Running Tests

The backend uses Jest with `ts-jest`. Tests are co-located with their modules under `__tests__/` directories.

```bash
cd backend
npm test              # run all tests once
npm run test:watch    # watch mode
```

Test coverage includes:

- Auth middleware (token validation, role enforcement)
- Error handler middleware
- File upload middleware
- Billing service (estimate creation, approval, invoice generation)
- Delivery service (booking, driver assignment, status transitions, GPS)
- Payment flows
- Model validation

---

## API Modules

All backend routes are mounted under `/api/v1/`.

### Billing — `/api/v1/billing`

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/estimates` | owner, manager | Create a new estimate |
| `GET` | `/estimates/:id` | owner, manager, frontdesk | Get estimate by ID |
| `POST` | `/estimates/:id/approve` | owner, manager, customer | Approve or reject an estimate |
| `POST` | `/invoices` | owner, manager | Convert approved estimate to invoice |
| `GET` | `/invoices/:id` | owner, manager, frontdesk, customer | Get invoice |

### Delivery — `/api/v1/delivery`

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/jobs` | owner, manager, frontdesk | Book a delivery job |
| `GET` | `/jobs/:id` | authenticated | Get job details |
| `GET` | `/jobs` | owner, manager, frontdesk | List all jobs (paginated) |
| `POST` | `/jobs/:id/assign` | owner, manager | Assign a driver |
| `PATCH` | `/jobs/:id/status` | driver, owner, manager | Update delivery status (FSM-validated) |
| `POST` | `/jobs/:id/gps` | driver | Record live GPS ping |
| `GET` | `/jobs/:id/location` | owner, manager, frontdesk | Get live driver location |
| `POST` | `/jobs/:id/complete` | driver | Complete job with proof of delivery |
| `DELETE` | `/jobs/:id/erasure` | super_admin | GDPR erasure |
| `GET` | `/drivers/:driverId/jobs` | driver | Driver's active jobs |
| `PUT` | `/zones` | owner | Create or update a service zone |
| `GET` | `/zones` | owner, manager | List all zones |
| `POST` | `/zones/check` | public | Check if a postcode is in a service zone |

### Notifications — `/api/v1/notifications`

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/` | authenticated | List notifications for current user |
| `PATCH` | `/:id/read` | authenticated | Mark notification as read |
| `PATCH` | `/read-all` | authenticated | Mark all as read |

### Payments — `/api/v1/payments`

Gateway-specific routes for Stripe, PayPal, JazzCash, and EasyPaisa with webhook endpoints for async confirmation.

---

## Security

### Authentication
- JWT-based with a configurable expiry (default 30 days) and a separate refresh token secret
- Tokens validated on every request via `authMiddleware`
- Brute-force login protection: Redis-backed attempt counter with account lockout

### Authorization
- Role-Based Access Control enforced by `roleMiddleware` on all protected routes
- Frontend route protection via Next.js `middleware.ts` — unauthorized role access redirects to the correct home page, not a 403 page

### Transport & Headers
- Fastify Helmet: Content-Security-Policy, HSTS (1-year, preload), `X-Frame-Options: deny`, `X-Content-Type-Options: nosniff`, XSS filter
- Strict CORS — only origins listed in `ALLOWED_ORIGINS` are accepted
- Signed cookies (`@fastify/cookie` with `JWT_SECRET`)

### Rate Limiting
- Global: 100 requests / 60 seconds per IP + tenantId (Redis-backed)
- Auth endpoints: 10 requests / 15 minutes
- Payment endpoints: 20 requests / 1 minute

### Data
- AES-256-CBC encryption for sensitive fields (key + IV validated at startup)
- Financial records isolated in PostgreSQL with full ACID transactions
- Tenant data isolation enforced at every query — no shared collections without a `tenantId` filter
- GDPR anonymisation support for delivery jobs (`anonymiseJobForErasure`)

### File Uploads
- Size limit: 10 MB per file, max 5 files per request
- Stored in Cloudinary, not on local disk

---

## Deployment

### Recommended Stack

| Service | Provider |
|---|---|
| Frontend | Vercel (Next.js native) |
| Backend API | Railway, Render, or EC2 |
| AI Chatbot | Railway or a small VPS |
| MongoDB | MongoDB Atlas |
| PostgreSQL | Supabase |
| Redis | Upstash |
| File Storage | Cloudinary |
| Email | Resend |
| SMS | Twilio |

### Vercel (Frontend)

1. Connect the repository to Vercel.
2. Set the root directory to `frontend/`.
3. Add all `NEXT_PUBLIC_*` environment variables in the Vercel dashboard.
4. Deploy — Vercel handles the Next.js build automatically.

### Backend

```bash
cd backend
npm run build       # compiles TypeScript to dist/
npm start           # runs dist/server.js
```

Set `NODE_ENV=production` in your environment. The PostgreSQL pool enables TLS (`rejectUnauthorized: true`) automatically in production.

### Docker (optional)

A `Dockerfile` can be added to both `backend/` and `frontend/` following standard Node.js multi-stage build patterns. The backend has no filesystem dependency (all uploads go to Cloudinary), making it stateless and horizontally scalable.

---

## License

Proprietary — Dibnow Engineering © 2026. All rights reserved.
