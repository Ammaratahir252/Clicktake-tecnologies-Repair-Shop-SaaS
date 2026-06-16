// Mock all external dependencies
jest.mock('../../../../config/env', () => ({
  env: {
    ENCRYPTION_KEY:      '12345678901234567890123456789012',
    EASYPAISA_HASH_KEY:  'test-hash-key',
    EASYPAISA_STORE_ID:  'test-store-id',
    APP_URL:             'http://localhost:3001',
  },
}));

jest.mock('../../../../errors', () => ({
  PaymentError: class PaymentError extends Error {
    constructor(msg: string) { super(msg); this.name = 'PaymentError'; }
  },
  InternalError: class InternalError extends Error {
    constructor(msg: string) { super(msg); }
  },
}));

jest.mock('../../../../utils/logger', () => ({
  paymentLogger: {
    created:  jest.fn(),
    failed:   jest.fn(),
    refunded: jest.fn(),
  },
}));

jest.mock('axios');
jest.mock('../stripe.gateway',   () => ({ stripeGateway:   {} }));
jest.mock('../jazzcash.gateway', () => ({ jazzCashGateway: {} }));

import { CashGateway, BankTransferGateway, EasyPaisaGateway, getGateway } from '../index';
import { PaymentGateway } from '../../../../types';

const baseInput = {
  amount:         150.00,
  currency:       'USD',
  invoiceId:      'inv-uuid-0001',
  tenantId:       'tenant-001',
  customerId:     'cust-001',
  description:    'Screen repair',
  idempotencyKey: 'idem-key-001',
  customerEmail:  'customer@test.com',
  customerName:   'Ali Khan',
};

// ─────────────────────────────────────────────────────────────
// CashGateway
// ─────────────────────────────────────────────────────────────
describe('CashGateway', () => {
  const gateway = new CashGateway();

  it('gateway property is CASH', () => {
    expect(gateway.gateway).toBe(PaymentGateway.CASH);
  });

  it('createPayment returns status paid immediately', async () => {
    const result = await gateway.createPayment(baseInput);
    expect(result.status).toBe('paid');
  });

  it('createPayment gatewayPaymentId starts with CASH_', async () => {
    const result = await gateway.createPayment(baseInput);
    expect(result.gatewayPaymentId).toMatch(/^CASH_/);
  });

  it('createPayment rawResponse contains type cash', async () => {
    const result = await gateway.createPayment(baseInput);
    expect(result.rawResponse.type).toBe('cash');
  });

  it('verifyPayment always returns paid status', async () => {
    const result = await gateway.verifyPayment('CASH_123');
    expect(result.status).toBe('paid');
  });

  it('verifyPayment returns paidAt date', async () => {
    const result = await gateway.verifyPayment('CASH_123');
    expect(result.paidAt).toBeInstanceOf(Date);
  });

  it('refundPayment returns processed status', async () => {
    const result = await gateway.refundPayment('CASH_123', 50);
    expect(result.status).toBe('processed');
  });

  it('refundPayment gatewayRefundId starts with CASH_REFUND_', async () => {
    const result = await gateway.refundPayment('CASH_123', 50);
    expect(result.gatewayRefundId).toMatch(/^CASH_REFUND_/);
  });

  it('refundPayment returns correct amount', async () => {
    const result = await gateway.refundPayment('CASH_123', 75);
    expect(result.amount).toBe(75);
  });
});

