// Mock dependencies that are DB-related
jest.mock('../../../config/env', () => ({
  env: { ENCRYPTION_KEY: '12345678901234567890123456789012' },
}));

import {
  mongoIdSchema,
  uuidSchema,
  phoneSchema,
  emailSchema,
  passwordSchema,
  currencyAmountSchema,
  paginationSchema,
  loginSchema,
  registerSchema,
  lineItemSchema,
  createEstimateSchema,
  approveEstimateSchema,
  formatZodErrors,
  sanitizeString,
} from '../schemas';

import { z } from 'zod';

describe('mongoIdSchema', () => {
  it('accepts valid 24-char hex id', () => {
    expect(mongoIdSchema.safeParse('507f1f77bcf86cd799439011').success).toBe(true);
  });
  it('rejects short id', () => {
    expect(mongoIdSchema.safeParse('abc123').success).toBe(false);
  });
  it('rejects non-hex', () => {
    expect(mongoIdSchema.safeParse('zzzzzzzzzzzzzzzzzzzzzzzz').success).toBe(false);
  });
});

describe('uuidSchema', () => {
  it('accepts valid UUID v4', () => {
    expect(uuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000').success).toBe(true);
  });
  it('rejects non-UUID', () => {
    expect(uuidSchema.safeParse('not-a-uuid').success).toBe(false);
  });
});

describe('phoneSchema', () => {
  it('accepts valid international numbers', () => {
    expect(phoneSchema.safeParse('+923001234567').success).toBe(true);
    expect(phoneSchema.safeParse('+447911123456').success).toBe(true);
  });
  it('rejects too short', () => {
    expect(phoneSchema.safeParse('+123').success).toBe(false);
  });
});

describe('emailSchema', () => {
  it('accepts valid email', () => {
    const r = emailSchema.safeParse('USER@EXAMPLE.COM');
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe('user@example.com'); // lowercased
  });
  it('rejects invalid email', () => {
    expect(emailSchema.safeParse('notanemail').success).toBe(false);
  });
});

describe('passwordSchema', () => {
  it('accepts strong password', () => {
    expect(passwordSchema.safeParse('SecureP@ss1').success).toBe(true);
  });
  it('rejects too short', () => {
    expect(passwordSchema.safeParse('Ab@1').success).toBe(false);
  });
  it('rejects no uppercase', () => {
    expect(passwordSchema.safeParse('secure@pass1').success).toBe(false);
  });
  it('rejects no number', () => {
    expect(passwordSchema.safeParse('Secure@Pass').success).toBe(false);
  });
  it('rejects no special char', () => {
    expect(passwordSchema.safeParse('SecurePass1').success).toBe(false);
  });
});

describe('currencyAmountSchema', () => {
  it('accepts valid amounts', () => {
    expect(currencyAmountSchema.safeParse(10).success).toBe(true);
    expect(currencyAmountSchema.safeParse(9.99).success).toBe(true);
  });
  it('rejects zero', () => {
    expect(currencyAmountSchema.safeParse(0).success).toBe(false);
  });
  it('rejects negative', () => {
    expect(currencyAmountSchema.safeParse(-5).success).toBe(false);
  });
});

describe('paginationSchema', () => {
  it('defaults to page 1 limit 20', () => {
    const r = paginationSchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.page).toBe(1);
      expect(r.data.limit).toBe(20);
    }
  });
  it('coerces string numbers', () => {
    const r = paginationSchema.safeParse({ page: '2', limit: '50' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.page).toBe(2);
      expect(r.data.limit).toBe(50);
    }
  });
  it('rejects limit over 100', () => {
    expect(paginationSchema.safeParse({ limit: 101 }).success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    expect(loginSchema.safeParse({
      email: 'user@test.com', password: 'pass123',
    }).success).toBe(true);
  });
  it('defaults rememberMe to false', () => {
    const r = loginSchema.safeParse({ email: 'x@x.com', password: 'p' });
    if (r.success) expect(r.data.rememberMe).toBe(false);
  });
  it('rejects missing password', () => {
    expect(loginSchema.safeParse({ email: 'x@x.com' }).success).toBe(false);
  });
});

