# Spec — Testing

## Purpose
Defines the full testing strategy for Savant: test types, tooling, coverage
targets, specific test cases, CI/CD pipeline, and the order in which test
infrastructure must be built. This spec governs Phase 7 Sprints 7.1–7.4.

---

## 1. Current Testing Status

**Zero test files exist.** There are no test configuration files, no test
utilities, no mocks, and no CI pipeline. This spec defines the full testing
foundation to be built in Phase 7.

---

## 2. Test Stack

| Layer | Tool | Config file |
|-------|------|------------|
| Unit / component | Vitest + React Testing Library | `vitest.config.ts` |
| E2E | Playwright | `playwright.config.ts` |
| Accessibility | `@axe-core/playwright` (via E2E) | — (inline in E2E tests) |
| Visual regression | Not required (Phase 7 scope) | — |

### Installation
```sh
npm install --save-dev vitest @vitejs/plugin-react jsdom
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install --save-dev @playwright/test @axe-core/playwright
```

---

## 3. Vitest Configuration

`vitest.config.ts` (project root):
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

`src/test/setup.ts`:
```ts
import '@testing-library/jest-dom'
```

---

## 4. Unit Tests — Zustand Stores

These are the highest-priority tests. Store actions are pure functions with
predictable inputs and outputs — easy to test and high value.

### `lesson-store.test.ts`
```ts
// src/store/lesson-store.test.ts
import { useLessonStore } from './lesson-store'
import { mockLesson } from '../test/fixtures/lesson'

describe('lesson-store', () => {
  beforeEach(() => useLessonStore.getState().exitLesson())

  it('startLesson resets all state', () => {
    useLessonStore.getState().startLesson(mockLesson)
    const s = useLessonStore.getState()
    expect(s.activeLesson).toBe(mockLesson)
    expect(s.currentSlideIndex).toBe(0)
    expect(s.answers).toEqual({})
  })

  it('canAdvance returns false if required block unanswered', () => {
    useLessonStore.getState().startLesson(mockLesson)
    expect(useLessonStore.getState().canAdvance()).toBe(false)
  })

  it('canAdvance returns true after all required blocks answered correctly', () => {
    useLessonStore.getState().startLesson(mockLesson)
    useLessonStore.getState().setAnswer('block-mc-1', 0)
    useLessonStore.getState().validateBlock('block-mc-1')
    expect(useLessonStore.getState().canAdvance()).toBe(true)
  })

  it('validateBlock returns correct for right answer', () => {
    useLessonStore.getState().startLesson(mockLesson)
    useLessonStore.getState().setAnswer('block-mc-1', 0)  // correct index
    const result = useLessonStore.getState().validateBlock('block-mc-1')
    expect(result).toBe('correct')
  })

  it('validateBlock returns incorrect for wrong answer', () => {
    useLessonStore.getState().startLesson(mockLesson)
    useLessonStore.getState().setAnswer('block-mc-1', 3)  // wrong index
    const result = useLessonStore.getState().validateBlock('block-mc-1')
    expect(result).toBe('incorrect')
  })

  it('interactive_slider validates within tolerance', () => {
    useLessonStore.getState().startLesson(mockLesson)
    useLessonStore.getState().setAnswer('block-slider-1', 5.2)  // correct: 5, tolerance: 0.5
    const result = useLessonStore.getState().validateBlock('block-slider-1')
    expect(result).toBe('correct')
  })
})
```

### `canvas-store.test.ts`
Test the stroke lifecycle:
```ts
it('commitStroke appends to strokes and clears activePoints', () => {
  useCanvasStore.getState().beginStroke(100, 200, 0.5)
  useCanvasStore.getState().extendStroke(110, 210, 0.5)
  useCanvasStore.getState().commitStroke()
  const s = useCanvasStore.getState()
  expect(s.strokes).toHaveLength(1)
  expect(s.activePoints).toHaveLength(0)
})

it('eraseNear removes strokes within radius', () => {
  // add a stroke at (100, 100) then erase nearby
  useCanvasStore.getState().beginStroke(100, 100, 0.5)
  useCanvasStore.getState().commitStroke()
  expect(useCanvasStore.getState().strokes).toHaveLength(1)
  useCanvasStore.getState().eraseNear(100, 100, 20)
  expect(useCanvasStore.getState().strokes).toHaveLength(0)
})
```

