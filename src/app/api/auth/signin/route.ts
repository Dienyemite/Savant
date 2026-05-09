/**
 * POST /api/auth/signin
 * Body: { email: string; password: string }
 *
 * Signs in an existing user with email + password.
 * Returns: { session } or { error }
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseBrowser } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.email !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ error: "email and password are required" }, { status: 400 });
  }

  const { data, error } = await supabaseBrowser.auth.signInWithPassword({
    email: body.email,
    password: body.password,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  return NextResponse.json({ session: data.session, user: data.user });
}
