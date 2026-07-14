import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import PlatformSettings from '@/models/platformSettings.model';
import { sendResponse } from '@/utils/apiResponse';
import { canAccess } from '@/lib/adminAccess';
import { forceLogoutAllExceptSuperAdmin } from '@/lib/sessions';
import SystemLog from '@/models/systemLog.model';
import { createAuditLog } from '@/services/auditLog.service';
import { AUDIT_ACTIONS } from '@/models/auditLog.model';
import { notifyMaintenanceScheduled } from '@/lib/notifications';
import { getClientIp, isIpWhitelisted, isValidWhitelistEntry } from '@/lib/ipWhitelist';

function isSuperAdmin(req: NextRequest) {
  return canAccess(req, 'settings');
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
    // clientIp lets the settings UI show the admin their own IP next to the whitelist field.
    return sendResponse(true, 'Settings fetched', { ...(settings as any), clientIp: getClientIp(req) });
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}

// Toggles powerful enough that even a scoped admin with the 'settings' section granted
// must NOT be able to flip them — only a real super_admin.
const SUPER_ADMIN_ONLY_KEYS = ['emergencyLockdown', 'readOnlyMode', 'adminIpWhitelist'];

export async function PATCH(req: NextRequest) {
  if (!isSuperAdmin(req)) return sendResponse(false, 'Forbidden', null, 403);
  await connectDB();
  try {
    const body = await req.json();

    if (req.headers.get('x-role') !== 'super_admin' && SUPER_ADMIN_ONLY_KEYS.some((k) => k in body)) {
      return sendResponse(false, 'Only a super admin can change lockdown/read-only/IP-whitelist settings', null, 403);
    }

    if ('adminIpWhitelist' in body) {
      const list = (Array.isArray(body.adminIpWhitelist) ? body.adminIpWhitelist : [])
        .map((e: unknown) => String(e).trim())
        .filter(Boolean);
      const bad = list.find((e: string) => !isValidWhitelistEntry(e));
      if (bad) {
        return sendResponse(false, `"${bad}" is not a valid IP address or IPv4 CIDR range (e.g. 203.0.113.4 or 198.51.100.0/24)`, null, 400);
      }
      // Self-lockout guard: the list must cover the IP you are saving it from.
      if (list.length > 0 && !isIpWhitelisted(getClientIp(req), list)) {
        return sendResponse(false, `This whitelist would lock you out — your current IP is ${getClientIp(req) ?? 'undetectable'}. Add it (or a range containing it), or clear the list.`, null, 400);
      }
      body.adminIpWhitelist = list;
    }

    const before = await PlatformSettings.findOne().select('emergencyLockdown maintenanceMode maintenanceScheduledAt').lean() as any;

    // Turning maintenance mode off cancels any pending scheduled start.
    if (body.maintenanceMode === false) {
      body.maintenanceScheduledAt = null;
    }

    const settings = await PlatformSettings.findOneAndUpdate(
      {},
      { $set: body },
      { new: true, upsert: true, runValidators: false }
    ).lean() as any;

    // Rising edge of Emergency Lockdown — force everyone but super admins off the platform immediately.
    if (body.emergencyLockdown === true && !before?.emergencyLockdown) {
      const count = await forceLogoutAllExceptSuperAdmin();
      await SystemLog.create({ category: 'monitor', message: `Emergency Lockdown enabled — force-logged-out ${count} user(s)`, status: 'warning' });
    }

    // Maintenance mode freshly enabled, or its scheduled start time changed — broadcast
    // the notice (email + in-app) to every tenant/technician once, right away.
    if (body.maintenanceMode === true) {
      const beforeSchedMs = before?.maintenanceScheduledAt ? new Date(before.maintenanceScheduledAt).getTime() : 0;
      const afterSchedMs = settings?.maintenanceScheduledAt ? new Date(settings.maintenanceScheduledAt).getTime() : 0;
      if (!before?.maintenanceMode || beforeSchedMs !== afterSchedMs) {
        void notifyMaintenanceScheduled(settings.maintenanceMessage, settings.maintenanceScheduledAt ?? null);
        await PlatformSettings.findOneAndUpdate({}, { $set: { maintenanceNoticeSentAt: new Date() } });
        await SystemLog.create({
          category: 'monitor',
          message: settings.maintenanceScheduledAt
            ? `Maintenance scheduled for ${new Date(settings.maintenanceScheduledAt).toLocaleString()} — notice broadcast to all tenants`
            : 'Maintenance mode enabled immediately — notice broadcast to all tenants',
          status: 'warning',
        });
      }
    }

    const adminId = req.headers.get('x-user-id') || 'unknown';
    if (adminId !== 'unknown') {
      createAuditLog({
        tenantId: adminId,
        userId: adminId,
        action: AUDIT_ACTIONS.SETTINGS_UPDATED,
        entity: 'platformSettings',
        details: body,
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      });
    }

    return sendResponse(true, 'Settings saved', settings);
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}
