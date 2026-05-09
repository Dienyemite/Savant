# Phase 6 — Auth & User Management

## Status: ~5% Complete (client stub only)

## Overview
Adds real user identity, session persistence, and per-user data storage to
the entire platform. Without this phase, every browser session starts from
zero — no saved progress, no canvas state, no annotation history. This phase
integrates Supabase Auth, persists all five Zustand stores to the database,
and adds RBAC foundations for future teacher/admin roles.

---

## Sprint 6.1 — Supabase Auth Foundation  ❌ NOT STARTED

### Tasks

#### 6.1.1 Auth client setup
- [ ] Expand `src/lib/supabase.ts` to export two typed clients:
  ```ts
  // Browser client — for client components and API routes
  export const supabaseBrowser = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Server client — for server components and middleware (reads service role key)
  export const createServerClient = (cookieStore: ReadonlyRequestCookies) =>
    createSSRClient<Database>(url, anonKey, { cookies: { get: cookieStore.get } })
  ```
- [ ] Generate TypeScript types from the database schema:
  ```bash
  supabase gen types typescript --project-id <project-id> > src/types/supabase.ts
  ```
- [ ] Keep `src/types/supabase.ts` up to date whenever a migration runs

#### 6.1.2 Auth API routes
- [ ] `src/app/api/auth/signup/route.ts`
  - `POST { email, password, display_name }`
  - Calls `supabase.auth.signUp()` with `emailRedirectTo: <app_url>/auth/confirm`
  - On success: inserts into `public.users` with `id = user.id`, `email`, `display_name`, `role = "student"`
  - Returns `{ user, session }` or `{ error }`
  - Rate-limited: max 5 sign-ups per IP per hour (use `Ratelimit` from `@upstash/ratelimit` or a simple in-memory map for MVP)

- [ ] `src/app/api/auth/signin/route.ts`
  - `POST { email, password }`
  - Calls `supabase.auth.signInWithPassword()`
  - Returns `{ session }` or `{ error }`

- [ ] `src/app/api/auth/signout/route.ts`
  - `POST` (no body)
  - Calls `supabase.auth.signOut()`
  - Returns `{ success: true }`

- [ ] `src/app/auth/confirm/route.ts`
  - Handles the email confirmation callback (`?token_hash=...&type=email`)
  - Calls `supabase.auth.verifyOtp()` then redirects to `/`

#### 6.1.3 Session middleware
- [ ] Create `middleware.ts` at project root:
  ```ts
  // Uses @supabase/ssr to refresh the session cookie on every request
  // Redirects to /onboarding if:
  //   - request is for "/" or "/dashboard"
  //   - AND no valid session cookie exists
  // Matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)']
  ```
- [ ] Ensure the middleware does NOT block requests to `/api/chat` (AI chat must
  work without auth for demo purposes during development)

#### 6.1.4 Auth context
- [ ] Create `src/components/AuthProvider.tsx` — React context providing:
  ```ts
  {
    user: User | null,
    session: Session | null,
    isLoading: boolean,
    signOut: () => Promise<void>
  }
  ```
  - Uses `supabase.auth.onAuthStateChange()` to react to sign-in/sign-out events
  - Sets `isLoading: true` until the initial session check resolves
- [ ] Wrap `src/app/layout.tsx` root with `<AuthProvider>`

### Acceptance criteria
- New user can sign up, verify email, and access the app
- Returning user can sign in and land on their constellation
- Session cookie refreshes automatically on each navigation
- Signing out clears the cookie and redirects to `/onboarding`
- Unauthenticated access to `/` and `/dashboard` redirects to `/onboarding`
- `/api/chat` continues to function without a session (for development bypass)

---

## Sprint 6.2 — Progress Persistence  ❌ NOT STARTED

### Context
`useGraphStore.updateProgress()` currently updates in-memory state only. On page
reload, all progress reverts to `DEFAULT_PROGRESS`.

### Tasks

#### 6.2.1 Progress API route
- [ ] Create `src/app/api/progress/route.ts`:
  - `GET` — returns all `student_progress` rows for the authenticated user
  - `PATCH { conceptId, status }` — upserts a `student_progress` row
    (`status` is a `progress_status` ENUM value: `locked | unlocked | mastered`)

#### 6.2.2 Load progress on app init
- [ ] In `src/app/page.tsx`, on mount when `user` is non-null:
  - Fetch `/api/progress` → receive `{ conceptId, status }[]`
  - Call `graphStore.hydrateProgress(records)` (new action to add to store)
  - `hydrateProgress` builds the `progressMap` from the fetched records, with
    `DEFAULT_PROGRESS` as fallback for concepts not in the DB

#### 6.2.3 Save progress on mastery
- [ ] In `useGraphStore.updateProgress()`, after updating in-memory state:
  - If `user` is non-null, call `fetch("/api/progress", { method: "PATCH", body: ... })`
  - Fire-and-forget (no UI blocking); log errors silently

### Acceptance criteria
- Complete a lesson → refresh the page → the mastered node is still mastered
- On first visit (no DB rows), `DEFAULT_PROGRESS` is used as the starting state
- PATCH requests are authenticated — unauthenticated POSTs return 401

---

## Sprint 6.3 — Canvas State Persistence  ❌ NOT STARTED

