import { NextRequest } from 'next/server';
import { sendResponse } from '@/utils/apiResponse';
import { createAuditLog } from '@/services/auditLog.service';
import { AUDIT_ACTIONS } from '@/models/auditLog.model';

// POST /api/activity/pageview — fire-and-forget navigation tracking for the
// per-user activity timeline (login → page views → actions).
export async function POST(req: NextRequest) {
  try {
    const { path } = await req.json();
    const rawTenantId = req.headers.get('x-tenant-id');
    const userId = req.headers.get('x-user-id');
    if (!userId || !path) {
      return sendResponse(false, 'Missing context', null, 400);
    }
    // super_admin has no tenantId of its own (unless impersonating) — fall back to
    // its own userId so the required AuditLog.tenantId field is always satisfied.
    const tenantId = rawTenantId || userId;

    createAuditLog({
      tenantId,
      userId,
      action: AUDIT_ACTIONS.PAGE_VIEW,
      entity: 'page',
      details: { path },
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
    });

    return sendResponse(true, 'Tracked');
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}
