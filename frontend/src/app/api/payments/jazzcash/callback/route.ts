import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Payment from '@/models/payment.model';
import Subscription from '@/models/subscription.model';

// POST/GET /api/payments/jazzcash/callback — JazzCash's pp_ReturnURL target.
// Public/unauthenticated by design (the gateway calls this, not a logged-in user).
async function handleCallback(params: Record<string, string>) {
  await connectDB();

  const orderId = params.pp_BillReference || params.orderId;
  if (!orderId) {
    return NextResponse.json({ success: false, message: 'Missing orderId' }, { status: 400 });
  }

  const payment = await Payment.findOne({ gatewayOrderId: orderId });
  if (!payment) {
    return NextResponse.json({ success: false, message: 'Unknown order' }, { status: 404 });
  }

  const succeeded = params.pp_ResponseCode === '000';
  payment.status = succeeded ? 'completed' : 'failed';
  payment.gatewayTransactionId = params.pp_RetreivalReferenceNo || payment.gatewayTransactionId;
  payment.rawResponse = params;
  if (!succeeded) payment.failureReason = params.pp_ResponseMessage || 'Payment failed at gateway';
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
