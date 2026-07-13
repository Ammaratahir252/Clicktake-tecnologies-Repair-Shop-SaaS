import 'server-only';
import Stripe from 'stripe';

// ─── Stripe — Hosted Checkout Session ─────────────────────────────────────────
// Uses Stripe Checkout (a redirect to Stripe's own hosted payment page) rather than
// embedded Elements, so this gateway shares the exact same "redirectUrl or show an
// instruction message" contract as EasyPaisa/JazzCash/PayPal. Test vs live mode is
// determined entirely by the secret key prefix (sk_test_... vs sk_live_...) — there
// is no separate sandbox host, unlike the other three gateways.

export interface StripeCredentials {
  secretKey: string;
}

export interface StripeTransactionParams {
  orderId: string;
  amount: number;
  currency?: string;
  description?: string;
  successUrl: string;
  cancelUrl: string;
}

export interface StripeTransactionResult {
  success: boolean;
  transactionId?: string;
  responseDesc?: string;
  redirectUrl?: string;
  rawResponse: unknown;
  error?: string;
}

export async function createTransaction(
  creds: StripeCredentials,
  params: StripeTransactionParams
): Promise<StripeTransactionResult> {
  if (!creds.secretKey) {
    return {
      success: false,
      rawResponse: null,
      error: 'Stripe is not configured yet — missing secret key. Add credentials before accepting live payments.',
    };
  }

  try {
    const stripe = new Stripe(creds.secretKey);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: (params.currency || 'PKR').toLowerCase(),
            unit_amount: Math.round(params.amount * 100),
            product_data: { name: params.description || `Order ${params.orderId}` },
          },
          quantity: 1,
        },
      ],
      client_reference_id: params.orderId,
      success_url: `${params.successUrl}?orderId=${encodeURIComponent(params.orderId)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: params.cancelUrl,
    });

    return {
      success: true,
      transactionId: session.id,
      redirectUrl: session.url || undefined,
      rawResponse: session,
    };
  } catch (err: any) {
    return { success: false, rawResponse: null, error: err?.message || 'Stripe request failed' };
  }
}

/** Verifies a Checkout Session actually completed — called from the callback route
 * when Stripe redirects the customer back to success_url. */
export async function verifySession(secretKey: string, sessionId: string) {
  const stripe = new Stripe(secretKey);
  return stripe.checkout.sessions.retrieve(sessionId);
}
