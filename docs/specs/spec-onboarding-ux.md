# Spec — Onboarding UX

## Purpose
Defines the complete onboarding experience: the `NotebookCover` entry point,
the three learning paths, the K-12 diagnostic crucible, the cover-to-canvas
transition, and the full intended implementation of `handleBegin()`. This spec
governs `NotebookCover.tsx`, `src/app/onboarding/page.tsx`, and the cover state
in `canvas-store.ts`.

---

## 1. Current Implementation Status

**Exists:**
- `NotebookCover.tsx` — complete UI (binding spine, path selector, exit animation)
- `src/app/onboarding/page.tsx` — UI complete (three-path flow with K-12 grade selector)
- `isCoverOpen` state in `canvas-store.ts` with `closeCover()` action

**Does NOT exist:**
- `handleBegin()` only calls `router.push("/")` — the cover never closes, the
  notebook never opens
- K-12 diagnostic crucible is wired in state (`selectedGrade`, `selectedSubjects`)
  but never triggers any diagnostic questions
- No persistence of path choice, grade, or subject preferences
- No auth integration — selected path/grade/major is never saved
- Cover-to-canvas transition currently relies on the cover being on the same page
  as the canvas (`page.tsx`), but onboarding is at `/onboarding` — they are separate pages

---

## 2. Two-Screen Architecture

The onboarding flow spans **two pages**:

### 2.1 `/onboarding` page
The first screen a new user sees. It contains:
- Path selection (Self-Learning / K-12 Student / College/University)
- Conditional input based on path:
  - K-12: grade level selector (1–12) + subject quick-select
  - College: major/field selector
  - Self-Learning: no additional input

### 2.2 `/` (root) page
Contains the `NotebookCover` component, which renders over the constellation canvas.
On first visit, `isCoverOpen: true`. The cover is closed when `closeCover()` is called.

### Why two screens?
The original design intent is for `/onboarding` to collect the user's path, then
redirect to `/` where the `NotebookCover` performs the final "opening the notebook"
theatrical animation into the constellation. The path data is passed via URL params
or session storage so the constellation can be seeded with the correct content.

---

## 3. NotebookCover Component

File: `src/components/cover/NotebookCover.tsx`

### Visual design
- Full-screen black overlay (`z-50`)
- Left "binding spine": 72px column on the left with `.notebook-nav-margin` class
- Binding spine contents: "SAVANT" text rotated 90°, Courier New 11px, `text-white/40`
- Main area: centred content with ivy-presto typography
- Title: "Savant" in ivy-presto Display (48px), with `.text-glow`
- Tagline: one-liner in ivy-presto Tagline (20px italic), `text-white/55`, no glow.
  Renders between the title and subtitle. Example: *"Think. Question. Know."*
  See `spec-ui-aesthetic.md §3` for the Tagline type token.
- Subtitle: "Your personal learning notebook." in ivy-presto Body (16px)

### Path selector
Three paths rendered as horizontal text buttons with arrow indicators:
```
→ Self-Learning
→ K-12 Student
→ College / University
```
Font: Courier New 13px. Active path: `text-white` `.text-glow`. Inactive: `text-white/40`.

### Grade level selector (K-12 path only)
Appears below the path selector when K-12 is selected.
```ts
const GRADE_LEVELS = [
  { label: "Grade 1", value: 1 },
  { label: "Grade 2", value: 2 },
  { label: "Grade 3", value: 3 },
  { label: "Grade 4", value: 4 },
  { label: "Grade 5", value: 5 },
  { label: "Grade 6", value: 6 },
  // ... through Grade 12
]
```
Rendered as a horizontal row of small chips, Courier New 11px.

### Quick subjects (K-12 path only)
Appears after grade selection.
```ts
const QUICK_SUBJECTS = ["Math", "Science", "Art", "Music", "Language"]
```
Multi-select: clicking a subject toggles it. Min 1 subject required to enable "Begin".

### Major selector (College path only)
```ts
const MAJORS = [
  "Computer Science",
  "Mathematics",
  "Physics",
  "Biology",
  "Chemistry",
  "Psychology",
  "History",
  "Literature",
  "Economics",
  "Engineering",
]
```
Rendered as a vertical list of radio buttons (Courier New 13px).

