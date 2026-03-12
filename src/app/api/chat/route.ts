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
// ============================================

export const runtime = "edge";

interface ChatRequest {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  lessonContext: LessonContext;
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
  const { messages, lessonContext } = body;

  if (!messages || !lessonContext) {
    return new Response(
      JSON.stringify({ error: "Missing messages or lessonContext" }),
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

  const systemPrompt = buildSocraticSystemPrompt(lessonContext);

  const result = streamText({
    model,
    system: systemPrompt,
    messages,
    maxOutputTokens: 300,
    temperature: 0.7,
  });

  return result.toTextStreamResponse();
}
