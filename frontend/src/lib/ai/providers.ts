/**
 * lib/ai/providers.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * AI Provider helpers. Per explicit product direction ("no Anthropic, Groq
 * only" — see project memory 2026-07-14), every shop-facing AI feature (chat,
 * diagnostic, estimate, forecast, automation validation) runs on Groq.
 * callOpenAI/callGemini remain available below for the platform-level,
 * admin-configurable AI report feature (lib/ai/client.ts) — they are NOT used
 * by any shop-facing route, and were previously mis-wired into diagnostic/
 * estimate/forecast, which broke those features entirely once Gemini retired
 * gemini-1.5-flash and the configured OpenAI key ran out of quota. Fixed
 * 2026-08-17: diagnostic/estimate/forecast now all call Groq, matching chat.
 *
 * ENV VARS REQUIRED in frontend/.env.local:
 *   GROQ_API_KEY=gsk_...      (required — every shop-facing AI feature)
 *   OPENAI_API_KEY=sk-proj... (optional — only for the super-admin AI report)
 *   GEMINI_API_KEY=AIzaSy...  (optional — only for the super-admin AI report)
 */

import "server-only";

export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AIResponse = {
  text: string;
  provider: "groq" | "openai" | "gemini";
  model: string;
};

// ─── GROQ — gpt-oss-120b (llama-3.3-70b-versatile was retired 2026-08) ───────

export const GROQ_MODEL = "openai/gpt-oss-120b";

export async function callGroq(
  messages: AIMessage[],
  maxTokens = 1024
): Promise<AIResponse> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not set in .env.local");

  const Groq = (await import("groq-sdk")).default;
  const client = new Groq({ apiKey });

  // gpt-oss-120b is a reasoning model — reasoning_effort keeps its hidden
  // chain-of-thought short so maxTokens isn't consumed before the final JSON
  // answer is emitted (otherwise content comes back empty, finish_reason "length").
  const res = await client.chat.completions.create({
    model: GROQ_MODEL,
    max_tokens: maxTokens,
    reasoning_effort: "low" as any,
    messages: messages as any,
  });

  return {
    text: res.choices[0]?.message?.content ?? "",
    provider: "groq",
    model: GROQ_MODEL,
  };
}

// ─── OPENAI — GPT-4o Mini (ChatGPT) ──────────────────────────────────────────

export const OPENAI_MODEL = "gpt-4o-mini";

export async function callOpenAI(
  messages: AIMessage[],
  maxTokens = 1024
): Promise<AIResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set in .env.local");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_tokens: maxTokens,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `OpenAI error ${res.status}: ${(err as any)?.error?.message ?? res.statusText}`
    );
  }

  const data = await res.json();
  return {
    text: data.choices?.[0]?.message?.content ?? "",
    provider: "openai",
    model: OPENAI_MODEL,
  };
}

// ─── GOOGLE GEMINI ────────────────────────────────────────────────────────────

export const GEMINI_MODEL = "gemini-1.5-flash";

export async function callGemini(
  messages: AIMessage[],
  maxTokens = 1024
): Promise<AIResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set in .env.local");

  const systemMsg = messages.find((m) => m.role === "system");
  const nonSystemMsgs = messages.filter((m) => m.role !== "system");

  const geminiContents = nonSystemMsgs.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const body: Record<string, unknown> = {
    contents: geminiContents,
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 0.3,
    },
  };

  if (systemMsg) {
    body.systemInstruction = { parts: [{ text: systemMsg.content }] };
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `Gemini error ${res.status}: ${JSON.stringify((err as any)?.error ?? {})}`
    );
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  return { text, provider: "gemini", model: GEMINI_MODEL };
}

// ─── Safe JSON Parser ─────────────────────────────────────────────────────────

export function parseAIJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    const cleaned = raw
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    try {
      return JSON.parse(cleaned) as T;
    } catch {
      return fallback;
    }
  }
}
