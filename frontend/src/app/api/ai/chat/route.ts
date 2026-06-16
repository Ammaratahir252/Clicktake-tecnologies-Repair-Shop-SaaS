import { NextRequest, NextResponse } from "next/server";
import groq, { AI_MODEL } from "@/lib/ai/anthropic";
import { buildChatbotSystemPrompt } from "@/lib/ai/prompts";
import connectDB from "@/lib/db";
import Ticket from "@/models/ticket.model";
import { sendResponse } from "@/utils/apiResponse";

function getTenantId(req: NextRequest): string {
  return req.headers.get("x-tenant-id") ?? "";
}

function extractTicketNumber(message: string): string | null {
  const match = message.match(/\b(TKT-\d{4,}|REP-\d{4}-\d{5,})\b/i);
  return match ? match[0].toUpperCase() : null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  await connectDB();

  const tenantId = getTenantId(req);

  let body: {
    message: string;
    history?: { role: "user" | "assistant"; content: string }[];
  };
  try {
    body = await req.json();
  } catch {
    return sendResponse(false, "Invalid request body", null, 400);
  }

  if (!body.message?.trim()) {
    return sendResponse(false, "Message is required", null, 400);
  }

  try {
    const mongoose = (await import("mongoose")).default;

    const ticketNumber = extractTicketNumber(body.message);
    let ticketContext = "No ticket number mentioned in this message.";

    if (ticketNumber && !tenantId) {
      ticketContext =
        "Customer mentioned a ticket number, but we don't know which shop they belong to yet — ask them to confirm the shop name, or tell them to check their confirmation email/SMS for a tracking link.";
    } else if (ticketNumber) {
      const ticket = await Ticket.findOne({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        ticketNumber: ticketNumber.toUpperCase(),
      })
        .populate("customerId", "name phone")
        .select(
          "ticketNumber status deviceBrand deviceModel issue estimateAmount createdAt"
        )
        .lean();

      if (ticket) {
        ticketContext = `Ticket found:
- Number: ${(ticket as any).ticketNumber}
- Device: ${(ticket as any).deviceBrand} ${(ticket as any).deviceModel}
- Issue: ${(ticket as any).issue}
- Current Status: ${(ticket as any).status}
- Estimate: PKR ${(ticket as any).estimateAmount ?? "Pending"}
- Created: ${new Date((ticket as any).createdAt).toLocaleDateString()}`;
      } else {
        ticketContext = `No ticket found with number ${ticketNumber} for this shop.`;
      }
    }

    const shopInfo = `Shop Name: Your Repair Shop (via DibnowRepairSaaS)
Business Hours: Mon–Sat 9am–7pm
Services: Phone, Laptop, Tablet repairs
Warranty: 30-day warranty on all repairs`;

    const conversationMessages: {
      role: "user" | "assistant";
      content: string;
    }[] = [
      ...(body.history ?? []).slice(-6),
      { role: "user", content: body.message },
    ];

    const response = await groq.chat.completions.create({
      model: AI_MODEL,
      max_tokens: 512,
      messages: [
        {
          role: "system",
          content: buildChatbotSystemPrompt(ticketContext, shopInfo),
        },
        ...conversationMessages,
      ],
    });

    const rawText = response.choices[0]?.message?.content ?? "";

    let parsed: {
      message: string;
      needsHandoff: boolean;
      suggestedActions?: string[];
    };
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
        // If still not JSON, wrap plain text response
        parsed = {
          message: cleaned,
          needsHandoff: false,
          suggestedActions: [],
        };
      }
    }

    return sendResponse(true, "Chatbot response", {
      reply: parsed.message,
      needsHandoff: parsed.needsHandoff ?? false,
      suggestedActions: parsed.suggestedActions ?? [],
      ticketFound: ticketNumber
        ? ticketContext.startsWith("Ticket found")
        : null,
    });
  } catch (err: any) {
    console.error("[AI/chat]", err.message);
    return sendResponse(false, err.message ?? "Chatbot error", null, 500);
  }
}