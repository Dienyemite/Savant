/**
 * PATCH /api/auth/profile
 * Updates learning_mode, declared_subject, grade_level on the authenticated user.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { cookies } from "next/headers";

export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { learning_mode, declared_subject, grade_level } = body as {
    learning_mode?: string;
    declared_subject?: string;
    grade_level?: number;
  };

  const updates: Record<string, unknown> = {};
  if (learning_mode) updates.learning_mode = learning_mode;
  if (declared_subject !== undefined) updates.declared_subject = declared_subject;
  if (grade_level !== undefined) updates.grade_level = grade_level;

  const { error } = await supabase.from("users").update(updates).eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
