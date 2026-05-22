// ============================================================
// DibnowRepairSaaS — Payment Service
// Handles: payment creation, verification, refunds, retries
// Idempotency keys prevent duplicate charges
// ============================================================

import { query, withTransaction } from '../../../config/postgres';
import { redis, RedisKeys, RedisTTL } from '../../../config/redis';
import { PaymentGateway, AuditAction } from '../../../types';
import { getGateway } from '../gateways';
import { createAuditLog } from '../../../models/auditLog.model';
import {
  NotFoundError,
  BusinessRuleError,
  PaymentError,
  ConflictError,
} from '../../../errors';
import { paymentLogger } from '../../../utils/logger';


interface CreatePaymentInput {
  tenantId: string;
  invoiceId: string;
  customerId: string;
  collectedBy: string;
  gateway: PaymentGateway;
  amount: number;
  currency: string;
  referenceNote?: string;
  customerEmail?: string;
  ipAddress: string;
}

interface RefundInput {
  tenantId: string;
  paymentId: string;
  amount?: number;
  reason: string;
  processedBy: string;
  ipAddress: string;
}

// ─── Create Payment ───────────────────────────────────────────
export const createPayment = async (input: CreatePaymentInput) => {
  // 1. Load and validate invoice
  const invoices = await query<{
    id: string; tenant_id: string; status: string;
    total_amount: number; amount_due: number; currency: string;
    customer_id: string; ticket_id: string;
  }>(
    'SELECT * FROM invoices WHERE id = $1 AND tenant_id = $2',
    [input.invoiceId, input.tenantId]
  );

  if (!invoices.length) throw new NotFoundError('Invoice');
  const invoice = invoices[0];

  if (invoice.status === 'paid') {
    throw new ConflictError('Invoice is already fully paid');
  }

  if (invoice.status === 'void') {
    throw new BusinessRuleError('Cannot process payment for a voided invoice');
  }

  // 2. Validate payment amount
  if (input.amount <= 0) {
    throw new BusinessRuleError('Payment amount must be greater than 0');
  }

  if (input.amount > invoice.amount_due) {
    throw new BusinessRuleError(
      `Payment amount ($${input.amount}) exceeds amount due ($${invoice.amount_due})`
    );
  }

  // 3. Idempotency check — prevent duplicate payments
  const idempotencyKey = `${input.tenantId}:${input.invoiceId}:${input.gateway}:${Math.round(input.amount * 100)}`;
  const idempotencyRedisKey = RedisKeys.paymentIdempotency(input.tenantId, idempotencyKey);

  const existingPaymentId = await redis.get(idempotencyRedisKey) as string | null;
  if (existingPaymentId) {
    const existing = await query(
      'SELECT * FROM payments WHERE id = $1',
      [existingPaymentId]
    );
    if (existing.length && (existing[0] as Record<string, string>).status === "paid") {
      throw new ConflictError('Duplicate payment detected — this payment was already processed');
    }
  }

  // 4. Process through gateway
  const gateway = getGateway(input.gateway);

  const gatewayResult = await gateway.createPayment({
    amount: input.amount,
    currency: input.currency || invoice.currency,
    invoiceId: input.invoiceId,
    tenantId: input.tenantId,
    customerId: input.customerId,
    description: `Invoice payment - ${input.invoiceId}`,
    idempotencyKey,
    customerEmail: input.customerEmail,
  });

  // 5. Save payment record
  return await withTransaction(async (client) => {
    const paymentResult = await client.query(`
      INSERT INTO payments (
        tenant_id, invoice_id, customer_id, collected_by,
        gateway, gateway_payment_id, gateway_response,
        amount, currency, status,
        idempotency_key, reference_note,
        paid_at, failed_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING *
    `, [
      input.tenantId, input.invoiceId, input.customerId, input.collectedBy,
      input.gateway, gatewayResult.gatewayPaymentId,
      JSON.stringify(gatewayResult.rawResponse),
      input.amount, input.currency || invoice.currency,
      gatewayResult.status,
      idempotencyKey,
      input.referenceNote || null,
      gatewayResult.status === 'paid' ? new Date() : null,
      gatewayResult.status === 'failed' ? new Date() : null,
    ]);

    const payment = paymentResult.rows[0];

    // 6. Update invoice amounts if payment succeeded
    if (gatewayResult.status === 'paid') {
      await updateInvoiceAfterPayment(client, input.invoiceId, input.tenantId, input.amount);
    }

    // 7. Store idempotency key in Redis
    await redis.setex(idempotencyRedisKey, RedisTTL.PAYMENT_IDEMPOTENCY, payment.id);

    // 8. Audit log
    await createAuditLog({
      tenantId: input.tenantId,
      userId: input.collectedBy,
      action: AuditAction.PAYMENT_CREATED,
      entityType: 'payment',
      entityId: payment.id,
      newValues: {
        amount: input.amount,
        gateway: input.gateway,
        status: gatewayResult.status,
      },
      ipAddress: input.ipAddress,
    });

    paymentLogger.success(payment.id, input.tenantId, input.gateway, input.amount);

    return {
      payment,
      clientSecret: gatewayResult.clientSecret,
      redirectUrl: gatewayResult.redirectUrl,
    };
  });
};

