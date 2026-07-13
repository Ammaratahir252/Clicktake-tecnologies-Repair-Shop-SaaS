import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Tenant from '@/models/tenant.model';
import { sendResponse } from '@/utils/apiResponse';
import { canAccess } from '@/lib/adminAccess';

function toCsv(rows: any[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
}

// GET /api/admin/tools/export-tenants — CSV export of every tenant
export async function GET(req: NextRequest) {
  if (!canAccess(req, 'settings')) return sendResponse(false, 'Forbidden', null, 403);
  await connectDB();
  try {
    const tenants = await Tenant.find().select('name subdomain ownerName email plan isActive createdAt').lean();
    const rows = tenants.map((t: any) => ({
      name: t.name,
      subdomain: t.subdomain,
      ownerName: t.ownerName,
      email: t.email,
      plan: t.plan,
      status: t.isActive ? 'active' : 'suspended',
      createdAt: t.createdAt?.toISOString?.() ?? '',
    }));
    const csv = toCsv(rows);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="tenants-${Date.now()}.csv"`,
      },
    });
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}
