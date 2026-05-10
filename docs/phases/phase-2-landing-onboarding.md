# Phase 2 — Landing Page & Onboarding

## Status: ~50% Complete

## Overview
Builds the "Front Cover" experience — the first thing a user sees — and the
onboarding flow that personalises their initial Knowledge Constellation. Also
covers Supabase Auth integration and the persistence of a user's chosen learning
path, which are the two biggest gaps currently.

---

## Sprint 2.1 — Notebook Cover (Front Cover)  ✅ DONE

### What was built
`src/components/cover/NotebookCover.tsx` — a `position: fixed, z-50` full-screen
overlay with:

**Visual elements:**
- Binding spine on the left edge: 72px column with 10 circular ring holes
- Centred title block: "An Endless Monochrome Notebook" subtitle, "Savant" heading
  in `ivy-presto` serif with `.text-glow`, tagline in Courier New
- Page number `pg. 0001` at bottom-right
- `.notebook-ruled` background

**Path selector:**
- Three paths presented as stacked buttons: Self-Learning / K–12 / College/Undergrad
- `AnimatePresence` with `mode="wait"` — path buttons fade out, sub-form fades in
- Sub-forms: grade selector (K–12), major autocomplete (College), subject text field (all)
- Quick-pick subject chips: Algebra, Calculus, Geometry, Physics, Chemistry

**Exit animation:**
- `isOpening` flag triggers `exit` variant: `opacity: 0, y: -60, scale: 0.97, rotateX: -6`
- 850ms duration with `[0.4, 0, 0.2, 1]` cubic-bezier (simulates opening a book)
- `setTimeout(closeCover, 900)` deferred to allow animation to complete
- `closeCover()` calls `useCanvasStore.closeCover()` → sets `isCoverOpen: false`

**State:**
- `selectedPath: LearningPath` (`"self" | "k12" | "college" | null`)
- `gradeLevel`, `major`, `subject` — controlled string inputs
- `canOpen` — requires subject and path-relevant field to be filled

### Key files
- `src/components/cover/NotebookCover.tsx`
- `src/store/canvas-store.ts` — `isCoverOpen`, `closeCover()`
- `src/app/page.tsx` — conditionally renders `{isCoverOpen && <NotebookCover />}`

### Verification
- Cover renders on initial load; all other UI is visible behind it
- Selecting a path reveals the correct sub-form with animation
- Clicking "Open Notebook →" with a filled subject triggers the exit animation
- After 900ms the cover is gone and the constellation is fully interactive

---

## Sprint 2.2 — Onboarding Page  ✅ DONE (UI Only)

### What was built
`src/app/onboarding/page.tsx` — a `/onboarding` route styled as a notebook index
page with:

- Page header with back-link to `/`
- Three path entries as `PathEntry` sub-component (notebook ledger rows with
  Roman numeral index, title, subtitle, description)
- **Path I — Self-Learning**: text input for any subject + "Begin →" button
- **Path II — K–12**: grade selector (1–12) with `GRADE_LABELS` mapping →
  placeholder diagnostic placeholder (`k12Step: "grade" | "diagnostic"`)
- **Path III — College**: major text input with filtered autocomplete dropdown
  from `SAMPLE_MAJORS` array, animated `AnimatePresence` dropdown
- `handleBegin()` currently calls `router.push("/")` — navigates to constellation
  without persisting any data
- `selectedPath`, `subject`, `grade`, `major`, `majorQuery`, `k12Step` in local state

### Key files
- `src/app/onboarding/page.tsx`

---

## Sprint 2.3 — Supabase Auth Integration  ✅ DONE

### Context
`src/lib/supabase.ts` contains only a 3-line client stub. No sign-in, sign-up,
session management, or protected routes exist anywhere in the project.

### Tasks

#### 2.3.1 Auth provider setup
- [ ] Enable Email/Password provider in Supabase dashboard
- [ ] (Optional) Enable Google OAuth provider
- [ ] Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### 2.3.2 Auth API routes
- [ ] Create `src/app/api/auth/signup/route.ts`
  - Accepts `{ email, password, display_name }`
  - Calls `supabase.auth.signUp()` → on success, inserts row into `public.users`
  - Returns session token
- [ ] Create `src/app/api/auth/signin/route.ts`
  - Accepts `{ email, password }`
  - Calls `supabase.auth.signInWithPassword()`
  - Returns session token
- [ ] Create `src/app/api/auth/signout/route.ts`
  - Calls `supabase.auth.signOut()`

#### 2.3.3 Session context
- [ ] Create `src/lib/auth.ts` — server-side session helper using
  `@supabase/supabase-js` with the service role key for trusted server reads
- [ ] Create `src/components/AuthProvider.tsx` — React context that exposes
  `user`, `session`, `isLoading`, `signOut` to the component tree
