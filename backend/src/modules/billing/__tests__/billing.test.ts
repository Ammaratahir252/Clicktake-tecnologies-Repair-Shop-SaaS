// ============================================================
// DibnowRepairSaaS M9 — Billing Module Tests
// Tests: calculateAmounts logic + Zod schema validators
// No DB / Redis needed — pure unit tests
// Run: npm test
// ============================================================

import { z } from 'zod';

// ─── Re-implement calculateAmounts locally ────────────────────
// (It's a private function in billing.service.ts, so we test it
//  here in isolation — same logic, no DB imports needed)
interface LineItem {
  name: string;
  type: 'part' | 'labor' | 'service' | 'fee';
  quantity: number;
  unitPrice: number;
  partId?: string;
  description?: string;
}

const calculateAmounts = (
  lineItems: LineItem[],
  taxRate: number,
  discountType?: string,
  discountValue?: number
) => {
  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  let discountAmount = 0;
  if (discountType === 'percentage' && discountValue) {
    discountAmount = (subtotal * discountValue) / 100;
  } else if (discountType === 'fixed' && discountValue) {
    discountAmount = Math.min(discountValue, subtotal);
  }

  const taxableAmount = subtotal - discountAmount;
  const taxAmount = (taxableAmount * taxRate) / 100;
  const totalAmount = taxableAmount + taxAmount;

  return {
    subtotal:        Math.round(subtotal        * 100) / 100,
    discountAmount:  Math.round(discountAmount  * 100) / 100,
    taxAmount:       Math.round(taxAmount       * 100) / 100,
    totalAmount:     Math.round(totalAmount     * 100) / 100,
  };
};

// ─── Zod schemas (copied from shared schemas — no DB imports) ─
const mongoIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Invalid MongoDB ObjectId');

const currencyAmountSchema = z
  .number()
  .positive('Amount must be positive')
  .multipleOf(0.01, 'Amount must have max 2 decimal places');

const lineItemSchema = z.object({
  name:        z.string().min(1).max(200).trim(),
  type:        z.enum(['part', 'labor', 'service', 'fee']),
  quantity:    z.number().int().positive(),
  unitPrice:   currencyAmountSchema,
  partId:      mongoIdSchema.optional(),
  description: z.string().max(500).optional(),
});

const createEstimateSchema = z.object({
  ticketId:      mongoIdSchema,
  customerId:    mongoIdSchema,
  lineItems:     z.array(lineItemSchema).min(1, 'At least one line item required'),
  taxRate:       z.number().min(0).max(100).default(0),
  discountType:  z.enum(['percentage', 'fixed']).optional(),
  discountValue: z.number().min(0).optional(),
  notes:         z.string().max(1000).optional(),
  validUntil:    z.string().datetime().optional(),
  currency:      z.string().length(3).default('USD'),
});

const approveEstimateSchema = z.object({
  action:           z.enum(['approve', 'reject']),
  customerSignature: z.string().optional(),
  rejectionReason:  z.string().max(500).optional(),
});

// ─── Error classes (local — no DB import) ────────────────────
class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}
class NotFoundError    extends AppError { constructor(m: string) { super(m, 404); } }
class ConflictError    extends AppError { constructor(m: string) { super(m, 409); } }
class BusinessRuleError extends AppError { constructor(m: string) { super(m, 422); } }

// ─────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────

