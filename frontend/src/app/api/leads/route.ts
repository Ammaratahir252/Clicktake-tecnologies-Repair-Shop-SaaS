import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { sendResponse } from '@/utils/apiResponse';
import Lead from '@/models/lead.model';
import mongoose from 'mongoose';

function getCtx(req: NextRequest) {
  return {
    tenantId: req.headers.get('x-tenant-id') ?? '',
    userId:   req.headers.get('x-user-id')   ?? '',
    userName: req.headers.get('x-user-name') ?? 'Staff',
    role:     req.headers.get('x-role')      ?? '',
  };
}

async function generateLeadNumber(tenantId: string): Promise<string> {
  const count = await Lead.countDocuments({ tenantId: new mongoose.Types.ObjectId(tenantId) });
  return `L-${String(count + 1).padStart(3, '0')}`;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  await connectDB();
  try {
    const { tenantId, role } = getCtx(req);
    if (!['owner', 'manager', 'super_admin'].includes(role)) return sendResponse(false, 'Forbidden', null, 403);

    // super_admin has no tenantId — query all leads platform-wide
    if (role !== 'super_admin' && !tenantId) return sendResponse(false, 'Unauthorized', null, 401);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const query: Record<string, unknown> = {};
    if (role !== 'super_admin' && tenantId) {
      query.tenantId = new mongoose.Types.ObjectId(tenantId);
    }
    if (status && status !== 'all') query.status = status;

    const leads = await Lead.find(query).sort({ createdAt: -1 }).lean();
    return sendResponse(true, 'Leads fetched', leads);
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  await connectDB();
  try {
    const { tenantId, userId, userName, role } = getCtx(req);
    if (!tenantId) return sendResponse(false, 'Unauthorized', null, 401);
    if (!['owner', 'manager', 'super_admin', 'frontdesk'].includes(role)) return sendResponse(false, 'Forbidden', null, 403);

    const body = await req.json();
    const { name, phone, email, device, issue, source } = body;

    if (!name || !phone || !device || !issue || !source) {
      return sendResponse(false, 'name, phone, device, issue, source are required', null, 400);
    }

    const leadNumber = await generateLeadNumber(tenantId);
    const lead = await Lead.create({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      leadNumber,
      name, phone, email, device, issue, source,
      status: 'new',
    });

    return sendResponse(true, 'Lead created', lead, 201);
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}
