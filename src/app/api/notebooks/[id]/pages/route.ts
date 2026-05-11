/**
 * GET  /api/notebooks/[id]/pages   — list pages in a notebook
 * POST /api/notebooks/[id]/pages   — create a new page
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Page } from "@/types";

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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: notebookId } = await params;
  const cookieStore = await cookies();
  const supabase = makeSupabase(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify notebook belongs to user
  const { data: notebook } = await supabase
    .from("notebooks")
    .select("id")
    .eq("id", notebookId)
    .eq("user_id", user.id)
    .single();

  if (!notebook) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("pages")
    .select("*")
    .eq("notebook_id", notebookId)
    .order("order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ pages: data as Page[] });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: notebookId } = await params;
  const cookieStore = await cookies();
  const supabase = makeSupabase(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  // Verify notebook belongs to user
  const { data: notebook } = await supabase
    .from("notebooks")
    .select("id")
    .eq("id", notebookId)
    .eq("user_id", user.id)
    .single();

  if (!notebook) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Get current max order
  const { data: existing } = await supabase
    .from("pages")
    .select("order")
    .eq("notebook_id", notebookId)
    .order("order", { ascending: false })
    .limit(1);

  const nextOrder = existing?.[0]?.order != null ? existing[0].order + 1 : 0;

  const { data, error } = await supabase
    .from("pages")
    .insert({
      notebook_id: notebookId,
      user_id: user.id,
      title: body.title,
      topic: body.topic ?? body.title.toLowerCase().replace(/\s+/g, "_"),
      order: nextOrder,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ page: data as Page }, { status: 201 });
}
