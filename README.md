# DibnowRepairSaaS — Core Backend Engine (M5 & M12)

The high-performance, multi-tenant backend engine powering **DibnowRepairSaaS**. This codebase unifies **Module 5 (Billing, Payments & Finance)** and **Module 12 (Security, Compliance & Reliability)** using Fastify and TypeScript.

---

## 🏗️ Multi-Database Architecture

To balance extreme document flexibility with strict financial ACID compliance, data is split across three isolated tiers:

| Database Engine | Provider / Tooling | Target Collections & Tables | Operational Purpose |
| :--- | :--- | :--- | :--- |
| **MongoDB Atlas** | Mongoose ODM | `tenants`, `users`, `customers`, `tickets`, `devices`, `inventory_items`, `leads`, `notifications` | **Primary Store:** Multi-tenant schemas, high-volume operational documents, configurations, and dynamic custom fields. |
| **PostgreSQL** | Supabase / PG Pool | `invoices`, `payments`, `estimates`, `audit_logs_immutable`, `subscriptions` | **Financial Ledger:** Legally compliant ACID transactions, revenue logging, and tamper-proof billing records. |
| **Redis Cloud** | Node-Redis Client | Active login tokens, session caches, rate-limit counters, system queues, and concurrent stock locks. | **Performance Layer:** Distributed session management, pub/sub adapters, and query cache-warming. |

---

## 🛠️ Feature Modules Summary

### 💳 Module 5: Billing & Payments
* **One-Click Generation:** Instantly builds immutable invoices derived from customer-approved line-item estimates.
* **Localized Payment Gateways:** Dedicated integration endpoints matching global processing (Stripe, PayPal) alongside native Pakistani mobile wallets (JazzCash, EasyPaisa).
* **Split Settlements:** Core engines tracking pending due structures, partial token entries, installment plans, and manager-approved refunds.

### 🚨 Module 12: Security & Compliance
* **Append-Only Auditing:** Immutable system logging tracking administrator behaviors, access locations, user agents, and explicit schema data diff changes (`oldValues` vs `newValues`) with absolute zero update/delete permissions.
* **Session Telemetry:** Real-time visibility into active login instances allowing explicit token revocations via an immediate Redis blocklist.
* **Tenant Isolation Middleware:** Layer 1 route-level middleware stripping incoming JWT credentials to automatically enforce `tenant_id` query validation boundaries.

---

## 📡 API Routing Registry

### 🟢 Platform Health
* `GET /health` — Verifies engine uptime, environment variables state, and container health metrics.

### 🟣 Module 5: Financial Services
* `GET /api/billing/invoices` — Pulls tenant-scoped billing documents matching active route authorizations.
* `POST /api/billing/invoices` — Spins up a fresh compliance ledger record from an active approved estimate.
* `POST /api/payments` — Fires the automated payment intent parser (mounts Stripe client secrets or triggers mobile wallet verification steps).
* `POST /api/payments/refund` — Validates role permissions and maps transaction rollbacks directly against the primary ledger.

### 🔵 Module 12: Compliance Infrastructure
* `GET /api/security/audit-logs` — Administrative tracking stream segmented cleanly by target error levels (`info`, `warning`, `critical`).
* `GET /api/security/sessions` — Pulls active token device metadata mapped to your workspace.
* `DELETE /api/security/sessions` — Invalidates target session keys, instantly expelling unauthorized hardware from the server cache.

---

## 🚀 Execution Guide

### Local Development Running
```bash
# Install the exact Node development dependencies
npm install

# Run hot-reloading development pipeline via nodemon + ts-node
npm run dev
