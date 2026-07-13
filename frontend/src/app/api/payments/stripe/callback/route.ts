import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Payment from '@/models/payment.model';
import Subscription from '@/models/subscription.model';
import TenantPaymentConfig from '@/models/tenantPaymentConfig.model';
import { decrypt } from '@/lib/crypto';
import { verifySession } from '@/lib/payments/stripe';

// GET /api/payments/stripe/callback — Stripe Checkout's success_url target. Public/
// unauthenticated by design (the customer's browser lands here after paying).
// Unlike the other gateways' POST-based callbacks, this is a real browser navigation,
// so it renders a small HTML result page instead of returning JSON.
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
    const sessionId = req.nextUrl.searchParams.get('session_id');
    if (!orderId || !sessionId) return resultPage(false, 'Missing payment reference.');

    const payment = await Payment.findOne({ gatewayOrderId: orderId });
    if (!payment) return resultPage(false, 'Unknown order.');

    const secretKey = payment.kind === 'subscription'
      ? process.env.STRIPE_SECRET_KEY || ''
      : await (async () => {
          const config = await TenantPaymentConfig.findOne({ tenantId: payment.tenantId }).lean() as any;
          const enc = config?.stripe?.secretKeyEnc;
          return enc ? decrypt(enc) : '';
        })();

    if (!secretKey) return resultPage(false, 'Stripe is not configured for this order.');

    const session = await verifySession(secretKey, sessionId);
    const succeeded = session.payment_status === 'paid';

    payment.status = succeeded ? 'completed' : 'failed';
    payment.rawResponse = session as any;
    if (!succeeded) payment.failureReason = `Checkout session status: ${session.payment_status}`;
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
