# Phase 7 — Testing & QA

## Status: ~90% Complete (Sprint 7.6 Accessibility Audit remaining)

## Overview
Establishes the full testing stack — unit tests for stores and utilities,
component tests for interactive blocks, integration tests for API routes,
end-to-end tests for critical user journeys, and accessibility auditing.
No test files exist anywhere in the project at this time.

---

## Sprint 7.1 — Test Framework Setup  ✅ DONE

### Tasks

#### 7.1.1 Install and configure Vitest (unit + component)
- [ ] `npm install --save-dev vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event jsdom`
- [ ] Create `vitest.config.ts`:
  ```ts
  import { defineConfig } from 'vitest/config'
  import react from '@vitejs/plugin-react'
  export default defineConfig({
    plugins: [react()],
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      globals: true,
    },
  })
  ```
- [ ] Create `src/test/setup.ts`:
  ```ts
  import '@testing-library/jest-dom'
  // Mock ResizeObserver (not available in jsdom)
  global.ResizeObserver = class ResizeObserver {
    observe() {}; unobserve() {}; disconnect() {}
  }
  // Mock window.getSelection
  global.getSelection = () => ({ getRangeAt: () => null, toString: () => "" } as any)
  ```

#### 7.1.2 Install and configure Playwright (E2E)
- [ ] `npm install --save-dev @playwright/test`
- [ ] `npx playwright install chromium`
- [ ] Create `playwright.config.ts`:
  ```ts
  import { defineConfig, devices } from '@playwright/test'
  export default defineConfig({
    testDir: './e2e',
    use: {
      baseURL: 'http://localhost:3000',
      trace: 'on-first-retry',
    },
    projects: [
      { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
    ],
    webServer: {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
    },
  })
  ```

#### 7.1.3 Add test scripts to `package.json`
```json
"test": "vitest run",
"test:watch": "vitest",
"test:e2e": "playwright test",
"test:coverage": "vitest run --coverage"
```

### Acceptance criteria
- `npm test` runs the Vitest suite
- `npm run test:e2e` launches the dev server and runs E2E tests against it
- Both commands exit 0 on a clean project (no test failures)

---

## Sprint 7.2 — Store Unit Tests  ✅ DONE

### Tasks

All tests in `src/test/stores/`.

#### 7.2.1 `canvas-store.test.ts`
- [ ] `beginStroke → extendStroke → commitStroke` produces a stroke in `strokes[]`
- [ ] `commitStroke` fires `onStrokeCommit` callback if registered
- [ ] `eraseNear` removes strokes within radius and leaves others intact
- [ ] `clearStrokes` empties the strokes array without affecting text notes
- [ ] Tool switching from `"pen"` to `"eraser"` updates `activeTool`
- [ ] `addNote → updateNote → finishNote` lifecycle produces a non-editing note
- [ ] `deleteNote` removes the note; `editNote` sets `isEditing: true`

#### 7.2.2 `graph-store.test.ts`
- [ ] `updateProgress("c-addition", "mastered")` sets `progressMap.get("c-addition") === "mastered"`
- [ ] Auto-unlock: when all prerequisites of `c-subtraction` are mastered, its status
  transitions to `"unlocked"`
- [ ] `recentlyMasteredId` is set after `updateProgress` and cleared by `clearMasteryAnimation()`
- [ ] `getPrerequisitesFor(id)` returns the correct prerequisite concept IDs
- [ ] `getUnlockedBy(id)` returns the concepts that are unlocked by mastering a given concept

#### 7.2.3 `lesson-store.test.ts`
- [ ] `startLesson` sets `isLessonActive: true`, `currentSlideIndex: 0`
- [ ] `canAdvance()` returns false when the current slide has an un-answered interactive block
- [ ] `canAdvance()` returns true when the current slide has only a text block
- [ ] `setAnswer` with `validationState: "correct"` allows `canAdvance() → true`
- [ ] `nextSlide` is a no-op on the last slide
- [ ] `completeLesson` sets `isLessonComplete: true`
- [ ] `exitLesson` resets all lesson state

#### 7.2.4 `chat-store.test.ts`
- [ ] `addMarginaliaEntry` returns a unique ID and adds an entry with `isStreaming: true`
- [ ] `updateMarginalia` appends content to the correct entry
- [ ] `finishMarginalia` sets `isStreaming: false` on the correct entry
- [ ] `removeMarginalia` removes the entry by ID
- [ ] `triggerFromFailure` sets `isOpen: true`

#### 7.2.5 `telemetry-store.test.ts`
- [ ] `startSession → enterSlide → recordAttempt(true) → exitSlide → completeSession`
  produces a session in `completedSessions`
- [ ] Struggle score is 0 for a slide answered instantly and correctly on first attempt
- [ ] Struggle score increases for more attempts and longer time on slide
- [ ] `getConceptMetrics(conceptId)` returns the correct subset of sessions

---

## Sprint 7.3 — Component Tests  ✅ DONE

### Tasks

All tests in `src/test/components/`.

#### 7.3.1 Block renderer tests
- [ ] `MultipleChoiceRenderer.test.tsx`
  - Renders the correct number of options
  - Click on correct option → `validationState === "correct"` in store
  - Click on wrong option → `validationState === "incorrect"`, options lock
- [ ] `InteractiveSliderRenderer.test.tsx`
  - Moving slider updates tally dot count
  - Setting value to `correctValue` and submitting → `validationState === "correct"`
  - Out-of-tolerance value → `validationState === "incorrect"`, attempts increments
- [ ] `DragDropMatchRenderer.test.tsx`
  - Clicking an item selects it (highlighted state)
  - Clicking a target with a selected item creates a pair
  - All correct pairs → validation passes

