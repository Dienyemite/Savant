/**
 * PUT /api/pages/[id]/canvas
 * Saves the canvas state (strokes, textNotes, annotations) for a page.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { cookies } from "next/headers";
import type { PageCanvasState } from "@/types";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null) as { canvas_state?: PageCanvasState } | null;
  if (!body?.canvas_state) {
    return NextResponse.json({ error: "canvas_state is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("pages")
    .update({ canvas_state: body.canvas_state })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
