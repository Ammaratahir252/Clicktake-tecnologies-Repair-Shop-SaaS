-- ============================================================
-- DibnowRepairSaaS — Migration 003
-- Payments Table — supports partial payments, multiple gateways
-- PCI-DSS: NEVER store raw card data — only gateway tokens
-- ============================================================

CREATE TABLE IF NOT EXISTS payments (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id             VARCHAR(24) NOT NULL,
  invoice_id            UUID NOT NULL REFERENCES invoices(id),
  customer_id           VARCHAR(24) NOT NULL,
  collected_by          VARCHAR(24),  -- staff member who processed payment

  -- Gateway info
  gateway               VARCHAR(20) NOT NULL
                        CHECK (gateway IN (
                          'stripe', 'paypal', 'jazzcash',
                          'easypaisa', 'cash', 'bank_transfer'
                        )),
  gateway_payment_id    TEXT,         -- Stripe PaymentIntent ID, PayPal order ID etc
  gateway_order_id      TEXT,         -- gateway's order reference
  gateway_response      JSONB,        -- full gateway response (for debugging)

  -- Amount
  amount                NUMERIC(12, 2) NOT NULL,
  currency              CHAR(3) NOT NULL DEFAULT 'USD',
  refunded_amount       NUMERIC(12, 2) NOT NULL DEFAULT 0,

  -- Status
  status                VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN (
                          'pending', 'processing', 'paid',
                          'failed', 'refunded', 'partially_refunded'
                        )),

  -- Failure tracking
  failure_code          VARCHAR(100),
  failure_message       TEXT,
  retry_count           INTEGER NOT NULL DEFAULT 0,
  next_retry_at         TIMESTAMPTZ,

  -- Idempotency — prevents duplicate payments
  idempotency_key       VARCHAR(100) UNIQUE,

  -- Manual payment proof (cash/bank transfer)
  reference_note        TEXT,
  proof_url             TEXT,

  -- Timestamps
  paid_at               TIMESTAMPTZ,
  failed_at             TIMESTAMPTZ,
  refunded_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Refunds Table ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refunds (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           VARCHAR(24) NOT NULL,
  payment_id          UUID NOT NULL REFERENCES payments(id),
  invoice_id          UUID NOT NULL REFERENCES invoices(id),
  processed_by        VARCHAR(24) NOT NULL,

  amount              NUMERIC(12, 2) NOT NULL,
  currency            CHAR(3) NOT NULL DEFAULT 'USD',
  reason              TEXT NOT NULL,

  gateway_refund_id   TEXT,
  status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'processed', 'failed')),

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Payment Webhook Events — idempotent processing ──────────
CREATE TABLE IF NOT EXISTS webhook_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       VARCHAR(24),
  gateway         VARCHAR(20) NOT NULL,
  event_id        VARCHAR(200) NOT NULL,  -- gateway's event ID
  event_type      VARCHAR(100) NOT NULL,
  payload         JSONB NOT NULL,
  processed       BOOLEAN NOT NULL DEFAULT FALSE,
  processed_at    TIMESTAMPTZ,
  error           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Immutable Financial Audit Log ───────────────────────────
CREATE TABLE IF NOT EXISTS financial_audit_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       VARCHAR(24) NOT NULL,
  user_id         VARCHAR(24) NOT NULL,
  action          VARCHAR(50) NOT NULL,
  entity_type     VARCHAR(50) NOT NULL,
  entity_id       UUID NOT NULL,
  old_values      JSONB,
  new_values      JSONB,
  ip_address      VARCHAR(45),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- NO updated_at — immutable
);

-- ─── Indexes ─────────────────────────────────────────────────
CREATE INDEX idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_payments_customer_id ON payments(customer_id);
CREATE INDEX idx_payments_status ON payments(tenant_id, status);
CREATE INDEX idx_payments_gateway ON payments(tenant_id, gateway);
CREATE INDEX idx_payments_gateway_id ON payments(gateway_payment_id);
CREATE UNIQUE INDEX idx_webhook_events_unique
  ON webhook_events(gateway, event_id);
CREATE INDEX idx_refunds_payment_id ON refunds(payment_id);
CREATE INDEX idx_financial_audit_tenant ON financial_audit_logs(tenant_id, created_at DESC);

-- ─── Prevent updates to financial_audit_logs ─────────────────
CREATE RULE no_update_financial_audit AS
  ON UPDATE TO financial_audit_logs DO INSTEAD NOTHING;

CREATE RULE no_delete_financial_audit AS
  ON DELETE TO financial_audit_logs DO INSTEAD NOTHING;

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_refunds_updated_at
  BEFORE UPDATE ON refunds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
