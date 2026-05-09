# Spec — Canvas Persistence

## Purpose
Defines the full persistence contract for canvas state (ink strokes, highlight
strokes, text notes, and viewport) to Supabase. Covers the database schema,
API route specifications, the auto-save pattern, and hydration on app startup.

---

## 1. Current Implementation Status

**What exists:**
- `supabase/migrations/002_canvas_states.sql` — table definition is complete
- `NotebookCanvas.tsx` — has `getState()` / `loadState()` / `clear()` imperative handle
- `src/lib/supabase.ts` — 3-line stub (`createClient(url, anonKey)`)

**What does NOT exist yet:**
- No API route for reading or writing canvas state
- `getState()` / `loadState()` results are never sent to or read from Supabase
- No debounced auto-save trigger anywhere in the codebase
- No hydration on app init

---

## 2. Database Schema

Defined in `supabase/migrations/002_canvas_states.sql`.

```sql
CREATE TABLE canvas_states (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES users(id) ON DELETE CASCADE,
  concept_id  text REFERENCES concepts(id) ON DELETE CASCADE,
  strokes     jsonb NOT NULL DEFAULT '[]',
  text_notes  jsonb NOT NULL DEFAULT '[]',
  viewport    jsonb NOT NULL DEFAULT '{"x":0,"y":0,"zoom":1}',
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Constraint: one row per (user_id, concept_id) pair
CREATE UNIQUE INDEX canvas_states_user_concept ON canvas_states(user_id, concept_id);

-- RLS: users can only read/write their own rows
ALTER TABLE canvas_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own canvas states"
  ON canvas_states FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at on any row change
CREATE TRIGGER canvas_states_updated_at
  BEFORE UPDATE ON canvas_states
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### JSONB column shapes
See `spec-ink-stylus.md §10` for the exact serialisation format of each column.

- `strokes`: `InkStroke[] | HighlightStroke[]` (discriminated by `tool` field)
- `text_notes`: `GlobalTextNote[]` (constellation) or `LocalTextNote[]` (lesson)
- `viewport`: `{ x: number, y: number, zoom: number }`

---

## 3. API Routes

### 3.1 `GET /api/canvas`
Loads the canvas state for a specific `(user_id, concept_id)` pair.

**Route file:** `src/app/api/canvas/route.ts`

**Query parameters:**
- `conceptId: string` — required; the concept the lesson belongs to

**Runtime:** `"nodejs"` (not edge — requires Supabase server-side client
with service role key for bypassing RLS in server context, until full auth is wired)

**Auth:** See §5 Pre-auth workaround. After Phase 6 auth, use `supabase.auth.getUser()`.

**Response — 200 OK:**
```json
{
  "strokes": [...],
  "textNotes": [...],
  "viewport": { "x": 0, "y": 0, "zoom": 1 }
}
```

**Response — 404 Not Found:**
```json
{ "error": "No canvas state found" }
```
The client treats 404 as "empty canvas" — do not treat it as an error.

**Response — 400 Bad Request:**
```json
{ "error": "conceptId is required" }
```

### 3.2 `PUT /api/canvas`
Upserts the canvas state for a `(user_id, concept_id)` pair.
Uses PostgreSQL `ON CONFLICT DO UPDATE` (upsert) so there is always at most
one row per user+concept combination.

**Route file:** `src/app/api/canvas/route.ts`

**Request body:**
```json
{
  "conceptId": "c-addition",
  "strokes": [...],
  "textNotes": [...],
  "viewport": { "x": 0, "y": 0, "zoom": 1 }
}
```

**Runtime:** `"nodejs"`

**SQL executed:**
```sql
INSERT INTO canvas_states (user_id, concept_id, strokes, text_notes, viewport)
VALUES ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb)
ON CONFLICT (user_id, concept_id)
DO UPDATE SET
  strokes    = EXCLUDED.strokes,
  text_notes = EXCLUDED.text_notes,
  viewport   = EXCLUDED.viewport,
  updated_at = now();
```

**Response — 200 OK:**
```json
{ "ok": true }
```

**Response — 400/500:**
```json
{ "error": "..." }
```

### 3.3 Security constraints
- Request body size limit: 512KB maximum. Strokes and text notes must be
  validated for maximum array lengths before DB write:
  - `strokes.length <= 2000`
  - `textNotes.length <= 200`
- Each stroke's `points` array: maximum 5000 points per stroke
- If limits exceeded, return 400 with `{ "error": "Canvas state too large" }`

---

## 4. Auto-Save Pattern

The auto-save must be **debounced** to avoid sending a PUT request on every
pointer-move event.

### Implementation location
`LessonView.tsx` — because it holds the `notebookCanvasRef` and knows the
active concept.

### Pattern
```ts
const saveTimer = useRef<ReturnType<typeof setTimeout>>()

