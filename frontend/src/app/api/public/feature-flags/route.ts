import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import PlatformSettings from '@/models/platformSettings.model';

const DEFAULTS = {
  enableAI: true,
  enableTickets: true,
  enableInventory: true,
  enableReports: true,
  enableCustomerPortal: true,
  enableAnalytics: true,
};

// GET /api/public/feature-flags — unauthenticated (any logged-in role needs this
// to know which nav sections to render, and it's not sensitive information).
export async function GET() {
  try {
    await connectDB();
    const s = await PlatformSettings.findOne().select('featureFlags').lean() as any;
    return NextResponse.json({ success: true, data: { ...DEFAULTS, ...(s?.featureFlags ?? {}) } });
  } catch {
    return NextResponse.json({ success: true, data: DEFAULTS });
  }
}
