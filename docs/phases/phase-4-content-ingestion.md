# Phase 4 — Content Ingestion & Lesson Engine

## Status: ~40% Complete

## Overview
Builds and populates the lesson content layer: the lesson rendering pipeline is
largely complete, but only 2 of 15 concepts have actual lesson data. This phase
covers the interactive block renderers (done), the seed data expansion (major gap),
and a content ingestion pipeline to create lessons from structured input or AI
generation. Sprint 4.4 adds spatial indexing to the text renderer, which is a
prerequisite for the Smart Annotation engine.

---

## Sprint 4.1 — Interactive Block Renderers  ✅ DONE

### What was built

All six block types have renderers in `src/components/lesson/blocks/`:

#### `TextBlockRenderer.tsx`
- Handles: `# Heading`, `## Subheading`, `**bold**`, `*italic*`, paragraphs
- No spatial indexing (see Sprint 4.4)
- Typography: `ivy-presto` for headings, 16px/28px line-height for body

#### `InteractiveSliderRenderer.tsx`
- Renders a value range with tally-mark visualization
- Input: `<input type="range">` with `min`, `max`, `step` from block config
- Answer validated against `block.correctValue ± block.tolerance`
- On correct: green glow state; on incorrect: shake animation, increment attempts counter
- Calls `setAnswer(blockId, { value, validationState, attempts })`

#### `DragDropMatchRenderer.tsx`
- Click-to-select, click-target matching (not native HTML5 drag)
- Left column: items; right column: targets
- State: `selectedItem`, matched pairs highlighted in green, unmatched in white
- Validated by comparing all pairs against `block.correctPairs`

#### `MultipleChoiceRenderer.tsx`
- Letter-indexed options (A, B, C, D)
- Correct answer: green fill + checkmark; incorrect: red/desaturated + X
- Once answered, all options lock (no re-selection)
- Calls `setAnswer(blockId, { value: selectedIndex, validationState, attempts: 1 })`

#### `FormulaBuilderRenderer.tsx`
- Token assembly: drag or click tokens from a palette into ordered slots
- Validates assembled formula string against `block.correctFormula`
- Reset button clears all slots

#### `VisualFeedbackRenderer.tsx`
- Data-driven visualisations for the `visual_feedback` block type
- Sub-types: `number_line`, `scale`, `bar_chart`, `pie_chart`
- Rendered as inline SVG; values from `block.data`
- Read-only (no interaction); used to visualise slider or formula results

### Key files
- `src/components/lesson/LessonBlockRenderer.tsx` — switch dispatcher
- `src/components/lesson/blocks/TextBlockRenderer.tsx`
- `src/components/lesson/blocks/InteractiveSliderRenderer.tsx`
- `src/components/lesson/blocks/DragDropMatchRenderer.tsx`
- `src/components/lesson/blocks/MultipleChoiceRenderer.tsx`
- `src/components/lesson/blocks/FormulaBuilderRenderer.tsx`
- `src/components/lesson/blocks/VisualFeedbackRenderer.tsx`

### Verification
- Open the Addition lesson (concept `c-addition`); slider renders with tally marks
- Moving the slider shows tally mark count updating
- Correct answer triggers green state; incorrect triggers shake
- Multiple choice selects, locks, and shows correct/incorrect feedback
- Drag-drop assigns pairs and validates

---

## Sprint 4.2 — Lesson Engine (Store & View)  ✅ DONE

### What was built

#### `src/store/lesson-store.ts`
```ts
activeLesson: Lesson | null
activeLessonConceptId: string | null
currentSlideIndex: number
totalSlides: number
answers: Record<string, BlockAnswer>       // keyed by block ID
isLessonActive: boolean
isLessonComplete: boolean
startedAt: number | null                   // Date.now() timestamp

startLesson(lesson: Lesson, conceptId: string): void
exitLesson(): void
nextSlide(): void
prevSlide(): void
setAnswer(blockId: string, answer: BlockAnswer): void
validateBlock(blockId: string): ValidationResult
canAdvance(): boolean      // false if current slide has unvalidated interactive blocks
getProgress(): number      // 0–1, currentSlideIndex / (totalSlides - 1)
getCurrentBlock(): LessonBlock | null
getBlockAnswer(blockId: string): BlockAnswer | undefined
completeLesson(): void     // sets isLessonComplete, calls updateProgress in graph-store
```

