import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import Tenant from '@/models/tenant.model';
import { sendResponse } from '@/utils/apiResponse';

function getUserContext(req: NextRequest) {
  return {
    role:     req.headers.get('x-role'),
    tenantId: req.headers.get('x-tenant-id'),
  };
}

// ─── GET /api/tenant/branding ─────────────────────────────────────────────────
// Returns the shop customization prefs (bio, home widgets, customer portal
// tab visibility) for the current tenant. Accessible by any authenticated
// user that belongs to a shop.
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { tenantId } = getUserContext(req);
    if (!tenantId) return sendResponse(false, 'No shop associated with your account', null, 400);

    const tenant = await Tenant.findById(tenantId).select('branding team');
    if (!tenant) return sendResponse(false, 'Shop not found', null, 404);

    return sendResponse(true, 'Branding fetched', { branding: tenant.branding ?? {}, team: tenant.team ?? [] });
  } catch (err: any) {
    return sendResponse(false, err.message || 'Failed to fetch branding', null, 500);
  }
}

// ─── PATCH /api/tenant/branding ───────────────────────────────────────────────
// Updates bio / home widget visibility / customer portal tab visibility.
// Only owner or manager allowed.
export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    const { tenantId, role } = getUserContext(req);
    if (!tenantId) return sendResponse(false, 'No shop associated with your account', null, 400);

    if (!['owner', 'manager'].includes(role ?? '')) {
      return sendResponse(false, 'Only owners and managers can update shop branding', null, 403);
    }

    const body = await req.json();
    const { bio, homeWidgets, customerPortal, notificationPrefs, team } = body;

    const $set: Record<string, any> = {};
    if (bio               !== undefined) $set['branding.bio']               = bio;
    if (homeWidgets       !== undefined) $set['branding.homeWidgets']       = homeWidgets;
    if (customerPortal    !== undefined) $set['branding.customerPortal']    = customerPortal;
    if (notificationPrefs !== undefined) $set['branding.notificationPrefs'] = notificationPrefs;
    if (team              !== undefined) $set.team                         = team;

    if (Object.keys($set).length === 0) {
      return sendResponse(false, 'No valid fields provided to update', null, 400);
    }

    const updated = await Tenant.findByIdAndUpdate(
      tenantId,
      { $set },
      { new: true, runValidators: true }
    ).select('branding team');

    if (!updated) return sendResponse(false, 'Shop not found', null, 404);

    return sendResponse(true, 'Shop branding updated successfully', { branding: updated.branding, team: updated.team });
  } catch (err: any) {
    return sendResponse(false, err.message || 'Failed to update branding', null, 500);
  }
}
