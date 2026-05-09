# Spec — Authentication & User Management

## Purpose
Defines the authentication system for Savant: Supabase Magic Link flow,
session management, RLS policy alignment, the pre-auth guest workaround,
and the migration path from guest → authenticated. This spec governs
Phase 6 Sprint 6.1–6.4 and `src/app/api/auth/`.

---

## 1. Current Implementation Status

**Exists:**
- `supabase/migrations/001_initial_schema.sql` — `users` table, `user_role` ENUM, RLS policies
- `src/lib/supabase.ts` — 3-line stub (`createClient(url, anonKey)`)
- Guest user constant in canvas API routes: `GUEST_USER_ID = '00000000-0000-0000-0000-000000000001'`

**Does NOT exist:**
- No auth anywhere in the app — no sign-in, no sign-out
- `supabase.ts` does not export `createServerClient()`
- No `src/app/api/auth/` directory
- No `middleware.ts` for session refresh
- No auth context in React
- No COPPA/FERPA age-gating (required before public launch with minors)

---

## 2. Authentication Strategy

### Method: Supabase Magic Link (email OTP)
- No passwords — reduces auth friction for students
- Student enters email → receives 6-digit OTP → enters it → authenticated
- Supabase handles token storage, refresh, and revocation
- No OAuth providers in Phase 6 (may add Google in a later phase)

### Why not social auth?
For K-12 students, many schools block third-party OAuth providers on school
email accounts. Magic Link works with any email address including school-issued
`@school.edu` addresses.

### Session storage
Supabase stores the session in `localStorage` by default. For the web app,
this is acceptable. The session token auto-refreshes every 3600 seconds.

---

## 3. Supabase Client Setup

`src/lib/supabase.ts` must be fully implemented in Phase 6 Sprint 6.1:

```ts
import { createBrowserClient } from '@supabase/ssr'
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Client-side Supabase client (browser)
// Singleton — call once at module level
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Server-side Supabase client factory (for API routes and Server Components)
// Must be called per-request — do not cache across requests
export async function createServerClient() {
  const cookieStore = await cookies()
  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}

// Service role client — NEVER import this in client components
// Only for server-side admin operations that must bypass RLS
export function createServiceRoleClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

**Package:** `@supabase/ssr` (not `@supabase/auth-helpers-nextjs` which is
deprecated). Install: `npm install @supabase/ssr @supabase/supabase-js`.

---

## 4. Next.js Middleware for Session Refresh

File: `src/middleware.ts` (project root level)

Required to refresh the Supabase session on every request, so server components
see an up-to-date auth state:

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — do not remove this
  await supabase.auth.getUser()

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

---

## 5. Auth API Routes

### `POST /api/auth/send-otp`
**File:** `src/app/api/auth/send-otp/route.ts`

Sends a Magic Link / OTP to the provided email address.

```ts
export const runtime = "nodejs"

export async function POST(request: Request) {
  const { email } = await request.json()

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return Response.json({ error: "Valid email is required" }, { status: 400 })
  }

  const supabase = await createServerClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,   // creates user if not exists
    },
  })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true })
}
```

**Rate limiting:** Supabase enforces its own OTP rate limit (3 emails per hour
per email address). No additional rate limiting needed here.

### `POST /api/auth/verify-otp`
**File:** `src/app/api/auth/verify-otp/route.ts`

Verifies the OTP entered by the user and establishes a session.

```ts
export const runtime = "nodejs"

export async function POST(request: Request) {
  const { email, token } = await request.json()

  if (!email || !token) {
    return Response.json({ error: "email and token are required" }, { status: 400 })
  }

  const supabase = await createServerClient()
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  })

  if (error) {
    return Response.json({ error: "Invalid or expired code" }, { status: 401 })
  }

  // Ensure the user row exists in public.users
  await ensureUserRow(supabase, data.user!.id, data.user!.email!)

  return Response.json({ ok: true, userId: data.user!.id })
}
```

### `POST /api/auth/sign-out`
**File:** `src/app/api/auth/sign-out/route.ts`

```ts
export const runtime = "nodejs"

