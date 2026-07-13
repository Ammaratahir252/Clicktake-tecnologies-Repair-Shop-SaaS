import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { AuditLog } from '@/models/auditLog.model';
import Tenant from '@/models/tenant.model';

// Impersonation is intentionally super_admin-only, never a grantable scoped-admin
// permission: middleware only rewrites x-tenant-id for role === 'super_admin' (see
// applyImpersonation in middleware.ts), so a scoped `admin` who somehow started a
// session here would get bounced right back out of /dashboard/owner with no real
// tenant access — a silent no-op dressed up as success. Fail loudly instead.
function isSuperAdmin(req: NextRequest) {
  return req.headers.get('x-role') === 'super_admin';
}

export async function POST(req: NextRequest) {
  if (!isSuperAdmin(req)) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
  }
  await connectDB();
  try {
    const { tenantId } = await req.json();
    if (!tenantId) {
      return NextResponse.json({ success: false, message: 'tenantId is required' }, { status: 400 });
    }

    const tenant = await Tenant.findById(tenantId).select('name subdomain isActive').lean() as any;
    if (!tenant) {
      return NextResponse.json({ success: false, message: 'Tenant not found' }, { status: 404 });
    }

    const superAdminId = req.headers.get('x-user-id');
    if (!superAdminId) {
      return NextResponse.json({ success: false, message: 'Missing acting admin identity' }, { status: 400 });
    }

    await AuditLog.create({
      tenantId,
      userId:    superAdminId,
      action:    'IMPERSONATE_START',
      entity:    'tenant',
      entityId:  tenantId,
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
    });

    // Next.js's cookie serializer already percent-encodes the value — do not
    // encodeURIComponent it here too, or every reader's single decodeURIComponent
    // call will fail to parse the resulting double-encoded JSON.
    const cookiePayload = JSON.stringify({
      tenantId,
      tenantName:      tenant.name,
      tenantSubdomain: tenant.subdomain,
      superAdminId,
      startedAt:       Date.now(),
    });

    const res = NextResponse.json({
      success: true,
      message: 'Impersonation started',
      data:    { tenantId, tenantName: tenant.name, tenantSubdomain: tenant.subdomain },
    });

    // NOT httpOnly so DashboardShell client JS can read it for the banner
    res.cookies.set('imper', cookiePayload, {
      path:     '/',
      sameSite: 'lax',
      httpOnly: false,
      maxAge:   60 * 60 * 4, // 4 hours
    });

    return res;
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Server error' }, { status: 500 });
  }
}