### `graph-store.test.ts`
Test progress state machine:
```ts
it('updateProgress to mastered unlocks dependent concepts', () => {
  const s = useGraphStore.getState()
  // c-addition has c-carrying as dependent
  s.updateProgress('c-addition', 'mastered')
  expect(useGraphStore.getState().progressMap.get('c-carrying')).toBe('unlocked')
})

it('updateProgress does not unlock concepts with multiple unmet prerequisites', () => {
  // c-algebra requires both c-multiplication AND c-division
  useGraphStore.getState().updateProgress('c-multiplication', 'mastered')
  expect(useGraphStore.getState().progressMap.get('c-algebra')).toBe('locked')
})
```

### `telemetry-store.test.ts`
Test struggle score computation:
```ts
it('struggle score is 0 with no events', () => {
  const score = useTelemetryStore.getState().computeStruggleScore('c-addition')
  expect(score.score).toBe(0)
})

it('all-correct first-attempt reduces score by success bonus', () => {
  const store = useTelemetryStore.getState()
  store.markConceptStart('c-addition')
  store.logEvent({ conceptId: 'c-addition', lessonId: 'l-1', blockId: 'b-1', event: 'block_attempt' })
  store.logEvent({ conceptId: 'c-addition', lessonId: 'l-1', blockId: 'b-1', event: 'block_correct' })
  const score = store.computeStruggleScore('c-addition')
  expect(score.successBonus).toBe(-0.2)
})
```

---

## 5. Component Tests — Block Renderers

Test that each block renderer renders correctly and user interactions work.

### `MultipleChoiceRenderer.test.tsx`
```ts
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MultipleChoiceRenderer } from '../components/lesson/blocks/MultipleChoiceRenderer'

const block: MultipleChoiceBlock = {
  id: 'mc-1',
  type: 'multiple_choice',
  question: 'What is 2 + 2?',
  options: ['3', '4', '5', '6'],
  correctIndex: 1,
}

it('renders all options', () => {
  render(<MultipleChoiceRenderer block={block} />)
  expect(screen.getByText('A. 3')).toBeInTheDocument()
  expect(screen.getByText('B. 4')).toBeInTheDocument()
})

it('shows correct state after right answer', async () => {
  render(<MultipleChoiceRenderer block={block} />)
  await userEvent.click(screen.getByText('B. 4'))
  // Trigger validation
  expect(screen.getByRole('button', { name: /B. 4/ })).toHaveClass('correct')
})
```

### `InteractiveSliderRenderer.test.tsx`
Verify tally marks update on slider drag and validation checks tolerance.

### `DragDropMatchRenderer.test.tsx`
Verify clicking a left item then a right item forms a pair, and all correct
pairs validates successfully.

---

## 6. E2E Tests — Playwright

All E2E tests run against the local dev server (`http://localhost:3000`).

`playwright.config.ts`:
```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

### E2E Test 1: Full lesson completion flow
```ts
// e2e/lesson-flow.spec.ts
test('can complete a lesson from the constellation', async ({ page }) => {
  await page.goto('/')
  // Dismiss the notebook cover
  await page.getByRole('button', { name: /begin/i }).click()
  await expect(page.locator('.react-flow')).toBeVisible()
  // Click an unlocked concept node
  await page.locator('[aria-label*="Addition — unlocked"]').click()
  // Open lesson modal
  await page.getByRole('button', { name: /open lessons/i }).click()
  // Start first lesson
  await page.getByRole('button', { name: /addition fundamentals/i }).click()
  // Navigate to first interactive block
  await page.getByRole('button', { name: /continue/i }).click()
  // Answer a multiple choice question (option B)
  await page.getByRole('button', { name: /B\./i }).click()
  // Check answer
  await page.getByRole('button', { name: /check answer/i }).click()
  await expect(page.locator('[data-state="correct"]')).toBeVisible()
})
```

### E2E Test 2: Ink drawing
```ts
// e2e/ink-drawing.spec.ts
test('can draw ink strokes on the canvas', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /begin/i }).click()
  // Select pen tool
  await page.getByRole('button', { name: /pen tool/i }).click()
  // Draw a stroke across the canvas
  const canvas = page.locator('.react-flow')
  await canvas.hover({ position: { x: 100, y: 100 } })
  await page.mouse.down()
  await page.mouse.move(200, 200)
  await page.mouse.up()
  // Verify a stroke path exists in the SVG layer
  await expect(page.locator('svg path[d]')).toBeVisible()
})
```

### E2E Test 3: Socratic chat trigger after 2 failures
```ts
// e2e/socratic-chat.spec.ts
test('Socratic chat opens after 2 incorrect answers', async ({ page }) => {
  await page.goto('/')
  // Navigate to a lesson with a multiple choice block
  // ... (navigate steps)
  // Answer wrong twice
  await page.getByRole('button', { name: /A\./i }).click()
  await page.getByRole('button', { name: /check answer/i }).click()
  await page.getByRole('button', { name: /A\./i }).click()
  await page.getByRole('button', { name: /check answer/i }).click()
  // Socratic chat should open automatically
  await expect(page.getByRole('region', { name: /tutor chat/i })).toBeVisible()
})
```

### E2E Test 4: Accessibility check on main pages
```ts
// e2e/accessibility.spec.ts
import AxeBuilder from '@axe-core/playwright'

