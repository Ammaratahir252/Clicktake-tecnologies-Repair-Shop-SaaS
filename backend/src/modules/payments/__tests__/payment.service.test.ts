jest.mock('../../../config/postgres', () => ({
  query: jest.fn(),
  withTransaction: jest.fn(),
}));

jest.mock('../../../config/redis', () => ({
  redis: { get: jest.fn(), setex: jest.fn() },
  RedisKeys: { paymentIdempotency: (t: string, k: string) => `idem:${t}:${k}` },
  RedisTTL: { PAYMENT_IDEMPOTENCY: 86400 },
}));

jest.mock('../gateways', () => ({
  getGateway: jest.fn(),
}));

jest.mock('../../../models/auditLog.model', () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  paymentLogger: {
    success:  jest.fn(),
    failed:   jest.fn(),
    refunded: jest.fn(),
    created:  jest.fn(),
  },
}));

import { query, withTransaction } from '../../../config/postgres';
import { redis } from '../../../config/redis';
import { getGateway } from '../gateways';
import {
  createPayment,
  verifyPayment,
  processRefund,
  getPaymentHistory,
} from '../service/payment.service';
import { NotFoundError, BusinessRuleError, ConflictError } from '../../../errors';
import { PaymentGateway } from '../../../types';

const mockQuery = query as jest.Mock;
const mockWithTransaction = withTransaction as jest.Mock;
const mockGetGateway = getGateway as jest.Mock;
const mockRedisGet = redis.get as jest.Mock;
const mockRedisSetex = redis.setex as jest.Mock;

const TENANT = 'tenant-001';
const baseInvoice = {
  id: 'inv1', tenant_id: TENANT, status: 'pending',
  total_amount: 100, amount_due: 100, currency: 'USD',
  customer_id: 'cust1', ticket_id: 'ticket1',
};

afterEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────
// createPayment
// ─────────────────────────────────────────────────────────────
describe('createPayment', () => {
  const baseInput = {
    tenantId: TENANT,
    invoiceId: 'inv1',
    customerId: 'cust1',
    collectedBy: 'user1',
    gateway: PaymentGateway.CASH,
    amount: 50,
    currency: 'USD',
    ipAddress: '127.0.0.1',
  };

  it('throws NotFoundError when invoice does not exist', async () => {
    mockQuery.mockResolvedValueOnce([]);
    await expect(createPayment(baseInput)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws ConflictError when invoice is already paid', async () => {
    mockQuery.mockResolvedValueOnce([{ ...baseInvoice, status: 'paid' }]);
    await expect(createPayment(baseInput)).rejects.toBeInstanceOf(ConflictError);
  });

  it('throws BusinessRuleError when invoice is void', async () => {
    mockQuery.mockResolvedValueOnce([{ ...baseInvoice, status: 'void' }]);
    await expect(createPayment(baseInput)).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('throws BusinessRuleError when amount is zero or negative', async () => {
    mockQuery.mockResolvedValueOnce([baseInvoice]);
    await expect(createPayment({ ...baseInput, amount: 0 })).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('throws BusinessRuleError when amount exceeds amount_due', async () => {
    mockQuery.mockResolvedValueOnce([baseInvoice]);
    await expect(createPayment({ ...baseInput, amount: 150 })).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('throws ConflictError on duplicate idempotent payment', async () => {
    mockQuery
      .mockResolvedValueOnce([baseInvoice])               // invoice lookup
      .mockResolvedValueOnce([{ status: 'paid' }]);       // existing payment lookup

    mockRedisGet.mockResolvedValueOnce('existing-payment-id');

    await expect(createPayment(baseInput)).rejects.toBeInstanceOf(ConflictError);
  });

  it('creates a payment successfully via cash gateway', async () => {
    mockQuery.mockResolvedValueOnce([baseInvoice]); // invoice lookup
    mockRedisGet.mockResolvedValueOnce(null);       // no idempotency hit

    mockGetGateway.mockReturnValue({
      createPayment: jest.fn().mockResolvedValue({
        gatewayPaymentId: 'CASH_123',
        rawResponse: { type: 'cash' },
        status: 'paid',
        clientSecret: undefined,
        redirectUrl: undefined,
      }),
    });

    const clientQuery = jest.fn().mockResolvedValue({
      rows: [{ id: 'pay1', status: 'paid', amount: 50 }],
    });
    mockWithTransaction.mockImplementation(async (cb) => cb({ query: clientQuery }));

    const result = await createPayment(baseInput);

    expect(result.payment.id).toBe('pay1');
    expect(mockRedisSetex).toHaveBeenCalledWith('idem:tenant-001:tenant-001:inv1:cash:5000', 86400, 'pay1');
  });
});

// ─────────────────────────────────────────────────────────────
// verifyPayment
// ─────────────────────────────────────────────────────────────
describe('verifyPayment', () => {
  const basePayment = {
    id: 'pay1', tenant_id: TENANT, gateway: 'cash',
    gateway_payment_id: 'CASH_123', status: 'pending',
    amount: 50, invoice_id: 'inv1',
  };

  it('throws NotFoundError when payment does not exist', async () => {
    mockQuery.mockResolvedValueOnce([]);
    await expect(verifyPayment('pay1', TENANT, 'user1', '127.0.0.1'))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  it('returns alreadyVerified=true when payment already paid', async () => {
    mockQuery.mockResolvedValueOnce([{ ...basePayment, status: 'paid' }]);
    const result = await verifyPayment('pay1', TENANT, 'user1', '127.0.0.1');
    expect(result.alreadyVerified).toBe(true);
  });

  it('updates status when gateway reports a different status', async () => {
    mockQuery.mockResolvedValueOnce([basePayment]);

    mockGetGateway.mockReturnValue({
      verifyPayment: jest.fn().mockResolvedValue({ status: 'paid' }),
    });

    const clientQuery = jest.fn().mockResolvedValue({ rows: [] });
    mockWithTransaction.mockImplementation(async (cb) => cb({ query: clientQuery }));

    const result = await verifyPayment('pay1', TENANT, 'user1', '127.0.0.1');
    expect(result.alreadyVerified).toBe(false);
    expect(result.payment.status).toBe('paid');
  });
});

// ─────────────────────────────────────────────────────────────
// processRefund
// ─────────────────────────────────────────────────────────────
describe('processRefund', () => {
  const basePayment = {
    id: 'pay1', tenant_id: TENANT, gateway: 'cash',
    gateway_payment_id: 'CASH_123', status: 'paid',
    amount: 100, refunded_amount: 0, invoice_id: 'inv1', currency: 'USD',
  };

  const baseInput = {
    tenantId: TENANT,
    paymentId: 'pay1',
    reason: 'customer request',
    processedBy: 'user1',
    ipAddress: '127.0.0.1',
  };

  it('throws NotFoundError when payment does not exist', async () => {
    mockQuery.mockResolvedValueOnce([]);
    await expect(processRefund(baseInput)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws BusinessRuleError when payment is not paid', async () => {
    mockQuery.mockResolvedValueOnce([{ ...basePayment, status: 'pending' }]);
    await expect(processRefund(baseInput)).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('throws BusinessRuleError when refund amount exceeds refundable amount', async () => {
    mockQuery.mockResolvedValueOnce([basePayment]);
    await expect(processRefund({ ...baseInput, amount: 200 })).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('processes a full refund successfully', async () => {
    mockQuery.mockResolvedValueOnce([basePayment]);

    mockGetGateway.mockReturnValue({
      refundPayment: jest.fn().mockResolvedValue({
        gatewayRefundId: 'CASH_REFUND_123',
        status: 'processed',
      }),
    });

    const clientQuery = jest.fn()
      .mockResolvedValueOnce({ rows: [{ id: 'refund1', amount: 100, status: 'processed' }] }) // INSERT refunds
      .mockResolvedValueOnce({ rows: [] }) // UPDATE payments
      .mockResolvedValueOnce({ rows: [] }); // UPDATE invoices

    mockWithTransaction.mockImplementation(async (cb) => cb({ query: clientQuery }));

    const result = await processRefund(baseInput);
    expect(result.id).toBe('refund1');
    expect(result.status).toBe('processed');
  });
});

// ─────────────────────────────────────────────────────────────
// getPaymentHistory
// ─────────────────────────────────────────────────────────────
describe('getPaymentHistory', () => {
  it('returns payment history for an invoice', async () => {
    mockQuery.mockResolvedValueOnce([{ id: 'pay1', amount: 50, status: 'paid' }]);

    const result = await getPaymentHistory('inv1', TENANT);
    expect(result).toHaveLength(1);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });
});