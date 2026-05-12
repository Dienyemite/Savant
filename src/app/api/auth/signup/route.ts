/**
 * POST /api/auth/signup
 * Body: { email: string; password: string; display_name: string }
 *
 * Creates a new Supabase Auth user and inserts a row into public.users.
 * Returns: { user, session } or { error }
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseBrowser } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.email !== "string") {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const { email, display_name, _profile_only } = body as {
    email: string;
    password?: string;
    display_name?: string;
    _profile_only?: boolean;
    learning_mode?: string;
    declared_subject?: string;
    grade_level?: number;
  };

  const { learning_mode, declared_subject, grade_level } = body as {
    learning_mode?: string;
    declared_subject?: string;
    grade_level?: number;
  };

  // When called with _profile_only, the client already handled auth.
  // We just need to look up the current user and upsert their profile row.
  if (_profile_only) {
    const { data: { user } } = await supabaseBrowser.auth.getUser();
    if (user) {
      await supabaseBrowser
        .from("users")
        .upsert(
          {
            id: user.id,
            email: user.email!,
            display_name: display_name ?? email.split("@")[0],
            role: "student",
            learning_mode: learning_mode ?? null,
            declared_subject: declared_subject ?? null,
            grade_level: grade_level ?? null,
          },
          { onConflict: "id" }
        );
    }
    return NextResponse.json({ ok: true });
  }

  const { password } = body as { password?: string };
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "password must be at least 8 characters" }, { status: 400 });
  }

  const { data, error } = await supabaseBrowser.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/auth/confirm`,
      data: { display_name: display_name ?? email.split("@")[0] },
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (data.user) {
    await supabaseBrowser
      .from("users")
      .upsert(
        {
          id: data.user.id,
          email: data.user.email!,
          display_name: display_name ?? email.split("@")[0],
          role: "student",
          learning_mode: learning_mode ?? null,
          declared_subject: declared_subject ?? null,
          grade_level: grade_level ?? null,
        },
        { onConflict: "id" }
      );
  }

  return NextResponse.json({ user: data.user, session: data.session });
}
