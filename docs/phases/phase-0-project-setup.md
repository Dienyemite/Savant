# Phase 0 — Project Setup & Infrastructure

## Status: ~85% Complete

## Overview
Establishes the full development foundation: tooling, dependencies, environment
configuration, global CSS, CI/CD scaffolding, and local Supabase connectivity.
Every subsequent phase depends on this being solid.

---

## Sprint 0.1 — Repository & Tooling  ✅ DONE

### Tasks
- [x] Initialise Next.js 16 project with TypeScript 5 strict mode
- [x] Configure Tailwind CSS v4 via `@tailwindcss/postcss`
- [x] Install and configure shadcn component library (`components.json`)
- [x] Configure ESLint v9 with `eslint-config-next`
- [x] Install all core runtime dependencies (see `package.json`)

### Key files
- `package.json` — all dependencies locked
- `tsconfig.json` — TypeScript strict config
- `eslint.config.mjs` — ESLint flat config
- `postcss.config.mjs` — PostCSS with Tailwind plugin
- `next.config.ts` — Next.js project config

### Verification
```bash
npm run lint   # zero errors
npm run build  # compiles without type errors
```

---

## Sprint 0.2 — Global Design System  ✅ DONE

### Tasks
- [x] Define monochrome CSS custom properties in `src/app/globals.css`
  - `--background: oklch(0 0 0)` (pure black)
  - `--foreground: oklch(1 0 0)` (pure white)
  - Full shadcn token overrides for card, popover, muted, border, ring, etc.
- [x] Implement `body::after` paper-grain overlay
  - SVG data URI with `feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4"`
  - `opacity: 0.042`, `mix-blend-mode: screen`, `z-index: 9999`
- [x] Implement global body `text-shadow` glow
  - `0 0 6px rgba(255,255,255,0.22), 0 0 14px rgba(255,255,255,0.08)`
- [x] Define notebook utility CSS classes
  - `.notebook-ruled` — `repeating-linear-gradient`, 28px pitch, 1px line at 8% white
  - `.notebook-grid` — 32px grid variant
  - `.notebook-margin` — `::before` pseudo-element at `left: 72px`, `rgba(255,255,255,0.14)`
  - `.notebook-content` — `margin-left: 72px`
  - `.notebook-nav-margin` — 72px left gutter for navigation column
- [x] Define glow utility classes
  - `.text-glow`, `.text-glow-subtle`, `.glow-white`, `.glow-border`, `.glow-box`, `.notebook-panel`, `.dashed-border`
- [x] Register `ivy-presto` serif via Adobe Typekit in `src/app/layout.tsx`
- [x] Define SVG `feTurbulence` filter in `src/app/layout.tsx` (filter ID `paper-noise`)

### Key files
- `src/app/globals.css`
- `src/app/layout.tsx`

### Verification
- Load any page in dev; body has visible grain texture at 4% opacity
- White text has perceptible luminescence (not harsh, not absent)
- Ruled lines are visible at 8% white on black

---

## Sprint 0.3 — TypeScript Types  ✅ DONE

### Tasks
- [x] Define all core types in `src/types/index.ts`
  - `UserRole`, `ConceptDomain` (math/science/art/music/language/logic), `ProgressStatus`
  - `User`, `Concept`, `ConceptPrerequisite`, `Lesson`, `StudentProgress`
  - `LessonBlockType` (6 variants), `LessonBlockBase`, all 6 block interfaces
  - `MultipleChoiceBlock`, `VisualFeedbackBlock` (with all sub-fields)
  - `ConceptNode` (derived — combines `Concept` + `ProgressStatus` + edge arrays)
  - `DOMAIN_LABELS`, `DOMAIN_COLORS` exported maps

### Key files
- `src/types/index.ts`

### Verification
- `npm run build` — zero type errors referencing types from this file

---

## Sprint 0.4 — Database Schema  ✅ DONE

### Tasks
- [x] Migration 001 (`supabase/migrations/001_initial_schema.sql`)
  - ENUMs: `user_role`, `concept_domain`, `progress_status`
  - Tables: `users`, `concepts`, `concept_prerequisites`, `lessons`, `student_progress`
  - Composite PK on `concept_prerequisites(concept_id, prerequisite_id)`
  - `UNIQUE(user_id, concept_id)` on `student_progress`
  - Indexes: `idx_concepts_domain`, `idx_lessons_concept`, `idx_progress_user`, `idx_progress_concept`
- [x] Migration 002 (`supabase/migrations/002_canvas_states.sql`)
  - `canvas_states` table with `strokes JSONB`, `text_notes JSONB`, `viewport JSONB`
  - `concept_id` nullable (NULL = global constellation canvas)
  - `UNIQUE(user_id, concept_id)` constraint
  - Auto-update `updated_at` trigger `trg_canvas_states_updated_at`
  - RLS policies: SELECT/INSERT/UPDATE/DELETE guarded by `auth.uid() = user_id`
  - Indexes: `idx_canvas_states_user`, `idx_canvas_states_concept`

### Key files
- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/002_canvas_states.sql`

### Verification
```bash
supabase db reset   # applies both migrations cleanly
supabase db lint    # no policy warnings
```

---

## Sprint 0.5 — Supabase Client  ✅ DONE (Stub Only)

### Tasks
- [x] Create `src/lib/supabase.ts` — typed Supabase client using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Key files
- `src/lib/supabase.ts`

---

## Sprint 0.6 — Environment & CI  ❌ NOT STARTED

### Tasks
- [ ] Create `.env.example` with all required keys:
  ```
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=
  ANTHROPIC_API_KEY=
  GOOGLE_GENERATIVE_AI_API_KEY=
  NEXTAUTH_SECRET=
  NEXTAUTH_URL=
  ```
- [ ] Add environment variable validation at startup (e.g., throw descriptive error if `NEXT_PUBLIC_SUPABASE_URL` is missing rather than crashing with `!` assertion in `supabase.ts`)
- [ ] Create `.github/workflows/ci.yml`
  - Trigger: push to `main` and all PRs
  - Steps: `npm ci` → `npm run lint` → `npm run build`
- [ ] Add `.gitignore` entry for `.env.local`
- [ ] Create `CONTRIBUTING.md` with local setup steps (clone → install → `supabase start` → `cp .env.example .env.local` → `npm run dev`)

### Key files (to create)
- `.env.example`
- `.github/workflows/ci.yml`
- `CONTRIBUTING.md`

### Verification
- CI workflow runs green on a clean clone
- Missing env var at runtime emits a human-readable error before the app crashes

---

## Completion Criteria for Phase 0

- [ ] `npm run build` succeeds from a clean clone with only `.env.local` populated
- [ ] `npm run lint` returns zero errors
- [ ] `supabase db reset` applies both migrations without errors
- [ ] Paper grain, ruled lines, and glow effects are visually correct
- [ ] All 6 block type interfaces are defined and exported from `src/types/index.ts`
- [ ] `.env.example` documents every required environment variable
- [ ] CI workflow passes on GitHub

---

## Dependencies
- Blocks: nothing (this is the foundation)
- Blocks for: all other phases
