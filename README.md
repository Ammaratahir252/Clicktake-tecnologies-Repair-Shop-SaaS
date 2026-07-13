# 🔧 DibnowRepairSaaS — Repair Shop Management Platform

> A production-grade, multi-tenant SaaS platform built for repair shops. Covers the full repair lifecycle — from ticket intake to delivery — with role-based access control, multi-gateway payments, doorstep delivery logistics, and a real-time inventory system.

---

## 📌 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Features by Module](#features-by-module)
- [User Roles & Permissions](#user-roles--permissions)
- [Project Structure](#project-structure)
- [Database Design](#database-design)
- [API Overview](#api-overview)
- [Payment Gateways](#payment-gateways)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Running Tests](#running-tests)
- [Deployment](#deployment)
- [Security](#security)

---

## Overview

**DibnowRepairSaaS** is a full-stack multi-tenant SaaS application purpose-built for device repair shops. Each repair shop operates as an isolated **tenant** accessed via their own subdomain (e.g., `shopname.dibnow.com`). The system supports 7 distinct user roles, each with their own dashboard and access permissions.

The codebase is structured as a **monorepo** with a clear separation between the Next.js frontend (which also handles its own API routes) and a standalone Fastify microservice backend dedicated to the Doorstep Delivery & Logistics module.

---

## Tech Stack

### Frontend
| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Auth | JWT + `jose` (Edge-compatible) |
| HTTP Client | Axios |
| Validation | Zod |
| Icons | Lucide React |

### Backend (Delivery Microservice)
| Layer | Technology |
|---|---|
| Framework | Fastify 4 |
| Language | TypeScript |
| Validation | Zod |
| Logger | Custom structured logger |

### Databases
| Purpose | Database |
|---|---|
| Core operational data (users, tickets, inventory, tenants) | MongoDB Atlas (Mongoose) |
| Financial data (estimates, invoices, payments) | PostgreSQL (Supabase) |
| Real-time GPS tracking & caching | Redis (ioredis) |

### Infrastructure & Services
| Service | Purpose |
|---|---|
| Cloudinary | Repair photo & proof-of-delivery uploads |
| Stripe | Card payments & SaaS subscriptions |
| JazzCash | Pakistan mobile wallet payments |
| EasyPaisa | Pakistan mobile wallet payments |
| PayPal | International payments |
| Resend | Transactional email |
| Sentry | Error monitoring (optional) |

---

## Architecture

```
dibnow.com / [tenant].dibnow.com
          │
          ▼
┌─────────────────────────────────────┐
│         Next.js 14 Frontend         │
│  ┌─────────────┐  ┌──────────────┐  │
│  │  App Router │  │  API Routes  │  │
│  │  /dashboard │  │  /api/...    │  │
│  └─────────────┘  └──────────────┘  │
│         │                │          │
│    Edge Middleware        │          │
│    (JWT + RBAC)           │          │
└─────────────────────────────────────┘
          │                │
          │        ┌───────▼────────┐
          │        │  Fastify M9    │
          │        │  (Delivery     │
          │        │   Microservice)│
          │        └───────┬────────┘
          │                │
    ┌─────▼────────────────▼─────┐
    │        Data Layer          │
    │  MongoDB  PostgreSQL  Redis│
    └────────────────────────────┘
```

The platform follows a **modular monolith** pattern on the frontend (Next.js API routes per domain) and extracts the delivery module as a **standalone Fastify microservice** to allow independent scaling of logistics workloads.

---

## Features by Module

### M1 — Authentication & Multi-Tenancy
- JWT-based auth with refresh token support
- Tenant isolation via subdomain detection (`x-subdomain` header)
- Session invalidation via `tokenVersion` comparison
- Forgot / reset password flows
- Edge-compatible middleware (Next.js `middleware.ts` using `jose`)

### M2 — Repair Ticket Management
- Full ticket lifecycle: `received → diagnosed → estimate_sent → approved → in_repair → ready → delivered`
- Enforced FSM: invalid status transitions are rejected at the service layer
- Ticket notes, status history, technician assignment
- Photos per ticket (Cloudinary)
- Ticket number generation (`TKT-XXXX`)

### M3 — Inventory & Parts Management
- Parts catalog with SKU, brand, cost, and selling price
- Stock adjustment with movement types: `added`, `used`, `adjusted`, `returned`, `damaged`
- Stock movement audit trail per part
- Technician part requests linked to tickets
- Low-stock detection

### M4 — Estimates & Invoices (PostgreSQL)
- Line item estimates: `part`, `labor`, `service`, `fee`
- Tax rate, discount (percentage or fixed), and currency support
- Customer approval / rejection with digital signature capture
- Auto-conversion of approved estimate to invoice
- PostgreSQL migrations: `001_create_estimates`, `002_create_invoices`, `003_create_payments`

### M5 — Payments
- Pluggable gateway architecture (`IPaymentGateway` interface)
- Stripe integration (card payments + webhook handling)
- JazzCash integration (HMAC-SHA256 signed requests)
- EasyPaisa integration
- PayPal integration
- Webhook handlers for async payment confirmation

### M6 — Customer Portal
- Self-service dashboard: track repair status, view estimates/invoices, approve estimates, pay invoices
- Repair history
- Review submission

### M7 — Reporting & Analytics
- Financial reports (owner / manager)
- Technician performance reports
- Lead tracking

### M8 — Audit Logs
- Immutable audit trail for all critical actions
- Viewable by `super_admin` and `owner`
- Stored in MongoDB (`AuditLog` model)

### M9 — Doorstep Delivery & Logistics (UK)
- Postcode-based service zone management
- Haversine distance calculation for zone matching
- Dynamic pricing models: `flat`, `per_km`, `tiered`
- Delivery FSM: `PENDING → ASSIGNED → EN_ROUTE → ARRIVED → PICKED_UP → IN_TRANSIT → DELIVERED`
- Real-time GPS tracking via Redis (TTL-based live pings + Mongo snapshots on completion)
- Proof-of-delivery photo capture
- Driver self-service dashboard
- UK GDPR / ICO right-to-erasure: `anonymiseJobForErasure`
- Driver payment tracking per job

---

## User Roles & Permissions

| Role | Dashboard Route | Key Capabilities |
|---|---|---|
| `super_admin` | `/dashboard/super-admin` | All tenants, impersonation, platform analytics, global audit logs |
| `owner` | `/dashboard/owner` | Full shop access, settings, user management, billing, audit logs |
| `manager` | `/dashboard/manager` | Tickets, inventory, team, reports, leads |
| `frontdesk` | `/dashboard/frontdesk` | Ticket intake, customer management, delivery booking, payments |
| `technician` | `/dashboard/technician` | Assigned tickets, inventory requests, AI diagnostic assistant, time tracking |
| `customer` | `/dashboard/customer` | Track device, view/approve estimates, pay invoices, review |
| `driver` | `/dashboard/driver` | Active delivery jobs, GPS navigation, proof-of-delivery, payment |

Permission enforcement happens at two layers:
1. **Edge Middleware** (`frontend/src/middleware.ts`) — guards dashboard routes and API routes via JWT verification
2. **Permission Middleware** (`frontend/src/middleware/permissionMiddleware.ts`) — fine-grained permission checks using the `PERMISSIONS` matrix in `src/lib/rbac.ts`

---

## Project Structure

```
├── .env.local                          # Root environment config
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/                    # Next.js API routes
│   │   │   │   ├── auth/               # login, register, logout, forgot/reset password
│   │   │   │   ├── tickets/            # CRUD + status, notes, assign, estimate, parts
│   │   │   │   ├── parts/              # Inventory CRUD + stock adjustments
│   │   │   │   ├── users/              # User management
│   │   │   │   ├── audit-logs/         # Audit log retrieval
│   │   │   │   └── tenant/             # Tenant resolution
│   │   │   └── dashboard/              # Role-scoped UI pages
│   │   │       ├── super-admin/
│   │   │       ├── owner/
│   │   │       ├── manager/
│   │   │       ├── frontdesk/
│   │   │       ├── technician/
│   │   │       ├── customer/
│   │   │       └── driver/
│   │   ├── components/                 # Shared UI components
│   │   │   ├── DashboardShell.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   └── tickets/                # TicketList, TicketForm, TicketDetail
│   │   ├── lib/                        # Core utilities
│   │   │   ├── rbac.ts                 # Permission matrix + role metadata
│   │   │   ├── enums.ts                # TicketStatus FSM, StockMovementType, Roles
│   │   │   ├── permissions.ts
│   │   │   ├── subdomain.ts
│   │   │   ├── db.ts                   # MongoDB connection helper
│   │   │   └── auth.helper.ts
│   │   ├── models/                     # Mongoose models
│   │   │   ├── ticket.model.ts
│   │   │   ├── user.model.ts
│   │   │   ├── tenant.model.ts
│   │   │   ├── customer.model.ts
│   │   │   ├── part.model.ts
│   │   │   ├── stockMovement.model.ts
│   │   │   └── auditLog.model.ts
│   │   ├── modules/                    # Feature controllers
│   │   │   ├── auth/auth.service.ts
│   │   │   ├── inventory/part.controller.ts
│   │   │   └── tickets/ticket.controller.ts
│   │   ├── services/                   # Business logic services
│   │   │   ├── tickets/ticket.service.ts
│   │   │   └── auditLog.service.ts
│   │   ├── middleware/
│   │   │   └── permissionMiddleware.ts
│   │   ├── utils/
│   │   │   ├── apiResponse.ts
│   │   │   ├── passwordPolicy.ts
│   │   │   └── response.helper.ts
│   │   └── middleware.ts               # Edge middleware (JWT + RBAC guards)
│   ├── tailwind.config.js
│   └── tsconfig.json
│
└── backend/                            # M9 Delivery Microservice (Fastify)
    └── src/
        ├── server.ts                   # Fastify bootstrap
        ├── config/
        │   ├── env.ts                  # Zod-validated env schema
        │   ├── mongodb.ts
        │   ├── postgres.ts
        │   └── redis.ts
        ├── database/
        │   ├── migrate.ts
        │   └── migrations/
        │       ├── 001_create_estimates.sql
        │       ├── 002_create_invoices.sql
        │       └── 003_create_payments.sql
        ├── errors/                     # Custom error classes
        ├── middleware/
        │   ├── authMiddleware.ts
        │   ├── errorHandler.ts
        │   ├── fileUploadMiddleware.ts
        │   ├── roleMiddleware.ts
        │   ├── securityMiddleware.ts
        │   └── tenantMiddleware.ts
        ├── models/
        │   ├── tenant.model.ts
        │   └── auditLog.model.ts
        ├── modules/
        │   ├── billing/                # Estimates + invoices (PostgreSQL)
        │   ├── delivery/               # M9 doorstep logistics
        │   │   ├── model/
        │   │   ├── service/
        │   │   ├── controller/
        │   │   ├── routes/
        │   │   ├── validators/
        │   │   └── utils/
        │   └── payments/               # Multi-gateway payment processing
        │       ├── gateways/
        │       │   ├── gateway.interface.ts
        │       │   ├── stripe.gateway.ts
        │       │   ├── jazzcash.gateway.ts
        │       │   └── index.ts
        │       ├── service/
        │       └── routes/
        ├── types/
        └── utils/
            ├── encryption/             # AES-256-CBC
            └── logger/
```

---

## Database Design

### MongoDB Collections
| Collection | Description |
|---|---|
| `users` | All user accounts across tenants |
| `tenants` | Repair shop registrations + subdomain + subscription info |
| `tickets` | Repair jobs with FSM status, notes, history, parts used |
| `customers` | Customer profiles per tenant |
| `parts` | Inventory catalogue per tenant |
| `stockmovements` | Audit trail for every inventory change |
| `auditlogs` | Immutable system-wide action log |
| `deliveryjobs` | M9 delivery bookings with GPS trail |
| `servicezones` | UK postcode district-based delivery zones |

### PostgreSQL Tables (Financial — via Supabase)
| Table | Description |
|---|---|
| `estimates` | Quote header with status, tax, discount, currency |
| `estimate_line_items` | Individual line items per estimate |
| `invoices` | Finalized invoice converted from approved estimate |
| `invoice_line_items` | Invoice line items |
| `payments` | Payment records linked to invoices with gateway details |

---

## API Overview

### Next.js API Routes (`/api/...`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register new user |
| `POST` | `/api/auth/login` | Public | Login, returns JWT cookie |
| `POST` | `/api/auth/logout` | Auth | Clear session |
| `POST` | `/api/auth/forgot-password` | Public | Send reset email |
| `POST` | `/api/auth/reset-password` | Public | Apply new password |
| `GET` | `/api/auth/verify-session` | Auth | Validate token version |
| `GET/POST` | `/api/tickets` | Auth | List / create tickets |
| `GET/PUT/DELETE` | `/api/tickets/[id]` | Auth | Get / update / delete ticket |
| `PATCH` | `/api/tickets/[id]/status` | Auth | FSM status transition |
| `POST` | `/api/tickets/[id]/assign` | Auth | Assign technician |
| `POST` | `/api/tickets/[id]/notes` | Auth | Add internal note |
| `POST` | `/api/tickets/[id]/estimate` | Auth | Attach estimate |
| `POST` | `/api/tickets/[id]/parts` | Auth | Log parts used |
| `GET/POST` | `/api/parts` | Auth | List / create parts |
| `GET/PUT/DELETE` | `/api/parts/[partId]` | Auth | Manage a specific part |
| `POST` | `/api/parts/[partId]/stock` | Auth | Adjust stock |
| `GET/POST` | `/api/stock-movements` | Auth | List / record stock movements |
| `GET/POST` | `/api/users` | Auth (owner/manager) | List / create users |
| `GET/PUT/DELETE` | `/api/users/[userId]` | Auth | Manage a specific user |
| `GET` | `/api/audit-logs` | Auth (owner/super_admin) | Retrieve audit log |
| `GET` | `/api/tenant/resolve` | Public | Resolve tenant from subdomain |

### Fastify Delivery Microservice (`/api/delivery/...`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/api/delivery/jobs` | Book a delivery job |
| `GET` | `/api/delivery/jobs` | List delivery jobs (paginated) |
| `GET` | `/api/delivery/jobs/:id` | Get job details |
| `PATCH` | `/api/delivery/jobs/:id/status` | Update delivery status (FSM) |
| `PATCH` | `/api/delivery/jobs/:id/assign` | Assign a driver |
| `POST` | `/api/delivery/jobs/:id/gps` | Record live GPS ping |
| `GET` | `/api/delivery/jobs/:id/location` | Get live driver location |
| `POST` | `/api/delivery/jobs/:id/complete` | Complete with proof of delivery |
| `DELETE` | `/api/delivery/jobs/:id/erasure` | GDPR right-to-erasure |
| `GET` | `/api/delivery/driver/jobs` | Driver's active jobs |
| `GET/POST` | `/api/delivery/zones` | List / create service zones |
| `GET` | `/api/delivery/zones/check` | Check postcode coverage |

---

## Payment Gateways

All payment gateways implement the `IPaymentGateway` interface:

```typescript
interface IPaymentGateway {
  createPayment(input: PaymentGatewayInput): Promise<CreatePaymentResult>;
  verifyPayment(paymentId: string): Promise<VerifyPaymentResult>;
  refundPayment(paymentId: string, amount?: number): Promise<RefundResult>;
}
```

| Gateway | Region | Notes |
|---|---|---|
| **Stripe** | Global | Webhook signature verification via `STRIPE_WEBHOOK_SECRET` |
| **JazzCash** | Pakistan | HMAC-SHA256 signed requests; sandbox + live URLs |
| **EasyPaisa** | Pakistan | Hash-based request signing |
| **PayPal** | Global | Sandbox and live mode |

The active gateway is selected at runtime based on the payment method chosen at checkout. Webhooks for all gateways are handled in `backend/src/modules/payments/routes/webhook.handler.ts`.

---

## Environment Variables

Copy `.env.local` and fill in your values. All variables are validated at startup using Zod — the application will **refuse to start** if any required variable is missing or malformed.

```env
# Server
NODE_ENV=development
PORT=4000
APP_URL=http://localhost:3000

# JWT (minimum 32 characters)
JWT_SECRET=your_jwt_secret_minimum_32_chars_here
JWT_EXPIRES_IN=30d
JWT_REFRESH_SECRET=your_refresh_secret_minimum_32_chars

# MongoDB Atlas
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dibnow

# PostgreSQL (Supabase or self-hosted)
POSTGRES_URI=postgresql://user:pass@host:5432/dibnow

# Redis
REDIS_URL=redis://localhost:6379

# Encryption (AES-256-CBC — exactly 32 / 16 chars)
ENCRYPTION_KEY=your_32_char_encryption_key_here!!
ENCRYPTION_IV=your_16_char_iv!!

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# PayPal
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_MODE=sandbox

# JazzCash (optional)
JAZZCASH_MERCHANT_ID=
JAZZCASH_PASSWORD=
JAZZCASH_INTEGRITY_SALT=

# EasyPaisa (optional)
EASYPAISA_STORE_ID=
EASYPAISA_HASH_KEY=

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Email
RESEND_API_KEY=re_...

# Sentry (optional)
SENTRY_DSN=

# CORS
ALLOWED_ORIGINS=http://localhost:3000

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60000

# Session
SESSION_INACTIVITY_TIMEOUT=1800
```

---

## Getting Started

### Prerequisites
- Node.js >= 18
- MongoDB Atlas cluster (or local MongoDB)
- PostgreSQL database (Supabase recommended)
- Redis instance (local or Redis Cloud)

### 1. Clone and install

```bash
git clone https://github.com/your-org/dibnow-repair-saas.git
cd dibnow-repair-saas

# Install frontend dependencies
cd frontend && npm install

# Install backend dependencies
cd ../backend && npm install
```

### 2. Configure environment

```bash
cp .env.local .env
# Edit .env and fill in all required values
```

### 3. Run PostgreSQL migrations

```bash
cd backend
npm run dev
# The migration script at src/database/migrate.ts runs on startup
# or run manually:
npx ts-node src/database/migrate.ts
```

### 4. Start the development servers

```bash
# Terminal 1 — Next.js frontend (port 3000)
cd frontend
npm run dev

# Terminal 2 — Fastify delivery microservice (port 4001)
cd backend
npm run dev
```

### 5. Access the app

- Main app: [http://localhost:3000](http://localhost:3000)
- Delivery API health: [http://localhost:4001/health](http://localhost:4001/health)
- Tenant subdomain (local): add `127.0.0.1 myshop.localhost` to `/etc/hosts`, then visit `http://myshop.localhost:3000`

---

## Running Tests

The backend delivery module includes a Jest test suite:

```bash
cd backend

# Run all tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm test -- --coverage
```

Test files are located at:
- `backend/src/modules/delivery/__tests__/delivery.test.ts`

---

## Deployment

### Frontend — Vercel

```bash
cd frontend
vercel --prod
```

Set all environment variables in the Vercel project dashboard. For multi-tenant subdomain support, configure a wildcard domain: `*.dibnow.com`.

### Backend Microservice — Docker

```dockerfile
# Build
docker build -t dibnow-delivery-m9 ./backend

# Run
docker run -p 4001:4001 --env-file .env dibnow-delivery-m9
```

Or deploy to any Node.js-compatible host (Railway, Render, AWS ECS).

### Database

- **MongoDB**: Use MongoDB Atlas with network access restricted to your server IPs
- **PostgreSQL**: Supabase free tier works well for getting started; migrate to dedicated Postgres for production
- **Redis**: Redis Cloud or AWS ElastiCache for production

---

## Security

| Layer | Implementation |
|---|---|
| Authentication | JWT (HS256) with `tokenVersion` session invalidation |
| Password hashing | bcryptjs |
| Sensitive data encryption | AES-256-CBC (`ENCRYPTION_KEY` + `ENCRYPTION_IV`) |
| API protection | Edge middleware JWT verification on all `/api/*` and `/dashboard/*` routes |
| Role enforcement | Permission matrix in `rbac.ts` checked at middleware and service layer |
| Multi-tenancy isolation | `tenantId` scoped on every MongoDB query |
| Payment signing | HMAC-SHA256 for JazzCash; Stripe webhook signature verification |
| Env validation | Zod schema — app refuses to start with invalid config |
| CORS | Explicit allowlist via `ALLOWED_ORIGINS` |
| Rate limiting | Configurable via `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW` |
| GDPR | Right-to-erasure endpoint anonymises delivery job PII |
| Security headers | `securityMiddleware.ts` sets standard security headers |

---

## License

Proprietary — Clicktake Technologies. All rights reserved.

---

*Built with ❤️ by the Clicktake Technologies team.*
