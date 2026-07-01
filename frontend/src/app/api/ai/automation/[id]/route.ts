/**
 * app/api/ai/automation/[id]/route.ts
 * Module 8.2 — Toggle / Delete individual automation rule
 *
 * PATCH  — toggle isActive true/false
 * DELETE — remove rule
 *
 * RBAC: manager, owner
 */

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import AutomationRule from "@/models/automationRule.model";
import { sendResponse } from "@/utils/apiResponse";

function getCtx(req: NextRequest) {
  return {
    tenantId: req.headers.get("x-tenant-id") ?? "",
    role:     req.headers.get("x-role")       ?? "",
  };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  await connectDB();

  const { tenantId, role } = getCtx(req);

  if (!["manager", "owner", "super_admin"].includes(role)) {
    return sendResponse(false, "Forbidden", null, 403);
  }

  try {
    const mongoose = (await import("mongoose")).default;
    const body = await req.json();

    const rule = await AutomationRule.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(params.id),
        tenantId: new mongoose.Types.ObjectId(tenantId),
      },
      { $set: { isActive: body.isActive } },
      { new: true }
    );

    if (!rule) return sendResponse(false, "Rule not found", null, 404);

    return sendResponse(true, `Rule ${rule.isActive ? "activated" : "deactivated"}`, rule);
  } catch (err: any) {
    return sendResponse(false, err.message ?? "Failed to update rule", null, 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  await connectDB();

  const { tenantId, role } = getCtx(req);

  if (!["manager", "owner", "super_admin"].includes(role)) {
    return sendResponse(false, "Forbidden", null, 403);
  }

  try {
    const mongoose = (await import("mongoose")).default;

    const rule = await AutomationRule.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(params.id),
      tenantId: new mongoose.Types.ObjectId(tenantId),
    });

    if (!rule) return sendResponse(false, "Rule not found", null, 404);

    return sendResponse(true, "Rule deleted", null);
  } catch (err: any) {
    return sendResponse(false, err.message ?? "Failed to delete rule", null, 500);
  }
}
