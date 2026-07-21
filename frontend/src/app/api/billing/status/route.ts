import { NextRequest } from "next/server";
import connectDB from "@/lib/db";
import Tenant from "@/models/tenant.model";
import { sendResponse } from "@/utils/apiResponse";

// This route is protected by middleware.ts's default-deny API auth model —
// x-tenant-id below is the verified value middleware sets from the caller's
// JWT after stripping whatever the client sent, never a raw client header.
// See the 2026-07-20 audit (Critical #1) for why that distinction matters here.
export async function GET(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return sendResponse(false, "Unauthorized", null, 401);

  await connectDB();
  try {
    const tenant = await Tenant.findById(tenantId).select(
      "name plan isActive stripeCustomerId stripeSubscriptionId"
    );
    if (!tenant) return sendResponse(false, "Tenant not found", null, 404);

    return sendResponse(true, "Billing status", {
      plan: tenant.plan,
      isActive: tenant.isActive,
      hasStripe: !!tenant.stripeCustomerId,
      subscriptionId: tenant.stripeSubscriptionId ?? null,
    });
  } catch (err: any) {
    return sendResponse(false, err.message, null, 500);
  }
}
