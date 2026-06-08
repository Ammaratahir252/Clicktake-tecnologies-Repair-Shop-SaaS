import { NextRequest } from 'next/server';
import { getTenantBySubdomain } from '@/lib/subdomain';
import { sendResponse } from '@/utils/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const subdomain = searchParams.get('subdomain');

    if (!subdomain) {
      return sendResponse(false, 'Subdomain parameter is required', null, 400);
    }

    const tenant = await getTenantBySubdomain(subdomain);
    if (!tenant) {
      return sendResponse(false, 'Shop not found', null, 404);
    }

    return sendResponse(true, 'Tenant resolved', {
      tenantId: tenant._id,
      shopName: tenant.name,
      subdomain: tenant.subdomain,
      plan: tenant.plan
    });
  } catch (error: any) {
    return sendResponse(false, error.message || 'Failed to resolve tenant', null, 500);
  }
}
