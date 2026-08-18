import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import Report from '@/models/report.model';
import { sendResponse } from '@/utils/apiResponse';

const ALLOWED_ROLES = new Set(['owner', 'manager']);

function getCtx(req: NextRequest) {
  return {
    tenantId: req.headers.get('x-tenant-id') ?? '',
    role:     req.headers.get('x-role')      ?? '',
  };
}

// PATCH /api/reports/:id — edit a report (any owner/manager on the tenant, not just the author)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await connectDB();
  try {
    const { tenantId, role } = getCtx(req);
    if (!ALLOWED_ROLES.has(role)) return sendResponse(false, 'Forbidden', null, 403);
    if (!tenantId) return sendResponse(false, 'Unauthorized', null, 401);

    const body = await req.json();
    const { title, body: content, periodStart, periodEnd } = body;

    const update: Record<string, unknown> = {};
    if (title !== undefined) update.title = String(title).trim();
    if (content !== undefined) update.body = String(content).trim();
    if (periodStart !== undefined) update.periodStart = periodStart ? new Date(periodStart) : null;
    if (periodEnd !== undefined) update.periodEnd = periodEnd ? new Date(periodEnd) : null;

    const report = await Report.findOneAndUpdate(
      { _id: params.id, tenantId },
      { $set: update },
      { new: true }
    );
    if (!report) return sendResponse(false, 'Report not found', null, 404);
    return sendResponse(true, 'Report updated', report);
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}

// DELETE /api/reports/:id
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await connectDB();
  try {
    const { tenantId, role } = getCtx(req);
    if (!ALLOWED_ROLES.has(role)) return sendResponse(false, 'Forbidden', null, 403);
    if (!tenantId) return sendResponse(false, 'Unauthorized', null, 401);

    const report = await Report.findOneAndDelete({ _id: params.id, tenantId });
    if (!report) return sendResponse(false, 'Report not found', null, 404);
    return sendResponse(true, 'Report deleted');
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}
