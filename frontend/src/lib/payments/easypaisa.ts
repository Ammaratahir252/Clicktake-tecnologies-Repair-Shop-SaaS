import 'server-only';

// ─── EasyPaisa (Pakistan) — IPG Token + Transaction API ───────────────────────
//
// NOTE ON CONFIDENCE: only the two endpoint URLs below were supplied by the
// merchant (no Postman collection / field-level API doc, no live credentials
// yet). The request/response shapes here follow the standard, documented
// pattern for this EasyPaisa IPG family (OAuth-style token, then an
// authenticated transaction call) and the env-var naming already established
// in this repo's (disconnected) backend gateway prototype. Treat the exact
// field names in `createTransaction`'s request body as the single place to
// correct once real API docs / a failed UAT call clarify the actual contract —
// everything else in the payment flow is independent of that detail.

export const EASYPAISA_URLS = {
  uat: {
    token: 'https://ipguat.apps.net.pk/Ecommerce/api/Transaction/GetAccessToken',
    transaction: 'https://ipguat.apps.net.pk/Ecommerce/api/Transaction/PostTransaction',
  },
  live: {
    token: 'https://ipg1.apps.net.pk/Ecommerce/api/Transaction/GetAccessToken',
    transaction: 'https://ipg1.apps.net.pk/Ecommerce/api/Transaction/PostTransaction',
  },
} as const;

export type EasyPaisaEnvironment = 'uat' | 'live';

export interface EasyPaisaCredentials {
  storeId: string;
  hashKey: string;
  username: string;
  password: string;
  environment: EasyPaisaEnvironment;
}

export interface EasyPaisaTransactionParams {
  orderId: string;
  amount: number;
  mobileAccountNo?: string;
  email?: string;
  postBackUrl: string;
}

export interface EasyPaisaTransactionResult {
  success: boolean;
  transactionId?: string;
  responseCode?: string;
  responseDesc?: string;
  redirectUrl?: string;
  rawResponse: unknown;
  error?: string;
}

function missingCredentialFields(creds: Partial<EasyPaisaCredentials>): string[] {
  const required: (keyof EasyPaisaCredentials)[] = ['storeId', 'hashKey', 'username', 'password'];
  return required.filter((k) => !creds[k]);
}

/** Step 1 — exchange merchant username/password for a bearer access token. */
export async function getAccessToken(creds: EasyPaisaCredentials): Promise<string> {
  const url = EASYPAISA_URLS[creds.environment].token;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${creds.username}:${creds.password}`).toString('base64')}`,
    },
    body: JSON.stringify({ username: creds.username, password: creds.password }),
  });

  const data = await res.json().catch(() => ({} as any));
  const token = data?.accessToken || data?.access_token || data?.token;
  if (!res.ok || !token) {
    throw new Error(data?.responseDesc || data?.message || `EasyPaisa GetAccessToken failed (HTTP ${res.status})`);
  }
  return token;
}

/** Step 2 — create the transaction using the token from getAccessToken(). Signs the
 * request with hashKey (HMAC-SHA256) following this gateway family's standard convention. */
export async function createTransaction(
  creds: EasyPaisaCredentials,
  params: EasyPaisaTransactionParams
): Promise<EasyPaisaTransactionResult> {
  const missing = missingCredentialFields(creds);
  if (missing.length) {
    return {
      success: false,
      rawResponse: null,
      error: `EasyPaisa is not configured yet — missing: ${missing.join(', ')}. Add credentials before accepting live payments.`,
    };
  }

  try {
    const accessToken = await getAccessToken(creds);
    const url = EASYPAISA_URLS[creds.environment].transaction;

    const crypto = await import('crypto');
    const signaturePayload = `amount=${params.amount.toFixed(2)}&orderId=${params.orderId}&storeId=${creds.storeId}`;
    const signature = crypto.createHmac('sha256', creds.hashKey).update(signaturePayload).digest('hex');

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        storeId: creds.storeId,
        orderId: params.orderId,
        transactionAmount: params.amount.toFixed(2),
        transactionType: params.mobileAccountNo ? 'MA' : 'OTC',
        mobileAccountNo: params.mobileAccountNo || '',
        emailAddress: params.email || '',
        postBackUrl: params.postBackUrl,
        signature,
      }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json().catch(() => ({} as any));
      const success = res.ok && (data?.responseCode === '0000' || data?.success === true);
      return {
        success,
        transactionId: data?.transactionId,
        responseCode: data?.responseCode,
        responseDesc: data?.responseDesc,
        redirectUrl: data?.redirectUrl || data?.redirectURL,
        rawResponse: data,
        error: success ? undefined : (data?.responseDesc || data?.message || `EasyPaisa PostTransaction failed (HTTP ${res.status})`),
      };
    }

    // Non-JSON response — some EasyPaisa integration variants return the hosted
    // checkout page HTML directly. Surface it so the caller can render/redirect.
    const html = await res.text();
    return {
      success: res.ok,
      redirectUrl: undefined,
      rawResponse: html,
      error: res.ok ? undefined : `EasyPaisa PostTransaction failed (HTTP ${res.status})`,
    };
  } catch (err: any) {
    return { success: false, rawResponse: null, error: err?.message || 'EasyPaisa request failed' };
  }
}
