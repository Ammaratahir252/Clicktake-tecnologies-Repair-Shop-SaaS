# DibnowRepairSaaS

A multi-tenant SaaS platform for repair shops — covering the full job lifecycle from customer intake to billing, inventory, doorstep delivery, and AI diagnostics.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, TanStack Query, Framer Motion |
| Backend | Fastify, Node.js, TypeScript, Zod |
| AI Service | FastAPI, Python, Groq (Llama3-8b) + Anthropic SDK |
| Databases | MongoDB Atlas · PostgreSQL (Supabase) · Redis |
| Payments | Stripe · PayPal · JazzCash · EasyPaisa |
| Storage | Cloudinary |
| Notifications | Resend (email) · Twilio (SMS) · In-app |

---

## Modules

| # | Module | Description |
|---|---|---|
| M1 | Auth & Roles | JWT auth, 7-role RBAC, subdomain-based tenant routing |
| M2 | Tickets | FSM-controlled repair lifecycle (received → delivered) |
| M3 | Inventory | Parts catalogue, stock movements, low-stock alerts |
| M4 | Billing | Estimates, invoices, digital signatures, partial payments |
| M5 | Payments | Multi-gateway processing with webhook support |
| M6 | Leads | GPS-routed inbound leads, claim/expiry flow |
| M7 | Notifications | Event bus → email / SMS / in-app with quiet hours |
| M8 | AI Assistant | Groq-powered chatbot + AI demand forecaster + workflow automation |
| M9 | Delivery (UK) | Postcode zones, FSM delivery jobs, live GPS tracking, GDPR erasure |
| M10 | Customer Portal | Repair tracker, invoice view, payment, estimates, chat, reviews |
| M11 | Front Desk | Customer intake, ticket creation, payment processing, delivery booking, print receipts |
| M12 | Security | Helmet CSP, brute-force lockout, AES-256 encryption, session token versioning, audit trail |
| M13 | Reviews & Analytics | Star ratings per ticket/technician, platform-wide analytics, revenue & performance reporting |

---

## User Roles

| Role | Dashboard Route | Scope |
|---|---|---|
| `super_admin` | `/dashboard/super-admin` | All tenants, impersonation, platform analytics, audit logs |
| `owner` | `/dashboard/owner` | Full shop — billing, team, inventory, leads, settings, forecasting |
| `manager` | `/dashboard/manager` | Tickets, inventory, reports, leads, team |
| `frontdesk` | `/dashboard/frontdesk` | Customer intake, tickets, payments, delivery |
| `technician` | `/dashboard/technician` | Assigned tickets, parts requests, photos, time tracking, AI tools |
| `customer` | `/dashboard/customer` | Repair tracker, estimates, invoices, payment, chat, reviews |
| `driver` | `/dashboard/driver` | Active delivery jobs, navigation, GPS updates, proof of delivery |

---

## Project Structure

```
/
├── backend/src/
│   ├── config/              # env, MongoDB, PostgreSQL, Redis
│   ├── database/migrations/ # SQL for estimates, invoices, payments
│   ├── errors/              # Typed error classes
│   ├── middleware/          # auth, RBAC, tenant isolation, security, file upload
│   ├── models/              # Tenant, AuditLog (Mongoose)
│   └── modules/
│       ├── billing/         # Estimates + invoices
│       ├── delivery/        # Doorstep logistics (UK)
│       ├── notifications/   # Event bus, queue, email/SMS/in-app providers
│       └── payments/        # Stripe, PayPal, JazzCash, EasyPaisa gateways
│
├── frontend/src/
│   ├── app/dashboard/
│   │   ├── super-admin/     # Tenants, users, tickets, analytics, audit, impersonate
│   │   ├── owner/           # Overview, tickets, team, inventory, leads, reports, forecast, settings
│   │   ├── manager/         # Tickets, inventory, team, leads, reports
│   │   ├── frontdesk/       # Tickets, customers, inventory, payments, delivery, print
│   │   ├── technician/      # Tickets, inventory, photos, time tracking, AI
│   │   ├── customer/        # Track, estimates, invoices, payment, chat, history, review, delivery
│   │   └── driver/          # Jobs, navigation, payment, proof of delivery
│   ├── components/          # DashboardShell, TicketForm, TicketList, RepairTracker, UI primitives
│   ├── lib/                 # rbac.ts, enums.ts, AI client, API helpers
│   ├── models/              # TypeScript interfaces for all entities
│   └── middleware.ts        # Route protection + role redirect + subdomain extraction
│
├── main.py                  # AI chatbot — FastAPI + Groq
├── static/index.html        # AI chatbot UI
└── scripts/create-admin.mjs # Seed super admin
```