**`BlockAnswer` type:**
```ts
type BlockAnswer = {
  value: unknown;
  validationState: "idle" | "correct" | "incorrect";
  attempts: number;
}
```

#### `src/components/lesson/LessonView.tsx`
- Full-screen `position: fixed z-50` overlay
- Slide navigation: ArrowRight / ArrowLeft keyboard handlers
- Progress bar at top (driven by `getProgress()`)
- Page number: `slide N of M` in Courier New bottom-right
- `canAdvance()` guards `nextSlide()` — user cannot advance without validating
  interactive blocks
- On final slide completion, `completeLesson()` is called → triggers mastery
  burst animation in `ConceptNode`
- Renders: `NotebookCanvas` overlay + `MarginaliaAnnotations` + `SelectionTrigger`

### Key files
- `src/store/lesson-store.ts`
- `src/components/lesson/LessonView.tsx`

### Verification
- Start the Addition lesson; slide count shows `1 of N`
- Advance without answering the slider — nothing happens (gated)
- Answer correctly — next slide unlocks
- Complete all slides — constellation shows Addition node as mastered (filled disc)

---

## Sprint 4.3 — Seed Data Expansion  ⚠️ MAJOR GAP

### Current state
`src/data/seed.ts` defines:
- 15 concepts with positions: Addition, Subtraction, Multiplication, Division,
  Fractions, Decimals, Percentages, Algebra, Geometry, Sequences, Trigonometry,
  Calculus, Physics-Motion, Chemistry-Atoms, Music-Theory
- 17 prerequisite edges
- **Only 2 full lessons:**
  - `l-addition-1` (concept `c-addition`) — 3 slides: text intro, slider block, visual_feedback
  - `l-multiplication-1` (concept `c-multiplication`) — 3 slides: text intro, drag_drop_match, multiple_choice
- 13 concepts have `lessons: []`

### Tasks

#### 4.3.1 Complete minimum viable lesson set (8 more concepts)
Each concept needs at least 1 lesson with a minimum of 3 slides. Priority order:

| Concept ID | Lesson focus | Block mix |
|------------|--------------|-----------|
| `c-subtraction` | Taking away | slider (result), multiple_choice (word problem) |
| `c-fractions` | Part of a whole | visual_feedback (pie), slider (numerator), drag_drop_match (equivalents) |
| `c-decimals` | Place value | text, slider (tenths), multiple_choice |
| `c-percentages` | Proportion | formula_builder (% of N), visual_feedback (bar_chart) |
| `c-algebra` | Unknowns | text, formula_builder (solve x), multiple_choice |
| `c-geometry` | Shapes & area | text, visual_feedback (bar_chart), multiple_choice |
| `c-sequences` | Patterns | slider (next term), drag_drop_match (order) |
| `c-division` | Sharing equally | slider, multiple_choice |

#### 4.3.2 Data integrity validation
- [ ] Add a runtime validation function `validateSeedData()` in `src/data/seed.ts`
  that checks:
  - Every concept referenced in `PREREQUISITES` exists in `CONCEPTS`
  - Every lesson's `conceptId` matches a concept in `CONCEPTS`
  - Every block has a valid `type` from `LessonBlockType`
  - Throws in development if any check fails (wraps in `if (process.env.NODE_ENV !== "production")`)

#### 4.3.3 DEFAULT_PROGRESS baseline
- [ ] Ensure `DEFAULT_PROGRESS` in `seed.ts` has entries for all 15 concepts
  with correct initial `status` based on prerequisite graph:
  - Concepts with no prerequisites → `"unlocked"`
  - All others → `"locked"`

### Acceptance criteria
- All 15 concepts have at least 1 lesson
- Completing lesson for concept C unlocks all direct dependents of C
- `validateSeedData()` runs in dev and throws zero errors

