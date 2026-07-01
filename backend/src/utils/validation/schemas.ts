// ============================================================
// DibnowRepairSaaS — Shared Zod Validation Schemas
// Import these in individual module validation files
// ============================================================

import { z } from 'zod';
import { UserRole, PaymentGateway, PaymentStatus } from '../../types';

// ─── Primitives ───────────────────────────────────────────────
export const mongoIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Invalid MongoDB ObjectId');

export const uuidSchema = z
  .string()
  .uuid('Invalid UUID format');

export const tenantIdSchema = mongoIdSchema;

export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{7,14}$/, 'Invalid phone number format');

export const emailSchema = z
  .string()
  .email('Invalid email address')
  .toLowerCase()
  .trim();

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const currencyAmountSchema = z
  .number()
  .positive('Amount must be positive')
  .multipleOf(0.01, 'Amount must have max 2 decimal places');

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ─── Auth Schemas ─────────────────────────────────────────────
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

export const registerSchema = z.object({
  shopName: z.string().min(2).max(100).trim(),
  ownerName: z.string().min(2).max(100).trim(),
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema,
  subdomain: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Subdomain can only contain lowercase letters, numbers, and hyphens')
    .toLowerCase(),
  timezone: z.string().default('UTC'),
  currency: z.string().length(3).default('USD'),
});

export const passwordResetRequestSchema = z.object({
  email: emailSchema,
});

export const passwordResetSchema = z.object({
  token: z.string().min(1),
  newPassword: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export const totpVerifySchema = z.object({
  token: z.string().length(6).regex(/^\d+$/, 'TOTP must be 6 digits'),
});

// ─── Invite User Schema ───────────────────────────────────────
export const inviteUserSchema = z.object({
  email: emailSchema,
  role: z.nativeEnum(UserRole).refine(
    (val) => val !== UserRole.SUPER_ADMIN && val !== UserRole.CUSTOMER,
    { message: 'Cannot invite users with this role' }
  ),
  name: z.string().min(2).max(100).trim(),
});

// ─── Billing / Estimate Schemas ───────────────────────────────
export const lineItemSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  type: z.enum(['part', 'labor', 'service', 'fee']),
  quantity: z.number().int().positive(),
  unitPrice: currencyAmountSchema,
  partId: mongoIdSchema.optional(), // links to M3 inventory
  description: z.string().max(500).optional(),
});

export const createEstimateSchema = z.object({
  ticketId: mongoIdSchema,
  customerId: mongoIdSchema,
  lineItems: z.array(lineItemSchema).min(1, 'At least one line item required'),
  taxRate: z.number().min(0).max(100).default(0),
  discountType: z.enum(['percentage', 'fixed']).optional(),
  discountValue: z.number().min(0).optional(),
  notes: z.string().max(1000).optional(),
  validUntil: z.string().datetime().optional(),
  currency: z.string().length(3).default('USD'),
});

export const approveEstimateSchema = z.object({
  action: z.enum(['approve', 'reject']),
  customerSignature: z.string().optional(), // base64 signature image
  rejectionReason: z.string().max(500).optional(),
});

export const createInvoiceSchema = z.object({
  estimateId: uuidSchema,
  notes: z.string().max(1000).optional(),
});

// ─── Payment Schemas ──────────────────────────────────────────
export const createPaymentSchema = z.object({
  invoiceId: uuidSchema,
  gateway: z.nativeEnum(PaymentGateway),
  amount: currencyAmountSchema,
  currency: z.string().length(3).default('USD'),
  // For cash/bank transfer — no gateway token needed
  referenceNote: z.string().max(200).optional(),
});

export const refundPaymentSchema = z.object({
  paymentId: uuidSchema,
  amount: currencyAmountSchema.optional(), // optional = full refund
  reason: z.string().max(500),
});

// ─── File Upload Schema ───────────────────────────────────────
export const fileUploadSchema = z.object({
  entityType: z.enum(['ticket', 'invoice', 'inventory', 'customer', 'logo']),
  entityId: mongoIdSchema,
});

// ─── Sanitization helper ──────────────────────────────────────
// Strip HTML tags from string inputs to prevent XSS
export const sanitizeString = (input: string): string => {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
};

// ─── Zod error formatter → ApiResponse ValidationError[] ─────
export const formatZodErrors = (
  error: z.ZodError
): Record<string, string> => {
  const formatted: Record<string, string> = {};
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    formatted[path] = err.message;
  });
  return formatted;
};
