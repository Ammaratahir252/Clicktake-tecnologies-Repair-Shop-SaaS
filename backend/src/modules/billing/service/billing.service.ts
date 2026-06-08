// ============================================================
// DibnowRepairSaaS — Billing Service
// Handles: estimates, invoices, line items, invoice numbering
// All financial data stored in PostgreSQL
// ============================================================

import { query, withTransaction } from '../../../config/postgres';
import { AuditAction } from '../../../types';
import { createAuditLog } from '../../../models/auditLog.model';
import { NotFoundError, BusinessRuleError, ConflictError } from '../../../errors';
import { paymentLogger } from '../../../utils/logger';

// ─── Types ───────────────────────────────────────────────────
interface LineItemInput {
  name: string;
  type: 'part' | 'labor' | 'service' | 'fee';
  quantity: number;
  unitPrice: number;
  partId?: string;
  description?: string;
}

interface CreateEstimateInput {
  tenantId: string;
  ticketId: string;
  customerId: string;
  createdBy: string;
  lineItems: LineItemInput[];
  taxRate: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  notes?: string;
  validUntil?: string;
  currency?: string;
}

interface ApproveEstimateInput {
  estimateId: string;
  tenantId: string;
  action: 'approve' | 'reject';
  customerSignature?: string;
  rejectionReason?: string;
  userId: string;
  ipAddress: string;
}

// ─── Calculate amounts ────────────────────────────────────────
const calculateAmounts = (
  lineItems: LineItemInput[],
  taxRate: number,
  discountType?: string,
  discountValue?: number
) => {
  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice, 0
  );

  let discountAmount = 0;
  if (discountType === 'percentage' && discountValue) {
    discountAmount = (subtotal * discountValue) / 100;
  } else if (discountType === 'fixed' && discountValue) {
    discountAmount = Math.min(discountValue, subtotal);
  }

  const taxableAmount = subtotal - discountAmount;
  const taxAmount = (taxableAmount * taxRate) / 100;
  const totalAmount = taxableAmount + taxAmount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discountAmount: Math.round(discountAmount * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
  };
};

// ─── Generate next invoice number ────────────────────────────
const generateInvoiceNumber = async (
  tenantId: string,
  prefix = 'INV'
): Promise<string> => {
  // Atomic increment using PostgreSQL — prevents duplicate numbers
  const rows = await query<{ last_sequence: number }>(`
    INSERT INTO invoice_sequences (tenant_id, last_sequence)
    VALUES ($1, 1)
    ON CONFLICT (tenant_id)
    DO UPDATE SET
      last_sequence = invoice_sequences.last_sequence + 1,
      updated_at = NOW()
    RETURNING last_sequence
  `, [tenantId]);

  const sequence = rows[0].last_sequence;
  const year = new Date().getFullYear();
  const paddedSequence = String(sequence).padStart(5, '0');

  return `${prefix}-${year}-${paddedSequence}`;
};

// ============================================================
// ESTIMATE SERVICE
// ============================================================

