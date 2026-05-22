# DibnowRepairSaaS — Core Backend Engine (M5 & M12)

The enterprise-grade, high-performance, multi-tenant backend engine powering **DibnowRepairSaaS**. This codebase implements a fully unified infrastructure combining **Module 5 (Billing, Payments & Finance)** and **Module 12 (Security, Compliance & Reliability)** built on Fastify, TypeScript, and a robust multi-database layout.

---

## 🏗️ Multi-Database & Storage Architecture

To achieve extreme document schema flexibility for repair variants while maintaining absolute financial ACID guarantees, data operations are strictly isolated across three database layers:

| Database Engine | Provider / Tooling | Target Collections & Tables | Operational Purpose & Scoping |
| :--- | :--- | :--- | :--- |
| **MongoDB Atlas** | Mongoose ODM | `tenants`, `users`, `customers`, `tickets`, `devices`, `inventory_items`, `leads`, `notifications` | **Primary Operational Store:** Manages flexible multi-tenant schemas, high-volume documents, workspace configurations, and dynamic custom field layouts. |
| **PostgreSQL** | Supabase / PG Pool | `invoices`, `payments`, `estimates`, `audit_logs_immutable`, `subscriptions` | **Financial Ledger:** Mandated for legally compliant ACID transactions, revenue recording, and tamper-proof billing history. |
| **Redis Cloud** | Node-Redis Client | Token blocklists, active session cache keys, rate-limit counters, system queues, and microsecond concurrency locks. | **Performance & Performance Layer:** In-memory session tracking, pub/sub communication routing, and concurrent stock reservation safeguards. |
| **Cloudinary** | Cloudinary CDN | Secure URL binaries, static corporate branding assets, PDF structures | **Binary Storage:** Highly optimized endpoint for storing customer device damage pictures, before/after records, and generated invoice sheets. |

---

## 🛠️ Advanced Module & Logic Deep-Dive

### 💳 Module 5: Billing & Payments Core
* **Automated Invoice Generation:** Converts customer-approved line-item estimates into immutable financial records with one click, securely pulling nested arrays of labor and parts directly to the SQL ledger.
* **Idempotency Safeguards:** Every single incoming transaction request generates an internal `idempotencyKey` string formatted directly as `tenantId:invoiceId:gateway:amount` to entirely eliminate double-charging under unstable network dropouts.
* **Gateway State Splitting:** Dynamically routes application logic based on the user's chosen payment processor:
  * *Offline Gateways (Cash/Bank Transfer):* Instantly flags state as `paid`, populates `paidAt` logs, and appends reference notes.
  * *Online Gateways (Stripe/PayPal):* Triggers automated processing pipelines, yields valid cryptographic signatures (`clientSecret`), and shifts states to `pending` while awaiting secure webhook resolutions.
  * *Localized Mobile Wallets:* Custom routing paths designed for Pakistani transaction structures (**JazzCash** and **EasyPaisa**), handling mobile number validation prompts and interactive verification simulations.
* **Privileged Rollback Controls:** Enforces rigid role boundaries on `/api/payments/refund` controllers, entirely dropping execution payloads unless the request is signed by an authenticated `owner` or `manager`.

### 🚨 Module 12: Security, Compliance & System Reliability
* **Tamper-Proof Audit Tracking:** Writes comprehensive operational tracking streams to an append-only configuration database using localized severities (`info`, `warning`, `critical`). Stores full historical delta objects containing a complete side-by-side snapshot:
  * `oldValues`: The raw system record snapshot *before* the structural modification.
  * `newValues`: The updated system record state *after* the structural execution was validated.
* **Strict SQL Invariant:** The database client strictly blocks all incoming `UPDATE` or `DELETE` requests aimed at the immutable security tables, assuring unalterable logs for compliance.
* **Session Jail & Active Revocation:** Tracks active computing hardware signatures, browser engines, IP strings, and approximate locations. Revoking a session pushes the user's active `sessionId` straight into a sliding Redis blocklist, instantly dropping their API request capability within milliseconds.
* **Route Isolation Middleware:** Core route guards intercept all dashboard HTTP headers to verify and parse secure `httpOnly` JWT cookies, explicitly scoping query boundaries inside an injected `tenant_id` database partition.

---

## 📡 API Routing Architecture

### 🟢 Platform Monitoring Framework
* `GET /health` — Evaluates server health status, active runtime environment flags, version trackers, and timestamp strings.

### 🟣 Module 5: Financial Services Pipeline
* `GET /api/billing/invoices` — Fetches active invoice matrices cleanly scoped to the validated `tenant_id`.
* `POST /api/billing/invoices` — Allocates a fresh financial ledger line item tied explicitly to an approved work estimate id.
* `POST /api/payments` — Validates processing requests, matching payload entries to initiate local mobile wallet loops or global card elements.
* `POST /api/payments/refund` — Evaluates manager/owner authorizations to issue point-of-sale transaction rollbacks.

### 🔵 Module 12: Administrative Compliance Logging
* `GET /api/security/audit-logs` — Administrative stream tracking real-time user actions, filterable by target severities and user identities.
* `GET /api/security/sessions` — Collects and displays active, verified workspace session arrays currently holding platform permissions.
* `DELETE /api/security/sessions` — Broadcasts an administrative log-out command across the node pool, severing unauthorized hardware connections via the Redis cache.

---

## 🚀 Local Deployment & System Run Instructions

### 1. Environment Configuration (`.env`)
Create a custom system environment instance in the root directory:
```bash
touch .env
