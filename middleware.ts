/**
 * middleware.ts — Session refresh + protected route guard
 *
 * Runs on every non-static request. The Supabase SSR client reads the current
 * session cookie and automatically refreshes the JWT if needed. This ensures
 * the session never expires silently.
 *
 * Route protection:
 *   - "/dashboard" requires a valid session → redirect to /onboarding
 *   - "/" is accessible without auth — seed data works, cloud features degrade gracefully
 *   - "/onboarding" is always accessible (even when logged in)
 *   - "/api/chat" is always accessible (dev bypass per spec)
 *   - All other /api/* routes are handled by individual route files
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient as createSSRClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        get(name) {
          return req.cookies.get(name)?.value;
        },
        set(name, value, options) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          res.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // Refresh session — required on every request to keep the JWT alive
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;

  // Protected pages: redirect to onboarding if no session
  const isProtected = pathname.startsWith("/dashboard");
  if (isProtected && !session) {
    const url = req.nextUrl.clone();
    url.pathname = "/onboarding";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - api/auth/* (auth routes — always accessible)
     * - api/chat (AI chat — accessible without session per spec)
     * - auth/* (email confirmation)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|api/auth|api/chat|auth/).*)",
  ],
};
