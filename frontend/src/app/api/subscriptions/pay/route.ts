import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import Subscription from '@/models/subscription.model';
import Payment from '@/models/payment.model';
import { sendResponse } from '@/utils/apiResponse';
import { createTransaction as createEasyPaisaTransaction, EasyPaisaEnvironment } from '@/lib/payments/easypaisa';
import { createTransaction as createJazzCashTransaction, JazzCashEnvironment } from '@/lib/payments/jazzcash';
import { createTransaction as createStripeTransaction } from '@/lib/payments/stripe';
import { createTransaction as createPayPalTransaction, PayPalMode } from '@/lib/payments/paypal';

type Gateway = 'easypaisa' | 'jazzcash' | 'stripe' | 'paypal';

// POST /api/subscriptions/pay — shop owner pays their platform subscription via the
// platform's own gateway accounts (env-configured, not per-tenant). Body: { gateway }.
export async function POST(req: NextRequest) {
  await connectDB();
  try {
    const tenantId = req.headers.get('x-tenant-id') ?? '';
    const role = req.headers.get('x-role') ?? '';
    if (!tenantId) return sendResponse(false, 'No shop associated with your account', null, 400);
    if (!['owner', 'manager'].includes(role)) return sendResponse(false, 'Forbidden', null, 403);

    const body = await req.json().catch(() => ({}));
    const gateway: Gateway = (['easypaisa', 'jazzcash', 'stripe', 'paypal'].includes(body?.gateway) ? body.gateway : 'easypaisa');

    const subscription = await Subscription.findOne({ tenantId });
    if (!subscription) return sendResponse(false, 'No subscription found for this shop', null, 404);
    if (!subscription.amount || subscription.amount <= 0) {
      return sendResponse(false, 'This plan has no payable amount', null, 400);
    }

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const orderId = `SUB-${subscription._id}-${Date.now()}`;

    let environment = 'uat';
    if (gateway === 'stripe') environment = 'test';
    if (gateway === 'paypal') environment = (process.env.PAYPAL_MODE as PayPalMode) || 'sandbox';
    if (gateway === 'jazzcash') environment = (process.env.JAZZCASH_ENVIRONMENT as JazzCashEnvironment) || 'uat';
    if (gateway === 'easypaisa') environment = (process.env.EASYPAISA_ENVIRONMENT as EasyPaisaEnvironment) || 'uat';

    const payment = await Payment.create({
      tenantId,
      kind: 'subscription',
      referenceId: subscription._id,
      amount: subscription.amount,
      currency: gateway === 'paypal' ? 'USD' : (subscription.currency || 'PKR'),
      gateway,
      environment,
      status: 'pending',
      gatewayOrderId: orderId,
    });

    let result;
    if (gateway === 'easypaisa') {
      result = await createEasyPaisaTransaction(
        {
          storeId: process.env.EASYPAISA_STORE_ID || '',
          hashKey: process.env.EASYPAISA_HASH_KEY || '',
          username: process.env.EASYPAISA_USERNAME || '',
          password: process.env.EASYPAISA_PASSWORD || '',
          environment: environment as EasyPaisaEnvironment,
        },
        { orderId, amount: subscription.amount, postBackUrl: `${appUrl}/api/payments/easypaisa/callback` }
      );
    } else if (gateway === 'jazzcash') {
      result = await createJazzCashTransaction(
        {
          merchantId: process.env.JAZZCASH_MERCHANT_ID || '',
          password: process.env.JAZZCASH_PASSWORD || '',
          integritySalt: process.env.JAZZCASH_INTEGRITY_SALT || '',
          environment: environment as JazzCashEnvironment,
        },
        { orderId, amount: subscription.amount, postBackUrl: `${appUrl}/api/payments/jazzcash/callback` }
      );
    } else if (gateway === 'stripe') {
      result = await createStripeTransaction(
        { secretKey: process.env.STRIPE_SECRET_KEY || '' },
        {
          orderId,
          amount: subscription.amount,
          currency: subscription.currency || 'PKR',
          description: `${subscription.plan} plan subscription`,
          successUrl: `${appUrl}/api/payments/stripe/callback`,
          cancelUrl: `${appUrl}/dashboard/owner/settings`,
        }
      );
    } else {
      result = await createPayPalTransaction(
        {
          clientId: process.env.PAYPAL_CLIENT_ID || '',
          clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
          mode: environment as PayPalMode,
        },
        {
          orderId,
          amount: subscription.amount,
          returnUrl: `${appUrl}/api/payments/paypal/callback?orderId=${encodeURIComponent(orderId)}`,
          cancelUrl: `${appUrl}/dashboard/owner/settings`,
        }
      );
    }

    if (!result.success) {
      payment.status = 'failed';
      payment.failureReason = result.error;
      payment.rawResponse = result.rawResponse as any;
      await payment.save();
      return sendResponse(false, result.error || 'Payment could not be started', null, 502);
    }

    payment.rawResponse = result.rawResponse as any;
    payment.gatewayTransactionId = result.transactionId;
    await payment.save();

    return sendResponse(true, 'Payment initiated', {
      paymentId: payment._id,
      redirectUrl: result.redirectUrl,
      responseDesc: result.responseDesc,
    });
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}