### Key files
- `src/data/seed.ts`

---

## Sprint 4.4 — Text Block Spatial Index  ✅ DONE

### Context
`TextBlockRenderer.tsx` currently renders lesson text as plain React DOM with no
position tracking. To enable Smart Annotation (Phase 5, Sprint 5.3), we need to
know the screen-space bounding box of each rendered paragraph/heading so that a
highlight stroke can be matched to the text it covers.

### Tasks

#### 4.4.1 Add spatial metadata to block rendering
- [ ] Add a `SpatialBlock` interface to `src/types/index.ts`:
  ```ts
  interface SpatialBlock {
    blockId: string;
    paragraphIndex: number;     // 0-based index within the block
    text: string;               // the raw text content of this paragraph
    rect: DOMRect;              // current screen-space bounding box
  }
  ```
- [ ] Modify `TextBlockRenderer.tsx` to:
  - Wrap each paragraph/heading in a `<span ref={paragraphRefs[i]}>` using `useRef`
  - On mount and on window resize, call `getBoundingClientRect()` on each ref and
    report the results via a new `onSpatialUpdate` prop:
    ```ts
    onSpatialUpdate?: (blocks: SpatialBlock[]) => void
    ```
  - Call `onSpatialUpdate` after every `ResizeObserver` callback

#### 4.4.2 Spatial index store in lesson-store
- [ ] Add spatial block tracking to `src/store/lesson-store.ts`:
  ```ts
  spatialIndex: SpatialBlock[]
  updateSpatialIndex(blocks: SpatialBlock[]): void
  queryByRect(rect: DOMRect): SpatialBlock[]  // returns blocks whose rects intersect
  ```
- [ ] `queryByRect` uses AABB intersection test:
  ```ts
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
  ```

#### 4.4.3 Wire up in LessonView
- [ ] In `LessonView.tsx`, pass `onSpatialUpdate={(blocks) => updateSpatialIndex(blocks)}`
  to each `LessonBlockRenderer` → `TextBlockRenderer`
- [ ] Clear `spatialIndex` on slide turn (`nextSlide` and `prevSlide` actions)

#### 4.4.4 Verify spatial tracking
- [ ] Add a development-mode debug overlay (behind a `?debug=spatial` URL flag) that
  draws red outlines over all tracked text blocks to confirm the index is correct

### Acceptance criteria
- Each paragraph in a lesson has a tracked `DOMRect` in `lesson-store.spatialIndex`
- `queryByRect` returns the correct paragraphs when given a bounding box that
  overlaps them
- Spatial index updates within 100ms of a window resize
- Debug overlay shows correct outlines in dev mode

### Key files (to modify)
- `src/types/index.ts` — `SpatialBlock` interface
- `src/components/lesson/blocks/TextBlockRenderer.tsx` — `onSpatialUpdate` prop
- `src/store/lesson-store.ts` — `spatialIndex`, `updateSpatialIndex`, `queryByRect`
- `src/components/lesson/LessonView.tsx` — wire `onSpatialUpdate`
- `src/lib/utils.ts` — AABB intersection helper `rectIntersects(a: DOMRect, b: DOMRect): boolean`

---

## Completion Criteria for Phase 4

- [ ] All six block renderers function correctly with their validation states
- [ ] Lesson engine gates slide advancement on block validation
- [ ] All 15 concepts have at least 1 lesson with ≥3 slides
- [ ] `validateSeedData()` passes with zero errors in development
- [ ] `DEFAULT_PROGRESS` correctly marks initial unlocked concepts
- [ ] `SpatialBlock` interface is defined and exported
- [ ] `TextBlockRenderer` calls `onSpatialUpdate` with correct DOMRects on mount
- [ ] `lessonStore.queryByRect` returns correct results for a given DOMRect
- [ ] `npm run build` with no type errors

---

## Dependencies
- Requires: Phase 1 (lesson view sits on top of canvas), Phase 0 (types)
- Blocks: Phase 5 Sprint 5.3 (Smart Annotation needs `queryByRect`)
