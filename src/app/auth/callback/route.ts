import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * GET /auth/callback
 * Handles Supabase email confirmation and OAuth redirect.
 * Supabase appends ?code=... to this URL after the user clicks the confirmation link.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/figma-dashboard";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
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

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, req.url));
    }
  }

  // Exchange failed — redirect to onboarding
  return NextResponse.redirect(new URL("/onboarding?error=auth_failed", req.url));
}
