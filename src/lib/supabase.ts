/**
 * supabase.ts — Typed Supabase client factory
 *
 * Exports two clients:
 *   supabaseBrowser — for use in client components and API routes.
 *   createServerClient — factory for server components / middleware;
 *     forwards cookies so the session is refreshed automatically.
 */

import { createBrowserClient } from "@supabase/ssr";
import {
  createServerClient as createSSRServerClient,
  type CookieOptions,
} from "@supabase/ssr";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl) {
  throw new Error(
    "Missing environment variable: NEXT_PUBLIC_SUPABASE_URL\n" +
    "Copy .env.example to .env.local and fill in your Supabase project URL."
  );
}
if (!supabaseAnonKey) {
  throw new Error(
    "Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY\n" +
    "Copy .env.example to .env.local and fill in your Supabase anon key."
  );
}

/** Browser client — use in client components and edge API routes */
export const supabaseBrowser = createBrowserClient(supabaseUrl, supabaseAnonKey);

/** Legacy alias for existing callers */
export const supabase = supabaseBrowser;

/**
 * Server client — use in server components, Server Actions, and middleware.
 * Reads/writes the session cookie so the JWT refreshes on every request.
 */
export function createServerClient(cookieStore: ReadonlyRequestCookies) {
  return createSSRServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        // Server components are read-only; the response sets cookies in middleware
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (cookieStore as any).set({ name, value, ...options });
        } catch {
          // Silently ignore when called from a read-only context
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (cookieStore as any).set({ name, value: "", ...options });
        } catch {
          // Silently ignore when called from a read-only context
        }
      },
    },
  });
}
