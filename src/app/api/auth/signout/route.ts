/**
 * POST /api/auth/signout
 *
 * Signs out the current user by invalidating the Supabase session.
 * Returns: { success: true } or { error }
 */

import { NextResponse } from "next/server";
import { supabaseBrowser } from "@/lib/supabase";

export async function POST() {
  const { error } = await supabaseBrowser.auth.signOut();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
