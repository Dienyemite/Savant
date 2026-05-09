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
// ============================================

export const runtime = "edge";

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

  return result.toTextStreamResponse();
}
