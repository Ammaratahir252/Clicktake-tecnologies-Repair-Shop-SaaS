import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Payment from '@/models/payment.model';
import Subscription from '@/models/subscription.model';

// POST/GET /api/payments/easypaisa/callback — EasyPaisa's postBackUrl target.
// Public/unauthenticated by design (the gateway calls this, not a logged-in user).
// Accepts both GET (query string redirect) and POST (server-to-server) since the
// exact callback delivery mechanism isn't confirmed yet without EasyPaisa's docs.
async function handleCallback(params: Record<string, string>) {
  await connectDB();

  const orderId = params.orderId || params.orderRefNum;
  if (!orderId) {
    return NextResponse.json({ success: false, message: 'Missing orderId' }, { status: 400 });
  }

  const payment = await Payment.findOne({ gatewayOrderId: orderId });
  if (!payment) {
    return NextResponse.json({ success: false, message: 'Unknown order' }, { status: 404 });
  }

  const succeeded = params.responseCode === '0000' || params.status === 'success' || params.success === 'true';
  payment.status = succeeded ? 'completed' : 'failed';
  payment.gatewayTransactionId = params.transactionId || payment.gatewayTransactionId;
  payment.rawResponse = params;
  if (!succeeded) payment.failureReason = params.responseDesc || 'Payment failed at gateway';
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

  return NextResponse.json({ success: true, message: succeeded ? 'Payment confirmed' : 'Payment marked failed' });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    return await handleCallback(body);
  } catch {
    return NextResponse.json({ success: false, message: 'Callback processing failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    return await handleCallback(params);
  } catch {
    return NextResponse.json({ success: false, message: 'Callback processing failed' }, { status: 500 });
  }
}
