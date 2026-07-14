import "server-only";
import connectDB from "@/lib/db";
import PlatformSettings from "@/models/platformSettings.model";
import AIUsageLog from "@/models/aiUsageLog.model";
import Tenant from "@/models/tenant.model";

type Message = { role: "system" | "user" | "assistant"; content: string };

// Rough $/1K-token estimates — good enough for a soft budget cap, not billing-grade.
const COST_PER_1K_TOKENS: Record<string, number> = {
  groq: 0.0002,
  openai: 0.005,
  google: 0.001,
  glm: 0.0005,
};

async function budgetAndPlanCheck(tenantId?: string): Promise<void> {
  await connectDB();
  const s = await PlatformSettings.findOne()
    .select("aiDailyBudgetUsd aiMonthlyBudgetUsd aiDisabledPlans aiRateLimitPerHourPerTenant")
    .lean() as any;
  if (!s) return;

  if (tenantId && s.aiDisabledPlans?.length) {
    const tenant = await Tenant.findById(tenantId).select("plan").lean() as any;
    if (tenant && s.aiDisabledPlans.includes(tenant.plan)) {
      throw new Error(`AI features are disabled for the "${tenant.plan}" plan.`);
    }
  }

  const now = new Date();
  if (s.aiDailyBudgetUsd > 0) {
    const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
    const agg = await AIUsageLog.aggregate([
      { $match: { createdAt: { $gte: dayStart } } },
      { $group: { _id: null, total: { $sum: "$estimatedCostUsd" } } },
    ]);
    if ((agg[0]?.total ?? 0) >= s.aiDailyBudgetUsd) throw new Error("Daily AI budget has been reached. Try again tomorrow.");
  }
  if (s.aiMonthlyBudgetUsd > 0) {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const agg = await AIUsageLog.aggregate([
      { $match: { createdAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: "$estimatedCostUsd" } } },
    ]);
    if ((agg[0]?.total ?? 0) >= s.aiMonthlyBudgetUsd) throw new Error("Monthly AI budget has been reached.");
  }
  if (tenantId && s.aiRateLimitPerHourPerTenant > 0) {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const count = await AIUsageLog.countDocuments({ tenantId, createdAt: { $gte: hourAgo } });
    if (count >= s.aiRateLimitPerHourPerTenant) throw new Error("This tenant has hit its hourly AI request limit.");
  }
}

export async function createAICompletion(
  messages: Message[],
  maxTokens = 1024,
  tenantId?: string
): Promise<string> {
  await connectDB();
  const raw = await PlatformSettings.findOne()
    .select("aiProvider aiModel")
    .lean();

  const s = raw as any;
  let provider: string = s?.aiProvider || "groq";
  let model: string    = s?.aiModel    || "llama-3.3-70b-versatile";
  // Anthropic was removed as a provider — any stale 'anthropic' value in the DB
  // falls back to Groq (the platform default) instead of erroring.
  if (provider === "anthropic") {
    provider = "groq";
    model = "llama-3.3-70b-versatile";
  }

  await budgetAndPlanCheck(tenantId);
  AIUsageLog.create({
    tenantId: tenantId || undefined,
    provider,
    aiModel: model,
    estimatedCostUsd: (maxTokens / 1000) * (COST_PER_1K_TOKENS[provider] ?? 0.001),
  }).catch(() => {});

  switch (provider) {
    case "groq": {
      const { default: Groq } = await import("groq-sdk");
      const apiKey = process.env.GROQ_API_KEY || "";
      if (!apiKey) throw new Error("GROQ_API_KEY is not set in environment variables.");
      const client = new Groq({ apiKey });
      const res = await client.chat.completions.create({ model, max_tokens: maxTokens, messages: messages as any });
      return res.choices[0]?.message?.content ?? "";
    }

    case "openai": {
      const { default: OpenAI } = await import("openai");
      const apiKey = process.env.OPENAI_API_KEY || "";
      if (!apiKey) throw new Error("OPENAI_API_KEY is not set in environment variables.");
      const client = new OpenAI({ apiKey });
      const res = await client.chat.completions.create({ model, max_tokens: maxTokens, messages: messages as any });
      return res.choices[0]?.message?.content ?? "";
    }

    case "google": {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const apiKey = process.env.GEMINI_API_KEY || "";
      if (!apiKey) throw new Error("GEMINI_API_KEY is not set in environment variables.");
      const genAI     = new GoogleGenerativeAI(apiKey);
      const systemMsg = messages.find(m => m.role === "system")?.content ?? "";
      const geminiMdl = genAI.getGenerativeModel({ model, systemInstruction: systemMsg });
      const nonSystem = messages.filter(m => m.role !== "system").map(m => m.content).join("\n\n");
      const result    = await geminiMdl.generateContent(nonSystem);
      return result.response.text();
    }

    case "glm": {
      // Zhipu AI GLM — OpenAI-compatible endpoint
      const { default: OpenAI } = await import("openai");
      const apiKey = process.env.GLM_API_KEY || "";
      if (!apiKey) throw new Error("GLM_API_KEY is not set in environment variables.");
      const client = new OpenAI({ apiKey, baseURL: "https://open.bigmodel.cn/api/paas/v4/" });
      const res = await client.chat.completions.create({ model, max_tokens: maxTokens, messages: messages as any });
      return res.choices[0]?.message?.content ?? "";
    }

    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}
