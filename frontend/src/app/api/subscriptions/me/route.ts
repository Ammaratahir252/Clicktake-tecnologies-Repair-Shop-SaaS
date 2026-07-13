import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import Subscription from '@/models/subscription.model';
import { sendResponse } from '@/utils/apiResponse';

// GET /api/subscriptions/me — the calling tenant's own subscription/billing status.
export async function GET(req: NextRequest) {
  await connectDB();
  try {
    const tenantId = req.headers.get('x-tenant-id') ?? '';
    const role = req.headers.get('x-role') ?? '';
    if (!tenantId) return sendResponse(false, 'No shop associated with your account', null, 400);
    if (!['owner', 'manager'].includes(role)) return sendResponse(false, 'Forbidden', null, 403);

    const subscription = await Subscription.findOne({ tenantId }).lean();
    return sendResponse(true, 'Subscription fetched', subscription ?? null);
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}
