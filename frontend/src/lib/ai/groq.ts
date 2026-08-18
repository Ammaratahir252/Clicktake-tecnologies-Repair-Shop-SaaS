/**
 * lib/ai/groq.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared Groq client — the platform's default AI provider.
 * Used by the public chat widget and the AI automation builder; multi-provider
 * routes should go through lib/ai/client.ts (createAICompletion) instead.
 */

import "server-only";
import Groq from "groq-sdk";

if (!process.env.GROQ_API_KEY) {
  throw new Error("GROQ_API_KEY is missing from .env.local");
}

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// llama-3.3-70b-versatile was retired by Groq (2026-08) — gpt-oss-120b is the
// current best general-purpose model on Groq's catalog. It's a reasoning model:
// callers must pass `reasoning_effort: "low"` and budget enough max_tokens, or
// the whole token budget can get consumed by hidden reasoning before any of the
// final answer is emitted (empty `content`, finish_reason "length").
export const AI_MODEL = "openai/gpt-oss-120b" as const;
export const DEFAULT_MAX_TOKENS = 1024 as const;
export const runtime = "nodejs";
export default groq;
