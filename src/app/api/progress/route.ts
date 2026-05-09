/**
 * /api/progress — Student concept progress persistence
 *
 * GET  → Returns all user_progress rows for the authenticated user.
 *         Response: { data: { conceptId: string; status: string }[] }
 *
 * PATCH → Upserts a single user_progress row.
 *         Body: { conceptId: string; status: "locked" | "unlocked" | "mastered" }
 *         Response: { success: true } or { error }
 *
 * Auth: all requests require a valid Supabase session (401 otherwise).
 * Note: /api/chat bypasses auth per spec; this route does not.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("user_progress")
    .select("concept_id, status")
    .eq("user_id", session.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: (data ?? []).map((r) => ({ conceptId: r.concept_id, status: r.status })),
  });
}

export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (
    !body ||
    typeof body.conceptId !== "string" ||
    !["locked", "unlocked", "mastered"].includes(body.status)
  ) {
    return NextResponse.json({ error: "conceptId and status are required" }, { status: 400 });
  }

  const { error } = await supabase.from("user_progress").upsert(
    {
      user_id: session.user.id,
      concept_id: body.conceptId as string,
      status: body.status as string,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,concept_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
