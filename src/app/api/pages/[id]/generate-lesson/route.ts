/**
 * POST /api/pages/[id]/generate-lesson
 *
 * Triggers Teacher AI lesson generation for a page:
 * 1. Loads page + notebook (subject, learning_mode)
 * 2. Retrieves top-5 OpenStax chunks via pgvector
 * 3. Calls Teacher AI (Claude) to generate LessonBlock[]
 * 4. Assigns spatial (x, y) positions via layout algorithm
 * 5. Saves lesson_content to pages table
 * 6. Returns PositionedLessonBlock[]
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { retrieveChunks, formatChunksAsContext } from "@/lib/textbook-retrieval";
import { buildTeacherSystemPrompt } from "@/lib/teacher-prompt";
import type { LessonBlock, PositionedLessonBlock, DiagnosticResult } from "@/types";

function makeSupabase(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(toSet) {
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

function getModel() {
  if (process.env.ANTHROPIC_API_KEY) return anthropic("claude-sonnet-4-20250514");
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) return google("gemini-2.0-flash");
  throw new Error("No AI provider configured");
}

/**
 * Assigns absolute (x, y) canvas positions to each block.
 * Layout: title/text left column, equation/step_trace right column,
 * playground below-left, sketch below-right, MCQ bottom row.
 */
function assignSpatialLayout(blocks: LessonBlock[]): PositionedLessonBlock[] {
  const positioned: PositionedLessonBlock[] = [];
  let leftY = 0;
  let rightY = 0;
  const leftX = 0;
  const rightX = 720;
  const blockWidth = 680;
  const gap = 24;

  // Heights are estimated — the canvas renders actual height
  const estimatedHeight: Record<string, number> = {
    analogy: 160,
    text: 180,
    step_trace: 340,
    playground: 380,
    sketch: 300,
    multiple_choice: 220,
    interactive_slider: 180,
    drag_drop_match: 280,
    formula_builder: 260,
    visual_feedback: 240,
  };

  for (const block of blocks) {
    const h = estimatedHeight[block.type] ?? 200;

    // step_trace and multiple_choice go in the right column
    if (block.type === "step_trace" || block.type === "multiple_choice") {
      positioned.push({ block, x: rightX, y: rightY, width: blockWidth });
      rightY += h + gap;
    } else {
      positioned.push({ block, x: leftX, y: leftY, width: blockWidth });
      leftY += h + gap;
    }
  }

  return positioned;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: pageId } = await params;
  const cookieStore = await cookies();
  const supabase = makeSupabase(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Load page + notebook
  const { data: page } = await supabase
    .from("pages")
    .select("*, notebooks(subject, learning_mode)")
    .eq("id", pageId)
    .eq("user_id", user.id)
    .single();

  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const notebook = (page as { notebooks: { subject: string; learning_mode: string } }).notebooks;
  const subject = notebook?.subject ?? "general";
  const learning_mode = (notebook?.learning_mode ?? "self_taught") as "self_taught" | "k12" | "college";
  const diagnostic_result = (page.diagnostic_result as DiagnosticResult | null) ?? null;

  // Retrieve OpenStax context
  const chunks = await retrieveChunks(page.topic, subject);
  const textbook_context = formatChunksAsContext(chunks);

  // Build Teacher AI prompt
  const systemPrompt = buildTeacherSystemPrompt({
    topic: page.topic,
    subject,
    learning_mode,
    textbook_context,
    diagnostic_result,
  });

  // Call Teacher AI — not streaming, need full JSON
  let rawText: string;
  try {
    const result = await generateText({
      model: getModel(),
      system: systemPrompt,
      prompt: `Generate a complete interactive lesson about "${page.topic}" for a ${subject} student. Return only the JSON array.`,
      maxTokens: 4096,
      temperature: 0.4,
    });
    rawText = result.text;
  } catch (err) {
    console.error("[generate-lesson] AI error:", err);
    return NextResponse.json({ error: "AI generation failed" }, { status: 502 });
  }

  // Parse JSON — strip markdown code fences if present
  let blocks: LessonBlock[];
  try {
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();
    blocks = JSON.parse(cleaned) as LessonBlock[];
    if (!Array.isArray(blocks)) throw new Error("Expected array");
  } catch (err) {
    console.error("[generate-lesson] JSON parse failed:", err, "\nRaw:", rawText.slice(0, 500));
    return NextResponse.json({ error: "Failed to parse lesson JSON" }, { status: 500 });
  }

  // Assign spatial layout
  const positioned = assignSpatialLayout(blocks);

  // Persist to pages table
  const { error: saveError } = await supabase
    .from("pages")
    .update({
      lesson_content: positioned,
      lesson_generated_at: new Date().toISOString(),
    })
    .eq("id", pageId)
    .eq("user_id", user.id);

  if (saveError) {
    console.error("[generate-lesson] save error:", saveError.message);
    return NextResponse.json({ error: saveError.message }, { status: 500 });
  }

  return NextResponse.json({ lesson_content: positioned });
}
