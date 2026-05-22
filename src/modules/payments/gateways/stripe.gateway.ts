// ============================================================
// DibnowRepairSaaS — Stripe Gateway
// Handles: card payments, Apple Pay, Google Pay
// PCI-DSS: never touches raw card data — Stripe handles it
// ============================================================

import Stripe from 'stripe';
import { env } from '../../../config/env';
import { PaymentGateway } from '../../../types';
import { PaymentError } from '../../../errors';
import { paymentLogger } from '../../../utils/logger';
import {
  IPaymentGateway,
  PaymentGatewayInput,
  CreatePaymentResult,
  VerifyPaymentResult,
  RefundResult,
} from './gateway.interface';

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  typescript: true,
});

export class StripeGateway implements IPaymentGateway {
  gateway = PaymentGateway.STRIPE;

  async createPayment(input: PaymentGatewayInput): Promise<CreatePaymentResult> {
    try {
      // Amount in cents (Stripe requires smallest currency unit)
      const amountInCents = Math.round(input.amount * 100);

      const paymentIntent = await stripe.paymentIntents.create(
        {
          amount: amountInCents,
          currency: input.currency.toLowerCase(),
          description: input.description,
          metadata: {
            invoiceId: input.invoiceId,
            tenantId: input.tenantId,
            customerId: input.customerId,
            ...input.metadata,
          },
          // Auto payment methods: cards, Apple Pay, Google Pay
          automatic_payment_methods: { enabled: true },
          receipt_email: input.customerEmail,
        },
        {
          // Idempotency key prevents duplicate charges on retry
          idempotencyKey: input.idempotencyKey,
        }
      );

      paymentLogger.created(
        input.invoiceId,
        input.tenantId,
        'stripe',
        input.amount
      );

      return {
        gatewayPaymentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret || undefined,
        status: this.mapStripeStatus(paymentIntent.status) as 'pending' | 'paid' | 'failed',
        rawResponse: paymentIntent as unknown as Record<string, unknown>,
      };
    } catch (error) {
      const stripeError = error as Stripe.StripeRawError;
      paymentLogger.failed(
        input.invoiceId,
        input.tenantId,
        'stripe',
        stripeError.code || 'unknown'
      );
      throw new PaymentError(
        stripeError.message || 'Stripe payment failed',
        stripeError.code
      );
    }
  }

  async verifyPayment(gatewayPaymentId: string): Promise<VerifyPaymentResult> {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(gatewayPaymentId);

      return {
        gatewayPaymentId: paymentIntent.id,
        status: this.mapStripeStatus(paymentIntent.status) as 'pending' | 'paid' | 'failed',
        amount: paymentIntent.amount / 100, // convert cents back to dollars
        currency: paymentIntent.currency.toUpperCase(),
        paidAt: paymentIntent.status === 'succeeded'
          ? new Date(paymentIntent.created * 1000)
          : undefined,
        rawResponse: paymentIntent as unknown as Record<string, unknown>,
      };
    } catch (error) {
      const stripeError = error as Stripe.StripeRawError;
      throw new PaymentError(
        stripeError.message || 'Payment verification failed',
        stripeError.code
      );
    }
  }

  async refundPayment(
    gatewayPaymentId: string,
    amount: number,
    reason: string
  ): Promise<RefundResult> {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: gatewayPaymentId,
        amount: Math.round(amount * 100), // convert to cents
        reason: 'requested_by_customer',
        metadata: { reason },
      });

      return {
        gatewayRefundId: refund.id,
        status: refund.status === 'succeeded' ? 'processed' : 'failed',
        amount: refund.amount / 100,
        rawResponse: refund as unknown as Record<string, unknown>,
      };
    } catch (error) {
      const stripeError = error as Stripe.StripeRawError;
      throw new PaymentError(
        stripeError.message || 'Refund failed',
        stripeError.code
      );
    }
  }

  // ─── Verify Stripe webhook signature ─────────────────────
  verifyWebhook(payload: Buffer, signature: string): Stripe.Event {
    try {
      return stripe.webhooks.constructEvent(
        payload,
        signature,
        env.STRIPE_WEBHOOK_SECRET
      );
    } catch {
      throw new PaymentError('Invalid Stripe webhook signature');
    }
  }

  private mapStripeStatus(
    status: Stripe.PaymentIntent.Status
  ): 'pending' | 'paid' | 'failed' | 'processing' {
    const map: Record<string, 'pending' | 'processing' | 'paid' | 'failed'> = {
      requires_payment_method: 'pending',
      requires_confirmation: 'pending',
      requires_action: 'pending',
      processing: 'pending',
      succeeded: 'paid',
      canceled: 'failed',
      requires_capture: 'pending',
    };
    return map[status] || 'pending';
  }
}

export const stripeGateway = new StripeGateway();
