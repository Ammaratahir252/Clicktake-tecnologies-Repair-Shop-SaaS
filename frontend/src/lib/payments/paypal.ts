import 'server-only';

// ─── PayPal — REST Orders API v2 ───────────────────────────────────────────────
// No prior implementation existed anywhere in this repo to port from (the backend
// prototype aliases PayPal straight to a synchronous "cash" gateway placeholder) —
// this is a fresh implementation of PayPal's standard, publicly documented flow:
// OAuth2 client-credentials token exchange, then create an Order, then redirect the
// customer to the "approve" link PayPal returns. Capture happens in the callback
// route once PayPal redirects back.

export const PAYPAL_URLS = {
  sandbox: 'https://api-m.sandbox.paypal.com',
  live: 'https://api-m.paypal.com',
} as const;

export type PayPalMode = 'sandbox' | 'live';

export interface PayPalCredentials {
  clientId: string;
  clientSecret: string;
  mode: PayPalMode;
}

export interface PayPalTransactionParams {
  orderId: string;
  amount: number;
  currency?: string;
  returnUrl: string;
  cancelUrl: string;
}

export interface PayPalTransactionResult {
  success: boolean;
  transactionId?: string; // PayPal order id
  responseDesc?: string;
  redirectUrl?: string;
  rawResponse: unknown;
  error?: string;
}

async function getAccessToken(creds: PayPalCredentials): Promise<string> {
  const url = `${PAYPAL_URLS[creds.mode]}/v1/oauth2/token`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json().catch(() => ({} as any));
  if (!res.ok || !data?.access_token) {
    throw new Error(data?.error_description || `PayPal OAuth failed (HTTP ${res.status})`);
  }
  return data.access_token;
}

export async function createTransaction(
  creds: PayPalCredentials,
  params: PayPalTransactionParams
): Promise<PayPalTransactionResult> {
  if (!creds.clientId || !creds.clientSecret) {
    return {
      success: false,
      rawResponse: null,
      error: 'PayPal is not configured yet — missing client ID/secret. Add credentials before accepting live payments.',
    };
  }

  try {
    const accessToken = await getAccessToken(creds);
    const url = `${PAYPAL_URLS[creds.mode]}/v2/checkout/orders`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: params.orderId,
            amount: {
              currency_code: params.currency || 'USD',
              value: params.amount.toFixed(2),
            },
          },
        ],
        application_context: {
          return_url: params.returnUrl,
          cancel_url: params.cancelUrl,
          user_action: 'PAY_NOW',
        },
      }),
    });

    const data = await res.json().catch(() => ({} as any));
    if (!res.ok) {
      return {
        success: false,
        rawResponse: data,
        error: data?.message || `PayPal order creation failed (HTTP ${res.status})`,
      };
    }

    const approveLink = (data?.links || []).find((l: any) => l.rel === 'approve')?.href;
    return {
      success: true,
      transactionId: data.id,
      redirectUrl: approveLink,
      rawResponse: data,
    };
  } catch (err: any) {
    return { success: false, rawResponse: null, error: err?.message || 'PayPal request failed' };
  }
}

/** Captures a previously approved order — called from the callback route once the
 * customer approves payment and PayPal redirects back with ?token=<orderId>. */
export async function captureOrder(creds: PayPalCredentials, paypalOrderId: string) {
  const accessToken = await getAccessToken(creds);
  const res = await fetch(`${PAYPAL_URLS[creds.mode]}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  const data = await res.json().catch(() => ({} as any));
  return { ok: res.ok, data };
}