describe('registerSchema', () => {
  const validInput = {
    shopName: 'Fix It Fast',
    ownerName: 'Ali Khan',
    email: 'ali@shop.com',
    password: 'Secure@123',
    phone: '+923001234567',
    subdomain: 'fixitfast',
  };
  it('accepts valid registration', () => {
    expect(registerSchema.safeParse(validInput).success).toBe(true);
  });
  it('rejects subdomain with uppercase', () => {
    expect(registerSchema.safeParse({ ...validInput, subdomain: 'FixIt' }).success).toBe(false);
  });
  it('rejects subdomain with spaces', () => {
    expect(registerSchema.safeParse({ ...validInput, subdomain: 'fix it' }).success).toBe(false);
  });
  it('rejects short shopName', () => {
    expect(registerSchema.safeParse({ ...validInput, shopName: 'A' }).success).toBe(false);
  });
});

describe('lineItemSchema', () => {
  const valid = { name: 'Screen', type: 'part', quantity: 1, unitPrice: 50 };
  it('accepts valid line item', () => {
    expect(lineItemSchema.safeParse(valid).success).toBe(true);
  });
  it('rejects zero quantity', () => {
    expect(lineItemSchema.safeParse({ ...valid, quantity: 0 }).success).toBe(false);
  });
  it('rejects invalid type', () => {
    expect(lineItemSchema.safeParse({ ...valid, type: 'discount' }).success).toBe(false);
  });
  it('accepts all valid types', () => {
    ['part', 'labor', 'service', 'fee'].forEach((type) => {
      expect(lineItemSchema.safeParse({ ...valid, type }).success).toBe(true);
    });
  });
});

describe('createEstimateSchema', () => {
  const validId = '507f1f77bcf86cd799439011';
  const valid = {
    ticketId: validId,
    customerId: validId,
    lineItems: [{ name: 'Screen', type: 'part', quantity: 1, unitPrice: 100 }],
    taxRate: 10,
  };
  it('accepts valid estimate', () => {
    expect(createEstimateSchema.safeParse(valid).success).toBe(true);
  });
  it('rejects empty lineItems', () => {
    expect(createEstimateSchema.safeParse({ ...valid, lineItems: [] }).success).toBe(false);
  });
  it('defaults currency to USD', () => {
    const r = createEstimateSchema.safeParse(valid);
    if (r.success) expect(r.data.currency).toBe('USD');
  });
  it('rejects taxRate over 100', () => {
    expect(createEstimateSchema.safeParse({ ...valid, taxRate: 101 }).success).toBe(false);
  });
});

describe('approveEstimateSchema', () => {
  it('accepts approve action', () => {
    expect(approveEstimateSchema.safeParse({ action: 'approve' }).success).toBe(true);
  });
  it('accepts reject action', () => {
    expect(approveEstimateSchema.safeParse({ action: 'reject' }).success).toBe(true);
  });
  it('rejects unknown action', () => {
    expect(approveEstimateSchema.safeParse({ action: 'pending' }).success).toBe(false);
  });
});

describe('sanitizeString', () => {
  it('strips script tags', () => {
    expect(sanitizeString('<script>alert(1)</script>hello')).toBe('hello');
  });
  it('strips HTML tags', () => {
    expect(sanitizeString('<b>bold</b>')).toBe('bold');
  });
  it('trims whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
  });
  it('returns clean text unchanged', () => {
    expect(sanitizeString('plain text')).toBe('plain text');
  });
});

describe('formatZodErrors', () => {
  it('returns flat object with path.field: message', () => {
    const schema = z.object({ name: z.string().min(1), age: z.number() });
    const result = schema.safeParse({ name: '', age: 'bad' });
    if (!result.success) {
      const formatted = formatZodErrors(result.error);
      expect(typeof formatted).toBe('object');
      expect(Object.values(formatted).every((v) => typeof v === 'string')).toBe(true);
    }
  });
});