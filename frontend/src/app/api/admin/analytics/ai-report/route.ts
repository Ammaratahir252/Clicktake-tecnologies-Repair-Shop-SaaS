import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import Ticket from '@/models/ticket.model';
import Tenant from '@/models/tenant.model';
import { sendResponse } from '@/utils/apiResponse';
import { createAICompletion } from '@/lib/ai/client';
import mongoose from 'mongoose';

import { canAccess } from '@/lib/adminAccess';
function isSuperAdmin(req: NextRequest) {
  return canAccess(req, 'analytics');
}

// POST /api/admin/analytics/ai-report  body: { tenantId }
// Aggregates a shop's real ticket/revenue data and asks the configured AI provider
// for a plain-English insights summary + recommendations.
export async function POST(req: NextRequest) {
  if (!isSuperAdmin(req)) return sendResponse(false, 'Forbidden', null, 403);
  await connectDB();
  try {
    const { tenantId } = await req.json();
    if (!tenantId || tenantId.length !== 24) {
      return sendResponse(false, 'tenantId is required', null, 400);
    }

    const tenant = await Tenant.findById(tenantId).select('name plan').lean() as any;
    if (!tenant) return sendResponse(false, 'Tenant not found', null, 404);

    const tid = new mongoose.Types.ObjectId(tenantId);
    const tickets = await Ticket.find({ tenantId: tid }).select('status estimateAmount createdAt technicianId').lean() as any[];

    const statusCounts: Record<string, number> = {};
    let totalRevenue = 0;
    for (const t of tickets) {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
      totalRevenue += t.estimateAmount || 0;
    }
    const unassigned = tickets.filter(t => !t.technicianId).length;

    const prompt = `You are analyzing repair shop performance data for "${tenant.name}" (plan: ${tenant.plan}).

Total tickets: ${tickets.length}
Total revenue: Rs. ${totalRevenue.toLocaleString()}
Status breakdown: ${JSON.stringify(statusCounts)}
Unassigned tickets: ${unassigned}

Write a concise report (under 250 words) covering: overall health, any bottlenecks or red flags visible in the status breakdown, and 2-3 concrete recommendations for the shop owner. Plain English, no headers, no markdown formatting.`;

    const report = await createAICompletion([
      { role: 'system', content: 'You are a business analyst for a repair-shop SaaS platform, writing a short report for a platform administrator.' },
      { role: 'user', content: prompt },
    ], 600, tenantId);

    return sendResponse(true, 'Report generated', { report, tenantName: tenant.name });
  } catch (err: any) {
    return sendResponse(false, err.message || 'Failed to generate report', null, 500);
  }
}
