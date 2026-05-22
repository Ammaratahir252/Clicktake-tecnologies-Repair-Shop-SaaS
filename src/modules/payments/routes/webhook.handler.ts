// ============================================================
// DibnowRepairSaaS — Stripe Webhook Handler
// Idempotent: each event processed exactly once
// Signature verified before any processing
// ============================================================

import { FastifyRequest, FastifyReply } from 'fastify';
import { stripeGateway } from '../gateways/stripe.gateway';
import { query, withTransaction } from '../../../config/postgres';
import { paymentLogger, logger } from '../../../utils/logger';
import { createAuditLog } from '../../../models/auditLog.model';
import { AuditAction } from '../../../types';

export const stripeWebhookHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const signature = request.headers['stripe-signature'] as string;

  if (!signature) {
    paymentLogger.webhookVerificationFailed('stripe', request.ip);
    return reply.status(400).send({ success: false, message: 'Missing stripe signature' });
  }

  // ── 1. Verify webhook signature ───────────────────────────
  let event;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawBody = (request as any).rawBody as Buffer | undefined;
    if (!rawBody) {
      return reply.status(400).send({ success: false, message: 'Raw body required' });
    }
    event = stripeGateway.verifyWebhook(rawBody, signature);
  } catch {
    paymentLogger.webhookVerificationFailed('stripe', request.ip);
    return reply.status(400).send({ success: false, message: 'Invalid webhook signature' });
  }

  paymentLogger.webhookReceived('stripe', event.type);

  // ── 2. Idempotency — skip already processed events ────────
  const existing = await query(
    'SELECT id, processed FROM webhook_events WHERE gateway = $1 AND event_id = $2',
    ['stripe', event.id]
  );

  if (existing.length && (existing[0] as Record<string, unknown>).processed) {
    logger.info('Stripe webhook already processed', { eventId: event.id });
    return reply.send({ success: true, message: 'Already processed' });
  }

  // ── 3. Record webhook event ───────────────────────────────
  if (!existing.length) {
    await query(`
      INSERT INTO webhook_events (gateway, event_id, event_type, payload)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (gateway, event_id) DO NOTHING
    `, ['stripe', event.id, event.type, JSON.stringify(event)]);
  }

  // ── 4. Process event by type ──────────────────────────────
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as unknown as Record<string, unknown>);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as unknown as Record<string, unknown>);
        break;

      case 'charge.refunded':
        await handleRefunded(event.data.object as unknown as Record<string, unknown>);
        break;

      default:
        logger.info('Unhandled Stripe event type', { type: event.type });
    }

    // Mark as processed
    await query(`
      UPDATE webhook_events SET processed = TRUE, processed_at = NOW()
      WHERE gateway = $1 AND event_id = $2
    `, ['stripe', event.id]);

  } catch (error) {
    const err = error as Error;
    await query(`
      UPDATE webhook_events SET error = $1
      WHERE gateway = $1 AND event_id = $2
    `, [err.message, event.id]);

    logger.error('Stripe webhook processing failed', { eventId: event.id, error: err.message });
    return reply.status(500).send({ success: false, message: 'Webhook processing failed' });
  }

  return reply.send({ success: true, message: 'Webhook processed' });
};

const handlePaymentSucceeded = async (paymentIntent: Record<string, unknown>) => {
  const gatewayPaymentId = paymentIntent.id as string;
  const metadata = paymentIntent.metadata as Record<string, string>;
  const tenantId = metadata?.tenantId;
  const invoiceId = metadata?.invoiceId;

  if (!tenantId || !invoiceId) return;

  await withTransaction(async (client) => {
    // Update payment status
    await client.query(`
      UPDATE payments SET
        status = 'paid',
        paid_at = NOW(),
        updated_at = NOW()
      WHERE gateway_payment_id = $1 AND tenant_id = $2 AND status != 'paid'
    `, [gatewayPaymentId, tenantId]);

    // Get payment amount
    const payments = await client.query(
      'SELECT amount FROM payments WHERE gateway_payment_id = $1',
      [gatewayPaymentId]
    );

    if (payments.rows.length) {
      const amount = payments.rows[0].amount;
      await client.query(`
        UPDATE invoices SET
          amount_paid = amount_paid + $1,
          amount_due = GREATEST(0, amount_due - $1),
          status = CASE
            WHEN (amount_paid + $1) >= total_amount THEN 'paid'
            ELSE 'partial'
          END,
          updated_at = NOW()
        WHERE id = $2 AND tenant_id = $3
      `, [amount, invoiceId, tenantId]);
    }
  });

  paymentLogger.success(gatewayPaymentId, tenantId, 'stripe', 0);
};

const handlePaymentFailed = async (paymentIntent: Record<string, unknown>) => {
  const gatewayPaymentId = paymentIntent.id as string;
  const metadata = paymentIntent.metadata as Record<string, string>;
  const tenantId = metadata?.tenantId;
  const lastError = paymentIntent.last_payment_error as Record<string, string> | null;

  if (!tenantId) return;

  await query(`
    UPDATE payments SET
      status = 'failed',
      failure_code = $1,
      failure_message = $2,
      failed_at = NOW(),
      updated_at = NOW()
    WHERE gateway_payment_id = $3 AND tenant_id = $4
  `, [
    lastError?.code || 'unknown',
    lastError?.message || 'Payment failed',
    gatewayPaymentId,
    tenantId,
  ]);

  paymentLogger.failed(gatewayPaymentId, tenantId, 'stripe', lastError?.code || 'unknown');
};

const handleRefunded = async (charge: Record<string, unknown>) => {
  const paymentIntentId = charge.payment_intent as string;
  const amountRefunded = (charge.amount_refunded as number) / 100;

  if (!paymentIntentId) return;

  await query(`
    UPDATE payments SET
      refunded_amount = $1,
      status = CASE WHEN $1 >= amount THEN 'refunded' ELSE 'partially_refunded' END,
      refunded_at = NOW(),
      updated_at = NOW()
    WHERE gateway_payment_id = $2
  `, [amountRefunded, paymentIntentId]);
};
