import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Tenant from '@/models/tenant.model';
import Subscription from '@/models/subscription.model';

// GET /api/public/shops — unauthenticated. Lists shops that opted into the public
// homepage directory (isPubliclyVisible), excluding suspended/cancelled subscriptions
// even if the tenant itself is still marked isActive.
export async function GET() {
  try {
    await connectDB();

    const suspended = await Subscription.find({ status: { $in: ['suspended', 'cancelled'] } })
      .select('tenantId').lean();
    const excludedIds = suspended.map((s) => s.tenantId);

    const shops = await Tenant.find({
      isActive: true,
      isPubliclyVisible: true,
      _id: { $nin: excludedIds },
    })
      .select('name subdomain logo tagline city description')
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({ success: true, data: shops });
  } catch {
    return NextResponse.json({ success: true, data: [] });
  }
}
