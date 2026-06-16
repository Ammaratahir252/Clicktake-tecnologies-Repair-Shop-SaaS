jest.mock('../../../config/postgres', () => ({
  query: jest.fn(),
  withTransaction: jest.fn(),
}));

jest.mock('../../../models/auditLog.model', () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  paymentLogger: { created: jest.fn(), success: jest.fn(), failed: jest.fn(), refunded: jest.fn() },
}));

import { query, withTransaction } from '../../../config/postgres';
import {
  createEstimate,
  approveEstimate,
  getEstimate,
  generateInvoice,
  getInvoice,
  getInvoicesByTenant,
} from '../service/billing.service';
import { NotFoundError, BusinessRuleError, ConflictError } from '../../../errors';

const mockQuery = query as jest.Mock;
const mockWithTransaction = withTransaction as jest.Mock;

const TENANT = 'tenant-001';

afterEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────
// createEstimate
// ─────────────────────────────────────────────────────────────
describe('createEstimate', () => {
  const baseInput = {
    tenantId: TENANT,
    ticketId: 'ticket1',
    customerId: 'cust1',
    createdBy: 'user1',
    lineItems: [
      { name: 'Screen', type: 'part' as const, quantity: 1, unitPrice: 100 },
      { name: 'Labor',  type: 'labor' as const, quantity: 2, unitPrice: 25 },
    ],
    taxRate: 10,
  };

  const setupClient = () => {
    const clientQuery = jest.fn().mockResolvedValue({
      rows: [{ id: 'est1', tenant_id: TENANT, status: 'draft' }],
    });
    mockWithTransaction.mockImplementation(async (cb: (client: { query: jest.Mock }) => Promise<unknown>) => cb({ query: clientQuery }));
    return clientQuery;
  };

  it('calculates subtotal, tax and total correctly (no discount)', async () => {
    const clientQuery = setupClient();
    await createEstimate(baseInput);

    const params = clientQuery.mock.calls[0][1];
    expect(params[4]).toBe(150);   // subtotal: (1*100)+(2*25)
    expect(params[6]).toBe(15);    // taxAmount: 10% of 150
    expect(params[10]).toBe(165);  // totalAmount: 150 + 15
  });

  it('applies percentage discount before tax', async () => {
    const clientQuery = setupClient();
    await createEstimate({ ...baseInput, discountType: 'percentage', discountValue: 10 });

    const params = clientQuery.mock.calls[0][1];
    expect(params[9]).toBe(15);     // discountAmount: 10% of 150
    expect(params[6]).toBe(13.5);   // taxAmount: 10% of (150-15)
    expect(params[10]).toBe(148.5); // total: 135 + 13.5
  });

  it('caps fixed discount at subtotal', async () => {
    const clientQuery = setupClient();
    await createEstimate({ ...baseInput, discountType: 'fixed', discountValue: 500 });

    const params = clientQuery.mock.calls[0][1];
    expect(params[9]).toBe(150); // discount capped at subtotal (150), not 500
  });

  it('returns status "sent" with lineItems attached', async () => {
    setupClient();
    const result = await createEstimate(baseInput);
    expect(result.status).toBe('sent');
    expect(result.lineItems).toEqual(baseInput.lineItems);
  });
});

