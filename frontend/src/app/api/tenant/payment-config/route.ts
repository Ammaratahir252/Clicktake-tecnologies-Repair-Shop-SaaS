import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import TenantPaymentConfig from '@/models/tenantPaymentConfig.model';
import { sendResponse } from '@/utils/apiResponse';
import { encrypt } from '@/lib/crypto';

function getCtx(req: NextRequest) {
  return {
    tenantId: req.headers.get('x-tenant-id') ?? '',
    role:     req.headers.get('x-role')      ?? '',
  };
}

type GatewayKey = 'easypaisa' | 'jazzcash' | 'stripe' | 'paypal';
const GATEWAYS: GatewayKey[] = ['easypaisa', 'jazzcash', 'stripe', 'paypal'];

function maskGateway(gateway: GatewayKey, config: any) {
  const g = config?.[gateway] ?? {};
  switch (gateway) {
    case 'easypaisa':
      return {
        enabled: g.enabled ?? false,
        storeId: g.storeId ?? '',
        environment: g.environment ?? 'uat',
        hasHashKey: Boolean(g.hashKeyEnc),
        hasUsername: Boolean(g.usernameEnc),
        hasPassword: Boolean(g.passwordEnc),
      };
    case 'jazzcash':
      return {
        enabled: g.enabled ?? false,
        merchantId: g.merchantId ?? '',
        environment: g.environment ?? 'uat',
        hasPassword: Boolean(g.passwordEnc),
        hasIntegritySalt: Boolean(g.integritySaltEnc),
      };
    case 'stripe':
      return {
        enabled: g.enabled ?? false,
        publishableKey: g.publishableKey ?? '',
        hasSecretKey: Boolean(g.secretKeyEnc),
        hasWebhookSecret: Boolean(g.webhookSecretEnc),
      };
    case 'paypal':
      return {
        enabled: g.enabled ?? false,
        mode: g.mode ?? 'sandbox',
        hasClientId: Boolean(g.clientIdEnc),
        hasClientSecret: Boolean(g.clientSecretEnc),
      };
  }
}

// GET /api/tenant/payment-config — masked view for every gateway, never returns decrypted secrets.
export async function GET(req: NextRequest) {
  await connectDB();
  try {
    const { tenantId } = getCtx(req);
    if (!tenantId) return sendResponse(false, 'No shop associated with your account', null, 400);

    const config = await TenantPaymentConfig.findOne({ tenantId }).lean() as any;
    const data: Record<string, any> = {};
    for (const gw of GATEWAYS) data[gw] = maskGateway(gw, config);

    return sendResponse(true, 'Payment config fetched', data);
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}

// PATCH /api/tenant/payment-config — body: { gateway: 'easypaisa'|'jazzcash'|'stripe'|'paypal', ...fields }
// Owner/manager only. Blank/omitted secret fields keep the previously saved (encrypted) value.
export async function PATCH(req: NextRequest) {
  await connectDB();
  try {
    const { tenantId, role } = getCtx(req);
    if (!tenantId) return sendResponse(false, 'No shop associated with your account', null, 400);
    if (!['owner', 'manager'].includes(role)) {
      return sendResponse(false, 'Only owners and managers can configure payment gateways', null, 403);
    }

    const body = await req.json();
    const gateway = body.gateway as GatewayKey;
    if (!GATEWAYS.includes(gateway)) return sendResponse(false, 'Invalid gateway', null, 400);

    const $set: Record<string, any> = {};

    if (gateway === 'easypaisa') {
      const { enabled, storeId, hashKey, username, password, environment } = body;
      if (enabled !== undefined) $set['easypaisa.enabled'] = Boolean(enabled);
      if (storeId !== undefined) $set['easypaisa.storeId'] = String(storeId);
      if (environment && ['uat', 'live'].includes(environment)) $set['easypaisa.environment'] = environment;
      if (hashKey)  $set['easypaisa.hashKeyEnc']  = encrypt(String(hashKey));
      if (username) $set['easypaisa.usernameEnc'] = encrypt(String(username));
      if (password) $set['easypaisa.passwordEnc'] = encrypt(String(password));
    } else if (gateway === 'jazzcash') {
      const { enabled, merchantId, password, integritySalt, environment } = body;
      if (enabled !== undefined) $set['jazzcash.enabled'] = Boolean(enabled);
      if (merchantId !== undefined) $set['jazzcash.merchantId'] = String(merchantId);
      if (environment && ['uat', 'live'].includes(environment)) $set['jazzcash.environment'] = environment;
      if (password) $set['jazzcash.passwordEnc'] = encrypt(String(password));
      if (integritySalt) $set['jazzcash.integritySaltEnc'] = encrypt(String(integritySalt));
    } else if (gateway === 'stripe') {
      const { enabled, secretKey, publishableKey, webhookSecret } = body;
      if (enabled !== undefined) $set['stripe.enabled'] = Boolean(enabled);
      if (publishableKey !== undefined) $set['stripe.publishableKey'] = String(publishableKey);
      if (secretKey) $set['stripe.secretKeyEnc'] = encrypt(String(secretKey));
      if (webhookSecret) $set['stripe.webhookSecretEnc'] = encrypt(String(webhookSecret));
    } else if (gateway === 'paypal') {
      const { enabled, clientId, clientSecret, mode } = body;
      if (enabled !== undefined) $set['paypal.enabled'] = Boolean(enabled);
      if (mode && ['sandbox', 'live'].includes(mode)) $set['paypal.mode'] = mode;
      if (clientId) $set['paypal.clientIdEnc'] = encrypt(String(clientId));
      if (clientSecret) $set['paypal.clientSecretEnc'] = encrypt(String(clientSecret));
    }

    const updated = await TenantPaymentConfig.findOneAndUpdate(
      { tenantId },
      { $set, $setOnInsert: { tenantId } },
      { new: true, upsert: true }
    ).lean() as any;

    return sendResponse(true, 'Payment config saved', maskGateway(gateway, updated));
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}
