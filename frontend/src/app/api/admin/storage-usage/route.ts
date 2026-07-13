import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import PlatformSettings from '@/models/platformSettings.model';
import { sendResponse } from '@/utils/apiResponse';
import { canAccess } from '@/lib/adminAccess';
import { getStorageUsageByTenant } from '@/lib/storageUsage';

// GET /api/admin/storage-usage — real per-tenant DB storage usage vs the configured cap
export async function GET(req: NextRequest) {
  if (!canAccess(req, 'settings')) return sendResponse(false, 'Forbidden', null, 403);
  await connectDB();
  try {
    const settings = await PlatformSettings.findOne().select('maxStoragePerTenantMb').lean() as any;
    const usages = await getStorageUsageByTenant(settings?.maxStoragePerTenantMb ?? 500);
    return sendResponse(true, 'Storage usage fetched', usages);
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}