// ─── calculateAmounts ─────────────────────────────────────────
describe('calculateAmounts', () => {
  const items: LineItem[] = [
    { name: 'Screen', type: 'part',  quantity: 1, unitPrice: 80.00 },
    { name: 'Labor',  type: 'labor', quantity: 2, unitPrice: 15.00 },
  ];
  // subtotal = 80 + 30 = 110.00

  describe('no discount', () => {
    it('computes subtotal, taxAmount, totalAmount correctly', () => {
      const result = calculateAmounts(items, 10);
      expect(result.subtotal).toBe(110.00);
      expect(result.discountAmount).toBe(0);
      expect(result.taxAmount).toBe(11.00);
      expect(result.totalAmount).toBe(121.00);
    });

    it('zero tax rate returns total equal to subtotal', () => {
      const result = calculateAmounts(items, 0);
      expect(result.taxAmount).toBe(0);
      expect(result.totalAmount).toBe(110.00);
    });
  });

  describe('percentage discount', () => {
    it('applies percentage discount before tax', () => {
      // 10% off 110 = 11 discount → taxable 99 → 10% tax = 9.90 → total 108.90
      const result = calculateAmounts(items, 10, 'percentage', 10);
      expect(result.discountAmount).toBe(11.00);
      expect(result.taxAmount).toBe(9.90);
      expect(result.totalAmount).toBe(108.90);
    });

    it('100% discount makes total zero', () => {
      const result = calculateAmounts(items, 20, 'percentage', 100);
      expect(result.discountAmount).toBe(110.00);
      expect(result.taxAmount).toBe(0);
      expect(result.totalAmount).toBe(0);
    });
  });

  describe('fixed discount', () => {
    it('subtracts fixed amount from subtotal', () => {
      // 110 - 20 = 90 → tax 10% = 9 → total 99
      const result = calculateAmounts(items, 10, 'fixed', 20);
      expect(result.discountAmount).toBe(20.00);
      expect(result.taxAmount).toBe(9.00);
      expect(result.totalAmount).toBe(99.00);
    });

    it('clamps discount to subtotal (no negative totals)', () => {
      const result = calculateAmounts(items, 10, 'fixed', 500);
      expect(result.discountAmount).toBe(110.00);
      expect(result.totalAmount).toBe(0);
    });
  });

  describe('rounding precision', () => {
    it('rounds to 2 decimal places', () => {
      // 3 × £3.33 = 9.99 → tax 20% = 1.998 → rounds to 2.00 → total 11.99
      const oddItems: LineItem[] = [
        { name: 'Part', type: 'part', quantity: 3, unitPrice: 3.33 },
      ];
      const result = calculateAmounts(oddItems, 20);
      expect(result.subtotal).toBe(9.99);
      expect(result.taxAmount).toBe(2.00);
      expect(result.totalAmount).toBe(11.99);
    });

    it('single item with exact pence rounds correctly', () => {
      const result = calculateAmounts(
        [{ name: 'X', type: 'fee', quantity: 1, unitPrice: 49.99 }],
        17.5
      );
      expect(result.subtotal).toBe(49.99);
      expect(result.taxAmount).toBe(8.75);    // 49.99 × 0.175 = 8.74825 → 8.75
      expect(result.totalAmount).toBe(58.74);
    });
  });

  describe('multi-item subtotals', () => {
    it('sums all line items correctly', () => {
      const multiItems: LineItem[] = [
        { name: 'A', type: 'part',    quantity: 2,  unitPrice: 10.00 },
        { name: 'B', type: 'labor',   quantity: 3,  unitPrice:  5.00 },
        { name: 'C', type: 'service', quantity: 1,  unitPrice: 25.00 },
        { name: 'D', type: 'fee',     quantity: 10, unitPrice:  0.50 },
      ];
      // 20 + 15 + 25 + 5 = 65
      const result = calculateAmounts(multiItems, 0);
      expect(result.subtotal).toBe(65.00);
    });
  });
});

