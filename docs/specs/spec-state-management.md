# Spec — State Management

## Purpose
Defines the complete Zustand store architecture for Savant: store responsibilities,
slice boundaries, cross-store communication rules, selector patterns, and
the hydration/persistence lifecycle. This spec governs all five stores in
`src/store/`.

---

## 1. Store Inventory

| Store file | Hook | Responsibility |
|-----------|------|----------------|
| `src/store/canvas-store.ts` | `useCanvasStore` | Active tool, ink strokes, text notes, viewport mirror, cover state |
| `src/store/graph-store.ts` | `useGraphStore` | Concept data, progress map, selected concept, lesson modal, mastery animations |
| `src/store/lesson-store.ts` | `useLessonStore` | Active lesson, slide index, block answers, spatial index |
| `src/store/chat-store.ts` | `useChatStore` | Chat open state, message history, marginalia entries |
| `src/store/telemetry-store.ts` | `useTelemetryStore` | Struggle scores, event log, session timing |

---

## 2. Store Design Rules

### 2.1 No store imports another store
Stores must be completely independent. They do not import from each other.
Cross-store coordination is the responsibility of the component or action that
sits above both stores.

**Correct pattern — coordinate in a component:**
```ts
// In LessonView.tsx
function handleLessonComplete() {
  const { activeLesson } = useLessonStore.getState()
  useLessonStore.getState().completeLesson()
  useGraphStore.getState().updateProgress(activeLesson.conceptId, "mastered")
  useChatStore.getState().clearMessages()
}
```

**Wrong pattern — store importing store:**
```ts
// ❌ NEVER do this inside lesson-store.ts:
import { useGraphStore } from './graph-store'
```

### 2.2 Granular selectors only
Never destructure the full store state in a single selector. This causes the
component to re-render on every store change, even unrelated ones.

```ts
// ❌ Wrong
const store = useCanvasStore(s => s)

// ✓ Correct
const activeTool = useCanvasStore(s => s.activeTool)
const strokes = useCanvasStore(s => s.strokes)
```

For multiple related slices, combine only what the component actually uses:
```ts
const { activeTool, activePoints } = useCanvasStore(s => ({
  activeTool: s.activeTool,
  activePoints: s.activePoints,
}))
```
This still causes a re-render if either slice changes, which is acceptable
when the component uses both. Use `useShallow` from `zustand/shallow` when
selecting multiple primitive slices that change independently.

### 2.3 Computed values are not stored
Derived values must not be stored in state — compute them from primitives.

```ts
// ❌ Wrong: storing derived state
lessonProgress: number    // stored as float in state

// ✓ Correct: computed via a getter action
getProgress(): number {
  return (currentSlideIndex + 1) / activeLesson.slides.length
}
```

Exception: when computing a derived value is expensive (O(n) over large arrays),
it may be memoized in the component via `useMemo`, not in the store.

### 2.4 Actions are synchronous by default
Store actions must be synchronous. Async operations (API calls, DB queries)
belong in components or custom hooks — not in store actions.

**Exception:** `telemetry-store` may use a `setTimeout` for batching events.
This is the only store with deferred state updates.

---

## 3. canvas-store.ts — Full Specification

```ts
interface CanvasState {
  // Tool
  activeTool: CanvasTool
  setActiveTool(tool: CanvasTool): void

  // Ink strokes — canvas-space
  strokes: InkStroke[]
  activePoints: [number, number, number][]
  beginStroke(x: number, y: number, pressure: number): void
  extendStroke(x: number, y: number, pressure: number): void
  commitStroke(): void
  eraseNear(cx: number, cy: number, radius: number): void
  clearStrokes(): void

  // Highlight strokes — canvas-space (Phase 3 Sprint 3.3)
  highlightStrokes: HighlightStroke[]
  activeHighlightPoints: [number, number, number][]
  beginHighlight(x: number, y: number, pressure: number): void
  extendHighlight(x: number, y: number, pressure: number): void
  commitHighlight(): void

  // Stroke commit hook — for Smart Annotation
  onStrokeCommit: ((stroke: InkStroke) => void) | null
  setStrokeCommitHandler(fn: (stroke: InkStroke) => void): void
  clearStrokeCommitHandler(): void

  // Text notes — screen-space
  textNotes: GlobalTextNote[]
  addNote(x: number, y: number): string
  updateNote(id: string, content: string): void
  finishNote(id: string): void
  editNote(id: string): void
  deleteNote(id: string): void

  // Viewport — mirror of React Flow
  viewport: { x: number; y: number; zoom: number }
  setViewport(x: number, y: number, zoom: number): void
  rfContainerOrigin: { x: number; y: number }
  setRfContainerOrigin(x: number, y: number): void

  // Cover
  isCoverOpen: boolean
  closeCover(): void

  // Hydration (Phase 6)
  hydrateStrokes(strokes: InkStroke[]): void
  hydrateHighlightStrokes(strokes: HighlightStroke[]): void
  hydrateTextNotes(notes: GlobalTextNote[]): void
}
```

