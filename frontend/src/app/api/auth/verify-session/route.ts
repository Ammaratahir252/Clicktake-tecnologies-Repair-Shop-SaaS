import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../lib/db';
import User from '../../../../models/user.model';
import PlatformSettings from '../../../../models/platformSettings.model';
import { isMaintenanceActive } from '../../../../lib/platformSettings';
import { isIpWhitelisted } from '../../../../lib/ipWhitelist';

// Next would otherwise prerender this route as STATIC at build time (it reads
// no headers/cookies), freezing tokenVersion at 0 forever — which makes the
// middleware treat every user whose tokenVersion was ever bumped as revoked.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    // Client IP as seen by the middleware that called us — this inner fetch's own
    // x-forwarded-for is the server, so the middleware forwards the real one.
    const clientIp = req.nextUrl.searchParams.get('ip');
    await connectDB();

    // Piggyback on this same round trip (already fetched by middleware on every
    // authenticated request) so maintenance mode can be enforced site-wide —
    // both for new logins and sessions that were already active — with no
    // extra latency.
    const settings = await PlatformSettings.findOne().select('maintenanceMode maintenanceScheduledAt readOnlyMode emergencyLockdown adminIpWhitelist featureFlags').lean() as any;
    const maintenanceMode = isMaintenanceActive(settings ?? { maintenanceMode: false });
    const readOnlyMode = settings?.readOnlyMode ?? false;
    const emergencyLockdown = settings?.emergencyLockdown ?? false;
    // Feature flags ride along so the middleware can enforce them server-side
    // (nav hiding alone is cosmetic — direct URLs/API calls must be blocked too).
    const flags = {
      enableAI: true, enableTickets: true, enableInventory: true,
      enableReports: true, enableCustomerPortal: true, enableAnalytics: true,
      ...(settings?.featureFlags ?? {}),
    };

    // No userId → nothing to validate; omit tokenVersion so the middleware
    // skips the version check instead of treating the session as revoked.
    if (!userId) return NextResponse.json({ maintenanceMode, readOnlyMode, emergencyLockdown, ipBlocked: false, flags });

    const user = await User.findById(userId).select('tokenVersion role');

    // Super-admin IP whitelist applies to ACTIVE sessions, not just logins —
    // fails closed when the list is non-empty and the IP is missing/unknown.
    const whitelist: string[] = settings?.adminIpWhitelist ?? [];
    const ipBlocked =
      user?.role === 'super_admin' &&
      whitelist.length > 0 &&
      !isIpWhitelisted(clientIp, whitelist);

    return NextResponse.json({ tokenVersion: user?.tokenVersion || 0, maintenanceMode, readOnlyMode, emergencyLockdown, ipBlocked, flags });
  } catch {
    // DB error — fail open WITHOUT a tokenVersion: reporting 0 here would make
    // the middleware revoke every session whose version was ever bumped.
    return NextResponse.json({ maintenanceMode: false, readOnlyMode: false, emergencyLockdown: false, ipBlocked: false, flags: null });
  }
}
