import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/user.model';
import Ticket from '@/models/ticket.model';
import Lead from '@/models/lead.model';

export async function GET(req: NextRequest) {
  const role = req.headers.get('x-role');

  if (role !== 'super_admin') {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
  }

  try {
    await connectDB();

    const [totalUsers, totalTickets, totalLeads, totalTenants, activeTenants] = await Promise.all([
      User.countDocuments(),
      Ticket.countDocuments(),
      Lead.countDocuments(),
      User.countDocuments({ role: 'owner' }),
      User.countDocuments({ role: 'owner', isActive: true }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalTenants,
        activeTenants,
        totalUsers,
        totalTickets,
        totalRevenue: 0,
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
