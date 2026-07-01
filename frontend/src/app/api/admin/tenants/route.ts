import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import Tenant from '@/models/tenant.model';
import { sendResponse } from '@/utils/apiResponse';

function isSuperAdmin(req: NextRequest) {
  return req.headers.get('x-role') === 'super_admin';
}

export async function GET(req: NextRequest) {
  if (!isSuperAdmin(req)) return sendResponse(false, 'Forbidden', null, 403);
  await connectDB();
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500);
    const search = searchParams.get('search') ?? '';

    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { subdomain: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const tenants = await Tenant.find(query)
      .select('-__v')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return sendResponse(true, 'Tenants fetched', tenants);
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}

export async function POST(req: NextRequest) {
  if (!isSuperAdmin(req)) return sendResponse(false, 'Forbidden', null, 403);
  await connectDB();
  try {
    const body = await req.json();
    const tenant = await Tenant.create(body);
    return sendResponse(true, 'Tenant created', tenant, 201);
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}
