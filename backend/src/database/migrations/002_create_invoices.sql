-- ============================================================
-- DibnowRepairSaaS — Migration 002
-- Invoices Table
-- ============================================================

CREATE TABLE IF NOT EXISTS invoices (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         VARCHAR(24) NOT NULL,
  estimate_id       UUID REFERENCES estimates(id),
  ticket_id         VARCHAR(24) NOT NULL,
  customer_id       VARCHAR(24) NOT NULL,
  created_by        VARCHAR(24) NOT NULL,

  -- Invoice number: INV-2026-00001 (per tenant)
  invoice_number    VARCHAR(50) NOT NULL,

  -- Amounts
  subtotal          NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_rate          NUMERIC(5, 2) NOT NULL DEFAULT 0,
  tax_amount        NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount_amount   NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_amount      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  amount_paid       NUMERIC(12, 2) NOT NULL DEFAULT 0,
  amount_due        NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency          CHAR(3) NOT NULL DEFAULT 'USD',

  -- Status
  status            VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'partial', 'paid', 'failed', 'refunded', 'void')),

  -- Dates
  due_date          TIMESTAMPTZ,
  paid_at           TIMESTAMPTZ,
  voided_at         TIMESTAMPTZ,

  -- Meta
  notes             TEXT,
  pdf_url           TEXT,  -- Cloudinary URL of generated PDF

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Invoice Line Items ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  tenant_id       VARCHAR(24) NOT NULL,

  name            VARCHAR(200) NOT NULL,
  description     TEXT,
  type            VARCHAR(20) NOT NULL CHECK (type IN ('part', 'labor', 'service', 'fee')),
  quantity        INTEGER NOT NULL DEFAULT 1,
  unit_price      NUMERIC(12, 2) NOT NULL,
  total_price     NUMERIC(12, 2) NOT NULL,
  part_id         VARCHAR(24),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Invoice sequence per tenant ─────────────────────────────
-- Gives each tenant their own invoice numbering: INV-2026-00001
CREATE TABLE IF NOT EXISTS invoice_sequences (
  tenant_id       VARCHAR(24) PRIMARY KEY,
  last_sequence   INTEGER NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ─────────────────────────────────────────────────
CREATE INDEX idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX idx_invoices_ticket_id ON invoices(ticket_id);
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(tenant_id, status);
CREATE INDEX idx_invoices_number ON invoices(tenant_id, invoice_number);
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- ─── Unique invoice number per tenant ────────────────────────
CREATE UNIQUE INDEX idx_invoices_unique_number
  ON invoices(tenant_id, invoice_number);

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
