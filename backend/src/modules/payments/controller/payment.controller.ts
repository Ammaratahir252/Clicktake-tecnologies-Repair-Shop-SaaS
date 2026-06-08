// ============================================================
// DibnowRepairSaaS — Payment Controller
// ============================================================

import { FastifyRequest, FastifyReply } from 'fastify';
import {
  createPayment,
  verifyPayment,
  processRefund,
  getPaymentHistory,
} from '../service/payment.service';
import {
  createPaymentSchema,
  refundPaymentSchema,
  formatZodErrors,
} from '../../../utils/validation/schemas';
import { ValidationError } from '../../../errors';
import { PaymentGateway } from '../../../types';

// ─── Create Payment ───────────────────────────────────────────
export const createPaymentHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const parsed = createPaymentSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new ValidationError('Validation failed', formatZodErrors(parsed.error));
  }

  const result = await createPayment({
    tenantId: request.tenantId,
    invoiceId: parsed.data.invoiceId,
    customerId: request.user.userId,
    collectedBy: request.user.userId,
    gateway: parsed.data.gateway as PaymentGateway,
    amount: parsed.data.amount,
    currency: parsed.data.currency,
    referenceNote: parsed.data.referenceNote,
    ipAddress: request.ipAddress,
  });

  return reply.status(201).send({
    success: true,
    message: 'Payment initiated successfully',
    data: result,
  });
};

// ─── Verify Payment ───────────────────────────────────────────
export const verifyPaymentHandler = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  const result = await verifyPayment(
    request.params.id,
    request.tenantId,
    request.user.userId,
    request.ipAddress
  );

  return reply.send({
    success: true,
    message: 'Payment verified',
    data: result,
  });
};

// ─── Refund Payment ───────────────────────────────────────────
export const refundPaymentHandler = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  const parsed = refundPaymentSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new ValidationError('Validation failed', formatZodErrors(parsed.error));
  }

  const refund = await processRefund({
    tenantId: request.tenantId,
    paymentId: request.params.id,
    amount: parsed.data.amount,
    reason: parsed.data.reason,
    processedBy: request.user.userId,
    ipAddress: request.ipAddress,
  });

  return reply.send({
    success: true,
    message: 'Refund processed successfully',
    data: refund,
  });
};

// ─── Payment History ──────────────────────────────────────────
export const paymentHistoryHandler = async (
  request: FastifyRequest<{ Params: { invoiceId: string } }>,
  reply: FastifyReply
) => {
  const history = await getPaymentHistory(
    request.params.invoiceId,
    request.tenantId
  );

  return reply.send({
    success: true,
    message: 'Success',
    data: history,
  });
};
