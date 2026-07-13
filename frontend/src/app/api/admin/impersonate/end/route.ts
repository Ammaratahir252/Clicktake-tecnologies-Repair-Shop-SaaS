import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { AuditLog } from '@/models/auditLog.model';

// See start route for why this is a hard super_admin check, not a scoped-admin permission.
function isSuperAdmin(req: NextRequest) {
  return req.headers.get('x-role') === 'super_admin';
}

export async function POST(req: NextRequest) {
  if (!isSuperAdmin(req)) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
  }
  await connectDB();
  try {
    const superAdminId = req.headers.get('x-user-id');

    // Read impersonated tenantId from cookie for the audit log
    let impersonatedTenantId: string | null = null;
    const imperCookie = req.cookies.get('imper')?.value;
    if (imperCookie) {
      try {
        const ctx = JSON.parse(decodeURIComponent(imperCookie));
        impersonatedTenantId = ctx?.tenantId ?? null;
      } catch {}
    }

    // Only log if there was an actual impersonation session — tenantId is a required,
    // Tenant-referenced field, so we must never fall back to the admin's own userId here.
    if (impersonatedTenantId && superAdminId) {
      await AuditLog.create({
        tenantId:  impersonatedTenantId,
        userId:    superAdminId,
        action:    'IMPERSONATE_END',
        entity:    'session',
        entityId:  impersonatedTenantId,
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown',
      });
    }

    const res = NextResponse.json({ success: true, message: 'Impersonation ended', data: null });

    // Clear the impersonation cookie
    res.cookies.set('imper', '', {
      path:     '/',
      sameSite: 'lax',
      httpOnly: false,
      maxAge:   0,
    });

    return res;
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Server error' }, { status: 500 });
  }
}