### Begin button
```tsx
<button
  onClick={handleBegin}
  disabled={!canBegin()}
  className="font-['Courier_New'] text-[13px] text-white border border-white/40
             px-8 py-2 hover:border-white hover:bg-white/10 transition-all
             disabled:opacity-30 disabled:cursor-not-allowed"
>
  Open Notebook
</button>
```

`canBegin()` logic:
- Self-Learning: always true
- K-12: requires `selectedGrade !== null && selectedSubjects.length >= 1`
- College: requires `selectedMajor !== null`

### Secondary CTA
Below the primary "Open Notebook" button: a ghost text link for a brief introduction.
```tsx
<button
  className="font-['Courier_New'] text-[11px] text-white/40 hover:text-white/70
             transition-colors mt-3 tracking-wider"
>
  ▶ What is Savant?
</button>
```
On click: expands an inline `<p>` in ivy-presto 14px, `text-white/55`, describing
Savant in 2–3 sentences. No modal, no navigation. Click again to collapse (toggle).
This replaces the "Watch demo" pattern from traditional landing pages.
See `spec-ui-aesthetic.md §12` for the secondary CTA ghost button style token.

### Cover feature section
A 4-item row of inline feature descriptions beneath the CTA buttons. Visible once
`canBegin()` returns true (i.e., the user has made a selection) or always visible
 — implementation preference.

Each item describes one pillar of the learning system:
| Heading | Body |
|---------|------|
| Active Recall | Questions that surface what you don’t know. |
| Knowledge Graph | See how concepts connect and unlock. |
| Ink Annotations | Write, draw, and think directly on the lesson. |
| Socratic Tutor | An AI guide that asks, never tells. |

Rendered as a horizontal row of narrow columns with left-border only
(`1px solid rgba(255,255,255,0.12)`). Courier New 11px headings, ivy-presto
13px body. No colour, no border-radius. See `spec-ui-aesthetic.md §12` for
the cover feature section pattern.

---

## 4. Cover Exit Animation

Uses Framer Motion `<AnimatePresence>` in `src/app/page.tsx`:

```tsx
<AnimatePresence>
  {isCoverOpen && (
    <motion.div
      key="cover"
      exit={{ opacity: 0, y: -60, scale: 0.97, rotateX: -6 }}
      transition={{ duration: 0.85, ease: [0.4, 0, 0.2, 1] }}
      style={{ transformOrigin: "top center", perspective: 1200 }}
    >
      <NotebookCover />
    </motion.div>
  )}
</AnimatePresence>
```

The `rotateX: -6` degrees creates a "page turning over" feeling on exit.
`perspective: 1200` is set on the wrapper to enable the 3D rotation.

---

## 5. handleBegin() — Full Intended Implementation

This is the complete implementation that must replace the current stub:

```ts
async function handleBegin() {
  // 1. Persist the onboarding selections
  const userPrefs = {
    path: selectedPath,
    gradeLevel: selectedPath === "k12" ? selectedGrade : null,
    major: selectedPath === "college" ? selectedMajor : null,
    subjects: selectedPath === "k12" ? selectedSubjects : null,
  }

  // 2. Save to sessionStorage for immediate use (before Supabase auth exists)
  sessionStorage.setItem("savant_onboarding", JSON.stringify(userPrefs))

  // 3. After Phase 6 auth: save to Supabase users.metadata
  // await supabase.from('users').update({ metadata: userPrefs }).eq('id', userId)

  // 4. Navigate to the main canvas
  // The canvas page reads sessionStorage on mount and seeds the graph accordingly
  router.push("/")
}
```

The constellation canvas page (`src/app/page.tsx`) on mount:
```ts
useEffect(() => {
  const stored = sessionStorage.getItem("savant_onboarding")
  if (stored) {
    const prefs = JSON.parse(stored)
    graphStore.applyUserPreferences(prefs)
    // Seeds the progress map with appropriate starting concepts
    // based on grade level and selected subjects
  }
}, [])
```

