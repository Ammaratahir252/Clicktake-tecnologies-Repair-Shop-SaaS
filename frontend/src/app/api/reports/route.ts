import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import Report from '@/models/report.model';
import { sendResponse } from '@/utils/apiResponse';
import mongoose from 'mongoose';

const ALLOWED_ROLES = new Set(['owner', 'manager']);

function getCtx(req: NextRequest) {
  return {
    tenantId: req.headers.get('x-tenant-id') ?? '',
    userId:   req.headers.get('x-user-id')   ?? '',
    userName: req.headers.get('x-user-name') ?? 'Staff',
    role:     req.headers.get('x-role')      ?? '',
  };
}

// GET /api/reports — list this tenant's written reports, newest first
export async function GET(req: NextRequest) {
  await connectDB();
  try {
    const { tenantId, role } = getCtx(req);
    if (!ALLOWED_ROLES.has(role)) return sendResponse(false, 'Forbidden', null, 403);
    if (!tenantId) return sendResponse(false, 'Unauthorized', null, 401);

    const reports = await Report.find({ tenantId: new mongoose.Types.ObjectId(tenantId) })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return sendResponse(true, 'Reports fetched', reports);
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}

// POST /api/reports — author a new written report
export async function POST(req: NextRequest) {
  await connectDB();
  try {
    const { tenantId, userId, userName, role } = getCtx(req);
    if (!ALLOWED_ROLES.has(role)) return sendResponse(false, 'Forbidden', null, 403);
    if (!tenantId) return sendResponse(false, 'Unauthorized', null, 401);

    const body = await req.json();
    const { title, body: content, periodStart, periodEnd } = body;

    if (!title?.trim() || !content?.trim()) {
      return sendResponse(false, 'Title and body are required', null, 400);
    }

    const report = await Report.create({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      authorId: userId,
      authorName: userName,
      title: title.trim(),
      body: content.trim(),
      periodStart: periodStart ? new Date(periodStart) : null,
      periodEnd: periodEnd ? new Date(periodEnd) : null,
    });

    return sendResponse(true, 'Report saved', report, 201);
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}
