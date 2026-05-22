-- ============================================================
-- DibnowRepairSaaS — Migration 001
-- Estimates Table
-- Financial data lives in PostgreSQL for ACID compliance
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Estimates ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS estimates (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         VARCHAR(24) NOT NULL,
  ticket_id         VARCHAR(24) NOT NULL,
  customer_id       VARCHAR(24) NOT NULL,
  created_by        VARCHAR(24) NOT NULL,

  -- Amounts
  subtotal          NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_rate          NUMERIC(5, 2) NOT NULL DEFAULT 0,
  tax_amount        NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount_type     VARCHAR(10) CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value    NUMERIC(12, 2) DEFAULT 0,
  discount_amount   NUMERIC(12, 2) DEFAULT 0,
  total_amount      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency          CHAR(3) NOT NULL DEFAULT 'USD',

  -- Status
  status            VARCHAR(20) NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'sent', 'approved', 'rejected', 'expired')),

  -- Customer approval
  customer_signature  TEXT,
  approved_at         TIMESTAMPTZ,
  rejected_at         TIMESTAMPTZ,
  rejection_reason    TEXT,
  valid_until         TIMESTAMPTZ,

  -- Meta
  notes             TEXT,
  version           INTEGER NOT NULL DEFAULT 1,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Estimate Line Items ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS estimate_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estimate_id     UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  tenant_id       VARCHAR(24) NOT NULL,

  name            VARCHAR(200) NOT NULL,
  description     TEXT,
  type            VARCHAR(20) NOT NULL CHECK (type IN ('part', 'labor', 'service', 'fee')),
  quantity        INTEGER NOT NULL DEFAULT 1,
  unit_price      NUMERIC(12, 2) NOT NULL,
  total_price     NUMERIC(12, 2) NOT NULL,
  part_id         VARCHAR(24),  -- links to MongoDB inventory

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ─────────────────────────────────────────────────
CREATE INDEX idx_estimates_tenant_id ON estimates(tenant_id);
CREATE INDEX idx_estimates_ticket_id ON estimates(ticket_id);
CREATE INDEX idx_estimates_customer_id ON estimates(customer_id);
CREATE INDEX idx_estimates_status ON estimates(tenant_id, status);
CREATE INDEX idx_estimate_items_estimate_id ON estimate_items(estimate_id);
CREATE INDEX idx_estimate_items_tenant_id ON estimate_items(tenant_id);

-- ─── Auto-update updated_at ──────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_estimates_updated_at
  BEFORE UPDATE ON estimates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