export async function POST() {
  const supabase = await createServerClient()
  await supabase.auth.signOut()
  return Response.json({ ok: true })
}
```

---

## 6. User Row Provisioning

When a user first signs in, a row must be inserted into `public.users` (which
is separate from `auth.users` — Supabase's internal auth table).

```ts
async function ensureUserRow(
  supabase: SupabaseClient,
  userId: string,
  email: string
): Promise<void> {
  const { error } = await supabase.from("users").upsert({
    id: userId,
    email,
    role: "student",     // default role
    metadata: {},
  }, {
    onConflict: "id",
    ignoreDuplicates: true,
  })

  if (error) {
    console.error("Failed to provision user row:", error)
    // Non-fatal: the user is authenticated even if this fails
  }
}
```

The `users` table migration (`001_initial_schema.sql`) must include a trigger
that auto-creates this row on `auth.users` insert, as a backup to the API route:

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (NEW.id, NEW.email, 'student')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## 7. Auth State in React

A custom hook provides auth state to components:

```ts
// src/lib/hooks/use-auth.ts
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    )

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading, isAuthenticated: !!user }
}
```

---

## 8. Route Protection

After Phase 6, protected routes redirect unauthenticated users to `/onboarding`.

In `src/middleware.ts`, after the session refresh:
```ts
const { data: { user } } = await supabase.auth.getUser()

const isProtectedRoute = request.nextUrl.pathname === '/'
  || request.nextUrl.pathname.startsWith('/dashboard')

if (isProtectedRoute && !user) {
  return NextResponse.redirect(new URL('/onboarding', request.url))
}
```

`/onboarding` itself is always accessible (not protected).

---

## 9. Guest → Authenticated Migration

When a guest user (who used the app with `GUEST_USER_ID`) later signs in,
their data must be migrated:

1. On `verify-otp` success, check if `GUEST_USER_ID` has rows in `canvas_states`
   or `student_progress`
2. If so, update those rows: `UPDATE canvas_states SET user_id = $newUserId WHERE user_id = $GUEST_USER_ID`
3. Delete the guest rows after migration

This migration runs once per user and must be idempotent. Implement as a
Supabase RPC function to run atomically:

```sql
CREATE OR REPLACE FUNCTION migrate_guest_to_user(p_new_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  guest_id uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  UPDATE canvas_states SET user_id = p_new_user_id
  WHERE user_id = guest_id
  ON CONFLICT (user_id, concept_id) DO NOTHING;

  UPDATE student_progress SET user_id = p_new_user_id
  WHERE user_id = guest_id
  ON CONFLICT (user_id, concept_id) DO NOTHING;
END;
$$;
```

---

## 10. COPPA / FERPA Compliance

Before Savant can accept users under age 13 (K-12 students in grades K–7),
the following must be in place:

- **COPPA**: Users under 13 require verifiable parental consent. Options:
  1. Require a parent/guardian email at sign-up for grade levels 1–7
  2. Only allow school-administered accounts (teacher creates accounts for students)
  3. Mark the app as 13+ and enforce age verification
- **FERPA**: Student educational records (progress, telemetry) may not be shared
  with third parties without consent. AI API providers (Anthropic, Google) must
  sign a FERPA-compliant data processing agreement or the system must anonymise
  all data before sending to the LLM.

Phase 6 Sprint 6.4 must address these requirements before any student data
is collected. Until then, no real user data should be collected in production.

---

## 11. Pre-Auth Workaround Cleanup Checklist

When Phase 6 auth is complete, remove all instances of:
- `const GUEST_USER_ID = '00000000-0000-0000-0000-000000000001'` in API routes
- `sessionStorage.setItem("savant_onboarding", ...)` in `handleBegin()`
- `sessionStorage.getItem("savant_onboarding")` in `page.tsx`

Replace with:
- `supabase.auth.getUser()` → use `user.id` from result
- Supabase `users.metadata` for onboarding preferences
