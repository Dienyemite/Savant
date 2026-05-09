# Spec — API Routes

## Purpose
Defines every API route in Savant: the contract (method, path, runtime,
request/response shapes), implementation status, and the conventions all
routes must follow. This spec governs `src/app/api/`.

---

## 1. Route Inventory

| Method | Path | Runtime | Status |
|--------|------|---------|--------|
| `POST` | `/api/chat` | edge | ✅ Complete |
| `GET` | `/api/canvas` | nodejs | ❌ Not built |
| `PUT` | `/api/canvas` | nodejs | ❌ Not built |
| `GET` | `/api/concepts` | nodejs | ❌ Not built (Phase 4) |
| `GET` | `/api/lessons` | nodejs | ❌ Not built (Phase 4) |
| `GET` | `/api/progress` | nodejs | ❌ Not built (Phase 6) |
| `PUT` | `/api/progress` | nodejs | ❌ Not built (Phase 6) |
| `POST` | `/api/admin/generate-lesson` | nodejs | ❌ Not built (Phase 4) |

---

## 2. Route Conventions

### 2.1 Runtime declaration
Every route file must declare its runtime as its first export:
```ts
// Edge routes (streaming, low latency):
export const runtime = "edge"

// Node.js routes (Supabase, file I/O, full Node.js APIs):
export const runtime = "nodejs"
```

If `runtime` is omitted, Next.js defaults to `"nodejs"`. Always declare it
explicitly — do not rely on the default.

### 2.2 HTTP method handlers
Use named exports for HTTP methods. Do not use a default export.
```ts
// ✓ Correct
export async function GET(request: Request) { ... }
export async function POST(request: Request) { ... }

// ❌ Wrong
export default async function handler(request: Request) { ... }
```

### 2.3 Response helpers
Always return a `Response` object. Use the standard constructors:
```ts
// Success with JSON
return Response.json({ ok: true })

// Success with JSON and status
return Response.json({ data }, { status: 200 })

// Error
return Response.json({ error: "message" }, { status: 400 })

// Streaming (edge only)
return result.toTextStreamResponse()   // Vercel AI SDK
```

### 2.4 Error handling
All routes must catch unexpected errors and return a 500 — never let an
unhandled exception reach the edge runtime (it produces an empty response).
```ts
try {
  // ... route logic
} catch (err) {
  console.error("[route name] error:", err)
  return Response.json({ error: "Internal server error" }, { status: 500 })
}
```

### 2.5 Input validation at boundaries
Every `POST`/`PUT` route must validate required fields before processing:
```ts
const body = await request.json()
if (!body.conceptId || typeof body.conceptId !== "string") {
  return Response.json({ error: "conceptId is required" }, { status: 400 })
}
```
Do not use a validation library (no Zod, no Joi) — plain TypeScript guards
are sufficient at this scale.

---

## 3. `POST /api/chat`

**File:** `src/app/api/chat/route.ts`
**Runtime:** `"edge"`
**Status:** ✅ Complete

Full specification in `spec-ai-pipeline.md §2–§8`.

**Quick reference:**
```ts
export const runtime = "edge"

export async function POST(request: Request): Promise<Response> {
  // Validates contextType
  // Builds system prompt via buildSystemPrompt(body)
  // Calls streamText() with Anthropic claude-sonnet-4-20250514
  // Falls back to Google gemini-2.0-flash on Anthropic failure
  // Returns result.toTextStreamResponse()
}
```

**Error cases:**
- Missing `contextType` → 400
- Missing context object for `contextType` → 400
- Both models fail → 500

---

## 4. `GET /api/canvas`

**File:** `src/app/api/canvas/route.ts`
**Runtime:** `"nodejs"`
**Status:** ❌ Not built (Phase 1 Sprint 1.8)

**Purpose:** Load the canvas state (strokes, text notes, viewport) for a given
`(userId, conceptId)` pair.

**Query parameters:**
| Name | Type | Required | Notes |
|------|------|----------|-------|
| `conceptId` | `string \| "null"` | Yes | `"null"` string for the constellation canvas |

**Response — 200:**
```json
{
  "strokes": [{ "id": "...", "points": [[x,y,p]], "tool": "pen" }],
  "textNotes": [{ "id": "...", "x": 0, "y": 0, "content": "...", "isEditing": false }],
  "viewport": { "x": 0, "y": 0, "zoom": 1 }
}
```

**Response — 404:** `{ "error": "No canvas state found" }` — client treats this as empty canvas.

**Response — 400:** `{ "error": "conceptId is required" }`

**Implementation:**
```ts
export const runtime = "nodejs"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const conceptId = searchParams.get("conceptId")
  if (!conceptId) {
    return Response.json({ error: "conceptId is required" }, { status: 400 })
  }

  const supabase = createServerClient()
  const userId = GUEST_USER_ID   // replace with auth in Phase 6

  const { data, error } = await supabase
    .from("canvas_states")
    .select("strokes, text_notes, viewport")
    .eq("user_id", userId)
    .eq("concept_id", conceptId === "null" ? null : conceptId)
    .maybeSingle()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return Response.json({ error: "No canvas state found" }, { status: 404 })
  }

  return Response.json({
    strokes: data.strokes,
    textNotes: data.text_notes,
    viewport: data.viewport,
  })
}
```

---

## 5. `PUT /api/canvas`

**File:** `src/app/api/canvas/route.ts` (same file as GET)
**Runtime:** `"nodejs"`
**Status:** ❌ Not built (Phase 1 Sprint 1.8)

**Purpose:** Upsert canvas state. One row per `(userId, conceptId)`.