// ─── Update invoice after payment ────────────────────────────
const updateInvoiceAfterPayment = async (
  client: import('pg').PoolClient,
  invoiceId: string,
  tenantId: string,
  paidAmount: number
) => {
  const result = await client.query(`
    UPDATE invoices SET
      amount_paid = amount_paid + $1,
      amount_due = GREATEST(0, amount_due - $1),
      status = CASE
        WHEN (amount_paid + $1) >= total_amount THEN 'paid'
        WHEN (amount_paid + $1) > 0 THEN 'partial'
        ELSE status
      END,
      paid_at = CASE
        WHEN (amount_paid + $1) >= total_amount THEN NOW()
        ELSE paid_at
      END,
      updated_at = NOW()
    WHERE id = $2 AND tenant_id = $3
    RETURNING *
  `, [paidAmount, invoiceId, tenantId]);

  return result.rows[0];
};

// ─── Verify Payment ───────────────────────────────────────────
export const verifyPayment = async (
  paymentId: string,
  tenantId: string,
  userId: string,
  ipAddress: string
) => {
  const payments = await query<{
    id: string; tenant_id: string; gateway: string;
    gateway_payment_id: string; status: string; amount: number;
    invoice_id: string;
  }>(
    'SELECT * FROM payments WHERE id = $1 AND tenant_id = $2',
    [paymentId, tenantId]
  );

  if (!payments.length) throw new NotFoundError('Payment');
  const payment = payments[0];

  if (payment.status === 'paid') {
    return { payment, alreadyVerified: true };
  }

  const gateway = getGateway(payment.gateway as PaymentGateway);
  const result = await gateway.verifyPayment(payment.gateway_payment_id);

  if (result.status !== payment.status) {
    await withTransaction(async (client) => {
      await client.query(`
        UPDATE payments SET
          status = $1,
          paid_at = $2,
          updated_at = NOW()
        WHERE id = $3
      `, [
        result.status,
        result.status === 'paid' ? new Date() : null,
        paymentId,
      ]);

      if (result.status === 'paid') {
        await updateInvoiceAfterPayment(client, payment.invoice_id, tenantId, payment.amount);
      }
    });

    await createAuditLog({
      tenantId, userId,
      action: AuditAction.PAYMENT_CREATED,
      entityType: 'payment',
      entityId: paymentId,
      oldValues: { status: payment.status },
      newValues: { status: result.status },
      ipAddress,
    });
  }

  return { payment: { ...payment, status: result.status }, alreadyVerified: false };
};

// ─── Process Refund ───────────────────────────────────────────
export const processRefund = async (input: RefundInput) => {
  const payments = await query<{
    id: string; tenant_id: string; gateway: string;
    gateway_payment_id: string; status: string;
    amount: number; refunded_amount: number; invoice_id: string;
  }>(
    'SELECT * FROM payments WHERE id = $1 AND tenant_id = $2',
    [input.paymentId, input.tenantId]
  );

  if (!payments.length) throw new NotFoundError('Payment');
  const payment = payments[0];

  if (payment.status !== 'paid') {
    throw new BusinessRuleError('Only paid payments can be refunded');
  }

  const refundAmount = input.amount || payment.amount;
  const maxRefundable = payment.amount - payment.refunded_amount;

  if (refundAmount > maxRefundable) {
    throw new BusinessRuleError(
      `Refund amount ($${refundAmount}) exceeds refundable amount ($${maxRefundable})`
    );
  }

  const gateway = getGateway(payment.gateway as PaymentGateway);
  const result = await gateway.refundPayment(
    payment.gateway_payment_id,
    refundAmount,
    input.reason
  );

  return await withTransaction(async (client) => {
    // Record refund
    const refundResult = await client.query(`
      INSERT INTO refunds (
        tenant_id, payment_id, invoice_id, processed_by,
        amount, currency, reason, gateway_refund_id, status
      )
      SELECT $1, $2, invoice_id, $3, $4, currency, $5, $6, $7
      FROM payments WHERE id = $2
      RETURNING *
    `, [
      input.tenantId, input.paymentId, input.processedBy,
      refundAmount, input.reason,
      result.gatewayRefundId, result.status,
    ]);

    // Update payment
    const newRefundedAmount = payment.refunded_amount + refundAmount;
    const newStatus = newRefundedAmount >= payment.amount
      ? 'refunded'
      : 'partially_refunded';

    await client.query(`
      UPDATE payments SET
        refunded_amount = $1,
        status = $2,
        refunded_at = NOW(),
        updated_at = NOW()
      WHERE id = $3
    `, [newRefundedAmount, newStatus, input.paymentId]);

    // Update invoice
    await client.query(`
      UPDATE invoices SET
        amount_paid = amount_paid - $1,
        amount_due = amount_due + $1,
        status = CASE
          WHEN amount_paid - $1 <= 0 THEN 'refunded'
          ELSE 'partial'
        END,
        updated_at = NOW()
      WHERE id = $2
    `, [refundAmount, payment.invoice_id]);

    await createAuditLog({
      tenantId: input.tenantId,
      userId: input.processedBy,
      action: AuditAction.PAYMENT_REFUNDED,
      entityType: 'refund',
      entityId: refundResult.rows[0].id,
      newValues: { amount: refundAmount, reason: input.reason },
      ipAddress: input.ipAddress,
    });

    paymentLogger.refunded(input.paymentId, input.tenantId, refundAmount);

    return refundResult.rows[0];
  });
};

// ─── Get payment history for invoice ─────────────────────────
export const getPaymentHistory = async (invoiceId: string, tenantId: string) => {
  const payments = await query(`
    SELECT p.*, r.amount as refund_amount, r.reason as refund_reason
    FROM payments p
    LEFT JOIN refunds r ON r.payment_id = p.id
    WHERE p.invoice_id = $1 AND p.tenant_id = $2
    ORDER BY p.created_at ASC
  `, [invoiceId, tenantId]);

  return payments;
};
