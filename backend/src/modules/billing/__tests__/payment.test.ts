import { z } from 'zod';

// ─── Schemas ─────────────────────────────────────────────────
const uuidSchema = z.string().uuid('Invalid UUID format');

const currencyAmountSchema = z
  .number()
  .positive()
  .multipleOf(0.01);

const createPaymentSchema = z.object({
  invoiceId:     uuidSchema,
  gateway:       z.enum(['stripe', 'jazzcash', 'easypaisa', 'cash', 'bank_transfer', 'paypal']),
  amount:        currencyAmountSchema,
  currency:      z.string().length(3).default('USD'),
  referenceNote: z.string().max(200).optional(),
});

const refundPaymentSchema = z.object({
  paymentId: uuidSchema,
  amount:    currencyAmountSchema.optional(),
  reason:    z.string().max(500),
});

// ─── Business rule helpers (pure logic — no DB) ───────────────
const canRefund = (
  paymentStatus: string,
  refundAmount: number,
  paidAmount: number,
  alreadyRefunded: number
): { ok: boolean; error?: string } => {
  if (paymentStatus !== 'paid') {
    return { ok: false, error: 'Only paid payments can be refunded' };
  }
  const maxRefundable = paidAmount - alreadyRefunded;
  if (refundAmount > maxRefundable) {
    return {
      ok: false,
      error: `Refund amount ($${refundAmount}) exceeds refundable amount ($${maxRefundable})`,
    };
  }
  return { ok: true };
};

const canCreatePayment = (
  invoiceStatus: string,
  paymentAmount: number,
  amountDue: number
): { ok: boolean; error?: string } => {
  if (invoiceStatus === 'paid') {
    return { ok: false, error: 'Invoice is already fully paid' };
  }
  if (invoiceStatus === 'void') {
    return { ok: false, error: 'Cannot process payment for a voided invoice' };
  }
  if (paymentAmount <= 0) {
    return { ok: false, error: 'Payment amount must be greater than 0' };
  }
  if (paymentAmount > amountDue) {
    return {
      ok: false,
      error: `Payment amount ($${paymentAmount}) exceeds amount due ($${amountDue})`,
    };
  }
  return { ok: true };
};

const computeInvoiceStatusAfterPayment = (
  totalAmount: number,
  previouslyPaid: number,
  newPayment: number
): string => {
  const totalPaid = previouslyPaid + newPayment;
  if (totalPaid >= totalAmount) return 'paid';
  if (totalPaid > 0)            return 'partial';
  return 'pending';
};

const computeRefundStatus = (
  totalPaid: number,
  totalRefunded: number
): string => {
  if (totalRefunded >= totalPaid) return 'refunded';
  return 'partially_refunded';
};

// ─────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────

describe('createPayment schema', () => {
  const validUUID = '550e8400-e29b-41d4-a716-446655440000';

  const validInput = {
    invoiceId: validUUID,
    gateway:   'cash',
    amount:    150.00,
    currency:  'GBP',
  };

  it('accepts valid payment input', () => {
    expect(createPaymentSchema.safeParse(validInput).success).toBe(true);
  });

  it('defaults currency to USD', () => {
    const input = { invoiceId: validUUID, gateway: 'cash', amount: 50 };
    const result = createPaymentSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.currency).toBe('USD');
  });

  it('rejects invalid UUID invoiceId', () => {
    expect(createPaymentSchema.safeParse({
      ...validInput, invoiceId: 'not-a-uuid',
    }).success).toBe(false);
  });

  it('rejects unknown gateway', () => {
    expect(createPaymentSchema.safeParse({
      ...validInput, gateway: 'bitcoin',
    }).success).toBe(false);
  });

  it('rejects zero amount', () => {
    expect(createPaymentSchema.safeParse({
      ...validInput, amount: 0,
    }).success).toBe(false);
  });

  it('rejects negative amount', () => {
    expect(createPaymentSchema.safeParse({
      ...validInput, amount: -10,
    }).success).toBe(false);
  });

  it('rejects currency not 3 chars', () => {
    expect(createPaymentSchema.safeParse({
      ...validInput, currency: 'US',
    }).success).toBe(false);
  });

  it('accepts all supported gateways', () => {
    const gateways = ['stripe', 'jazzcash', 'easypaisa', 'cash', 'bank_transfer', 'paypal'];
    gateways.forEach((gateway) => {
      expect(createPaymentSchema.safeParse({
        ...validInput, gateway,
      }).success).toBe(true);
    });
  });

  it('accepts optional referenceNote', () => {
    expect(createPaymentSchema.safeParse({
      ...validInput, referenceNote: 'Cash received at counter',
    }).success).toBe(true);
  });

  it('rejects referenceNote over 200 chars', () => {
    expect(createPaymentSchema.safeParse({
      ...validInput, referenceNote: 'x'.repeat(201),
    }).success).toBe(false);
  });
});

