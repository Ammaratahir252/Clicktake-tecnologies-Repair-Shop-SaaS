// Mock env
jest.mock('../../../config/env', () => ({
  env: {
    ENCRYPTION_KEY: '12345678901234567890123456789012',
    APP_URL: 'http://localhost:4001',
  },
}));

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
  paymentLogger: { success: jest.fn(), failed: jest.fn(), refunded: jest.fn() },
}));

// Mock Stripe webhook handler entirely (heavy DB/gateway deps)
jest.mock('../../payments/routes/webhook.handler', () => ({
  stripeWebhookHandler: jest.fn(async (_req, rep) =>
    rep.send({ success: true, message: 'Webhook processed' })
  ),
}));

// Mock billing service
jest.mock('../service/billing.service', () => ({
  createEstimate:      jest.fn(),
  approveEstimate:     jest.fn(),
  getEstimate:         jest.fn(),
  generateInvoice:     jest.fn(),
  getInvoice:          jest.fn(),
  getInvoicesByTenant: jest.fn(),
}));

// Mock payment service
jest.mock('../../payments/service/payment.service', () => ({
  createPayment:     jest.fn(),
  verifyPayment:     jest.fn(),
  processRefund:     jest.fn(),
  getPaymentHistory: jest.fn(),
}));

import Fastify, { FastifyInstance } from 'fastify';
import { billingRoutes } from '../routes/billing.routes';
import { registerErrorHandler } from '../../../middleware/errorHandler';
import { UserRole, PaymentGateway } from '../../../types';
import * as billingService from '../service/billing.service';
import * as paymentService from '../../payments/service/payment.service';

// ─── Helpers ────────────────────────────────────────────────
const makeToken = (payload: object) =>
  Buffer.from(JSON.stringify(payload)).toString('base64');

const authHeaders = (role: UserRole, extra: Record<string, string> = {}) => ({
  authorization: `Bearer ${makeToken({ userId: 'u1', role, email: 'a@b.com' })}`,
  'x-tenant-id': 'tenant-001',
  ...extra,
});

const UUID = '550e8400-e29b-41d4-a716-446655440000';
const MONGO_ID = '507f1f77bcf86cd799439011';

let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify({ logger: false });
  await app.register(billingRoutes, { prefix: '/api/billing' });
  registerErrorHandler(app);
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

afterEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────
// WEBHOOK — public route
// ─────────────────────────────────────────────────────────────
describe('POST /api/billing/webhooks/stripe', () => {
  it('does not require authentication', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/billing/webhooks/stripe',
      payload: {},
    });
    expect(res.statusCode).not.toBe(401);
    expect(res.statusCode).not.toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────
// AUTH / TENANT GUARDS
// ─────────────────────────────────────────────────────────────
describe('auth + tenant guards', () => {
  it('returns 401 when Authorization header missing', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/billing/invoices' });
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 when X-Tenant-ID header missing', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/billing/invoices',
      headers: { authorization: `Bearer ${makeToken({ userId: 'u1', role: UserRole.OWNER, email: 'a@b.com' })}` },
    });
    expect(res.statusCode).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────
// ESTIMATES
// ─────────────────────────────────────────────────────────────
describe('POST /api/billing/estimates', () => {
  const validBody = {
    ticketId: MONGO_ID,
    customerId: MONGO_ID,
    lineItems: [{ name: 'Screen', type: 'part', quantity: 1, unitPrice: 50 }],
    taxRate: 10,
  };

  it('returns 403 for CUSTOMER role (cannot create estimates)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/billing/estimates',
      headers: authHeaders(UserRole.CUSTOMER),
      payload: validBody,
    });
    expect(res.statusCode).toBe(403);
  });

  it('returns 400 on invalid body (empty lineItems)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/billing/estimates',
      headers: authHeaders(UserRole.FRONTDESK),
      payload: { ...validBody, lineItems: [] },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 201 on valid body for FRONTDESK', async () => {
    (billingService.createEstimate as jest.Mock).mockResolvedValue({ id: 'est1', status: 'sent' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/billing/estimates',
      headers: authHeaders(UserRole.FRONTDESK),
      payload: validBody,
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().data.id).toBe('est1');
    expect(billingService.createEstimate).toHaveBeenCalledTimes(1);
  });
});