**Request body:**
```json
{
  "conceptId": "c-addition",
  "strokes": [...],
  "textNotes": [...],
  "viewport": { "x": 0, "y": 0, "zoom": 1 }
}
```

**Validation (before DB write):**
- `strokes.length <= 2000`
- `textNotes.length <= 200`
- Each stroke's `points.length <= 5000`

**Implementation:**
```ts
export async function PUT(request: Request) {
  const body = await request.json()
  const { conceptId, strokes, textNotes, viewport } = body

  if (conceptId === undefined) {
    return Response.json({ error: "conceptId is required" }, { status: 400 })
  }
  if (!Array.isArray(strokes) || strokes.length > 2000) {
    return Response.json({ error: "Canvas state too large" }, { status: 400 })
  }

  const supabase = createServerClient()
  const userId = GUEST_USER_ID   // replace with auth in Phase 6

  const { error } = await supabase.from("canvas_states").upsert({
    user_id: userId,
    concept_id: conceptId === "null" ? null : conceptId,
    strokes,
    text_notes: textNotes,
    viewport,
  }, {
    onConflict: "user_id,concept_id",
  })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true })
}
```

---

## 6. `GET /api/concepts`

**File:** `src/app/api/concepts/route.ts`
**Runtime:** `"nodejs"`
**Status:** ❌ Not built (Phase 4 Sprint 4.1)

**Purpose:** Load all concepts and prerequisites from Supabase. Replaces reading
from `src/data/seed.ts` after Phase 4 migration.

**Response — 200:**
```json
{
  "concepts": [...],
  "prerequisites": [...]
}
```

No query parameters — always returns all concepts. The full set is small
(hundreds of rows max) so no pagination needed.

---

## 7. `GET /api/lessons`

**File:** `src/app/api/lessons/route.ts`
**Runtime:** `"nodejs"`
**Status:** ❌ Not built (Phase 4 Sprint 4.1)

**Purpose:** Load lessons for one or more concept IDs.

**Query parameters:**
| Name | Type | Required |
|------|------|----------|
| `conceptIds` | `string` (comma-separated) | Yes |

**Response — 200:**
```json
{
  "lessons": [
    { "id": "l-addition-1", "conceptId": "c-addition", "title": "...", "slides": [...] }
  ]
}
```

Lessons are heavy (full slide JSON). Only fetch for concepts the student
currently has unlocked or mastered. Never fetch all lessons at once.

---

## 8. `GET /api/progress`

**File:** `src/app/api/progress/route.ts`
**Runtime:** `"nodejs"`
**Status:** ❌ Not built (Phase 6 Sprint 6.3)

**Purpose:** Load `student_progress` rows for the authenticated user.

**Response — 200:**
```json
{
  "progress": [
    { "conceptId": "c-addition", "status": "mastered", "lessonsCompleted": 1 }
  ]
}
```

Requires auth (Phase 6). Returns 401 if unauthenticated.

---

## 9. `PUT /api/progress`

**File:** `src/app/api/progress/route.ts` (same file as GET)
**Runtime:** `"nodejs"`
**Status:** ❌ Not built (Phase 6 Sprint 6.3)

**Purpose:** Upsert a single `student_progress` row.

**Request body:**
```json
{
  "conceptId": "c-addition",
  "status": "mastered",
  "lessonsCompleted": 1
}
```

Requires auth (Phase 6). Returns 401 if unauthenticated.

---

## 10. `POST /api/admin/generate-lesson`

**File:** `src/app/api/admin/generate-lesson/route.ts`
**Runtime:** `"nodejs"` (LLM call + JSON validation can be slow; edge timeout risk)
**Status:** ❌ Not built (Phase 4 Sprint 4.2)

**Purpose:** Generate a lesson JSON object using an LLM. Admin-only.

**Auth guard:**
```ts
// Check for admin token in Authorization header
const authHeader = request.headers.get("Authorization")
if (authHeader !== `Bearer ${process.env.ADMIN_TOKEN}`) {
  return Response.json({ error: "Unauthorized" }, { status: 401 })
}
```

**Request body:**
```json
{
  "conceptId": "c-fractions",
  "targetAge": 9,
  "slideCount": 3,
  "includeBlockTypes": ["text", "multiple_choice", "interactive_slider"]
}
```

**Response — 200:**
```json
{
  "lesson": { "id": "l-fractions-1", "conceptId": "c-fractions", "slides": [...] }
}
```

Full specification in `spec-content-schema.md §7`.

---

## 11. Environment Variables Required by API Routes

| Variable | Used by | Notes |
|----------|---------|-------|
| `ANTHROPIC_API_KEY` | `/api/chat` | Primary LLM |
| `GOOGLE_API_KEY` | `/api/chat` | Fallback LLM |
| `NEXT_PUBLIC_SUPABASE_URL` | all nodejs routes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client-side Supabase | Anon key for RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | all nodejs routes | Bypasses RLS for server calls |
| `ADMIN_TOKEN` | `/api/admin/*` | Static secret for admin routes |

All must be present in `.env.local` and in the Vercel "Savant" project environment
variables. See Phase 9 for the Vercel setup procedure.

---

## 12. Route File Structure

```
src/app/api/
├── chat/
│   └── route.ts        ✅ exists
├── canvas/
│   └── route.ts        ❌ to build (Phase 1 Sprint 1.8)
├── concepts/
│   └── route.ts        ❌ to build (Phase 4 Sprint 4.1)
├── lessons/
│   └── route.ts        ❌ to build (Phase 4 Sprint 4.1)
├── progress/
│   └── route.ts        ❌ to build (Phase 6 Sprint 6.3)
└── admin/
    └── generate-lesson/
        └── route.ts    ❌ to build (Phase 4 Sprint 4.2)
```
