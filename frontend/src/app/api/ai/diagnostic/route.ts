/**
 * app/api/ai/diagnostic/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * NOW USES: Google Gemini (gemini-1.5-flash)
 * WHY: Gemini's 1M-token context window fits all repair history without truncation.
 *
 * RBAC: technician, manager, owner
 */

import { NextRequest, NextResponse } from "next/server";
import { callGemini, parseAIJson } from "@/lib/ai/providers";
import { buildDiagnosticSystemPrompt } from "@/lib/ai/prompts";
import connectDB from "@/lib/db";
import Ticket from "@/models/ticket.model";
import { sendResponse } from "@/utils/apiResponse";

function getCtx(req: NextRequest) {
  return {
    tenantId: req.headers.get("x-tenant-id") ?? "",
    userId:   req.headers.get("x-user-id")   ?? "",
    role:     req.headers.get("x-role")       ?? "",
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  await connectDB();

  const { tenantId, role } = getCtx(req);

  if (!["technician", "manager", "owner", "super_admin"].includes(role)) {
    return sendResponse(false, "Forbidden: insufficient role for AI diagnostic", null, 403);
  }

  if (!tenantId) {
    return sendResponse(false, "Unauthorized: tenant context missing", null, 401);
  }

  let body: { deviceBrand?: string; deviceModel?: string; issue?: string };
  try {
    body = await req.json();
  } catch {
    return sendResponse(false, "Invalid request body", null, 400);
  }

  const { deviceBrand, deviceModel, issue } = body;

  if (!issue || issue.trim().length < 5) {
    return sendResponse(false, "Issue description must be at least 5 characters", null, 400);
  }

  try {
    const mongoose = (await import("mongoose")).default;

    const recentTickets = await Ticket.find({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      status: { $in: ["delivered", "ready"] },
      ...(deviceBrand ? { deviceBrand: new RegExp(deviceBrand, "i") } : {}),
    })
      .select("deviceBrand deviceModel issue diagnosisNotes estimateAmount status")
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const historyContext =
      recentTickets.length > 0
        ? recentTickets
            .map(
              (t, i) =>
                `${i + 1}. ${t.deviceBrand} ${t.deviceModel} — Issue: "${t.issue}" | Diagnosis: "${(t as any).diagnosisNotes || "not recorded"}" | Estimate: PKR ${(t as any).estimateAmount ?? "N/A"}`
            )
            .join("\n")
        : "No relevant repair history available yet for this shop.";

    const aiResponse = await callGemini(
      [
        { role: "system", content: buildDiagnosticSystemPrompt(historyContext) },
        {
          role: "user",
          content: `Device: ${deviceBrand ?? "Unknown brand"} ${deviceModel ?? "Unknown model"}\nIssue reported by customer: "${issue}"`,
        },
      ],
      1024
    );

    const parsed = parseAIJson(aiResponse.text, { raw: aiResponse.text });

    return sendResponse(true, "Diagnostic analysis complete", {
      ...parsed,
      ticketsAnalysed: recentTickets.length,
      model: aiResponse.model,
      provider: aiResponse.provider,
    });
  } catch (err: any) {
    console.error("[AI/diagnostic]", err.message);
    return sendResponse(false, err.message ?? "AI diagnostic failed", null, 500);
  }
}
