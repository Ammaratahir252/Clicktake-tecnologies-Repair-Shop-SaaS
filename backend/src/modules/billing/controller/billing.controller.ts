// ============================================================
// DibnowRepairSaaS — Billing Controller
// Thin layer: validate → call service → return response
// ============================================================

import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  createEstimate,
  approveEstimate,
  getEstimate,
  generateInvoice,
  getInvoice,
  getInvoicesByTenant,
} from '../service/billing.service';
import {
  createEstimateSchema,
  approveEstimateSchema,
  createInvoiceSchema,
  paginationSchema,
  formatZodErrors,
} from '../../../utils/validation/schemas';
import { ValidationError } from '../../../errors';

// ─── Create Estimate ─────────────────────────────────────────
export const createEstimateHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const parsed = createEstimateSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new ValidationError('Validation failed', formatZodErrors(parsed.error));
  }

  const estimate = await createEstimate({
    ...parsed.data,
    tenantId: request.tenantId,
    createdBy: request.user.userId,
  });

  return reply.status(201).send({
    success: true,
    message: 'Estimate created and sent to customer',
    data: estimate,
  });
};

// ─── Approve / Reject Estimate ────────────────────────────────
export const approveEstimateHandler = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  const parsed = approveEstimateSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new ValidationError('Validation failed', formatZodErrors(parsed.error));
  }

  const result = await approveEstimate({
    estimateId: request.params.id,
    tenantId: request.tenantId,
    action: parsed.data.action,
    customerSignature: parsed.data.customerSignature,
    rejectionReason: parsed.data.rejectionReason,
    userId: request.user.userId,
    ipAddress: request.ipAddress,
  });

  return reply.send({
    success: true,
    message: `Estimate ${parsed.data.action}d successfully`,
    data: result,
  });
};

// ─── Get Estimate ────────────────────────────────────────────
export const getEstimateHandler = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  const estimate = await getEstimate(request.params.id, request.tenantId);
  return reply.send({ success: true, message: 'Success', data: estimate });
};

// ─── Generate Invoice from Estimate ──────────────────────────
export const generateInvoiceHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const parsed = createInvoiceSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new ValidationError('Validation failed', formatZodErrors(parsed.error));
  }

  const invoice = await generateInvoice(
    parsed.data.estimateId,
    request.tenantId,
    request.user.userId,
    parsed.data.notes
  );

  return reply.status(201).send({
    success: true,
    message: 'Invoice generated successfully',
    data: invoice,
  });
};

// ─── Get Invoice ─────────────────────────────────────────────
export const getInvoiceHandler = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  const invoice = await getInvoice(request.params.id, request.tenantId);
  return reply.send({ success: true, message: 'Success', data: invoice });
};

// ─── List Invoices ────────────────────────────────────────────
export const listInvoicesHandler = async (
  request: FastifyRequest<{ Querystring: { page?: string; limit?: string; status?: string } }>,
  reply: FastifyReply
) => {
  const { page, limit } = paginationSchema.parse(request.query);
  const status = request.query.status;

  const result = await getInvoicesByTenant(request.tenantId, page, limit, status);

  return reply.send({
    success: true,
    message: 'Success',
    data: result.invoices,
    meta: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    },
  });
};
