import 'server-only';
import crypto from 'crypto';

// ─── JazzCash (Pakistan) — Mobile Wallet API ──────────────────────────────────
//
// NOTE ON CONFIDENCE: ported from this repo's own (disconnected) backend prototype
// at backend/src/modules/payments/gateways/jazzcash.gateway.ts, which itself was
// never verified against JazzCash's real merchant docs or a live sandbox account.
// Treat the field names/hash construction below as best-effort, same caveat as
// the EasyPaisa client — confirm once real sandbox credentials exist.

export const JAZZCASH_URLS = {
  uat: 'https://sandbox.jazzcash.com.pk/ApplicationAPI/API',
  live: 'https://payments.jazzcash.com.pk/ApplicationAPI/API',
} as const;

export type JazzCashEnvironment = 'uat' | 'live';

export interface JazzCashCredentials {
  merchantId: string;
  password: string;
  integritySalt: string;
  environment: JazzCashEnvironment;
}

export interface JazzCashTransactionParams {
  orderId: string;
  amount: number;
  description?: string;
  postBackUrl: string;
}

export interface JazzCashTransactionResult {
  success: boolean;
  transactionId?: string;
  responseCode?: string;
  responseDesc?: string;
  redirectUrl?: string;
  rawResponse: unknown;
  error?: string;
}

function missingCredentialFields(creds: Partial<JazzCashCredentials>): string[] {
  const required: (keyof JazzCashCredentials)[] = ['merchantId', 'password', 'integritySalt'];
  return required.filter((k) => !creds[k]);
}

function formatAmount(amount: number): string {
  return Math.round(amount * 100).toString(); // JazzCash amounts are in paisas
}

function getDateTime(offsetMs = 0): string {
  return new Date(Date.now() + offsetMs).toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
}

function generateHash(params: Record<string, string>, integritySalt: string): string {
  const sortedKeys = Object.keys(params).sort();
  const hashString = `${integritySalt}&${sortedKeys.map((k) => params[k]).join('&')}`;
  return crypto.createHmac('sha256', integritySalt).update(hashString).digest('hex').toUpperCase();
}

export async function createTransaction(
  creds: JazzCashCredentials,
  params: JazzCashTransactionParams
): Promise<JazzCashTransactionResult> {
  const missing = missingCredentialFields(creds);
  if (missing.length) {
    return {
      success: false,
      rawResponse: null,
      error: `JazzCash is not configured yet — missing: ${missing.join(', ')}. Add credentials before accepting live payments.`,
    };
  }

  try {
    const txnRefNo = `TXN${Date.now()}`;
    const fields: Record<string, string> = {
      pp_Version: '1.1',
      pp_TxnType: 'MWALLET',
      pp_Language: 'EN',
      pp_MerchantID: creds.merchantId,
      pp_Password: creds.password,
      pp_TxnRefNo: txnRefNo,
      pp_Amount: formatAmount(params.amount),
      pp_TxnCurrency: 'PKR',
      pp_TxnDateTime: getDateTime(),
      pp_BillReference: params.orderId,
      pp_Description: params.description || `Order ${params.orderId}`,
      pp_TxnExpiryDateTime: getDateTime(30 * 60 * 1000),
      pp_ReturnURL: params.postBackUrl,
    };
    fields.pp_SecureHash = generateHash(fields, creds.integritySalt);

    const url = `${JAZZCASH_URLS[creds.environment]}/2.0/Purchase/DoMWalletTransaction`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });

    const data = await res.json().catch(() => ({} as any));
    const code = data?.pp_ResponseCode;

    if (code === '000') {
      return {
        success: true,
        transactionId: data?.pp_RetreivalReferenceNo || txnRefNo,
        responseCode: code,
        responseDesc: data?.pp_ResponseMessage,
        rawResponse: data,
      };
    }
    if (code === '124') {
      // Awaiting customer OTP confirmation in their JazzCash app — same "pending,
      // no redirect" shape as EasyPaisa's mobile-account flow.
      return {
        success: true,
        transactionId: txnRefNo,
        responseCode: code,
        responseDesc: 'Enter the OTP sent to your JazzCash-registered number in your JazzCash app to complete this payment.',
        rawResponse: data,
      };
    }

    return {
      success: false,
      responseCode: code,
      rawResponse: data,
      error: data?.pp_ResponseMessage || `JazzCash transaction failed (HTTP ${res.status})`,
    };
  } catch (err: any) {
    return { success: false, rawResponse: null, error: err?.message || 'JazzCash request failed' };
  }
}