### Key implementation details
- `beginStroke`: must create a **new** array (`[first_point]`), not push into the
  existing `activePoints`. This ensures React detects the reference change.
- `commitStroke`: appends to `strokes[]` with a new `InkStroke` object, then
  calls `onStrokeCommit(stroke)` if registered, then resets `activePoints: []`.
- `eraseNear`: filters `strokes[]` removing any stroke where any point is within
  `radius` canvas-space units of `(cx, cy)`. Does not mutate individual strokes —
  replace the entire `strokes` array with filtered result.

---

## 4. graph-store.ts — Full Specification

```ts
interface GraphState {
  // Data
  concepts: Concept[]
  prerequisites: ConceptPrerequisite[]
  lessons: Lesson[]

  // Progress
  progressMap: Map<string, ProgressStatus>
  updateProgress(conceptId: string, status: ProgressStatus): void
  applyUserPreferences(prefs: UserPreferences): void    // Phase 2

  // Selection
  selectedConceptId: string | null
  selectConcept(id: string | null): void

  // Lesson modal
  isLessonModalOpen: boolean
  openLessonModal(): void
  closeLessonModal(): void

  // Mastery animation signals
  recentlyMasteredId: string | null
  recentlyUnlockedIds: string[]
  clearMasteryAnimation(): void

  // Hydration (Phase 6)
  hydrateProgress(entries: StudentProgress[]): void
  hydrateContent(concepts: Concept[], prerequisites: ConceptPrerequisite[], lessons: Lesson[]): void
}
```

### `progressMap` is a `Map`, not a plain object
Zustand does not deeply track `Map` mutations. Any action that modifies
`progressMap` must replace it with a new `Map`:
```ts
// ✓ Correct
const newMap = new Map(state.progressMap)
newMap.set(conceptId, status)
set({ progressMap: newMap })

// ❌ Wrong (Zustand won't detect the change)
state.progressMap.set(conceptId, status)
```

---

## 5. lesson-store.ts — Full Specification

```ts
interface LessonState {
  activeLesson: Lesson | null
  currentSlideIndex: number
  answers: Record<string, BlockAnswer>
  spatialIndex: TextBlockSpatialIndex[]    // Phase 4 Sprint 4.4

  startLesson(lesson: Lesson): void
  exitLesson(): void
  nextSlide(): void
  prevSlide(): void
  setAnswer(blockId: string, value: unknown): void
  validateBlock(blockId: string): ValidationState
  completeLesson(): void
  setSpatialIndex(index: TextBlockSpatialIndex[]): void    // Phase 4 Sprint 4.4

  // Computed
  canAdvance(): boolean
  getProgress(): number
}
```

### `startLesson()` — complete reset
```ts
startLesson(lesson: Lesson) {
  set({
    activeLesson: lesson,
    currentSlideIndex: 0,
    answers: {},
    spatialIndex: [],
  })
}
```

### `validateBlock()` — pure validation with no side effects
```ts
validateBlock(blockId: string): ValidationState {
  const { activeLesson, currentSlideIndex, answers } = get()
  if (!activeLesson) return "idle"
  const slide = activeLesson.slides[currentSlideIndex]
  const block = slide.blocks.find(b => b.id === blockId)
  if (!block) return "idle"
  const answer = answers[blockId]
  if (!answer) return "idle"

  const isCorrect = checkBlockAnswer(block, answer.value)
  const newState: ValidationState = isCorrect ? "correct" : "incorrect"

  set(state => ({
    answers: {
      ...state.answers,
      [blockId]: {
        ...state.answers[blockId],
        validationState: newState,
        attempts: (state.answers[blockId]?.attempts ?? 0) + 1,
      },
    },
  }))

  return newState
}
```

`checkBlockAnswer()` is a pure function in `lesson-store.ts`:
```ts
function checkBlockAnswer(block: LessonBlock, value: unknown): boolean {
  switch (block.type) {
    case "multiple_choice":
      return value === block.correctIndex
    case "interactive_slider":
      return Math.abs(Number(value) - block.correctValue) <= block.tolerance
    case "drag_drop_match":
      // value is an array of [leftId, rightId] pairs
      return (value as [string,string][]).every(([l, r]) => {
        const pair = block.pairs.find(p => p.left === l)
        return pair?.right === r
      })
    case "formula_builder":
      return JSON.stringify(value) === JSON.stringify(block.correctFormula)
    default:
      return false
  }
}
```