- [ ] Wrap `src/app/layout.tsx` body in `<AuthProvider>`

#### 2.3.4 Protected route middleware
- [ ] Create `middleware.ts` at project root
  - Reads Supabase session cookie
  - Redirects unauthenticated requests for `/` and `/dashboard` to `/onboarding`
  - Allows unauthenticated access to `/onboarding` only

#### 2.3.5 Auth UI in onboarding
- [ ] Add sign-up / sign-in form to `src/app/onboarding/page.tsx`
  - Styled as a notebook form (no rounded cards — flat ruled rows)
  - Email, password, display name fields
  - "New notebook" (sign up) / "Return to notebook" (sign in) tabs
  - Form validation: non-empty email, password ≥ 8 characters
  - Error display: inline below the failing field, not a modal

### Acceptance criteria
- New user can create an account from the onboarding page
- Returning user can sign in and arrive at their saved constellation state
- Unauthenticated users who navigate to `/` are redirected to `/onboarding`
- Sign-out clears the session and redirects to `/onboarding`

---

## Sprint 2.4 — Path Persistence  ❌ NOT STARTED

### Context
`handleBegin()` in `onboarding/page.tsx` contains the comment:
> "For now, route to constellation — in full implementation this would persist
> the user's chosen path and route appropriately."

### Tasks

#### 2.4.1 User profile persistence
- [ ] Create `src/app/api/user/profile/route.ts`
  - `PATCH` — updates `users.display_name`; can be extended for learning path
- [ ] Add `learning_path`, `grade_level`, `major` columns to `users` table
  - Create `supabase/migrations/003_user_learning_path.sql`
  - `learning_path TEXT CHECK (learning_path IN ('self', 'k12', 'college'))`
  - `grade_level INTEGER CHECK (grade_level BETWEEN 1 AND 12)`
  - `major TEXT`

#### 2.4.2 Constellation seeding by path
- [ ] Modify `handleBegin()` to:
  1. Save chosen path/grade/major/subject to user profile via API route
  2. Filter the seed `CONCEPTS` array to a relevant starting subset
     (e.g., K-12 Grade 1–4 shows only Addition, Subtraction, Patterns, Geometry;
     College shows Algebra, Sequences, Fractions, Motion, Energy as starting nodes)
  3. Navigate to `/` with `?subject=algebra` query param
- [ ] In `KnowledgeGraph.tsx`, read query param on mount to apply initial filter
  or highlight a relevant node

#### 2.4.3 K-12 Diagnostic Crucible
- [ ] Implement `k12Step === "diagnostic"` view in `onboarding/page.tsx`
  - A set of 3–5 short problems rendered as `LessonBlock` components directly in
    the onboarding flow (not a modal — inline on the page, notebook aesthetic)
  - Scoring logic: tally correct answers to determine starting concept node
    (e.g., all correct → start at Fractions; mixed → start at Multiplication;
    struggled → start at Addition)
  - On completion, navigate to `/` with the recommended starting node highlighted

### Acceptance criteria
- Path choice is persisted to Supabase `users` table after sign-up
- K-12 diagnostic renders 3–5 blocks inline and routes to the appropriate concept
- User returning to the app sees their last constellation state, not a blank graph

---

## Sprint 2.5 — Cover-to-Canvas Transition Polish  ⚠️ MINOR GAP

### What is missing
The current exit animation (`rotateX: -6` with `transformStyle: preserve-3d`) works
but the constellation behind the cover is not yet animated in — it simply appears
when `isCoverOpen` becomes false. A complementary entry animation on the constellation
would complete the "opening the notebook" metaphor.

### Tasks
- [ ] Add an `AnimatePresence` + `motion.div` wrapper in `src/app/page.tsx` around
  the main content (excluding the cover) that runs `opacity: 0 → 1` over 500ms
  delayed 200ms (to start after cover begins exiting)
- [ ] Ensure the constellation nodes run their existing spring entrance animation
  (`initial: scale 0, opacity 0` defined in `ConceptNode.tsx`) on first reveal

### Key files
- `src/app/page.tsx`
- `src/components/graph/ConceptNode.tsx`

---

## Completion Criteria for Phase 2

- [ ] Cover renders correctly and dismisses with book-opening animation
- [ ] Onboarding page shows all three paths with correct sub-forms
- [ ] New users can sign up and existing users can sign in
- [ ] Session is maintained across page reloads
- [ ] Unauthenticated requests to `/` are redirected to `/onboarding`
- [ ] Chosen learning path is saved to the database
- [ ] K-12 diagnostic routes to the correct starting concept
- [ ] `npm run build` with no type errors

---

## Dependencies
- Requires: Phase 0 complete, Phase 1 Sprint 1.1 (canvas layer)
- Blocks: Phase 6 (auth is foundational for user management)
