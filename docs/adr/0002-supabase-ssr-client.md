# Supabase SSR client with PUBLISHABLE_KEY

We use `@supabase/ssr` (not the legacy `@supabase/supabase-js` browser client) with the environment variable named `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (not `ANON_KEY`).

Two client factories are exported from `src/lib/supabase.ts`:
- `supabaseBrowser` — a lazy proxy around `createBrowserClient`, safe to call from any client component
- `createServerClient(cookieStore)` — takes a `ReadonlyRequestCookies` store from `next/headers`, used in server components, route handlers, and middleware

Middleware at the repo root (`middleware.ts`) calls `createServerClient` on every request to refresh the session cookie before it expires. Protected routes (`/dashboard`, `/notebook`, etc.) redirect to `/onboarding?returnTo=...` when no session is found.

The `PUBLISHABLE_KEY` naming is Supabase's newer convention (replacing `ANON_KEY`). All new code must use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — do not introduce `SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