function triggerAutoSave() {
  if (saveTimer.current) clearTimeout(saveTimer.current)
  saveTimer.current = setTimeout(async () => {
    const state = notebookCanvasRef.current?.getState()
    if (!state) return
    await fetch('/api/canvas', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conceptId: activeLesson.conceptId,
        strokes: state.strokes,
        textNotes: state.textNotes,
        viewport: { x: 0, y: 0, zoom: 1 },  // lesson canvas has no viewport
      }),
    })
  }, 500)
}
```

### Trigger points
`triggerAutoSave()` must be called from `NotebookCanvas.tsx` via a callback prop
(`onStateChange`) whenever:
1. A stroke is committed
2. A text note is created, updated, or deleted

### Cleanup
```ts
useEffect(() => {
  return () => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
  }
}, [])
```

---

## 5. Hydration on Lesson Open

When a lesson is opened (`startLesson()` in `lesson-store`), `LessonView.tsx`
must load any existing canvas state from the API and call `loadState()` on
the canvas.

```ts
useEffect(() => {
  if (!activeLesson) return
  const fetchState = async () => {
    const res = await fetch(`/api/canvas?conceptId=${activeLesson.conceptId}`)
    if (res.status === 404) return   // no saved state — start blank
    if (!res.ok) return              // silent fail — don't block the lesson
    const data = await res.json()
    notebookCanvasRef.current?.loadState({
      strokes: data.strokes ?? [],
      textNotes: data.textNotes ?? [],
    })
  }
  fetchState()
}, [activeLesson?.id])
```

Dependency on `activeLesson?.id` (not the whole object) ensures this runs only
when the active lesson changes, not on re-renders.

---

## 6. Constellation Canvas Persistence

The global InkLayer (constellation canvas) is a different surface from the
lesson canvas. It requires a different persistence approach because:
- There is no "lesson" context — strokes belong to the global canvas
- The viewport must also be saved (so the user returns to where they were)

### API usage (same route, `conceptId: null`)
```json
{
  "conceptId": null,
  "strokes": [...],
  "textNotes": [...],
  "viewport": { "x": 150, "y": -200, "zoom": 0.8 }
}
```

The DB schema allows `concept_id` to be NULL (`concept_id text REFERENCES concepts(id) ON DELETE CASCADE`
— nullable foreign key). The unique index `canvas_states_user_concept` must be
updated to use `NULLS NOT DISTINCT` in PostgreSQL 15+ or a partial unique index
in earlier versions to allow only one NULL-concept row per user.

### Trigger
Global canvas auto-save triggers on `commitStroke` and `commitHighlight` via the
`setStrokeCommitHandler` hook, plus `addNote/finishNote/deleteNote` via a separate
`onTextNoteChange` callback. Debounce delay: 500ms (same as lesson canvas).

---

## 7. Pre-Auth Workaround (Phase 2 — before Phase 6 auth)

Before auth is implemented (Phase 6), a static guest user ID must be used
to allow testing persistence without Supabase auth:

```ts
// In src/app/api/canvas/route.ts
const GUEST_USER_ID = '00000000-0000-0000-0000-000000000001'
```

This constant must be replaced with `supabase.auth.getUser()` in Phase 6
Sprint 6.1. The guest user row must be inserted into `users` table in a
migration (see `spec-auth.md` in Chunk 3).

---

## 8. Supabase Client Setup

`src/lib/supabase.ts` must be extended beyond the 3-line stub:

```ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side Supabase client (anon key, RLS enforced)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side Supabase client factory (for API routes)
// Import separately in API routes to avoid including service key in client bundle
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
```

**Environment variables required:**
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...     # never expose to client
```

These must be present in `.env.local` and documented in a `.env.example` file
at the project root (see Phase 0 Sprint 0.2).

---

## 9. Error Handling Principles

Canvas persistence failures must **never block the lesson experience**:
- If `GET /api/canvas` fails, silently start with blank canvas
- If `PUT /api/canvas` fails, log to console only — do not show error UI
- If the debounce timer is pending when the user exits the lesson, fire the
  save immediately (no `clearTimeout` on lesson exit — let the final save complete)

The lesson experience is the primary product. Canvas state saving is a
quality-of-life feature that degrades gracefully.
