/**
 * app/api/ai/diagnostic/route.ts
 * Module 8.1 — AI Diagnostic Assistant
 *
 * Flow:
 *  1. Middleware injects x-tenant-id, x-user-id, x-role
 *  2. Route fetches last 30 completed tickets from MongoDB (RAG context)
 *  3. Sends device + issue + history to Groq
 *  4. Returns structured JSON: causes, steps, parts, confidence scores
 *
 * RBAC: technician, manager, owner
 */

import { NextRequest, NextResponse } from "next/server";
import { createAICompletion } from "@/lib/ai/client";
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

    // ── Step 1: Fetch real ticket history from MongoDB (RAG context) ──────────
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

    // ── Step 2: Call AI with real context injected ───────────────────────────
    const rawText = await createAICompletion([
      { role: "system", content: buildDiagnosticSystemPrompt(historyContext) },
      { role: "user",   content: `Device: ${deviceBrand ?? "Unknown brand"} ${deviceModel ?? "Unknown model"}\nIssue reported by customer: "${issue}"` },
    ], 1024);

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

    return sendResponse(true, "Diagnostic analysis complete", {
      ...parsed,
      ticketsAnalysed: recentTickets.length,
    });
  } catch (err: any) {
    console.error("[AI/diagnostic]", err.message);
    return sendResponse(false, err.message ?? "AI diagnostic failed", null, 500);
  }
}