// ─────────────────────────────────────────────────────────────
// approveEstimate
// ─────────────────────────────────────────────────────────────
describe('approveEstimate', () => {
  const baseInput = {
    estimateId: 'est1',
    tenantId: TENANT,
    userId: 'user1',
    ipAddress: '127.0.0.1',
  };

  it('throws NotFoundError when estimate does not exist', async () => {
    mockQuery.mockResolvedValueOnce([]);
    await expect(approveEstimate({ ...baseInput, action: 'approve' }))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws ConflictError when already approved', async () => {
    mockQuery.mockResolvedValueOnce([{ id: 'est1', status: 'approved' }]);
    await expect(approveEstimate({ ...baseInput, action: 'approve' }))
      .rejects.toBeInstanceOf(ConflictError);
  });

  it('throws BusinessRuleError when approving a rejected estimate', async () => {
    mockQuery.mockResolvedValueOnce([{ id: 'est1', status: 'rejected' }]);
    await expect(approveEstimate({ ...baseInput, action: 'approve' }))
      .rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('approves a sent estimate successfully', async () => {
    mockQuery
      .mockResolvedValueOnce([{ id: 'est1', status: 'sent' }])
      .mockResolvedValueOnce([]);

    const result = await approveEstimate({ ...baseInput, action: 'approve' });
    expect(result).toEqual({ estimateId: 'est1', action: 'approve' });
  });

  it('rejects a sent estimate successfully', async () => {
    mockQuery
      .mockResolvedValueOnce([{ id: 'est1', status: 'sent' }])
      .mockResolvedValueOnce([]);

    const result = await approveEstimate({
      ...baseInput, action: 'reject', rejectionReason: 'Too expensive',
    });
    expect(result).toEqual({ estimateId: 'est1', action: 'reject' });
  });
});

// ─────────────────────────────────────────────────────────────
// getEstimate
// ─────────────────────────────────────────────────────────────
describe('getEstimate', () => {
  it('throws NotFoundError when estimate missing', async () => {
    mockQuery.mockResolvedValueOnce([]);
    await expect(getEstimate('est1', TENANT)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('returns estimate with lineItems', async () => {
    mockQuery
      .mockResolvedValueOnce([{ id: 'est1', status: 'sent' }])
      .mockResolvedValueOnce([{ id: 'item1', name: 'Screen' }]);

    const result = await getEstimate('est1', TENANT) as any;
    expect(result.id).toBe('est1');

    expect(result.lineItems).toEqual([{ id: 'item1', name: 'Screen' }]);
  });
});

// ─────────────────────────────────────────────────────────────
// generateInvoice
// ─────────────────────────────────────────────────────────────
describe('generateInvoice', () => {
  const approvedEstimate = {
    id: 'est1', tenant_id: TENANT, status: 'approved',
    ticket_id: 'ticket1', customer_id: 'cust1',
    subtotal: 150, tax_rate: 10, tax_amount: 15,
    discount_amount: 0, total_amount: 165, currency: 'USD',
  };

  it('throws NotFoundError when estimate does not exist', async () => {
    mockQuery.mockResolvedValueOnce([]);
    await expect(generateInvoice('est1', TENANT, 'user1')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws BusinessRuleError when estimate is not approved', async () => {
    mockQuery.mockResolvedValueOnce([{ ...approvedEstimate, status: 'sent' }]);
    await expect(generateInvoice('est1', TENANT, 'user1')).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('throws ConflictError when invoice already exists for estimate', async () => {
    mockQuery
      .mockResolvedValueOnce([approvedEstimate])
      .mockResolvedValueOnce([{ id: 'inv-existing' }]);

    await expect(generateInvoice('est1', TENANT, 'user1')).rejects.toBeInstanceOf(ConflictError);
  });

  it('generates invoice with line items copied from estimate', async () => {
    mockQuery
      .mockResolvedValueOnce([approvedEstimate]) // estimate lookup
      .mockResolvedValueOnce([])                 // no existing invoice
      .mockResolvedValueOnce([{ last_sequence: 1 }]); // generateInvoiceNumber

    const clientQuery = jest.fn()
      .mockResolvedValueOnce({ rows: [{ id: 'inv1', total_amount: 165 }] })
      .mockResolvedValueOnce({ rows: [{ name: 'Screen', unit_price: 100, total_price: 100 }] })
      .mockResolvedValueOnce({ rows: [] });

    mockWithTransaction.mockImplementation(async (cb: (client: { query: jest.Mock }) => Promise<unknown>) => cb({ query: clientQuery }));

    const result = await generateInvoice('est1', TENANT, 'user1');
    expect(result.id).toBe('inv1');
    expect(result.lineItems).toEqual([{ name: 'Screen', unit_price: 100, total_price: 100 }]);
  });
});

// ─────────────────────────────────────────────────────────────
// getInvoice
// ─────────────────────────────────────────────────────────────
describe('getInvoice', () => {
  it('throws NotFoundError when invoice missing', async () => {
    mockQuery.mockResolvedValueOnce([]);
    await expect(getInvoice('inv1', TENANT)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('returns invoice with lineItems and payments', async () => {
    mockQuery
      .mockResolvedValueOnce([{ id: 'inv1', status: 'paid' }])
      .mockResolvedValueOnce([{ name: 'Screen' }])
      .mockResolvedValueOnce([{ id: 'pay1', status: 'paid' }]);

    const result = await getInvoice('inv1', TENANT) as any;
    expect(result.id).toBe('inv1');
    expect(result.lineItems).toEqual([{ name: 'Screen' }]);
    expect(result.payments).toEqual([{ id: 'pay1', status: 'paid' }]);
  });
});

// ─────────────────────────────────────────────────────────────
// getInvoicesByTenant
// ─────────────────────────────────────────────────────────────
describe('getInvoicesByTenant', () => {
  it('returns paginated results with correct meta', async () => {
    mockQuery
      .mockResolvedValueOnce([{ id: 'inv1' }, { id: 'inv2' }])
      .mockResolvedValueOnce([{ count: '2' }]);

    const result = await getInvoicesByTenant(TENANT, 1, 20);
    expect(result.invoices).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.totalPages).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('calculates totalPages correctly for multiple pages', async () => {
    mockQuery
      .mockResolvedValueOnce([{ id: 'inv1' }])
      .mockResolvedValueOnce([{ count: '45' }]);

    const result = await getInvoicesByTenant(TENANT, 1, 20);
    expect(result.totalPages).toBe(3); // ceil(45/20)
  });
});