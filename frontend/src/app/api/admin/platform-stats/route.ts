import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/user.model';
import Ticket from '@/models/ticket.model';
import Lead from '@/models/lead.model';
import Tenant from '@/models/tenant.model';
import { isAdminTier } from '@/lib/adminAccess';

export async function GET(req: NextRequest) {
  if (!isAdminTier(req)) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
  }

  try {
    await connectDB();

    const [totalUsers, totalTickets, totalLeads, tenantAgg, revenueAgg] = await Promise.all([
      User.countDocuments(),
      Ticket.countDocuments(),
      Lead.countDocuments(),
      Tenant.aggregate([
        { $group: { _id: null, total: { $sum: 1 }, active: { $sum: { $cond: ['$isActive', 1, 0] } } } },
      ]),
      Ticket.aggregate([
        { $group: { _id: null, revenue: { $sum: { $ifNull: ['$estimateAmount', 0] } } } },
      ]),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalTenants:  tenantAgg[0]?.total  ?? 0,
        activeTenants: tenantAgg[0]?.active ?? 0,
        totalUsers,
        totalTickets,
        totalRevenue:  revenueAgg[0]?.revenue ?? 0,
        totalLeads,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Failed to load platform stats' },
      { status: 500 }
    );
  }
}
