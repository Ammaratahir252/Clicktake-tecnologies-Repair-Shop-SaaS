import { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { sendResponse } from '@/utils/apiResponse';
import { canAccess } from '@/lib/adminAccess';
import connectDB from '@/lib/db';
import SystemLog from '@/models/systemLog.model';

// POST /api/admin/tools/cache-clear — invalidates Next.js's route cache platform-wide.
export async function POST(req: NextRequest) {
  if (!canAccess(req, 'settings')) return sendResponse(false, 'Forbidden', null, 403);
  try {
    revalidatePath('/', 'layout');
    await connectDB();
    await SystemLog.create({ category: 'cache', message: 'Cache cleared via Admin Tools', status: 'ok' });
    return sendResponse(true, 'Cache cleared');
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}
