import { NextRequest } from 'next/server';
import { sendResponse } from '@/utils/apiResponse';
import { canAccess } from '@/lib/adminAccess';
import { sendEmail } from '@/lib/notifications';

// POST /api/admin/tools/test-email  body: { to }
export async function POST(req: NextRequest) {
  if (!canAccess(req, 'settings')) return sendResponse(false, 'Forbidden', null, 403);
  try {
    const { to } = await req.json();
    if (!to || !to.includes('@')) return sendResponse(false, 'A valid recipient email is required', null, 400);

    await sendEmail(to, 'Test Email from Platform Settings', '<p>This is a test email sent from Super Admin → Settings → Email to verify the currently active provider is working.</p>');
    return sendResponse(true, `Test email queued to ${to}`);
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}
