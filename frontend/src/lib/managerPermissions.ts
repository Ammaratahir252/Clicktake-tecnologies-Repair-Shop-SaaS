import connectDB from '@/lib/db';

export interface ManagerPermissions {
  editTeam: boolean;
  assignWork: boolean;
  recordRevenue: boolean;
}

const DEFAULTS: ManagerPermissions = {
  editTeam: false,
  assignWork: true,
  recordRevenue: true,
};

/** Owner-controlled extra capabilities granted to the `manager` role for a tenant
 * (Owner Settings → Manager Permissions). Falls back to safe defaults on any error
 * or for tenants that have never touched this section. */
export async function getManagerPermissions(tenantId: string): Promise<ManagerPermissions> {
  try {
    if (!tenantId || tenantId.length !== 24) return { ...DEFAULTS };
    await connectDB();
    const Tenant = (await import('@/models/tenant.model')).default;
    const tenant = await Tenant.findById(tenantId).select('branding.managerPermissions').lean() as any;
    if (!tenant) return { ...DEFAULTS };
    return { ...DEFAULTS, ...(tenant.branding?.managerPermissions ?? {}) };
  } catch {
    return { ...DEFAULTS };
  }
}
