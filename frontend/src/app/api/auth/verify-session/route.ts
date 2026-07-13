import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../lib/db';
import User from '../../../../models/user.model';
import PlatformSettings from '../../../../models/platformSettings.model';
import { isMaintenanceActive } from '../../../../lib/platformSettings';

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    await connectDB();

    // Piggyback on this same round trip (already fetched by middleware on every
    // authenticated request) so maintenance mode can be enforced site-wide —
    // both for new logins and sessions that were already active — with no
    // extra latency.
    const settings = await PlatformSettings.findOne().select('maintenanceMode maintenanceScheduledAt readOnlyMode emergencyLockdown').lean() as any;
    const maintenanceMode = isMaintenanceActive(settings ?? { maintenanceMode: false });
    const readOnlyMode = settings?.readOnlyMode ?? false;
    const emergencyLockdown = settings?.emergencyLockdown ?? false;

    if (!userId) return NextResponse.json({ tokenVersion: 0, maintenanceMode, readOnlyMode, emergencyLockdown });

    const user = await User.findById(userId).select('tokenVersion');
    return NextResponse.json({ tokenVersion: user?.tokenVersion || 0, maintenanceMode, readOnlyMode, emergencyLockdown });
  } catch {
    return NextResponse.json({ tokenVersion: 0, maintenanceMode: false, readOnlyMode: false, emergencyLockdown: false });
  }
}
