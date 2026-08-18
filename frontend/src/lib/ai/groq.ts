/**
 * lib/ai/groq.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared Groq client — the platform's default AI provider.
 * Used by the public chat widget and the AI automation builder; multi-provider
 * routes should go through lib/ai/client.ts (createAICompletion) instead.
 */

import "server-only";
import Groq from "groq-sdk";

// Lazy singleton — constructing eagerly at module scope means merely
// IMPORTING this file (e.g. Next.js collecting page data for every route
// during `next build`) throws whenever GROQ_API_KEY isn't set, even for
// routes that never actually call the AI. groq-sdk's own constructor throws
// on a missing key too, so the check has to live inside this function, not
// be removed.
let _groq: Groq | null = null;

export function getGroqClient(): Groq {
  if (_groq) return _groq;
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is missing from .env.local");
  }
  _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
}

// llama-3.3-70b-versatile was retired by Groq (2026-08) — gpt-oss-120b is the
// current best general-purpose model on Groq's catalog. It's a reasoning model:
// callers must pass `reasoning_effort: "low"` and budget enough max_tokens, or
// the whole token budget can get consumed by hidden reasoning before any of the
// final answer is emitted (empty `content`, finish_reason "length").
export const AI_MODEL = "openai/gpt-oss-120b" as const;
export const DEFAULT_MAX_TOKENS = 1024 as const;
export const runtime = "nodejs";
export default getGroqClient;
