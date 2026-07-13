import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import Session from '@/models/session.model';
import { sendResponse } from '@/utils/apiResponse';
import { canAccess } from '@/lib/adminAccess';
import { forceLogoutAllExceptSuperAdmin } from '@/lib/sessions';
import SystemLog from '@/models/systemLog.model';

// GET /api/admin/sessions — list recent login sessions (active + revoked, newest first)
export async function GET(req: NextRequest) {
  if (!canAccess(req, 'settings')) return sendResponse(false, 'Forbidden', null, 403);
  await connectDB();
  try {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 300);

    const query: any = activeOnly ? { revoked: false } : {};
    const sessions = await Session.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('userId', 'name email role')
      .populate('tenantId', 'name subdomain')
      .lean();

    return sendResponse(true, 'Sessions fetched', sessions);
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}

// POST /api/admin/sessions  body: { action: 'logout-all' }
// Force-logs-out every non-super-admin user on the platform. Real super_admin only.
export async function POST(req: NextRequest) {
  if (req.headers.get('x-role') !== 'super_admin') return sendResponse(false, 'Forbidden', null, 403);
  await connectDB();
  try {
    const { action } = await req.json();
    if (action !== 'logout-all') return sendResponse(false, 'Unknown action', null, 400);

    const count = await forceLogoutAllExceptSuperAdmin();
    await SystemLog.create({ category: 'monitor', message: `Force Logout Everyone triggered — ${count} user(s) signed out`, status: 'warning' });

    return sendResponse(true, `${count} user(s) signed out`, { count });
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}
