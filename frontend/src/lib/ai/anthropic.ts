/**
 * lib/ai/anthropic.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Backward-compatible Groq export.
 * Existing routes (chat, automation) import from here — no changes needed there.
 * New routes should import from "@/lib/ai/providers" directly.
 */

import "server-only";
import Groq from "groq-sdk";

if (!process.env.GROQ_API_KEY) {
  throw new Error("GROQ_API_KEY is missing from .env.local");
}

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export const AI_MODEL = "llama-3.3-70b-versatile" as const;
export const DEFAULT_MAX_TOKENS = 1024 as const;
export const runtime = "nodejs";
export default groq;