#### 7.3.2 Canvas layer tests
- [ ] `CanvasToolbar.test.tsx`
  - Renders 5 tool buttons (after Sprint 3.3 adds Highlighter)
  - Clicking each button updates `useCanvasStore.activeTool`
  - Keyboard shortcuts V/P/E/H/T each change the active tool
  - Keyboard shortcut ignored when focus is on an INPUT

#### 7.3.3 Lesson navigation test
- [ ] `LessonView.test.tsx`
  - ArrowRight advances the slide when `canAdvance() === true`
  - ArrowRight is blocked when `canAdvance() === false`
  - ArrowLeft goes back to the previous slide
  - Escape calls `exitLesson()`
  - Completing the final slide calls `completeLesson()` and `updateProgress("mastered")`

---

## Sprint 7.4 — API Route Integration Tests  ✅ DONE

### Tasks

All tests in `src/test/api/`. Use Next.js `createMocks` from `node-mocks-http` or
the Next.js built-in `NextRequest`/`NextResponse` for route testing.

#### 7.4.1 `/api/chat` tests
- [ ] `POST { messages: [...] }` → returns a streaming response (status 200, Content-Type text/plain)
- [ ] Anthropic client failure → falls back to Gemini (requires mock of `@ai-sdk/anthropic`)
- [ ] Missing `messages` field → returns 400
- [ ] Correct `contextType: "highlight_annotation"` → uses annotation system prompt

#### 7.4.2 Auth route tests (Sprint 6 prerequisite)
- [ ] `POST /api/auth/signup` with valid data → creates user, returns session
- [ ] `POST /api/auth/signup` with existing email → returns 400 with error message
- [ ] `POST /api/auth/signin` with wrong password → returns 401
- [ ] `POST /api/auth/signout` → clears session

#### 7.4.3 Progress route tests (Sprint 6 prerequisite)
- [ ] `GET /api/progress` unauthenticated → 401
- [ ] `GET /api/progress` authenticated → returns array of progress records
- [ ] `PATCH /api/progress { conceptId: "c-addition", status: "mastered" }` → upserts and returns the row

---

## Sprint 7.5 — End-to-End Tests  ✅ DONE

### Tasks

All tests in `e2e/`.

#### 7.5.1 `onboarding.spec.ts`
- [ ] Visiting `/` unauthenticated redirects to `/onboarding`
- [ ] Selecting Self-Learning path, entering a subject, clicking Begin navigates to `/`
- [ ] Notebook cover appears on first load; clicking "Open Notebook →" dismisses it

#### 7.5.2 `lesson-flow.spec.ts`
- [ ] Click an unlocked node → lesson modal appears with lesson list
- [ ] Click a lesson → lesson view opens on slide 1
- [ ] Complete all slides → concept node shows mastered state (filled disc)
- [ ] Dependents of the mastered concept show the pulse animation

#### 7.5.3 `canvas-tools.spec.ts`
- [ ] Press P → draw on canvas → stroke is visible
- [ ] Press E → erase over stroke → stroke removed
- [ ] Press T → click canvas → textarea appears → type text → click away → text is visible

#### 7.5.4 `socratic-chat.spec.ts`
- [ ] Open a lesson → fail an interactive block twice → chat panel opens
- [ ] Type a question → send → AI response streams in
- [ ] Select text in lesson → "Ask Savant" tooltip appears → click → marginalia appears

---

## Sprint 7.6 — Accessibility Audit  ❌ NOT STARTED

### Tasks
- [ ] Install `axe-core` and `@axe-core/playwright`
- [ ] Add axe scan to the E2E test suite for each major page:
  ```ts
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toHaveLength(0)
  ```
- [ ] Fix any WCAG AA violations found:
  - All interactive elements must have `aria-label` or visible text
  - Colour contrast ratio must be ≥ 4.5:1 for normal text (note: the monochrome
    design uses white on black which is always 21:1 — compliance is expected)
  - Focus ring visible on all focusable elements (currently `outline: none` may
    be set globally; add `:focus-visible` styles)
  - Lesson block interactions must be keyboard-accessible (sliders already are;
    drag-drop and formula builder need keyboard alternatives)
- [ ] Add `role="region"` and `aria-label` to the canvas overlay elements
- [ ] Ensure `NotebookCover` traps focus while open (uses `focus-trap-react` or
  a simple `useEffect` with `tabIndex` management)

### Acceptance criteria
- Zero axe violations on `/onboarding`, `/`, and any open lesson view

---

## Sprint 7.7 — Error Boundaries  ✅ DONE

### Tasks
- [ ] Create `src/components/ErrorBoundary.tsx` — class component wrapping
  React's `componentDidCatch` lifecycle, renders a notebook-styled fallback:
  ```
  "Something tore in the notebook."
  [Reload page] button
  ```
- [ ] Wrap `KnowledgeGraph` in an error boundary
  (React Flow can throw during initial layout)
- [ ] Wrap `LessonView` in an error boundary
- [ ] Wrap `SocraticChat` in an error boundary
  (streaming errors should degrade to a "chat unavailable" state, not crash the lesson)
- [ ] Add `loading.tsx` files to `src/app/` and `src/app/dashboard/` for
  React Suspense boundaries

---

## Completion Criteria for Phase 7

- [ ] Vitest suite passes with zero failing tests
- [ ] E2E suite passes with zero failing tests on the full onboarding → lesson → mastery journey
- [ ] Code coverage ≥ 70% on all store files and block renderers
- [ ] Zero axe accessibility violations on all major pages
- [ ] Error boundaries wrap all major feature areas
- [ ] `npm run build` with no type errors

---

## Dependencies
- Requires: Phases 0–6 for integration tests
- Blocks: Phase 9 (CI must pass tests before deployment)
