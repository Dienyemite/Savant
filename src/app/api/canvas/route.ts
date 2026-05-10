/**
 * /api/canvas — Canvas state persistence
 *
 * Handles two canvas contexts:
 *   - Global constellation canvas:  concept_id param absent / null
 *     → stored in canvas_states table with concept_id = NULL
 *   - Per-lesson canvas:  concept_id = <seed string ID>
 *     → stored in lesson_canvas_states table
 *
 * GET  ?conceptId=<string> — returns saved canvas state
 *      Response: { strokes, textNodes, viewport? }
 *               or { strokes: [], textNodes: [] } if no saved state
 *
 * PUT  body: { strokes, textNotes, viewport?, conceptId? }
 *      Upserts canvas state. Returns { success: true } or { error }.
 *
 * Auth: requires valid Supabase session (401 otherwise).
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conceptId = req.nextUrl.searchParams.get("conceptId");

  if (conceptId) {
    // Per-lesson canvas state from lesson_canvas_states
    const { data, error } = await supabase
      .from("lesson_canvas_states")
      .select("strokes, text_nodes")
      .eq("user_id", session.user.id)
      .eq("concept_id", conceptId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      strokes: data?.strokes ?? [],
      textNodes: data?.text_nodes ?? [],
    });
  } else {
    // Global constellation canvas state from canvas_states
    const { data, error } = await supabase
      .from("canvas_states")
      .select("strokes, text_notes, viewport")
      .eq("user_id", session.user.id)
      .is("concept_id", null)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      strokes: data?.strokes ?? [],
      textNotes: data?.text_notes ?? [],
      viewport: data?.viewport ?? { x: 0, y: 0, scale: 1 },
    });
  }
}

export async function PUT(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: {
    strokes?: unknown[];
    textNotes?: unknown[];
    textNodes?: unknown[];
    viewport?: unknown;
    conceptId?: string;
  } = await req.json().catch(() => ({}));

  const { conceptId } = body;

  if (conceptId) {
    // Per-lesson canvas — lesson_canvas_states
    const { error } = await supabase.from("lesson_canvas_states").upsert(
      {
        user_id: session.user.id,
        concept_id: conceptId,
        strokes: body.strokes ?? [],
        text_nodes: body.textNodes ?? [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,concept_id" }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    // Global constellation canvas — canvas_states (concept_id NULL)
    const { error } = await supabase.from("canvas_states").upsert(
      {
        user_id: session.user.id,
        concept_id: null,
        strokes: body.strokes ?? [],
        text_notes: body.textNotes ?? [],
        viewport: body.viewport ?? { x: 0, y: 0, scale: 1 },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