describe('GET /api/billing/estimates/:id', () => {
  it('returns 200 for CUSTOMER role (read allowed)', async () => {
    (billingService.getEstimate as jest.Mock).mockResolvedValue({ id: 'est1', status: 'sent' });

    const res = await app.inject({
      method: 'GET',
      url: `/api/billing/estimates/${UUID}`,
      headers: authHeaders(UserRole.CUSTOMER),
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data.id).toBe('est1');
  });
});

describe('PATCH /api/billing/estimates/:id/approve', () => {
  it('returns 400 for invalid action', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/billing/estimates/${UUID}/approve`,
      headers: authHeaders(UserRole.CUSTOMER),
      payload: { action: 'pending' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 200 for valid approve action by CUSTOMER', async () => {
    (billingService.approveEstimate as jest.Mock).mockResolvedValue({ id: 'est1', status: 'approved' });

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/billing/estimates/${UUID}/approve`,
      headers: authHeaders(UserRole.CUSTOMER),
      payload: { action: 'approve' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data.status).toBe('approved');
  });

  it('returns 403 for DRIVER role', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/billing/estimates/${UUID}/approve`,
      headers: authHeaders(UserRole.DRIVER),
      payload: { action: 'approve' },
    });
    expect(res.statusCode).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────
// INVOICES
// ─────────────────────────────────────────────────────────────
describe('POST /api/billing/invoices', () => {
  it('returns 400 when estimateId is not a UUID', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/billing/invoices',
      headers: authHeaders(UserRole.MANAGER),
      payload: { estimateId: 'not-a-uuid' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 201 with valid estimateId', async () => {
    (billingService.generateInvoice as jest.Mock).mockResolvedValue({ id: 'inv1', status: 'unpaid' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/billing/invoices',
      headers: authHeaders(UserRole.MANAGER),
      payload: { estimateId: UUID },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().data.id).toBe('inv1');
  });
});

describe('GET /api/billing/invoices', () => {
  it('returns 200 with pagination meta', async () => {
    (billingService.getInvoicesByTenant as jest.Mock).mockResolvedValue({
      invoices: [{ id: 'inv1' }],
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/billing/invoices',
      headers: authHeaders(UserRole.OWNER),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data).toHaveLength(1);
    expect(body.meta.total).toBe(1);
  });
});

describe('GET /api/billing/invoices/:invoiceId/payments', () => {
  it('returns 200 with payment history', async () => {
    (paymentService.getPaymentHistory as jest.Mock).mockResolvedValue([{ id: 'pay1' }]);

    const res = await app.inject({
      method: 'GET',
      url: `/api/billing/invoices/${UUID}/payments`,
      headers: authHeaders(UserRole.CUSTOMER),
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────
// PAYMENTS
// ─────────────────────────────────────────────────────────────
describe('POST /api/billing/payments', () => {
  const validBody = {
    invoiceId: UUID,
    gateway: PaymentGateway.CASH,
    amount: 50,
    currency: 'USD',
  };

  it('returns 403 for DRIVER role', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/billing/payments',
      headers: authHeaders(UserRole.DRIVER),
      payload: validBody,
    });
    expect(res.statusCode).toBe(403);
  });

  it('returns 201 for FRONTDESK with valid body', async () => {
    (paymentService.createPayment as jest.Mock).mockResolvedValue({
      payment: { id: 'pay1', status: 'paid' },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/billing/payments',
      headers: authHeaders(UserRole.FRONTDESK),
      payload: validBody,
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().data.payment.id).toBe('pay1');
  });
});

describe('POST /api/billing/payments/:id/refund', () => {
  it('returns 403 for FRONTDESK (refund needs approve permission)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/billing/payments/${UUID}/refund`,
      headers: authHeaders(UserRole.FRONTDESK),
      payload: { paymentId: UUID, reason: 'customer request' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('returns 200 for MANAGER with valid body', async () => {
    (paymentService.processRefund as jest.Mock).mockResolvedValue({ id: 'refund1', status: 'processed' });

    const res = await app.inject({
      method: 'POST',
      url: `/api/billing/payments/${UUID}/refund`,
      headers: authHeaders(UserRole.MANAGER),
      payload: { paymentId: UUID, reason: 'customer request' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data.status).toBe('processed');
  });
});