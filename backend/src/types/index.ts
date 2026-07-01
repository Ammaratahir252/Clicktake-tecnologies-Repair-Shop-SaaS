export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  OWNER       = 'owner',
  MANAGER     = 'manager',
  FRONTDESK   = 'frontdesk',
  DRIVER      = 'driver',
  CUSTOMER    = 'customer',
}

export enum AuditAction {
  CREATE = 'create',
  READ   = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  ESTIMATE_APPROVED = 'estimate_approved',
  ESTIMATE_REJECTED = 'estimate_rejected',
  INVOICE_GENERATED = 'invoice_generated',
  PAYMENT_CREATED   = 'payment_created',
  PAYMENT_REFUNDED  = 'payment_refunded',
}

declare module 'fastify' {
  interface FastifyRequest {
    tenantId:  string;
    ipAddress: string;
    user: {
      userId: string;
      role:   UserRole;
      email:  string;
    };
  }
}
export enum PaymentGateway {
  STRIPE       = 'stripe',
  JAZZCASH     = 'jazzcash',
  EASYPAISA    = 'easypaisa',
  CASH         = 'cash',
  BANK_TRANSFER = 'bank_transfer',
  PAYPAL       = 'paypal',
}

export enum PaymentStatus {
  PENDING    = 'pending',
  PAID       = 'paid',
  PARTIAL    = 'partial',
  REFUNDED   = 'refunded',
  FAILED     = 'failed',
  VOID       = 'void',
}