### `graphStore.applyUserPreferences(prefs)`
To be implemented in Phase 2:
- K-12 Grade 1–3: unlock only Math and Language root concepts
- K-12 Grade 4–6: unlock Math, Science, Language root concepts
- K-12 Grade 7–12: unlock all root concepts for selected subjects
- College: unlock root concepts in the relevant domain(s)
- Self-Learning: unlock all root concepts

---

## 6. K-12 Diagnostic Crucible (Phase 2 Sprint 2.3 — not yet built)

For K-12 students who select their grade, after the path selection and before
`handleBegin()` is called, a brief diagnostic determines the student's actual
starting point within their grade level.

### Diagnostic format
3–5 multiple choice questions, each presented as a slide:
```ts
interface DiagnosticQuestion {
  id: string
  text: string
  options: string[]
  correctIndex: number
  targetConcept: string    // if answered correctly, this concept unlocks
  difficulty: "review" | "grade_level" | "challenge"
}
```

### Scoring
- All review correct → start at grade level
- Most grade_level correct → start at grade level
- Most challenge correct → start 1 grade above
- Mostly incorrect → start with foundational concepts

The diagnostic result adjusts which concepts are unlocked in `DEFAULT_PROGRESS`
before the constellation is first shown.

### Diagnostic UI
Renders as a full-screen overlay above the NotebookCover, using the same
slide-by-slide pattern as `LessonView.tsx`. Framer Motion page transitions.

---

## 7. Onboarding Page (`/onboarding`)

File: `src/app/onboarding/page.tsx`

### Route
Only shown to users who haven't completed onboarding. After `handleBegin()`,
they are redirected to `/` and the onboarding route is no longer reachable
(check `sessionStorage.getItem("savant_onboarding")` on page mount and redirect if present).

### Layout
Same `.notebook-ruled` background as the main page. Left binding spine (72px).
Centred content column, `max-w-[520px]`.

### Steps
1. Welcome screen: "Which describes you best?" with the three path options
2. Conditional path-specific screen (grade + subjects / major)
3. K-12 only: Diagnostic crucible (Phase 2 Sprint 2.3)
4. "Open Notebook" button → `handleBegin()`

### Progress indicator
A simple Courier New text label at the bottom: "1 / 2" or "2 / 3" (if diagnostic
is included). No progress bar — consistent with the minimal aesthetic.

---

## 8. Auth Integration Requirements (Phase 6)

When Supabase auth is added (Phase 6 Sprint 6.1), the onboarding flow changes:

1. `/onboarding` first checks if user is authenticated:
   - If not: show a brief "Sign in / Create account" step before the path selector
   - Use Supabase Magic Link (email OTP) — no password
2. After sign-in: path selection + diagnostic as above
3. `handleBegin()` saves to `users.metadata` via Supabase RPC
4. Subsequent visits: skip `/onboarding` entirely (user data loaded from Supabase)

The `sessionStorage` approach (§5) is explicitly a pre-auth workaround and must
be replaced in Phase 6. The `sessionStorage.getItem("savant_onboarding")` checks
must be replaced with `supabase.auth.getUser()` + DB query.

---

## 9. Page Transition — Onboarding to Canvas

When `router.push("/")` is called from `handleBegin()`:
- Next.js App Router performs a client-side navigation
- `page.tsx` mounts with `isCoverOpen: true` (from `canvas-store`)
- The `NotebookCover` renders immediately (no flash of the graph)
- After a brief moment (~200ms delay) or on user interaction, `closeCover()` is called

The current (incorrect) flow: `handleBegin()` → `router.push("/")` → canvas
renders with `isCoverOpen: true` but nothing ever calls `closeCover()`.

The intended flow:
1. `handleBegin()` saves prefs → `router.push("/")`
2. `page.tsx` reads prefs and seeds graph
3. A `useEffect` in `page.tsx` checks if the cover should auto-close:
   - If the user came from `/onboarding` (check referrer or URL param), close
     after `NotebookCover` has mounted and its entrance animation completes (300ms)
   - If it's a direct visit to `/`, keep `isCoverOpen: true` until the user
     clicks "Open Notebook" on the cover directly

This means `NotebookCover` needs its own "Open Notebook" button when rendered
on the main page without coming from `/onboarding`.
