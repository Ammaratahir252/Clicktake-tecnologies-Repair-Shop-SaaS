import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import PlatformSettings from '@/models/platformSettings.model';

// GET /api/public/branding — unauthenticated, exposes only non-sensitive
// display/branding settings so pages can render before any user is logged in.
export async function GET() {
  try {
    await connectDB();
    const s = await PlatformSettings.findOne()
      .select('companyName footerText primaryColor secondaryColor logoUrl faviconUrl loginBackgroundUrl darkModeDefault timezone dateFormat timeFormat')
      .lean() as any;
    return NextResponse.json({ success: true, data: s ?? {} });
  } catch {
    return NextResponse.json({ success: true, data: {} });
  }
}
