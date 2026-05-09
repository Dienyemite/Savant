/**
 * GET /auth/confirm
 *
 * Handles the email confirmation callback from Supabase.
 * Supabase redirects here after the user clicks the confirmation link in their email.
 * The URL contains: ?token_hash=<hash>&type=email
 *
 * On success: redirects to "/" (constellation)
 * On error: redirects to "/onboarding?error=<message>"
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseBrowser } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  if (tokenHash && type === "email") {
    const { error } = await supabaseBrowser.auth.verifyOtp({
      token_hash: tokenHash,
      type: "email",
    });

    if (!error) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.redirect(
      new URL(`/onboarding?error=${encodeURIComponent(error.message)}`, req.url)
    );
  }

  return NextResponse.redirect(
    new URL("/onboarding?error=invalid_confirmation_link", req.url)
  );
}
