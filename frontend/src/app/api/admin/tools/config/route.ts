import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import PlatformSettings from '@/models/platformSettings.model';
import { sendResponse } from '@/utils/apiResponse';
import { canAccess } from '@/lib/adminAccess';
import SystemLog from '@/models/systemLog.model';

// GET /api/admin/tools/config — export current PlatformSettings as a downloadable JSON file
export async function GET(req: NextRequest) {
  if (!canAccess(req, 'settings')) return sendResponse(false, 'Forbidden', null, 403);
  await connectDB();
  try {
    const settings = await PlatformSettings.findOne().lean();
    const body = JSON.stringify(settings ?? {}, null, 2);
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="platform-settings-${Date.now()}.json"`,
      },
    });
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}

// POST /api/admin/tools/config  body: the exported settings JSON — imports it back in.
// Real super_admin only since this can silently change security-sensitive toggles.
export async function POST(req: NextRequest) {
  if (req.headers.get('x-role') !== 'super_admin') return sendResponse(false, 'Forbidden', null, 403);
  await connectDB();
  try {
    const body = await req.json();
    const { _id, __v, createdAt, updatedAt, ...safe } = body || {};
    if (Object.keys(safe).length === 0) return sendResponse(false, 'Empty or invalid configuration file', null, 400);

    const settings = await PlatformSettings.findOneAndUpdate({}, { $set: safe }, { new: true, upsert: true, runValidators: false }).lean();
    await SystemLog.create({ category: 'config', message: 'Platform configuration imported', status: 'warning', details: { keys: Object.keys(safe).length } });

    return sendResponse(true, 'Configuration imported', settings);
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}
