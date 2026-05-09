/**
 * /api/annotations — Marginalia annotation persistence
 *
 * GET  ?conceptId=<string> — returns all annotations for (user, concept_id)
 *      Response: { data: Annotation[] }
 *
 * POST { conceptId, slideIndex, anchorY, selectedText, content, annotationType }
 *      Creates a new annotation.
 *      Response: { id: string } | { error }
 *
 * DELETE { id } — deletes annotation (must belong to authenticated user)
 *      Response: { success: true } | { error }
 *
 * Auth: requires valid session (401 otherwise).
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
  if (!conceptId) {
    return NextResponse.json({ error: "conceptId is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("annotations")
    .select(
      "id, concept_id, slide_index, anchor_y, selected_text, content, annotation_type, created_at"
    )
    .eq("user_id", session.user.id)
    .eq("concept_id", conceptId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: {
    conceptId?: string;
    slideIndex?: number;
    anchorY?: number;
    selectedText?: string;
    content?: string;
    annotationType?: string;
  } = await req.json().catch(() => ({}));

  const { conceptId, slideIndex, anchorY, selectedText, content, annotationType } = body;

  if (!conceptId || anchorY === undefined || !content) {
    return NextResponse.json(
      { error: "conceptId, anchorY, and content are required" },
      { status: 400 }
    );
  }

  if (!["marginalia", "highlight"].includes(annotationType ?? "")) {
    return NextResponse.json(
      { error: "annotationType must be 'marginalia' or 'highlight'" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("annotations")
    .insert({
      user_id: session.user.id,
      concept_id: conceptId,
      slide_index: slideIndex ?? 0,
      anchor_y: anchorY,
      selected_text: selectedText ?? "",
      content,
      annotation_type: annotationType,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}

export async function DELETE(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: { id?: string } = await req.json().catch(() => ({}));

  if (!body.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("annotations")
    .delete()
    .eq("id", body.id)
    .eq("user_id", session.user.id); // RLS guard + explicit filter

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
