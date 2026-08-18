// src/app/api/payments/route.ts
// GET /api/payments?ticketId=... — list invoice payments for the caller's tenant,
// optionally scoped to one ticket. Used by staff-facing payment/invoice views.

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import Payment from '@/models/payment.model';
import { sendResponse } from '@/utils/apiResponse';

const ALLOWED_ROLES = new Set(['owner', 'manager', 'frontdesk']);

// Reads the caller's tenant/role from verified request headers on every call —
// must never be statically prerendered at build time (no headers exist then).
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  await connectDB();
  try {
    const tenantId = req.headers.get('x-tenant-id') ?? '';
    const role = req.headers.get('x-role') ?? '';
    if (!tenantId) return sendResponse(false, 'No shop associated with your account', null, 400);
    if (!ALLOWED_ROLES.has(role)) return sendResponse(false, 'Forbidden', null, 403);

    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get('ticketId');

    const query: Record<string, unknown> = { tenantId, kind: 'invoice' };
    if (ticketId) query.referenceId = ticketId;

    const payments = await Payment.find(query).sort({ createdAt: -1 }).lean();
    return sendResponse(true, 'Payments fetched', payments);
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}