// ─────────────────────────────────────────────────────────────
// BankTransferGateway
// ─────────────────────────────────────────────────────────────
describe('BankTransferGateway', () => {
  const gateway = new BankTransferGateway();

  it('gateway property is BANK_TRANSFER', () => {
    expect(gateway.gateway).toBe(PaymentGateway.BANK_TRANSFER);
  });

  it('createPayment returns pending status (needs manual confirm)', async () => {
    const result = await gateway.createPayment(baseInput);
    expect(result.status).toBe('pending');
  });

  it('createPayment gatewayPaymentId starts with BT_', async () => {
    const result = await gateway.createPayment(baseInput);
    expect(result.gatewayPaymentId).toMatch(/^BT_/);
  });

  it('verifyPayment returns pending (manual confirmation needed)', async () => {
    const result = await gateway.verifyPayment('BT_123');
    expect(result.status).toBe('pending');
  });

  it('refundPayment returns processed', async () => {
    const result = await gateway.refundPayment('BT_123', 100);
    expect(result.status).toBe('processed');
  });

  it('refundPayment gatewayRefundId starts with BT_REFUND_', async () => {
    const result = await gateway.refundPayment('BT_123', 100);
    expect(result.gatewayRefundId).toMatch(/^BT_REFUND_/);
  });
});

// ─────────────────────────────────────────────────────────────
// EasyPaisaGateway
// ─────────────────────────────────────────────────────────────
describe('EasyPaisaGateway', () => {
  const gateway = new EasyPaisaGateway();

  it('gateway property is EASYPAISA', () => {
    expect(gateway.gateway).toBe(PaymentGateway.EASYPAISA);
  });

  it('verifyPayment returns pending (callback-based)', async () => {
    const result = await gateway.verifyPayment('EP_123');
    expect(result.status).toBe('pending');
    expect(result.currency).toBe('PKR');
  });

  it('refundPayment returns manual processing message', async () => {
    const result = await gateway.refundPayment('EP_123', 200, 'customer return');
    expect(result.gatewayRefundId).toMatch(/^EP_REFUND_/);
    expect(result.rawResponse).toHaveProperty('message');
  });

  it('refundPayment includes reason in rawResponse', async () => {
    const result = await gateway.refundPayment('EP_123', 100, 'test reason');
    expect(result.rawResponse.reason).toBe('test reason');
  });
});

// ─────────────────────────────────────────────────────────────
// getGateway factory
// ─────────────────────────────────────────────────────────────
describe('getGateway factory', () => {
  it('returns CashGateway for CASH', () => {
    const g = getGateway(PaymentGateway.CASH);
    expect(g).toBeInstanceOf(CashGateway);
  });

  it('returns BankTransferGateway for BANK_TRANSFER', () => {
    const g = getGateway(PaymentGateway.BANK_TRANSFER);
    expect(g).toBeInstanceOf(BankTransferGateway);
  });

  it('returns EasyPaisaGateway for EASYPAISA', () => {
    const g = getGateway(PaymentGateway.EASYPAISA);
    expect(g).toBeInstanceOf(EasyPaisaGateway);
  });

  it('returns a gateway with correct interface methods', () => {
    const g = getGateway(PaymentGateway.CASH);
    expect(typeof g.createPayment).toBe('function');
    expect(typeof g.verifyPayment).toBe('function');
    expect(typeof g.refundPayment).toBe('function');
  });

  it('PAYPAL falls back to CashGateway (placeholder)', () => {
    const g = getGateway(PaymentGateway.PAYPAL);
    expect(g).toBeInstanceOf(CashGateway);
  });
});

// ─────────────────────────────────────────────────────────────
// Gateway interface shape validation
// ─────────────────────────────────────────────────────────────
describe('all gateways implement IPaymentGateway interface', () => {
  const gateways = [
    new CashGateway(),
    new BankTransferGateway(),
    new EasyPaisaGateway(),
  ];

  it.each(gateways)('$gateway has createPayment method', (g) => {
    expect(typeof g.createPayment).toBe('function');
  });

  it.each(gateways)('$gateway has verifyPayment method', (g) => {
    expect(typeof g.verifyPayment).toBe('function');
  });

  it.each(gateways)('$gateway has refundPayment method', (g) => {
    expect(typeof g.refundPayment).toBe('function');
  });

  it.each(gateways)('$gateway property is defined', (g) => {
    expect(g.gateway).toBeDefined();
  });
});