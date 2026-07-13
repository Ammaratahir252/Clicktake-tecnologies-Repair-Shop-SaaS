import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { sendResponse } from '@/utils/apiResponse';
import Lead from '@/models/lead.model';
import mongoose from 'mongoose';
import { notifyTenantByRole } from '@/lib/notifications';

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
    if (!tenantId) return sendResponse(false, 'Unauthorized', null, 401);
    if (!['owner', 'manager', 'super_admin'].includes(role)) return sendResponse(false, 'Forbidden', null, 403);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const query: Record<string, unknown> = { tenantId: new mongoose.Types.ObjectId(tenantId) };
    if (status && status !== 'all') query.status = status;

    const leadsRaw = await Lead.find(query)
      .sort({ createdAt: -1 })
      .populate('tenantId', 'name subdomain')
      .lean() as any[];

    const leads = leadsRaw.map((lead) => ({
      ...lead,
      tenantName: lead.tenantId && typeof lead.tenantId === 'object' ? lead.tenantId.name : undefined,
      tenantId:   lead.tenantId && typeof lead.tenantId === 'object' ? String(lead.tenantId._id) : lead.tenantId,
    }));

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

    // The Manager Leads UI (and other callers) send display-cased labels like "Walk-in" /
    // "WhatsApp", but the schema enum is lowercase ('walk-in', 'whatsapp', ...). Normalize here
    // so every caller works regardless of casing, instead of failing Mongoose validation.
    const normalizedSource = String(source).toLowerCase().trim();

    const leadNumber = await generateLeadNumber(tenantId);
    const lead = await Lead.create({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      leadNumber,
      name, phone, email, device, issue,
      source: normalizedSource,
      status: 'new',
    });

    // Notify owner + manager about the new lead (fire-and-forget)
    notifyTenantByRole(
      tenantId,
      ['owner', 'manager'],
      'new_lead',
      `New Lead: ${name}`,
      `${device} — ${issue}`,
      { leadId: (lead as any)._id?.toString() }
    );

    return sendResponse(true, 'Lead created', lead, 201);
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}
