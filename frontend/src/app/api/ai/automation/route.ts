/**
 * app/api/ai/automation/route.ts
 * Module 8.2 — Workflow Automation Builder (GET + POST)
 *
 * GET  — returns all automation rules for this tenant
 * POST — creates a new rule, runs AI validation first, saves to MongoDB
 *
 * RBAC: manager, owner
 */

import { NextRequest, NextResponse } from "next/server";
import { groq, AI_MODEL } from "@/lib/ai/anthropic";
import { buildAutomationSystemPrompt } from "@/lib/ai/prompts";
import connectDB from "@/lib/db";
import AutomationRule from "@/models/automationRule.model";
import { sendResponse } from "@/utils/apiResponse";

function getCtx(req: NextRequest) {
  return {
    tenantId: req.headers.get("x-tenant-id") ?? "",
    userId:   req.headers.get("x-user-id")   ?? "",
    role:     req.headers.get("x-role")       ?? "",
  };
}

// ─── GET /api/ai/automation ─────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  await connectDB();

  const { tenantId, role } = getCtx(req);

  if (!["manager", "owner", "super_admin"].includes(role)) {
    return sendResponse(false, "Forbidden", null, 403);
  }

  if (!tenantId) {
    return sendResponse(false, "Unauthorized", null, 401);
  }

  try {
    const mongoose = (await import("mongoose")).default;

    const rules = await AutomationRule.find({
      tenantId: new mongoose.Types.ObjectId(tenantId),
    })
      .sort({ createdAt: -1 })
      .lean();

    return sendResponse(true, "Rules retrieved", rules);
  } catch (err: any) {
    console.error("[AI/automation GET]", err.message);
    return sendResponse(false, err.message ?? "Failed to fetch rules", null, 500);
  }
}

// ─── POST /api/ai/automation ────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  await connectDB();

  const { tenantId, userId, role } = getCtx(req);

  if (!["manager", "owner", "super_admin"].includes(role)) {
    return sendResponse(false, "Forbidden", null, 403);
  }

  if (!tenantId || !userId) {
    return sendResponse(false, "Unauthorized", null, 401);
  }

  let body: {
    name: string;
    description?: string;
    trigger: string;
    triggerValue?: string;
    action: string;
    actionTarget?: string;
  };
  try {
    body = await req.json();
  } catch {
    return sendResponse(false, "Invalid request body", null, 400);
  }

  if (!body.name || !body.trigger || !body.action) {
    return sendResponse(false, "name, trigger, and action are required", null, 400);
  }

  try {
    const mongoose = (await import("mongoose")).default;

    // ── AI Validation before saving ───────────────────────────────────────────
    let validation: {
      isValid: boolean;
      issues: string[];
      riskLevel: "low" | "medium" | "high";
      riskReason: string;
    } = {
      // Safe default — if Groq fails entirely, still allow the rule
      isValid: true,
      issues: [],
      riskLevel: "low",
      riskReason: "Auto-approved (AI validation unavailable)",
    };

    try {
      const aiResponse = await groq.chat.completions.create({
        model: AI_MODEL,
        max_tokens: 256,
        messages: [
          {
            role: "system",
            content: buildAutomationSystemPrompt(),
          },
          {
            role: "user",
            content: `Validate this automation rule:
Name: "${body.name}"
Trigger: ${body.trigger} (value: ${body.triggerValue ?? "N/A"})
Action: ${body.action} (target: ${body.actionTarget ?? "N/A"})
Description: ${body.description ?? "none"}`,
          },
        ],
      });

      const rawText = aiResponse.choices[0]?.message?.content ?? "{}";

      try {
        validation = JSON.parse(rawText);
      } catch {
        const cleaned = rawText
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        try {
          validation = JSON.parse(cleaned);
        } catch {
          // Groq returned non-JSON — keep safe default above
          console.warn("[AI/automation] Groq returned non-JSON, using default validation");
        }
      }
    } catch (aiErr: any) {
      // Groq call itself failed — log and continue with safe default
      console.warn("[AI/automation] Groq validation failed, skipping:", aiErr.message);
    }

    // ── Block only on explicit isValid: false ─────────────────────────────────
    if (validation.isValid === false) {
      return sendResponse(false, "Rule validation failed", {
        issues: validation.issues,
        riskLevel: validation.riskLevel,
        riskReason: validation.riskReason,
      }, 422);
    }

    const rule = await AutomationRule.create({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      name: body.name,
      description: body.description,
      trigger: body.trigger,
      triggerValue: body.triggerValue,
      action: body.action,
      actionTarget: body.actionTarget,
      createdBy: new mongoose.Types.ObjectId(userId),
      isActive: true,
      aiValidation: {
        isValid: validation.isValid,
        riskLevel: validation.riskLevel,
        riskReason: validation.riskReason,
        validatedAt: new Date(),
      },
    });

    return sendResponse(true, "Automation rule created", rule, 201);
  } catch (err: any) {
    console.error("[AI/automation POST]", err.message);
    return sendResponse(false, err.message ?? "Failed to create rule", null, 500);
  }
}