# 🔧 DibnowRepairSaaS — Repair Shop Management Platform

> A multi-tenant SaaS platform for repair shops — from ticket intake through diagnosis, estimates, repair, delivery, and payment — with role-based dashboards for 8 user types, multi-gateway payments, GPS delivery tracking, and an AI assistant.

---

## 📌 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Features by Area](#features-by-area)
- [User Roles & Permissions](#user-roles--permissions)
- [Project Structure](#project-structure)
- [Database Design](#database-design)
- [API Overview](#api-overview)
- [Payment Gateways](#payment-gateways)
- [AI Providers](#ai-providers)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Known Gaps & Honest Limitations](#known-gaps--honest-limitations)
- [Security](#security)

---

## Overview

**DibnowRepairSaaS** is a full-stack multi-tenant SaaS application for device repair shops. Each shop operates as an isolated **tenant**, optionally with its own public shop page (`/shop/[subdomain]`) listed in a searchable shop directory. The system supports 8 distinct roles, each with its own dashboard.

Almost the entire application — auth, tickets, inventory, payments, notifications, admin, AI — lives in the **Next.js frontend** as App Router API routes (`frontend/src/app/api/**`) talking directly to MongoDB via Mongoose. A separate **Fastify microservice** (`backend/`) exists for a Module 9 doorstep-delivery/logistics design, but in the current build it is not wired into any live user flow — it's kept in the repo for future use but isn't part of the running product today. Don't assume backend/ is live; verify before building on it.

---

## Tech Stack

### Frontend (the real application)
| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + inline styles (landing page) |
| Auth | JWT (`jsonwebtoken` + `jose` for Edge middleware) |
| HTTP Client | Axios (`src/lib/api.ts`, attaches auth headers from localStorage) |
| Validation | Zod |
| Icons | Lucide React |
| Maps | Mapbox GL JS (loaded via CDN script tag at runtime — no npm package) |

### Backend microservice (`backend/`, delivery module — not currently wired into the live app)
| Layer | Technology |
|---|---|
| Framework | Fastify 4 |
| Language | TypeScript |

### Databases
| Purpose | Database |
|---|---|
| Everything (users, tenants, tickets, parts, payments, sessions, logs, etc.) | MongoDB Atlas (Mongoose) |
| Estimates/invoices schema exists for a future PostgreSQL billing module | PostgreSQL (Supabase) — migrations present, not the primary payment path today |
| Not currently used by the live app | Redis (`ioredis`, configured for the unused backend microservice) |

### Infrastructure & Services
| Service | Purpose | Status |
|---|---|---|
| Stripe | Card payments & subscriptions | Live-tested with real test-mode keys |
| JazzCash / EasyPaisa / PayPal | Pakistan wallets & international payments | Code paths verified against real sandboxes; needs real merchant credentials to go live |
| Groq / OpenAI / Google Gemini | AI chat, diagnostics, estimates, automation validation | Live — routed per use-case in `frontend/src/lib/ai/providers.ts` |
| Mapbox | Live GPS map rendering, reverse geocoding, driving directions | Needs a real `NEXT_PUBLIC_MAPBOX_TOKEN` — falls back gracefully to raw lat/lng without one |
| Resend / MailerSend / Mailtrap | Transactional email (fallback chain) | Live |
| Cloudinary | Configured but not actually used — file uploads currently go to local `frontend/public/uploads/` | Not wired |

---

## Architecture

```
dibnow.com / [tenant].dibnow.com
          │
          ▼
┌───────────────────────────────────────┐
│           Next.js 14 Frontend          │
│  ┌─────────────┐   ┌────────────────┐  │
│  │  App Router │   │   API Routes    │  │
│  │  /dashboard │   │   /api/...      │  │
│  └─────────────┘   └────────────────┘  │
│           │                 │          │
│      Edge Middleware        │          │
│      (JWT + RBAC)           │          │
└───────────────────────────────────────┘
           │
     ┌─────▼─────┐
     │  MongoDB  │   ← the only datastore the live app actually reads/writes
     │   Atlas   │
     └───────────┘

(backend/ Fastify microservice exists for a future delivery-logistics
 module but is not called by any live user flow today)
```

---

## Features by Area

### Auth & Multi-Tenancy
- JWT auth (name/role/tenantId embedded in the token — verified server-side in `middleware.ts`, never trusted from client headers)
- Optional 2FA (email OTP) for super_admin / owner / manager, configurable per-platform
- Subdomain-based tenant resolution, public shop pages, shop directory with search
- Forgot/reset password, email verification, password history & expiry policy

### Repair Tickets
- Full lifecycle: `received → diagnosed → estimate_sent → approved → in_repair → ready → delivered` (or `cancelled`), enforced as a strict state machine
- Server-side role restrictions on which statuses each role may set (front desk: intake/handover only; technician: diagnosis/repair only)
- Technician assignment, driver assignment, internal notes, full status history with real attribution
- Repair photos (before/during/after/damage/parts/proof) — uploaded to disk, attached to the ticket, visible in the shared ticket-detail UI across every staff role
- Estimate creation, tied to the estimate→approve→pay flow

### Payments
- Online checkout: Stripe / JazzCash / EasyPaisa / PayPal, each with its own initiate + callback route
- **In-person (POS) payments**: front desk or driver can record a cash/card/wallet payment directly against a ticket, with duplicate-payment protection and a real payment ledger (`GET /api/payments`)

### Notifications
- Every ticket status change, estimate, technician/driver assignment, and payment fires both an in-app notification and an email to the relevant parties (owner, manager, technician, driver, customer)
- Multi-provider email fallback chain (Resend → MailerSend → Mailtrap)

### Automation Rules
- IF/THEN rules (trigger → action) created per tenant, validated by AI before saving
- Rules actually execute on real events: ticket created, ticket status changed, estimate exceeds a threshold, part stock falls below its limit
- Actions: notify manager, send email, flag ticket for review, auto-assign a technician, create a reorder alert. `send_sms` is honest about having no SMS provider configured rather than pretending to send one.
- One trigger (`ticket_overdue`) is defined but not wired — it needs a scheduled job runner that doesn't exist in this app yet.

### GPS & Delivery Tracking
- Customers can set a precise delivery pin via browser geolocation; drivers can share their live location
- Live map rendering via Mapbox (`GpsMap` component) with a raw lat/lng fallback when Mapbox isn't configured
- Two independent, real GPS pipelines currently coexist: one keyed by `Ticket.driverId`/`Ticket.driverLocation` (driver-initiated), another keyed by `User.currentLocation`/`ticket.technicianId` (a separate live-tracking API under `/api/driver/*`). They are not yet unified — see [Known Gaps](#known-gaps--honest-limitations).

### AI Assistant
- Floating chat widget on the public homepage (`ChatWidget.tsx`) — works for anonymous visitors, answers questions about the platform and repair status
- Role-specific AI tools in the dashboards: diagnostic assistant, cost estimation, demand forecasting, automation-rule risk validation

### Admin & Owner Settings
- Owner: 13-tab shop control center (public profile, business hours, notifications, home widgets, customer portal toggles, billing, payment gateways, security, danger zone, GPS)
- Super-admin: platform-wide settings (AI provider/budget, storage, feature flags, appearance/branding, backup & recovery, maintenance mode / read-only mode / emergency lockdown), tenant/user management, impersonation, audit logs, broadcast tool, diagnostics

---

## User Roles & Permissions

| Role | Dashboard Route | Key Capabilities |
|---|---|---|
| `super_admin` | `/dashboard/super-admin` | All tenants, impersonation, platform settings, global audit logs |
| `admin` | `/dashboard/super-admin` (scoped) | Per-section platform permissions granted by super_admin |
| `owner` | `/dashboard/owner` | Full shop access, 13-tab settings, staff management, billing |
| `manager` | `/dashboard/manager` | Tickets, inventory, team, reports, leads, automation rules |
| `frontdesk` | `/dashboard/frontdesk` | Ticket intake/handover, customers, payments, print |
| `technician` | `/dashboard/technician` | Assigned tickets, diagnosis/repair status, photos, parts, AI diagnostics |
| `customer` | `/dashboard/customer` | Book repairs, track status, estimates, invoices, delivery tracking, reviews |
| `driver` | `/dashboard/driver` | Assigned jobs, navigation, GPS sharing, proof of delivery, payment collection |

Permission enforcement happens at two layers:
1. **Edge Middleware** (`frontend/src/middleware.ts`) — verifies the JWT and derives trusted identity/role headers server-side (never trusts client-supplied headers)
2. **Server-side role checks** in individual route handlers for anything role-sensitive beyond "logged in" (e.g. `TECHNICIAN_ALLOWED_STATUSES` in `ticket.controller.ts`)

---

## Project Structure

```
├── frontend/                            # The real application
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/                     # All backend logic lives here
│   │   │   │   ├── auth/                # login, register, logout, 2FA, password flows
│   │   │   │   ├── tickets/[id]/        # status, assign, assign-driver, estimate,
│   │   │   │   │                        #   payment, photos, location, notes
│   │   │   │   ├── payments/            # stripe/jazzcash/easypaisa/paypal initiate+callback
│   │   │   │   ├── admin/               # super-admin: tenants, users, settings, tools
│   │   │   │   ├── ai/                  # chat (public), diagnostic, estimate, forecast, automation
│   │   │   │   ├── parts/, users/, leads/, notifications/, tenant/, shop/, shops/, ...
│   │   │   │   └── driver/               # legacy parallel GPS pipeline (see Known Gaps)
│   │   │   └── dashboard/               # Role-scoped UI, one folder per role
│   │   ├── components/
│   │   │   ├── DashboardShell.tsx       # Shared shell: nav, notifications, theme, impersonation
│   │   │   ├── ChatWidget.tsx           # Public homepage AI assistant
│   │   │   ├── GpsMap.tsx               # Mapbox live map component
│   │   │   └── tickets/TicketDetail.tsx # Shared ticket-detail UI used by 5 different roles
│   │   ├── lib/
│   │   │   ├── enums.ts                 # Role, TicketStatus, and the FSM transition map
│   │   │   ├── automation.ts            # Automation rule execution engine
│   │   │   ├── notifications.ts         # In-app + email notification helpers
│   │   │   ├── ai/                      # providers.ts (Groq/OpenAI/Gemini), anthropic.ts (Groq shim)
│   │   │   ├── payments/                # per-gateway request builders
│   │   │   └── db.ts                    # MongoDB connection helper
│   │   ├── models/                      # Mongoose models (Ticket, User, Tenant, Payment, ...)
│   │   ├── modules/tickets/             # ticket.controller.ts + ticket.validation.ts
│   │   ├── services/tickets/            # ticket.service.ts — the actual business logic
│   │   └── middleware.ts                # Edge middleware — JWT verification + route guards
│   └── scripts/create-admin.mjs         # Seed/reset the platform super_admin (reads ADMIN_PASSWORD from env — no hardcoded fallback)
│
└── backend/                             # Fastify delivery microservice — not wired into the live app
    └── src/modules/delivery/            # Kept for a future logistics module
```

---

## Database Design (MongoDB)

| Collection | Description |
|---|---|
| `users` | All accounts across all tenants (role, tokenVersion, 2FA, currentLocation) |
| `tenants` | Shop registrations, subdomain, branding, payment config, GPS pin |
| `tickets` | Repair jobs — FSM status, notes, statusHistory, photos, driver/technician assignment, delivery/driver GPS |
| `customers` | Customer profiles per tenant |
| `payments` | Online + in-person payment ledger, linked to tickets |
| `parts` / `stockmovements` | Inventory catalogue + audit trail |
| `automationRules` | IF/THEN rules with trigger/action, AI validation, real trigger counts |
| `notifications` | In-app notification inbox per user |
| `auditlogs` | Immutable action log |
| `sessions` | Active login sessions (for force-logout / session management) |

---

## API Overview

Every route below lives under `frontend/src/app/api/`. Auth is enforced by `middleware.ts` per route prefix — see that file for the exact matcher list.

| Area | Examples |
|---|---|
| Auth | `POST /api/auth/{register,login,logout,forgot-password,reset-password,verify-otp,change-password}` |
| Tickets | `GET/POST /api/tickets`, `PATCH /api/tickets/[id]/{status,estimate,assign,assign-driver,location}`, `POST /api/tickets/[id]/{photos,notes,payment}` |
| Payments | `POST /api/payments/{stripe,jazzcash,easypaisa,paypal}/{initiate,callback}`, `GET /api/payments` |
| Inventory | `GET/POST /api/parts`, `POST /api/parts/[partId]/stock` |
| AI | `POST /api/ai/chat` (public), `POST /api/ai/{diagnostic,estimate,forecast,automation}` (authenticated) |
| Admin | `GET/PATCH /api/admin/settings`, `/api/admin/{tenants,users,tools,impersonate,audit-logs}` |
| Public | `GET /api/public/shops`, `GET /api/shop/[subdomain]`, `POST /api/public/{contact-us,request-demo}` |

---

## Payment Gateways

| Gateway | Region | Status |
|---|---|---|
| **Stripe** | Global | Real test-mode keys configured; live-tested end-to-end |
| **JazzCash** | Pakistan | Code correct (HMAC-SHA256 signed requests); placeholder merchant credentials — needs a real merchant account |
| **EasyPaisa** | Pakistan | Code correct; placeholder credentials — needs a real merchant account |
| **PayPal** | Global | Code correct; placeholder client ID/secret — needs a real developer app |

In-person payments (cash/card/wallet collected by front desk or a driver) are a separate flow — see `POST /api/tickets/[id]/payment`.

---

## AI Providers

| Provider | Used for | Cost |
|---|---|---|
| Groq (Llama 3.3 70B) | Chat widget, automation rule validation | Free tier |
| Google Gemini | Diagnostics, demand forecasting (large context) | Free tier |
| OpenAI (GPT-4o-mini) | Cost estimation | ~$0.0001/call |

Configured in `frontend/src/lib/ai/providers.ts`. `frontend/src/lib/ai/anthropic.ts` is a thin backward-compatible Groq export still used by the chat and automation routes — don't delete it without updating those routes first.

---

## Environment Variables

See `frontend/.env.local` for the full list with inline comments. Key groups:

```env
# Server
NODE_ENV=development
APP_URL=http://localhost:3000

# Auth
JWT_SECRET=...
JWT_REFRESH_SECRET=...

# Database
MONGODB_URI=mongodb+srv://...
POSTGRES_URI=postgresql://...        # not on the primary payment path today
REDIS_URL=...                        # only used by the unwired backend/ microservice

# AI
GROQ_API_KEY=...
OPENAI_API_KEY=...
GEMINI_API_KEY=...

# Payments
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...      # placeholder until a real webhook endpoint is configured
JAZZCASH_MERCHANT_ID= / EASYPAISA_STORE_ID= / PAYPAL_CLIENT_ID=   # placeholders — need real merchant accounts

# Email (fallback chain)
EMAIL_PROVIDER_ORDER=resend,mailersend,mailtrap
RESEND_API_KEY=...

# GPS
NEXT_PUBLIC_MAPBOX_TOKEN=...          # placeholder — map falls back to raw lat/lng without a real token
```

**Before this goes live or public, rotate:** MongoDB password, Groq key, JWT secrets, Brevo key, and Cloudinary secret — these were previously exposed and the exposure was never followed up with rotation. This is independent of the git repository's contents.

---

## Getting Started

### Prerequisites
- Node.js >= 18
- A MongoDB Atlas cluster (or local MongoDB)

### 1. Install

```bash
cd frontend && npm install
```

### 2. Configure environment

Copy `frontend/.env.local.example` (if present) or create `frontend/.env.local` with the variables listed above.

### 3. Seed the platform super_admin

```bash
cd frontend
ADMIN_PASSWORD='your-strong-password' node scripts/create-admin.mjs
```

### 4. Run the app

```bash
cd frontend
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000). For a tenant subdomain locally, add `127.0.0.1 myshop.localhost` to your hosts file and visit `http://myshop.localhost:3000`.

The `backend/` Fastify service can be started separately (`cd backend && npm run dev`) but nothing in the live app currently depends on it being up.

---

## Known Gaps & Honest Limitations

These are real, verified gaps — not guesses:

- **Two parallel GPS pipelines**: `Ticket.driverLocation` (this build's driver-initiated flow) and `User.currentLocation` via `/api/driver/*` (a separate live-tracking flow) both work independently but aren't unified. Pick one before building further on top.
- **No POS payment UI beyond what's built**: front desk and driver can record in-person payments; there's no formal receipt/invoice generation yet.
- **Automation `ticket_overdue` trigger** is defined but never fires — needs a scheduled job runner.
- **JazzCash/EasyPaisa/PayPal** need real merchant credentials before they can process a real payment; code paths are verified correct against sandboxes.
- **Cloudinary is configured but unused** — uploads go to local disk (`frontend/public/uploads/`, gitignored), which won't persist on most serverless hosts. Wire up Cloudinary (or another persistent store) before deploying somewhere with an ephemeral filesystem.
- **Mapbox needs a real token** for live map rendering and reverse geocoding; without one, GPS features still work but only via raw coordinates.
- **`backend/` Fastify microservice** is not part of the live product — verify before assuming any of its routes are reachable from the deployed app.

---

## Security

| Layer | Implementation |
|---|---|
| Authentication | JWT (HS256), identity derived from the verified token server-side — never trusts client-supplied headers |
| Password hashing | bcryptjs |
| Sensitive data encryption | AES-256-CBC for stored payment gateway credentials |
| API protection | Edge middleware JWT verification on every protected route prefix |
| Role enforcement | Server-side checks beyond "logged in" (e.g. per-status RBAC on ticket transitions) |
| Multi-tenancy isolation | `tenantId` scoped on every tenant-scoped query |
| Payment signing | HMAC-SHA256 (JazzCash), Stripe webhook signature verification |
| Platform controls | Maintenance mode, read-only mode, and emergency lockdown, enforced centrally in `middleware.ts` |

---

## License

Proprietary — Clicktake Technologies. All rights reserved.
