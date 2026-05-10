import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { buildSocraticSystemPrompt } from "@/lib/socratic-prompt";
import type { LessonContext } from "@/lib/socratic-prompt";

// ============================================
// Socratic AI Tutor — Edge API Route
// Streams LLM responses using the Vercel AI SDK.
// Supports Anthropic Claude (primary) and
// Google Gemini (fallback) as specified.
//
// Sprint 5.3: contextType dispatch added.
//   "socratic"            → buildSocraticSystemPrompt (default)
//   "highlight_annotation"→ caller-supplied systemPrompt
//
// Sprint 10.3: token usage logging + per-user rate limiting (60 req/hr)
// ============================================

export const runtime = "edge";

// ── Per-user rate limiting (in-memory, edge-compatible) ──────────────────
// Map<userId, { count: number; windowStart: number }>
// Uses IP address as the user key when no auth header is present.
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT = 60;        // requests per window
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    rateLimitMap.set(key, { count: 1, windowStart: now });
    return true; // allowed
  }
  if (entry.count >= RATE_LIMIT) return false; // blocked
  entry.count++;
  return true;
}

type ContextType = "socratic" | "highlight_annotation";

interface ChatRequest {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  /** Default: "socratic" */
  contextType?: ContextType;
  /** Required when contextType === "socratic" */
  lessonContext?: LessonContext;
  /** Required when contextType === "highlight_annotation" */
  systemPrompt?: string;
}

function getModel() {
  // Primary: Anthropic Claude (superior for logic tutoring, per spec)
  if (process.env.ANTHROPIC_API_KEY) {
    return anthropic("claude-sonnet-4-20250514");
  }
  // Fallback: Google Gemini
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return google("gemini-2.0-flash");
  }
  return null;
}

export async function POST(req: Request) {
  // Rate limit keyed on IP (CF-Connecting-IP header on Vercel Edge, fallback to x-forwarded-for)
  const ip =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "anonymous";

  if (!checkRateLimit(ip)) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded. Try again soon." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  const body = (await req.json()) as ChatRequest;
  const { messages, contextType = "socratic", lessonContext, systemPrompt } = body;

  if (!messages) {
    return new Response(
      JSON.stringify({ error: "Missing messages" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const model = getModel();
  if (!model) {
    return new Response(
      JSON.stringify({
        error:
          "No AI provider configured. Set ANTHROPIC_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY.",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  let resolvedSystemPrompt: string;

  if (contextType === "highlight_annotation") {
    if (!systemPrompt) {
      return new Response(
        JSON.stringify({ error: "systemPrompt required for highlight_annotation context" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    resolvedSystemPrompt = systemPrompt;
  } else {
    // Default: socratic
    if (!lessonContext) {
      return new Response(
        JSON.stringify({ error: "lessonContext required for socratic context" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    resolvedSystemPrompt = buildSocraticSystemPrompt(lessonContext);
  }

  const result = streamText({
    model,
    system: resolvedSystemPrompt,
    messages,
    maxOutputTokens: 300,
    temperature: 0.7,
  });

  // Log token usage after streaming completes (captured by Vercel Log Drains)
  void result.usage.then((usage) => {
    console.log(
      JSON.stringify({
        type: "llm_usage",
        model: process.env.ANTHROPIC_API_KEY
          ? "claude-sonnet-4-20250514"
          : "gemini-2.0-flash",
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
        contextType,
        ts: new Date().toISOString(),
      })
    );
  });

  return result.toTextStreamResponse();
}
