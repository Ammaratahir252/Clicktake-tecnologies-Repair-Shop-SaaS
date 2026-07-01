import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import PlatformSettings from '@/models/platformSettings.model';
import { sendResponse } from '@/utils/apiResponse';

function isSuperAdmin(req: NextRequest) {
  return req.headers.get('x-role') === 'super_admin';
}

export async function GET(req: NextRequest) {
  if (!isSuperAdmin(req)) return sendResponse(false, 'Forbidden', null, 403);
  await connectDB();
  try {
    let settings = await PlatformSettings.findOne().lean();
    if (!settings) {
      settings = await PlatformSettings.create({});
      settings = (settings as any).toObject();
    }
    return sendResponse(true, 'Settings fetched', settings);
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}

export async function PATCH(req: NextRequest) {
  if (!isSuperAdmin(req)) return sendResponse(false, 'Forbidden', null, 403);
  await connectDB();
  try {
    const body = await req.json();
    const settings = await PlatformSettings.findOneAndUpdate(
      {},
      { $set: body },
      { new: true, upsert: true, runValidators: false }
    ).lean();
    return sendResponse(true, 'Settings saved', settings);
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}
