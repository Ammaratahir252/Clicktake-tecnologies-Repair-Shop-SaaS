import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import Customer from '@/models/customer.model';
import Tenant from '@/models/tenant.model';
import User from '@/models/user.model';
import Ticket from '@/models/ticket.model';
import mongoose from 'mongoose';
import { sendResponse } from '@/utils/apiResponse';

import { canAccess } from '@/lib/adminAccess';
function isSuperAdmin(req: NextRequest) {
  return canAccess(req, 'customers');
}

// GET /api/admin/customers
// Query params: tenantId (optional), search (optional), limit (default 200)
export async function GET(req: NextRequest) {
  if (!isSuperAdmin(req)) return sendResponse(false, 'Forbidden', null, 403);
  await connectDB();
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId') ?? '';
    const search   = searchParams.get('search')   ?? '';
    const limit    = Math.min(parseInt(searchParams.get('limit') || '200', 10), 500);

    const query: any = {};
    if (tenantId && tenantId.length === 24) {
      query.tenantId = new mongoose.Types.ObjectId(tenantId);
    }
    if (search.trim()) {
      query.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // Get customers from Customer model (shop customer records)
    const customers = await (Customer as any).find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean() as any[];

    // Gather unique tenantIds to enrich with tenant name
    const tenantIds = Array.from(new Set(
      customers.map((c: any) => c.tenantId ? String(c.tenantId) : '').filter(id => id.length === 24)
    ));
    const tenants   = await Tenant.find({ _id: { $in: tenantIds } }).select('name subdomain').lean() as any[];
    const tenantMap = new Map<string, any>();
    for (const t of tenants) tenantMap.set(String(t._id), t);

    // Gather unique customer phone numbers to check if they have portal accounts
    const phones = Array.from(new Set(customers.map((c: any) => c.phone).filter(Boolean)));
    const portalUsers = await User.find({ phone: { $in: phones }, role: 'customer' }).select('phone').lean() as any[];
    const portalPhones = new Set(portalUsers.map(u => u.phone));

    // Repair history per customer — ticket count + up to 5 most recent tickets
    const customerIds = customers.map((c: any) => c._id);
    const tickets = await Ticket.find({ customerId: { $in: customerIds } })
      .select('customerId ticketNumber status estimateAmount createdAt')
      .sort({ createdAt: -1 })
      .lean() as any[];

    const ticketsByCustomer = new Map<string, any[]>();
    for (const t of tickets) {
      const key = String(t.customerId);
      if (!ticketsByCustomer.has(key)) ticketsByCustomer.set(key, []);
      ticketsByCustomer.get(key)!.push(t);
    }

    const enriched = customers.map(c => {
      const custTickets = ticketsByCustomer.get(String(c._id)) ?? [];
      return {
        ...c,
        tenantName:      tenantMap.get(String(c.tenantId))?.name      ?? '—',
        tenantSubdomain: tenantMap.get(String(c.tenantId))?.subdomain ?? '—',
        hasPortalAccount: portalPhones.has(c.phone),
        totalTickets: custTickets.length,
        recentTickets: custTickets.slice(0, 5).map(t => ({
          _id: String(t._id),
          ticketNumber: t.ticketNumber,
          status: t.status,
          estimateAmount: t.estimateAmount ?? null,
          createdAt: t.createdAt,
        })),
      };
    });

    return sendResponse(true, 'Customers fetched', enriched);
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}
