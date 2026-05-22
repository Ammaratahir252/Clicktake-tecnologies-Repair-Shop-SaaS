// ============================================================
// DibnowRepairSaaS — Billing & Payment Routes
// All routes protected: auth → tenant → role middleware
// ============================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware } from '../../../middleware/authMiddleware';
import { tenantMiddleware } from '../../../middleware/tenantMiddleware';
import { roleMiddleware } from '../../../middleware/roleMiddleware';
import {
  createEstimateHandler,
  approveEstimateHandler,
  getEstimateHandler,
  generateInvoiceHandler,
  getInvoiceHandler,
  listInvoicesHandler,
} from '../controller/billing.controller';
import {
  createPaymentHandler,
  verifyPaymentHandler,
  refundPaymentHandler,
  paymentHistoryHandler,
} from '../../payments/controller/payment.controller';
import { stripeWebhookHandler } from '../../payments/routes/webhook.handler';

export const billingRoutes = async (app: FastifyInstance): Promise<void> => {

  // Stripe Webhook — no auth (Stripe calls this directly)
  app.post('/webhooks/stripe', stripeWebhookHandler);

  // Apply auth + tenant to all routes below
  app.addHook('preHandler', authMiddleware);
  app.addHook('preHandler', tenantMiddleware);

  // ESTIMATES
  app.post('/estimates', {
    preHandler: [roleMiddleware('invoices', 'create')],
  }, (req: FastifyRequest, rep: FastifyReply) => createEstimateHandler(req, rep));

  app.get('/estimates/:id', {
    preHandler: [roleMiddleware('invoices', 'read')],
  }, (req: FastifyRequest, rep: FastifyReply) => getEstimateHandler(req as FastifyRequest<{ Params: { id: string } }>, rep));

  app.patch('/estimates/:id/approve', {
    preHandler: [roleMiddleware('invoices', 'approve')],
  }, (req: FastifyRequest, rep: FastifyReply) => approveEstimateHandler(req as FastifyRequest<{ Params: { id: string } }>, rep));

  // INVOICES
  app.post('/invoices', {
    preHandler: [roleMiddleware('invoices', 'create')],
  }, (req: FastifyRequest, rep: FastifyReply) => generateInvoiceHandler(req, rep));

  app.get('/invoices', {
    preHandler: [roleMiddleware('invoices', 'read')],
  }, (req: FastifyRequest, rep: FastifyReply) => listInvoicesHandler(req as FastifyRequest<{ Querystring: { page?: string; limit?: string; status?: string } }>, rep));

  app.get('/invoices/:id', {
    preHandler: [roleMiddleware('invoices', 'read')],
  }, (req: FastifyRequest, rep: FastifyReply) => getInvoiceHandler(req as FastifyRequest<{ Params: { id: string } }>, rep));

  app.get('/invoices/:invoiceId/payments', {
    preHandler: [roleMiddleware('payments', 'read')],
  }, (req: FastifyRequest, rep: FastifyReply) => paymentHistoryHandler(req as FastifyRequest<{ Params: { invoiceId: string } }>, rep));

  // PAYMENTS
  app.post('/payments', {
    preHandler: [roleMiddleware('payments', 'create')],
  }, (req: FastifyRequest, rep: FastifyReply) => createPaymentHandler(req, rep));

  app.get('/payments/:id/verify', {
    preHandler: [roleMiddleware('payments', 'read')],
  }, (req: FastifyRequest, rep: FastifyReply) => verifyPaymentHandler(req as FastifyRequest<{ Params: { id: string } }>, rep));

  app.post('/payments/:id/refund', {
    preHandler: [roleMiddleware('payments', 'approve')],
  }, (req: FastifyRequest, rep: FastifyReply) => refundPaymentHandler(req as FastifyRequest<{ Params: { id: string } }>, rep));
};
