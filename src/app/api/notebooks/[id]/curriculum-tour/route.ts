/**
 * POST /api/notebooks/[id]/curriculum-tour
 *
 * Generates a full curriculum tour for a notebook:
 * 1. Asks Claude to plan 10–14 ordered topics for the subject
 * 2. Bulk-inserts a page per topic (order 0…N-1)
 * 3. Marks the notebook as curriculum_tour = true
 * 4. Returns { pages: Page[] } — caller starts background lesson generation
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { cookies } from "next/headers";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import type { Page, Notebook } from "@/types";

function getModel() {
  if (process.env.ANTHROPIC_API_KEY) return anthropic("claude-sonnet-4-20250514");
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) return google("gemini-2.0-flash");
  throw new Error("No AI provider configured");
}

interface CurriculumTopic {
  title: string;
  topic: string;
}

async function planCurriculum(
  subject: string,
  learning_mode: string
): Promise<CurriculumTopic[]> {
  const modeDesc =
    learning_mode === "k12"
      ? "a high school student"
      : learning_mode === "college"
      ? "a university student"
      : "a self-directed adult learner";

  const { text } = await generateText({
    model: getModel(),
    maxOutputTokens: 1024,
    system: `You are a curriculum designer. Return ONLY valid JSON — no prose, no code fences.`,
    prompt: `Design a semester-long curriculum for ${subject} aimed at ${modeDesc}.

Return a JSON array of 10–14 objects representing the complete course in logical progression.
Each object must have exactly these two fields:
- "title": short display title for the page (e.g. "Newton's Laws of Motion")
- "topic": normalized topic key used for RAG retrieval (e.g. "newtons_laws_of_motion")

Rules:
- Order topics from foundational → advanced (student must learn each before the next)
- Cover the standard textbook syllabus for ${subject} — no gaps, no redundancy
- Titles must be specific (not "Introduction" or "Overview")
- Topics must be lowercase with underscores, no spaces

Respond with ONLY the JSON array.`,
  });

  // Strip any accidental markdown fences
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Curriculum planner returned invalid JSON: ${text.slice(0, 200)}`);
  }

  if (
    !Array.isArray(parsed) ||
    parsed.length < 8 ||
    !parsed.every(
      (t) =>
        typeof t === "object" &&
        t !== null &&
        typeof (t as Record<string, unknown>).title === "string" &&
        typeof (t as Record<string, unknown>).topic === "string"
    )
  ) {
    throw new Error("Curriculum planner returned unexpected shape");
  }

  return (parsed as CurriculumTopic[]).slice(0, 14);
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: notebookId } = await params;
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership + load notebook details
  const { data: notebook } = await supabase
    .from("notebooks")
    .select("*")
    .eq("id", notebookId)
    .eq("user_id", user.id)
    .single();

  if (!notebook) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Guard: prevent duplicate tours
  if ((notebook as Notebook).curriculum_tour) {
    return NextResponse.json(
      { error: "Curriculum tour already exists for this notebook" },
      { status: 409 }
    );
  }

  // Plan topics via AI
  let topics: CurriculumTopic[];
  try {
    topics = await planCurriculum(
      (notebook as Notebook).subject,
      (notebook as Notebook).learning_mode
    );
  } catch (err) {
    console.error("[curriculum-tour] Planning failed:", err);
    return NextResponse.json(
      { error: "Failed to plan curriculum. Please try again." },
      { status: 502 }
    );
  }

  // Bulk-insert pages (order 0 … N-1)
  const rows = topics.map((t, i) => ({
    notebook_id: notebookId,
    user_id: user.id,
    title: t.title,
    topic: t.topic,
    order: i,
  }));

  const { data: pages, error: pagesErr } = await supabase
    .from("pages")
    .insert(rows)
    .select();

  if (pagesErr || !pages) {
    console.error("[curriculum-tour] Page insert failed:", pagesErr);
    return NextResponse.json({ error: "Failed to create pages" }, { status: 500 });
  }

  // Mark notebook as a curriculum tour
  await supabase
    .from("notebooks")
    .update({ curriculum_tour: true })
    .eq("id", notebookId);

  // Return pages sorted by order
  const sorted = [...(pages as Page[])].sort((a, b) => a.order - b.order);
  return NextResponse.json({ pages: sorted }, { status: 201 });
}
