/**
 * app/api/ai/estimate/route.ts
 * Module 8.1 — AI Estimate Predictor
 *
 * Queries the last 50 completed tickets with estimates for similar device+issue,
 * then sends that real cost history to Groq to predict a cost range.
 *
 * RBAC: technician, manager, owner
 */

import { NextRequest, NextResponse } from "next/server";
import { groq, AI_MODEL, DEFAULT_MAX_TOKENS } from "@/lib/ai/anthropic";
import { buildEstimateSystemPrompt } from "@/lib/ai/prompts";
import connectDB from "@/lib/db";
import Ticket from "@/models/ticket.model";
import { sendResponse } from "@/utils/apiResponse";

function getCtx(req: NextRequest) {
  return {
    tenantId: req.headers.get("x-tenant-id") ?? "",
    role:     req.headers.get("x-role")       ?? "",
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  await connectDB();

  const { tenantId, role } = getCtx(req);

  if (!["technician", "manager", "owner", "super_admin"].includes(role)) {
    return sendResponse(false, "Forbidden", null, 403);
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

  if (!issue) {
    return sendResponse(false, "Issue is required", null, 400);
  }

  try {
    const mongoose = (await import("mongoose")).default;

    const historicalTickets = await Ticket.find({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      estimateAmount: { $gt: 0, $ne: null },
      status: { $in: ["delivered", "ready", "in_repair"] },
      ...(deviceBrand ? { deviceBrand: new RegExp(deviceBrand, "i") } : {}),
    })
      .select("deviceBrand deviceModel issue estimateAmount partsUsed diagnosisNotes")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const historicalContext =
      historicalTickets.length > 0
        ? historicalTickets
            .map(
              (t) =>
                `${t.deviceBrand} ${t.deviceModel}: "${t.issue}" → PKR ${(t as any).estimateAmount} | Parts used: ${
                  ((t as any).partsUsed as any[])?.length > 0
                    ? ((t as any).partsUsed as any[]).map((p: any) => p.name).join(", ")
                    : "none recorded"
                }`
            )
            .join("\n")
        : "No historical estimate data available for this shop yet.";

    const response = await groq.chat.completions.create({
      model: AI_MODEL,
      max_tokens: DEFAULT_MAX_TOKENS,
      messages: [
        {
          role: "system",
          content: buildEstimateSystemPrompt(historicalContext),
        },
        {
          role: "user",
          content: `Predict repair cost for:\nDevice: ${deviceBrand ?? "Unknown"} ${deviceModel ?? "Unknown model"}\nIssue: "${issue}"`,
        },
      ],
    });

    const rawText = response.choices[0]?.message?.content ?? "";

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const cleaned = rawText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        parsed = { raw: cleaned };
      }
    }

    return sendResponse(true, "Estimate prediction complete", {
      ...parsed,
      samplesUsed: historicalTickets.length,
      model: AI_MODEL,
    });
  } catch (err: any) {
    console.error("[AI/estimate]", err.message);
    return sendResponse(false, err.message ?? "Estimate prediction failed", null, 500);
  }
}