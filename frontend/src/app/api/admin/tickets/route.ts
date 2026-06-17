import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import Ticket from '@/models/ticket.model';
import { sendResponse } from '@/utils/apiResponse';

function isSuperAdmin(req: NextRequest) {
  return req.headers.get('x-role') === 'super_admin';
}

export async function GET(req: NextRequest) {
  if (!isSuperAdmin(req)) return sendResponse(false, 'Forbidden', null, 403);
  await connectDB();
  try {
    const { searchParams } = new URL(req.url);
    const status   = searchParams.get('status')   ?? '';
    const tenantId = searchParams.get('tenantId') ?? '';
    const search   = searchParams.get('search')   ?? '';
    const limit    = Math.min(parseInt(searchParams.get('limit') || '200', 10), 500);

    const query: any = {};
    if (status   && status !== 'all')   query.status   = status;
    if (tenantId && tenantId !== 'all') query.tenantId = tenantId;
    if (search.trim()) {
      query.$or = [
        { ticketNumber:  { $regex: search, $options: 'i' } },
        { customerName:  { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
        { deviceBrand:   { $regex: search, $options: 'i' } },
        { deviceModel:   { $regex: search, $options: 'i' } },
      ];
    }

    const tickets = await Ticket.find(query)
      .populate('tenantId', 'name subdomain')
      .populate('technicianId', 'name')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return sendResponse(true, 'Tickets fetched', tickets);
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}