### Context
`supabase/migrations/002_canvas_states.sql` defines the `canvas_states` table
with `strokes JSONB`, `text_notes JSONB`, `viewport JSONB`. No code reads or
writes this table yet.

### Tasks

#### 6.3.1 Canvas state API route
- [ ] Create `src/app/api/canvas/route.ts`:
  - `GET ?conceptId=<id>` — returns canvas state for `(user, conceptId)` pair
    — `conceptId = null` (absent) is the global constellation canvas
  - `PUT { strokes, textNotes, viewport, conceptId? }` — upserts `canvas_states`
    using the `UNIQUE(user_id, concept_id)` constraint

#### 6.3.2 Auto-save with debounce
- [ ] In `InkLayer.tsx`, after `commitStroke()`, schedule a debounced save
  (500ms debounce) calling `/api/canvas` with the current store state
- [ ] In `TextNoteLayer.tsx`, after `finishNote()`, schedule the same debounced save
- [ ] In `LessonView.tsx`, after the lesson canvas draw handler, debounce-save
  with `conceptId = activeLessonConceptId`

#### 6.3.3 Load canvas state on app init
- [ ] On `page.tsx` mount (user non-null), fetch `/api/canvas` (no conceptId) → restore
  global canvas: call `useCanvasStore.hydrateStrokes(strokes)` and
  `useCanvasStore.hydrateTextNotes(notes)`
- [ ] On `LessonView.tsx` mount, fetch `/api/canvas?conceptId=<id>` → restore
  lesson canvas via `notebookCanvasRef.current.loadState(state)`

### Acceptance criteria
- Draw a stroke on the constellation → reload → stroke is restored
- Place a text note → reload → note is restored at the same position
- Lesson canvas annotations are restored when re-entering a lesson
- API returns 401 for unauthenticated requests

---

## Sprint 6.4 — Annotation Persistence  ❌ NOT STARTED

### Context
Chat messages and marginalia entries live in `chat-store.ts` (in-memory only).
Neither the Socratic conversation history nor the marginalia are saved to the DB.

### Tasks

#### 6.4.1 Add annotations table
- [ ] Create `supabase/migrations/004_annotations.sql`:
  ```sql
  CREATE TABLE annotations (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    concept_id   TEXT NOT NULL,          -- matches Concept.id from seed
    slide_index  INTEGER NOT NULL,
    anchor_y     FLOAT NOT NULL,
    selected_text TEXT NOT NULL,
    content      TEXT NOT NULL,
    annotation_type TEXT NOT NULL        -- 'marginalia' | 'highlight'
      CHECK (annotation_type IN ('marginalia', 'highlight')),
    created_at   TIMESTAMPTZ DEFAULT now()
  );
  CREATE INDEX idx_annotations_user_concept ON annotations(user_id, concept_id);
  ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "annotations_own" ON annotations
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  ```

#### 6.4.2 Annotation API route
- [ ] `src/app/api/annotations/route.ts`
  - `GET ?conceptId=<id>` — returns all annotations for `(user, concept_id)`
  - `POST { conceptId, slideIndex, anchorY, selectedText, content, annotationType }` — creates annotation
  - `DELETE { id }` — deletes annotation (matching `user_id`)

#### 6.4.3 Save and restore
- [ ] In `MarginaliaAnnotations.tsx`, after `finishMarginalia(id)`, POST the
  completed annotation to `/api/annotations`
- [ ] In `LessonView.tsx` on mount, GET annotations for `activeLessonConceptId`
  and call `addMarginaliaEntry` for each, with `isStreaming: false`

### Acceptance criteria
- Marginalia annotation persists after page reload
- Restored annotations appear at the correct `anchorY` position
- Deleting a marginalia card from the UI also deletes it from the DB

---

## Sprint 6.5 — RBAC Foundation  ❌ NOT STARTED

### Context
`user_role` ENUM is defined as `student | teacher | admin` in migration 001,
but the application never reads or enforces roles.

### Tasks
- [ ] In `src/types/index.ts`, expand `UserRole` to match the ENUM:
  ```ts
  type UserRole = "student" | "teacher" | "admin"
  ```
- [ ] Add a `role` check helper to `src/lib/auth.ts`:
  ```ts
  async function requireRole(session: Session, role: UserRole): Promise<void>
  // Throws 403 if session user's role does not match
  ```
- [ ] Use `requireRole(session, "teacher")` in any future teacher-only API routes
- [ ] Document in `CONTRIBUTING.md` that `student` is the default role on sign-up
  and that `teacher`/`admin` must be set manually in the Supabase dashboard

---

## Completion Criteria for Phase 6

- [ ] Sign-up, sign-in, sign-out all function correctly
- [ ] Session cookie refreshes automatically; unauthenticated routes redirect
- [ ] Concept progress persists to `student_progress` table and restores on reload
- [ ] Global canvas strokes and text notes persist to `canvas_states` table
- [ ] Lesson canvas strokes persist per-concept and restore when re-entering
- [ ] Marginalia annotations persist to `annotations` table and restore on lesson entry
- [ ] All API routes return 401 for unauthenticated requests (except `/api/chat` in dev mode)
- [ ] `npm run build` with no type errors

---

## Dependencies
- Requires: Phase 0 (Supabase schema), Phase 2 Sprint 2.3 (auth UI in onboarding)
- Blocks: Phase 7 (testing needs auth flows), Phase 9 (deployment needs env vars)