---

## Getting Started

### Prerequisites
- Node.js 20+, Python 3.10+
- MongoDB Atlas, PostgreSQL (Supabase), Redis

### Setup

```bash
# 1. Install and start backend (port 4000)
cd backend
npm install
npx ts-node src/database/migrate.ts   # run PostgreSQL migrations
node ../scripts/create-admin.mjs      # seed super admin
npm run dev

# 2. Install and start frontend (port 3000)
cd ../frontend
npm install
npm run dev

# 3. (Optional) Start AI chatbot (port 8000)
cd ..
pip install -r requirements.txt
python main.py
```

---

## Environment Variables

Copy `.env.local` to `.env` and fill in all values.

```env
# Server
NODE_ENV=development
PORT=4000
APP_URL=http://localhost:4000

# JWT (min 32 chars each)
JWT_SECRET=
JWT_REFRESH_SECRET=
JWT_EXPIRES_IN=30d

# Databases
MONGODB_URI=
POSTGRES_URI=
REDIS_URL=

# Encryption (AES-256-CBC)
ENCRYPTION_KEY=          # exactly 32 chars
ENCRYPTION_IV=           # exactly 16 chars

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# PayPal
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
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

# Email & SMS
RESEND_API_KEY=re_...
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=

# AI
GROQ_API_KEY=gsk_...
NEXT_PUBLIC_ANTHROPIC_API_KEY=sk-ant-...

# CORS / Rate Limiting
ALLOWED_ORIGINS=http://localhost:3000
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60000
```

> The backend validates every variable with Zod on startup and exits immediately if any required value is missing or malformed.

---

## Security (M12)

- **JWT** with token versioning — invalidated sessions are rejected even with a valid signature
- **RBAC** enforced on every backend route and every frontend page
- **Helmet** — CSP, HSTS (1 year + preload), `X-Frame-Options: deny`, XSS filter
- **Rate limiting** — global (100/min), auth endpoints (10/15 min), payments (20/min), all Redis-backed
- **Brute-force lockout** — failed login attempts tracked in Redis; account locked after threshold
- **AES-256-CBC** encryption for sensitive stored fields
- **Tenant isolation** — every DB query scoped to `tenantId`, enforced in middleware
- **Subdomain routing** — each tenant served under its own subdomain, extracted and validated in Next.js middleware
- **GDPR** — delivery job anonymisation endpoint (UK ICO compliant)
- **Immutable audit trail** — every sensitive action logged with actor, IP, before/after snapshot

---

## Running Tests

```bash
cd backend
npm test            # run all tests
npm run test:watch  # watch mode
```

Tests cover: auth middleware, billing service, delivery FSM, payment flows, error handling, file uploads.

---

## Deployment

| Service | Recommended Provider |
|---|---|
| Frontend | Vercel |
| Backend API | Railway / Render |
| AI Chatbot | Railway / VPS |
| MongoDB | MongoDB Atlas |
| PostgreSQL | Supabase |
| Redis | Upstash |

```bash
# Build backend for production
cd backend && npm run build && npm start
```

Set `NODE_ENV=production` — PostgreSQL TLS and stricter security headers activate automatically.

---

*Dibnow Engineering © 2026*
