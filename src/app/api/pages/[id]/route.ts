/**
 * GET /api/pages/[id]              — load page (canvas_state + lesson_content)
 * PUT /api/pages/[id]/canvas       — save canvas state (strokes + text + annotations)
 * POST /api/pages/[id]/generate-lesson — trigger Teacher AI lesson generation
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { cookies } from "next/headers";
import type { Page, Notebook } from "@/types";

type SupabaseServerClient = ReturnType<typeof createServerClient>;

async function authorizedPage(supabase: SupabaseServerClient, pageId: string, userId: string) {
  const { data } = await supabase
    .from("pages")
    .select("*, notebooks(*)")
    .eq("id", pageId)
    .eq("user_id", userId)
    .single();
  return data as (Page & { notebooks: Notebook }) | null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await authorizedPage(supabase, id, user.id);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { notebooks: notebook, ...page } = row;
  return NextResponse.json({ page, notebook });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null) as {
    title?: string;
    is_pinned?: boolean;
    is_favorited?: boolean;
    completed_at?: string | null;
  } | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const allowed: Record<string, unknown> = {};
  if (typeof body.title === "string")       allowed.title = body.title;
  if (typeof body.is_pinned === "boolean")  allowed.is_pinned = body.is_pinned;
  if (typeof body.is_favorited === "boolean") allowed.is_favorited = body.is_favorited;
  if ("completed_at" in body)               allowed.completed_at = body.completed_at ?? null;

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("pages")
    .update(allowed)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ page: data as Page });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("pages")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
