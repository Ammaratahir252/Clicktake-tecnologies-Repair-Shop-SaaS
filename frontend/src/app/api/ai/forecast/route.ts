/**
 * app/api/ai/forecast/route.ts
 * Module 8.3 — AI Inventory Demand Forecaster
 *
 * Reads real Part + StockMovement documents from MongoDB, calculates
 * usage velocity per part, then sends to Groq for reorder recommendations.
 *
 * RBAC: manager, owner
 */

import { NextRequest, NextResponse } from "next/server";
import { createAICompletion } from "@/lib/ai/client";
import { buildForecastSystemPrompt } from "@/lib/ai/prompts";
import connectDB from "@/lib/db";
import Part from "@/models/part.model";
import StockMovement from "@/models/stockMovement.model";
import { sendResponse } from "@/utils/apiResponse";

function getCtx(req: NextRequest) {
  return {
    tenantId: req.headers.get("x-tenant-id") ?? "",
    role:     req.headers.get("x-role")       ?? "",
  };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  await connectDB();

  const { tenantId, role } = getCtx(req);

  if (!["manager", "owner", "super_admin"].includes(role)) {
    return sendResponse(false, "Forbidden: managers and owners only", null, 403);
  }

  if (!tenantId) {
    return sendResponse(false, "Unauthorized: tenant context missing", null, 401);
  }

  try {
    const mongoose = (await import("mongoose")).default;
    const tenantOid = new mongoose.Types.ObjectId(tenantId);

    // ── Step 1: Get all active parts for this tenant ──────────────────────────
    const parts = await Part.find({ tenantId: tenantOid, isActive: true })
      .select("name sku category quantity lowStockLimit costPrice sellPrice")
      .lean();

    if (parts.length === 0) {
      return sendResponse(true, "No inventory data yet", {
        summary: "No parts in inventory yet.",
        alerts: [],
        insights: ["Add parts to your inventory to start getting AI forecasts."],
        overallHealth: "fair",
        partsAnalysed: 0,
      });
    }

    // ── Step 2: Get stock movements from the last 30 days ────────────────────
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const movements = await StockMovement.find({
      tenantId: tenantOid,
      type: "used",
      createdAt: { $gte: thirtyDaysAgo },
    })
      .select("partId quantity createdAt")
      .lean();

    // ── Step 3: Calculate usage velocity per part ─────────────────────────────
    const usageMap: Record<string, number> = {};
    for (const m of movements) {
      const key = (m as any).partId.toString();
      usageMap[key] = (usageMap[key] ?? 0) + m.quantity;
    }

    // ── Step 4: Build context string for Groq ─────────────────────────────────
    const inventoryContext = parts
      .map((p) => {
        const usage30d = usageMap[(p as any)._id.toString()] ?? 0;
        const daysOfStock =
          usage30d > 0
            ? Math.round(((p as any).quantity / (usage30d / 30)) * 10) / 10
            : null;
        const isLow = (p as any).quantity <= (p as any).lowStockLimit;
        return (
          `Part: ${p.name} (SKU: ${p.sku}) | Category: ${p.category}` +
          ` | Stock: ${(p as any).quantity} (limit: ${(p as any).lowStockLimit})` +
          ` | Used (30d): ${usage30d}` +
          ` | Days of stock left: ${daysOfStock ?? "N/A (no recent usage)"}` +
          ` | Low stock: ${isLow ? "YES" : "no"}` +
          ` | Cost: PKR ${(p as any).costPrice}`
        );
      })
      .join("\n");

    // ── Step 5: AI analyses the real data ────────────────────────────────────
    const rawText = await createAICompletion([
      { role: "system", content: buildForecastSystemPrompt(inventoryContext) },
      { role: "user",   content: `Analyse the inventory and provide reorder recommendations. Total parts: ${parts.length}. Total stock movements in 30d: ${movements.length}.` },
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

    return sendResponse(true, "Forecast generated", {
      ...parsed,
      partsAnalysed: parts.length,
      movementsAnalysed: movements.length,
    });
  } catch (err: any) {
    console.error("[AI/forecast]", err.message);
    return sendResponse(false, err.message ?? "Forecast failed", null, 500);
  }
}