describe('refundPayment schema', () => {
  const validUUID = '550e8400-e29b-41d4-a716-446655440000';

  it('accepts valid full refund (no amount = full refund)', () => {
    expect(refundPaymentSchema.safeParse({
      paymentId: validUUID,
      reason:    'Customer returned device',
    }).success).toBe(true);
  });

  it('accepts partial refund with amount', () => {
    expect(refundPaymentSchema.safeParse({
      paymentId: validUUID,
      amount:    25.00,
      reason:    'Partial refund agreed',
    }).success).toBe(true);
  });

  it('rejects invalid paymentId UUID', () => {
    expect(refundPaymentSchema.safeParse({
      paymentId: 'bad-id',
      reason:    'Test',
    }).success).toBe(false);
  });

  it('rejects missing reason', () => {
    expect(refundPaymentSchema.safeParse({
      paymentId: validUUID,
    }).success).toBe(false);
  });

  it('rejects reason over 500 chars', () => {
    expect(refundPaymentSchema.safeParse({
      paymentId: validUUID,
      reason:    'x'.repeat(501),
    }).success).toBe(false);
  });

  it('rejects zero refund amount', () => {
    expect(refundPaymentSchema.safeParse({
      paymentId: validUUID,
      amount:    0,
      reason:    'Test',
    }).success).toBe(false);
  });
});

describe('canCreatePayment business rules', () => {
  it('allows payment on pending invoice', () => {
    expect(canCreatePayment('pending', 100, 200).ok).toBe(true);
  });

  it('blocks payment on already paid invoice', () => {
    const result = canCreatePayment('paid', 100, 0);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('already fully paid');
  });

  it('blocks payment on voided invoice', () => {
    const result = canCreatePayment('void', 100, 200);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('voided');
  });

  it('blocks zero or negative payment amount', () => {
    expect(canCreatePayment('pending', 0,   200).ok).toBe(false);
    expect(canCreatePayment('pending', -10, 200).ok).toBe(false);
  });

  it('blocks overpayment', () => {
    const result = canCreatePayment('pending', 300, 200);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('exceeds amount due');
  });

  it('allows exact amount due', () => {
    expect(canCreatePayment('pending', 200, 200).ok).toBe(true);
  });

  it('allows partial payment', () => {
    expect(canCreatePayment('partial', 50, 150).ok).toBe(true);
  });
});

describe('canRefund business rules', () => {
  it('allows full refund of paid payment', () => {
    expect(canRefund('paid', 100, 100, 0).ok).toBe(true);
  });

  it('allows partial refund', () => {
    expect(canRefund('paid', 30, 100, 0).ok).toBe(true);
  });

  it('blocks refund on unpaid payment', () => {
    const result = canRefund('pending', 50, 100, 0);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Only paid');
  });

  it('blocks refund exceeding refundable amount', () => {
    // 40 already refunded, only 60 left
    const result = canRefund('paid', 70, 100, 40);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('exceeds refundable');
  });

  it('allows refund equal to remaining refundable amount', () => {
    expect(canRefund('paid', 60, 100, 40).ok).toBe(true);
  });

  it('blocks refund on failed payment', () => {
    expect(canRefund('failed', 50, 0, 0).ok).toBe(false);
  });
});

describe('invoice status after payment', () => {
  it('marks paid when full amount collected', () => {
    expect(computeInvoiceStatusAfterPayment(200, 0, 200)).toBe('paid');
  });

  it('marks partial when underpaid', () => {
    expect(computeInvoiceStatusAfterPayment(200, 0, 100)).toBe('partial');
  });

  it('marks paid when split payments complete total', () => {
    expect(computeInvoiceStatusAfterPayment(200, 100, 100)).toBe('paid');
  });

  it('marks partial when second payment still underpaid', () => {
    expect(computeInvoiceStatusAfterPayment(200, 50, 100)).toBe('partial');
  });

  it('stays pending when nothing paid', () => {
    expect(computeInvoiceStatusAfterPayment(200, 0, 0)).toBe('pending');
  });
});

describe('refund status calculation', () => {
  it('fully refunded when refunded equals paid', () => {
    expect(computeRefundStatus(100, 100)).toBe('refunded');
  });

  it('partially refunded when refunded less than paid', () => {
    expect(computeRefundStatus(100, 60)).toBe('partially_refunded');
  });

  it('fully refunded when refunded exceeds paid (edge case)', () => {
    expect(computeRefundStatus(100, 110)).toBe('refunded');
  });
});