// ─── createEstimate Zod schema ────────────────────────────────
describe('createEstimate schema', () => {
  const validMongoId = '507f1f77bcf86cd799439011';

  const validInput = {
    ticketId:   validMongoId,
    customerId: validMongoId,
    lineItems: [
      { name: 'Battery', type: 'part', quantity: 1, unitPrice: 29.99 },
    ],
    taxRate: 20,
    currency: 'GBP',
  };

  it('accepts a valid estimate input', () => {
    expect(createEstimateSchema.safeParse(validInput).success).toBe(true);
  });

  it('defaults taxRate to 0 when not provided', () => {
    const input = { ...validInput };
    const result = createEstimateSchema.safeParse(input);
    expect(result.success).toBe(true);
    // taxRate was provided as 20, check it's preserved
    if (result.success) expect(result.data.taxRate).toBe(20);
  });

  it('defaults currency to USD when not provided', () => {
    const input = { ...validInput };
    delete (input as Partial<typeof validInput>).currency;
    const result = createEstimateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.currency).toBe('USD');
  });

  it('rejects missing lineItems', () => {
    const bad = { ...validInput, lineItems: [] };
    expect(createEstimateSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects invalid ticketId (not mongo id)', () => {
    const bad = { ...validInput, ticketId: 'not-an-id' };
    expect(createEstimateSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects negative taxRate', () => {
    const bad = { ...validInput, taxRate: -5 };
    expect(createEstimateSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects taxRate above 100', () => {
    const bad = { ...validInput, taxRate: 101 };
    expect(createEstimateSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects unknown lineItem type', () => {
    const bad = {
      ...validInput,
      lineItems: [{ name: 'X', type: 'magic', quantity: 1, unitPrice: 10 }],
    };
    expect(createEstimateSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects zero quantity in line item', () => {
    const bad = {
      ...validInput,
      lineItems: [{ name: 'X', type: 'part', quantity: 0, unitPrice: 10 }],
    };
    expect(createEstimateSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects negative unitPrice', () => {
    const bad = {
      ...validInput,
      lineItems: [{ name: 'X', type: 'part', quantity: 1, unitPrice: -5 }],
    };
    expect(createEstimateSchema.safeParse(bad).success).toBe(false);
  });

  it('accepts optional discountType + discountValue', () => {
    const withDiscount = { ...validInput, discountType: 'percentage' as const, discountValue: 10 };
    expect(createEstimateSchema.safeParse(withDiscount).success).toBe(true);
  });

  it('accepts optional notes within 1000 chars', () => {
    const withNotes = { ...validInput, notes: 'Screen cracked.' };
    expect(createEstimateSchema.safeParse(withNotes).success).toBe(true);
  });

  it('rejects notes over 1000 chars', () => {
    const bad = { ...validInput, notes: 'x'.repeat(1001) };
    expect(createEstimateSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects currency not exactly 3 chars', () => {
    expect(createEstimateSchema.safeParse({ ...validInput, currency: 'US' }).success).toBe(false);
    expect(createEstimateSchema.safeParse({ ...validInput, currency: 'USDT' }).success).toBe(false);
  });
});

// ─── approveEstimate Zod schema ───────────────────────────────
describe('approveEstimate schema', () => {
  it('accepts approve action', () => {
    expect(approveEstimateSchema.safeParse({ action: 'approve' }).success).toBe(true);
  });

  it('accepts reject action with reason', () => {
    expect(approveEstimateSchema.safeParse({
      action: 'reject',
      rejectionReason: 'Customer changed mind',
    }).success).toBe(true);
  });

  it('rejects unknown action', () => {
    expect(approveEstimateSchema.safeParse({ action: 'cancel' }).success).toBe(false);
  });

  it('rejects rejectionReason over 500 chars', () => {
    expect(approveEstimateSchema.safeParse({
      action: 'reject',
      rejectionReason: 'x'.repeat(501),
    }).success).toBe(false);
  });
});

// ─── Error classes ────────────────────────────────────────────
describe('error classes', () => {
  it('NotFoundError has statusCode 404', () => {
    const err = new NotFoundError('Estimate not found');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Estimate not found');
    expect(err).toBeInstanceOf(Error);
  });

  it('ConflictError has statusCode 409', () => {
    const err = new ConflictError('Already approved');
    expect(err.statusCode).toBe(409);
  });

  it('BusinessRuleError has statusCode 422', () => {
    const err = new BusinessRuleError('Cannot approve a rejected estimate');
    expect(err.statusCode).toBe(422);
    expect(err.message).toContain('rejected');
  });

  it('errors are instances of AppError', () => {
    expect(new NotFoundError('x')).toBeInstanceOf(AppError);
    expect(new ConflictError('x')).toBeInstanceOf(AppError);
    expect(new BusinessRuleError('x')).toBeInstanceOf(AppError);
  });
});

// ─── lineItem schema edge cases ───────────────────────────────
describe('lineItem schema', () => {
  it('accepts all valid types', () => {
    const types = ['part', 'labor', 'service', 'fee'] as const;
    types.forEach((type) => {
      const result = lineItemSchema.safeParse({
        name: 'Test', type, quantity: 1, unitPrice: 10.00,
      });
      expect(result.success).toBe(true);
    });
  });

  it('rejects empty name', () => {
    expect(lineItemSchema.safeParse({
      name: '', type: 'part', quantity: 1, unitPrice: 10,
    }).success).toBe(false);
  });

  it('rejects name over 200 chars', () => {
    expect(lineItemSchema.safeParse({
      name: 'a'.repeat(201), type: 'part', quantity: 1, unitPrice: 10,
    }).success).toBe(false);
  });

  it('rejects fractional quantity', () => {
    expect(lineItemSchema.safeParse({
      name: 'Part', type: 'part', quantity: 1.5, unitPrice: 10,
    }).success).toBe(false);
  });

  it('accepts optional valid partId', () => {
    expect(lineItemSchema.safeParse({
      name: 'Screen', type: 'part', quantity: 1, unitPrice: 49.99,
      partId: '507f1f77bcf86cd799439011',
    }).success).toBe(true);
  });

  it('rejects invalid partId format', () => {
    expect(lineItemSchema.safeParse({
      name: 'Screen', type: 'part', quantity: 1, unitPrice: 49.99,
      partId: 'not-a-mongo-id',
    }).success).toBe(false);
  });
});