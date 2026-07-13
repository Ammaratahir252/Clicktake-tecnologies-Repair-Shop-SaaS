import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Payment from '@/models/payment.model';
import Subscription from '@/models/subscription.model';
import TenantPaymentConfig from '@/models/tenantPaymentConfig.model';
import { decrypt } from '@/lib/crypto';
import { captureOrder, PayPalMode } from '@/lib/payments/paypal';

// GET /api/payments/paypal/callback — PayPal's return_url target (after the customer
// approves payment in PayPal's UI). Public/unauthenticated by design — a real browser
// navigation, so this renders a small HTML result page rather than JSON.
function resultPage(success: boolean, message: string) {
  return new NextResponse(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Payment ${success ? 'Successful' : 'Failed'}</title>
<meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;font-family:system-ui,sans-serif;background:#f8fafc;display:flex;align-items:center;justify-content:center;min-height:100vh;">
<div style="text-align:center;max-width:420px;padding:24px;">
<h1 style="font-size:22px;color:${success ? '#065f46' : '#dc2626'};margin-bottom:8px;">${success ? 'Payment Successful' : 'Payment Failed'}</h1>
<p style="color:#64748b;font-size:14px;">${message}</p>
<a href="/dashboard" style="display:inline-block;margin-top:20px;background:#1d4ed8;color:#fff;padding:10px 20px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">Return to dashboard</a>
</div></body></html>`,
    { status: 200, headers: { 'content-type': 'text/html' } }
  );
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const orderId = req.nextUrl.searchParams.get('orderId');
    const paypalOrderId = req.nextUrl.searchParams.get('token'); // PayPal's own order id
    if (!orderId || !paypalOrderId) return resultPage(false, 'Missing payment reference.');

    const payment = await Payment.findOne({ gatewayOrderId: orderId });
    if (!payment) return resultPage(false, 'Unknown order.');

    const mode = (payment.environment as PayPalMode) || 'sandbox';
    let clientId = process.env.PAYPAL_CLIENT_ID || '';
    let clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';

    if (payment.kind !== 'subscription') {
      const config = await TenantPaymentConfig.findOne({ tenantId: payment.tenantId }).lean() as any;
      clientId = config?.paypal?.clientIdEnc ? decrypt(config.paypal.clientIdEnc) : '';
      clientSecret = config?.paypal?.clientSecretEnc ? decrypt(config.paypal.clientSecretEnc) : '';
    }

    if (!clientId || !clientSecret) return resultPage(false, 'PayPal is not configured for this order.');

    const { ok, data } = await captureOrder({ clientId, clientSecret, mode }, paypalOrderId);
    const succeeded = ok && data?.status === 'COMPLETED';

    payment.status = succeeded ? 'completed' : 'failed';
    payment.rawResponse = data;
    if (!succeeded) payment.failureReason = data?.message || `PayPal capture status: ${data?.status}`;
    await payment.save();

    if (succeeded && payment.kind === 'subscription') {
      const subscription = await Subscription.findById(payment.referenceId);
      if (subscription) {
        const cycleMs = subscription.billingCycle === 'annual' ? 365 * 86_400_000 : 30 * 86_400_000;
        subscription.status = 'active';
        subscription.nextBillingDate = new Date(Date.now() + cycleMs);
        await subscription.save();
      }
    }

    return resultPage(succeeded, succeeded ? 'Your payment was completed successfully.' : 'Your payment could not be confirmed.');
  } catch {
    return resultPage(false, 'Something went wrong while confirming your payment.');
  }
}