export const createEstimate = async (input: CreateEstimateInput) => {
  const amounts = calculateAmounts(
    input.lineItems,
    input.taxRate,
    input.discountType,
    input.discountValue
  );

  return await withTransaction(async (client) => {
    // Insert estimate
    const estimateResult = await client.query(`
      INSERT INTO estimates (
        tenant_id, ticket_id, customer_id, created_by,
        subtotal, tax_rate, tax_amount,
        discount_type, discount_value, discount_amount,
        total_amount, currency, status, notes, valid_until
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'draft',$13,$14)
      RETURNING *
    `, [
      input.tenantId, input.ticketId, input.customerId, input.createdBy,
      amounts.subtotal, input.taxRate, amounts.taxAmount,
      input.discountType || null, input.discountValue || 0, amounts.discountAmount,
      amounts.totalAmount, input.currency || 'USD',
      input.notes || null,
      input.validUntil || null,
    ]);

    const estimate = estimateResult.rows[0];

    // Insert line items
    for (const item of input.lineItems) {
      await client.query(`
        INSERT INTO estimate_items (
          estimate_id, tenant_id, name, description,
          type, quantity, unit_price, total_price, part_id
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `, [
        estimate.id, input.tenantId, item.name,
        item.description || null, item.type,
        item.quantity, item.unitPrice,
        item.quantity * item.unitPrice,
        item.partId || null,
      ]);
    }

    // Update status to sent
    await client.query(
      `UPDATE estimates SET status = 'sent', updated_at = NOW() WHERE id = $1`,
      [estimate.id]
    );

    await createAuditLog({
      tenantId: input.tenantId,
      userId: input.createdBy,
      action: AuditAction.CREATE,
      entityType: 'estimate',
      entityId: estimate.id,
      newValues: { totalAmount: amounts.totalAmount },
      ipAddress: 'system',
    });

    return { ...estimate, status: 'sent', lineItems: input.lineItems };
  });
};

export const approveEstimate = async (input: ApproveEstimateInput) => {
  const estimates = await query<{
    id: string; tenant_id: string; status: string; total_amount: number;
  }>(
    'SELECT * FROM estimates WHERE id = $1 AND tenant_id = $2',
    [input.estimateId, input.tenantId]
  );

  if (!estimates.length) throw new NotFoundError('Estimate');

  const estimate = estimates[0];

  if (estimate.status === 'approved') {
    throw new ConflictError('Estimate has already been approved');
  }

  if (estimate.status === 'rejected') {
    throw new BusinessRuleError('Cannot approve a rejected estimate');
  }

  if (input.action === 'approve') {
    await query(`
      UPDATE estimates SET
        status = 'approved',
        customer_signature = $1,
        approved_at = NOW(),
        updated_at = NOW()
      WHERE id = $2
    `, [input.customerSignature || null, input.estimateId]);

    await createAuditLog({
      tenantId: input.tenantId,
      userId: input.userId,
      action: AuditAction.ESTIMATE_APPROVED,
      entityType: 'estimate',
      entityId: input.estimateId,
      ipAddress: input.ipAddress,
    });
  } else {
    await query(`
      UPDATE estimates SET
        status = 'rejected',
        rejection_reason = $1,
        rejected_at = NOW(),
        updated_at = NOW()
      WHERE id = $2
    `, [input.rejectionReason || null, input.estimateId]);

    await createAuditLog({
      tenantId: input.tenantId,
      userId: input.userId,
      action: AuditAction.ESTIMATE_REJECTED,
      entityType: 'estimate',
      entityId: input.estimateId,
      ipAddress: input.ipAddress,
    });
  }

  return { estimateId: input.estimateId, action: input.action };
};

export const getEstimate = async (estimateId: string, tenantId: string) => {
  const estimates = await query(
    'SELECT * FROM estimates WHERE id = $1 AND tenant_id = $2',
    [estimateId, tenantId]
  );
  if (!estimates.length) throw new NotFoundError('Estimate');

  const items = await query(
    'SELECT * FROM estimate_items WHERE estimate_id = $1',
    [estimateId]
  );

  const est = estimates[0] as Record<string, unknown>; return { ...est, lineItems: items };
};

// ============================================================
// INVOICE SERVICE
// ============================================================