test('constellation page has no critical a11y violations', async ({ page }) => {
  await page.goto('/')
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  const critical = results.violations.filter(v =>
    v.impact === 'critical' || v.impact === 'serious'
  )
  expect(critical).toHaveLength(0)
})

test('onboarding page has no critical a11y violations', async ({ page }) => {
  await page.goto('/onboarding')
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  const critical = results.violations.filter(v =>
    v.impact === 'critical' || v.impact === 'serious'
  )
  expect(critical).toHaveLength(0)
})
```

---

## 7. Test Fixtures

```ts
// src/test/fixtures/lesson.ts
import type { Lesson } from '@/types'

export const mockLesson: Lesson = {
  id: 'l-test-1',
  conceptId: 'c-addition',
  title: 'Test Addition',
  slides: [
    {
      id: 'slide-1',
      blocks: [
        {
          id: 'block-mc-1',
          type: 'multiple_choice',
          question: 'What is 1 + 1?',
          options: ['1', '2', '3', '4'],
          correctIndex: 1,
          required: true,
        },
        {
          id: 'block-slider-1',
          type: 'interactive_slider',
          prompt: 'Set the value to 5',
          min: 0,
          max: 10,
          correctValue: 5,
          tolerance: 0.5,
          required: true,
        },
      ],
    },
  ],
}
```

---

## 8. CI Pipeline — GitHub Actions

`.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - name: Type check
        run: npx tsc --noEmit
      - name: Lint
        run: npx eslint src --max-warnings=0
      - name: Unit tests
        run: npx vitest run --coverage
      - name: Audit dependencies
        run: npm audit --audit-level=high
      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium
      - name: E2E tests
        run: npx playwright test
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GOOGLE_API_KEY: ${{ secrets.GOOGLE_API_KEY }}
```

GitHub repository secrets required: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`.

---

## 9. Coverage Targets

| Module | Minimum line coverage |
|--------|-----------------------|
| `src/store/lesson-store.ts` | 90% |
| `src/store/canvas-store.ts` | 80% |
| `src/store/graph-store.ts` | 80% |
| `src/store/telemetry-store.ts` | 75% |
| `src/components/lesson/blocks/*` | 70% |
| `src/lib/socratic-prompt.ts` | 70% |
| Global threshold | 70% lines, 70% functions, 60% branches |

Coverage below threshold fails the CI build.

---

## 10. Error Boundary Testing

Every major page section must have an error boundary. The boundaries are
rendered with fallback UI that does not expose internal error details.

Required error boundaries:
- `KnowledgeGraph.tsx` wrapper (React Flow crash → show "Reload canvas" message)
- `LessonView.tsx` wrapper (lesson crash → show "Exit lesson" button)
- `SocraticChat.tsx` wrapper (chat crash → dismiss silently)

Unit test the error boundaries:
```ts
it('ErrorBoundary renders fallback on child error', () => {
  const ThrowError = () => { throw new Error('test') }
  render(
    <KnowledgeGraphErrorBoundary>
      <ThrowError />
    </KnowledgeGraphErrorBoundary>
  )
  expect(screen.getByText(/reload canvas/i)).toBeInTheDocument()
})
```
