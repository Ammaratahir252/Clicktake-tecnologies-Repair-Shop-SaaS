import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/user.model';
import { sendResponse } from '@/utils/apiResponse';

function isSuperAdmin(req: NextRequest) {
  return req.headers.get('x-role') === 'super_admin';
}

export async function GET(req: NextRequest) {
  if (!isSuperAdmin(req)) return sendResponse(false, 'Forbidden', null, 403);
  await connectDB();
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') ?? '';
    const role   = searchParams.get('role') ?? '';
    const limit  = Math.min(parseInt(searchParams.get('limit') || '200', 10), 500);

    const query: any = {};
    if (role && role !== 'all') query.role = role;
    if (search) {
      query.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('-password -resetPasswordToken -resetPasswordExpiry')
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('tenantId', 'name subdomain')
      .lean();

    return sendResponse(true, 'Users fetched', users);
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}