export const generateInvoice = async (
  estimateId: string,
  tenantId: string,
  createdBy: string,
  notes?: string,
  invoicePrefix = 'INV'
) => {
  // Validate estimate is approved
  const estimates = await query<{
    id: string; tenant_id: string; status: string;
    ticket_id: string; customer_id: string;
    subtotal: number; tax_rate: number; tax_amount: number;
    discount_amount: number; total_amount: number; currency: string;
  }>(
    'SELECT * FROM estimates WHERE id = $1 AND tenant_id = $2',
    [estimateId, tenantId]
  );

  if (!estimates.length) throw new NotFoundError('Estimate');

  const estimate = estimates[0];

  if (estimate.status !== 'approved') {
    throw new BusinessRuleError(
      'Invoice can only be generated from an approved estimate'
    );
  }

  // Check no invoice already exists for this estimate
  const existing = await query(
    'SELECT id FROM invoices WHERE estimate_id = $1 AND tenant_id = $2',
    [estimateId, tenantId]
  );

  if (existing.length) {
    throw new ConflictError('Invoice already exists for this estimate');
  }

  return await withTransaction(async (client) => {
    const invoiceNumber = await generateInvoiceNumber(tenantId, invoicePrefix);

    const invoiceResult = await client.query(`
      INSERT INTO invoices (
        tenant_id, estimate_id, ticket_id, customer_id, created_by,
        invoice_number, subtotal, tax_rate, tax_amount,
        discount_amount, total_amount, amount_paid, amount_due,
        currency, status, notes,
        due_date
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,0,$11,$12,'pending',$13,$14)
      RETURNING *
    `, [
      tenantId, estimateId, estimate.ticket_id, estimate.customer_id, createdBy,
      invoiceNumber, estimate.subtotal, estimate.tax_rate, estimate.tax_amount,
      estimate.discount_amount, estimate.total_amount,
      estimate.currency, notes || null,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days due date
    ]);

    const invoice = invoiceResult.rows[0];

    // Copy line items from estimate to invoice
    const estimateItems = await client.query(
      'SELECT * FROM estimate_items WHERE estimate_id = $1',
      [estimateId]
    );

    for (const item of estimateItems.rows) {
      await client.query(`
        INSERT INTO invoice_items (
          invoice_id, tenant_id, name, description,
          type, quantity, unit_price, total_price, part_id
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `, [
        invoice.id, tenantId, item.name, item.description,
        item.type, item.quantity, item.unit_price, item.total_price, item.part_id,
      ]);
    }

    await createAuditLog({
      tenantId,
      userId: createdBy,
      action: AuditAction.INVOICE_GENERATED,
      entityType: 'invoice',
      entityId: invoice.id,
      newValues: { invoiceNumber, totalAmount: estimate.total_amount },
      ipAddress: 'system',
    });

    paymentLogger.created(invoice.id, tenantId, 'invoice', estimate.total_amount);

    return { ...invoice, lineItems: estimateItems.rows };
  });
};

export const getInvoice = async (invoiceId: string, tenantId: string) => {
  const invoices = await query(
    'SELECT * FROM invoices WHERE id = $1 AND tenant_id = $2',
    [invoiceId, tenantId]
  );
  if (!invoices.length) throw new NotFoundError('Invoice');

  const items = await query(
    'SELECT * FROM invoice_items WHERE invoice_id = $1',
    [invoiceId]
  );

  const payments = await query(
    `SELECT id, gateway, amount, status, paid_at, reference_note
     FROM payments WHERE invoice_id = $1 ORDER BY created_at ASC`,
    [invoiceId]
  );

  const inv = invoices[0] as Record<string, unknown>; return { ...inv, lineItems: items, payments };
};

export const getInvoicesByTenant = async (
  tenantId: string,
  page = 1,
  limit = 20,
  status?: string
) => {
  const offset = (page - 1) * limit;
  const conditions = ['tenant_id = $1'];
  const params: unknown[] = [tenantId];

  if (status) {
    conditions.push(`status = $${params.length + 1}`);
    params.push(status);
  }

  const where = conditions.join(' AND ');

  const [invoices, countResult] = await Promise.all([
    query(
      `SELECT * FROM invoices WHERE ${where}
       ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    query<{ count: string }>(
      `SELECT COUNT(*) as count FROM invoices WHERE ${where}`,
      params
    ),
  ]);

  return {
    invoices,
    total: parseInt(countResult[0].count),
    page,
    limit,
    totalPages: Math.ceil(parseInt(countResult[0].count) / limit),
  };
};
