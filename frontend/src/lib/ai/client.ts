import "server-only";
import connectDB from "@/lib/db";
import PlatformSettings from "@/models/platformSettings.model";

type Message = { role: "system" | "user" | "assistant"; content: string };

export async function createAICompletion(
  messages: Message[],
  maxTokens = 1024
): Promise<string> {
  await connectDB();
  const raw = await PlatformSettings.findOne()
    .select("aiProvider aiModel")
    .lean();

  const s = raw as any;
  const provider: string = s?.aiProvider || "groq";
  const model: string    = s?.aiModel    || "llama-3.3-70b-versatile";

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
