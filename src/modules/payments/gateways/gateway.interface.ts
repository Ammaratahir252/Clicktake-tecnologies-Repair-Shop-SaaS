// ============================================================
// DibnowRepairSaaS — Payment Gateway Abstraction Layer
// Every gateway implements IPaymentGateway interface
// Switch gateways without changing business logic
// ============================================================

import { PaymentGateway } from '../../../types';

// ─── Standard result types ────────────────────────────────────
export interface CreatePaymentResult {
  gatewayPaymentId: string;   // Stripe PaymentIntent ID, PayPal order ID etc
  gatewayOrderId?: string;
  clientSecret?: string;      // Stripe client secret for frontend confirmation
  redirectUrl?: string;       // PayPal / JazzCash redirect URL
  status: 'pending' | 'paid' | 'failed' | 'processing';
  rawResponse: Record<string, unknown>;
}

export interface VerifyPaymentResult {
  gatewayPaymentId: string;
  status: 'paid' | 'failed' | 'pending';
  amount: number;
  currency: string;
  paidAt?: Date;
  rawResponse: Record<string, unknown>;
}

export interface RefundResult {
  gatewayRefundId: string;
  status: 'processed' | 'failed';
  amount: number;
  rawResponse: Record<string, unknown>;
}

export interface PaymentGatewayInput {
  amount: number;           // in smallest currency unit (cents for USD)
  currency: string;
  invoiceId: string;
  tenantId: string;
  customerId: string;
  description: string;
  idempotencyKey: string;
  customerEmail?: string;
  customerName?: string;
  metadata?: Record<string, string>;
}

// ─── Gateway Interface — all gateways must implement this ─────
export interface IPaymentGateway {
  gateway: PaymentGateway;
  createPayment(input: PaymentGatewayInput): Promise<CreatePaymentResult>;
  verifyPayment(gatewayPaymentId: string): Promise<VerifyPaymentResult>;
  refundPayment(gatewayPaymentId: string, amount: number, reason: string): Promise<RefundResult>;
}
