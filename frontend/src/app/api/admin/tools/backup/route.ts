import { NextRequest, NextResponse } from 'next/server';
import { sendResponse } from '@/utils/apiResponse';
import { canAccess } from '@/lib/adminAccess';
import { createBackup, listBackups, readBackupFile, restoreBackup } from '@/lib/backup';

// GET /api/admin/tools/backup — list backups; ?download=<filename> to fetch one
export async function GET(req: NextRequest) {
  if (!canAccess(req, 'settings')) return sendResponse(false, 'Forbidden', null, 403);
  try {
    const { searchParams } = new URL(req.url);
    const download = searchParams.get('download');
    if (download) {
      const content = await readBackupFile(download);
      return new NextResponse(content, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${download}"`,
        },
      });
    }
    const backups = await listBackups();
    return sendResponse(true, 'Backups listed', backups);
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}

// POST /api/admin/tools/backup  body: { action: 'create' | 'restore', filename? }
export async function POST(req: NextRequest) {
  if (!canAccess(req, 'settings')) return sendResponse(false, 'Forbidden', null, 403);
  try {
    const { action, filename } = await req.json();
    if (action === 'create') {
      const result = await createBackup();
      return sendResponse(true, `Backup created: ${result.filename}`, result);
    }
    if (action === 'restore') {
      if (req.headers.get('x-role') !== 'super_admin') return sendResponse(false, 'Only a super admin can restore a backup', null, 403);
      if (!filename) return sendResponse(false, 'filename is required', null, 400);
      const counts = await restoreBackup(filename);
      return sendResponse(true, 'Backup restored', counts);
    }
    return sendResponse(false, 'Unknown action', null, 400);
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}