---

## 6. chat-store.ts — Full Specification

```ts
interface ChatState {
  isOpen: boolean
  messages: ChatMessage[]
  isStreaming: boolean

  open(): void
  close(): void
  triggerFromFailure(): void
  addMessage(msg: Omit<ChatMessage, "id" | "timestamp">): void
  appendToLastMessage(chunk: string): void    // for streaming assistant messages
  finishStreaming(): void
  clearMessages(): void

  marginaliaEntries: MarginaliaEntry[]
  addMarginaliaEntry(
    anchorY: number,
    selectedText: string,
    type?: MarginaliaEntry["type"]
  ): string
  updateMarginalia(id: string, chunk: string): void
  finishMarginalia(id: string): void
  removeMarginalia(id: string): void
  clearAllMarginalia(): void
}
```

### Streaming assistant messages
When a new assistant response starts streaming:
1. `addMessage({ role: "assistant", content: "" })` — creates empty shell
2. `appendToLastMessage(chunk)` — concatenates each chunk to `messages[last].content`
3. `finishStreaming()` — sets `isStreaming: false`

`appendToLastMessage` must create a new message object (not mutate):
```ts
appendToLastMessage(chunk: string) {
  set(state => {
    const messages = [...state.messages]
    const last = messages[messages.length - 1]
    messages[messages.length - 1] = { ...last, content: last.content + chunk }
    return { messages }
  })
}
```

---

## 7. telemetry-store.ts — Full Specification

```ts
interface TelemetryState {
  events: TelemetryEntry[]
  struggleScores: Record<string, StruggleScore>   // keyed by conceptId
  sessionStartTime: number                         // Date.now() on session start
  conceptStartTimes: Record<string, number>        // when the student opened this concept

  logEvent(event: Omit<TelemetryEntry, "id" | "timestamp">): void
  computeStruggleScore(conceptId: string): StruggleScore
  clearSession(): void
}
```

The `telemetry-store` is read by `DashboardPage` to display struggle scores.
It does not write to Supabase in the current implementation.
Phase 10 Sprint 10.2 adds Supabase telemetry persistence.

---

## 8. Cross-Store Action Sequences

These are the canonical sequences for operations that touch multiple stores.
They must always be implemented in this exact order to prevent inconsistent states.

### Lesson complete
```
1. lesson-store.completeLesson()
2. graph-store.updateProgress(conceptId, "mastered")
3. chat-store.clearMessages()
4. chat-store.clearAllMarginalia()
5. canvas-store.clearStrokeCommitHandler()
6. telemetry-store.logEvent({ event: "lesson_complete", ... })
```

### Lesson exit (without completion)
```
1. lesson-store.exitLesson()
2. chat-store.clearMessages()
3. chat-store.clearAllMarginalia()
4. canvas-store.clearStrokeCommitHandler()
```

### Concept mastered → unlock dependents
```
1. graph-store.updateProgress(conceptId, "mastered")
   — internally computes recentlyUnlockedIds and sets them
2. ConceptNode(recentlyMastered) plays burst animation, then calls:
3. graph-store.clearMasteryAnimation()
```

---

## 9. Zustand Version Notes

Savant uses **Zustand v5**. Key v5 differences from v4:
- `set()` automatically creates a shallow merge (same as v4)
- `get()` returns current state snapshot (same as v4)
- `useStore.getState()` works identically for imperative access
- `useStore.subscribe()` for non-React subscriptions (e.g., persisting to storage)
- `immer` middleware not used — all mutations are done via `set()` with new objects
- No `devtools` middleware in production (`process.env.NODE_ENV === 'development'` gate)

---

## 10. Store Persistence Strategy

| Store | Persisted | Where | When |
|-------|-----------|-------|------|
| `canvas-store` | Strokes + text notes | Supabase `canvas_states` | 500ms debounce after commit |
| `graph-store` | Progress map | Supabase `student_progress` | On `updateProgress()` call |
| `lesson-store` | Answers | Not persisted (transient per session) | — |
| `chat-store` | Nothing | Not persisted | — |
| `telemetry-store` | Events | Supabase `telemetry_events` (Phase 10) | Batch on session end |

Persistence is always async and runs outside the store — in components or
custom hooks that subscribe to store changes and trigger API calls.
