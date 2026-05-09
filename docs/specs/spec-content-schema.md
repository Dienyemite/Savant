# Spec — Content Schema

## Purpose
Defines the structure of lesson content: the six block types, lesson slide
format, seed data conventions, block validation logic, and the LLM content
pipeline spec for generating new lessons at scale. This spec governs
`src/data/seed.ts`, `src/store/lesson-store.ts`, and the Phase 4 content
ingestion system.

---

## 1. Current Implementation Status

**Exists:**
- All 6 block type interfaces in `src/types/index.ts`
- All 6 renderer components in `src/components/lesson/blocks/`
- `LessonBlockRenderer.tsx` switch dispatch
- `lesson-store.ts` with validation logic
- 15 concepts and 17 prerequisites in `src/data/seed.ts`
- 2 complete lessons: `l-addition-1`, `l-multiplication-1`

**Does NOT exist:**
- Lessons for 13/15 concepts
- LLM pipeline for generating lesson JSON
- Lesson validation/schema checker for new content
- Migration to move `lessons` data from TypeScript seed to Supabase `lessons` table
- `spatialIndex` field on `TextBlock` (needed for Smart Annotation — Phase 4 Sprint 4.4)

---

## 2. Lesson Structure

### Lesson
```ts
interface Lesson {
  id: string               // format: "l-{conceptId}-{n}" e.g., "l-addition-1"
  conceptId: string        // must match a Concept.id in the concepts array
  title: string            // e.g., "Understanding Addition"
  slides: LessonSlide[]    // ordered array, displayed one per view
  estimatedMinutes: number
}
```

### LessonSlide
```ts
interface LessonSlide {
  id: string               // format: "slide-{n}" e.g., "slide-1"
  blocks: LessonBlock[]    // ordered array rendered top-to-bottom
}
```

### Content design rules
- Each slide should have 1–4 blocks. More than 4 creates cognitive overload.
- Every slide must begin with a `TextBlock` (orientation) except pure practice slides.
- Every lesson must have at least one interactive block (anything other than `text`).
- The final slide should be a `TextBlock` summarising the key concept.

---

## 3. Block Types in Detail

### 3.1 TextBlock

```ts
interface TextBlock {
  id: string
  type: "text"
  content: string
}
```

**Markdown subset supported in `TextBlockRenderer.tsx`:**
| Syntax | Rendered as |
|--------|-------------|
| `# Heading` | `<h1>` at 28px ivy-presto |
| `## Subheading` | `<h2>` at 20px ivy-presto |
| `**bold**` | `<strong>` |
| `*italic*` | `<em>` |
| Plain paragraph | `<p>` at 16px ivy-presto |

No HTML tags, no tables, no code blocks, no image embeds in TextBlock.

**Spatial indexing (Phase 4 Sprint 4.4):**
After the lesson renders, `LessonView.tsx` must walk all rendered `TextBlock`
DOM nodes and record their bounding boxes in the lesson store:
```ts
interface TextBlockSpatialIndex {
  blockId: string
  slideIndex: number
  top: number       // relative to lesson content container top
  bottom: number
  text: string      // full plain-text content (stripped of markdown)
}
```
This index is used by `SelectionTrigger.tsx` to determine which `TextBlock`
the user's selection falls within, enabling the Smart Annotation engine to
receive the correct context.

### 3.2 MultipleChoiceBlock

```ts
interface MultipleChoiceBlock {
  id: string
  type: "multiple_choice"
  question: string
  options: string[]        // 2–4 options recommended; renderer supports up to 6
  correctIndex: number
  explanation?: string     // shown on correct answer, optional
}
```

**Seed example:**
```ts
{
  id: "mc-1",
  type: "multiple_choice",
  question: "What is 3 + 4?",
  options: ["6", "7", "8", "9"],
  correctIndex: 1,
  explanation: "3 + 4 = 7. Count the total objects."
}
```

**Renderer behaviour (`MultipleChoiceRenderer.tsx`):**
- Options displayed with letter indices: A, B, C, D
- After selection: shows correct (green glow) or incorrect (red glow)
- After any selection: all options lock (no further interaction)
- `validationState` in `lesson-store` updates immediately on selection
- 2 incorrect attempts → auto-triggers Socratic chat (`triggerFromFailure`)

### 3.3 InteractiveSliderBlock

```ts
interface InteractiveSliderBlock {
  id: string
  type: "interactive_slider"
  question: string
  min: number
  max: number
  step: number
  correctValue: number
  tolerance: number
  unit?: string
}
```

**Seed example:**
```ts
{
  id: "slider-1",
  type: "interactive_slider",
  question: "How many apples do 3 groups of 4 make?",
  min: 0,
  max: 20,
  step: 1,
  correctValue: 12,
  tolerance: 0,
  unit: "apples"
}
```

**Renderer behaviour (`InteractiveSliderRenderer.tsx`):**
- Displays tally-mark visualization alongside the numeric slider
- Validates: `Math.abs(value - correctValue) <= tolerance`
- "Confirm" button triggers validation
- Incorrect: increments `attempts`, shows hint text
- 2 incorrect → triggers Socratic chat

### 3.4 DragDropMatchBlock

```ts
interface DragDropMatchBlock {
  id: string
  type: "drag_drop_match"
  question: string
  pairs: Array<{ left: string; right: string }>
}
```

**Seed example:**
```ts
{
  id: "match-1",
  type: "drag_drop_match",
  question: "Match each multiplication to its result",
  pairs: [
    { left: "2 × 3", right: "6" },
    { left: "3 × 4", right: "12" },
    { left: "5 × 5", right: "25" },
  ]
}
```

**Renderer behaviour (`DragDropMatchRenderer.tsx`):**
- Right-side items are shuffled on mount (Fisher-Yates via `sort(() => Math.random() - 0.5)`)
- Uses click-based selection, not native HTML5 drag-and-drop (for tablet/stylus compatibility)
- Click left item → click right item → creates a connection
- All pairs must be matched before `canAdvance()` returns true

### 3.5 FormulaBuilderBlock

```ts
interface FormulaBuilderBlock {
  id: string
  type: "formula_builder"
  question: string
  tokens: string[]
  correctFormula: string[]
}
```

**Seed example:**
```ts
{
  id: "formula-1",
  type: "formula_builder",
  question: "Build the commutative property of addition:",
  tokens: ["a", "+", "b", "=", "b", "+", "a", "c"],
  correctFormula: ["a", "+", "b", "=", "b", "+", "a"]
}
```

Note: `tokens` may contain decoy tokens (like `"c"` above) that are not in the
correct formula. The renderer displays all tokens as draggable chips.

**Renderer behaviour (`FormulaBuilderRenderer.tsx`):**
- Students arrange tokens into a target row by clicking
- Token bank: unplaced tokens shown below the target row
- Clicking a placed token removes it back to the bank
- Validation: `JSON.stringify(placed) === JSON.stringify(correctFormula)`

### 3.6 VisualFeedbackBlock

```ts
interface VisualFeedbackBlock {
  id: string
  type: "visual_feedback"
  subType: "number_line" | "scale" | "bar_chart" | "pie_chart"
  data: VisualFeedbackData
}
```

`VisualFeedbackData` is a discriminated union based on `subType`:

```ts
type VisualFeedbackData =
  | NumberLineData
  | ScaleData
  | BarChartData
  | PieChartData

interface NumberLineData {
  min: number
  max: number
  markers: Array<{ value: number; label: string }>
  highlight?: { from: number; to: number }
}

interface ScaleData {
  leftLabel: string
  rightLabel: string
  balance: number          // -1.0 (full left) to 1.0 (full right), 0 = balanced
}

interface BarChartData {
  labels: string[]
  values: number[]
  highlighted?: number[]   // indices to highlight
}

interface PieChartData {
  slices: Array<{ label: string; value: number }>
  highlighted?: number[]
}
```

**VisualFeedbackBlock is display-only — it is never interactive and never
gates lesson progression.** Use it to visualise concepts after an interactive
block, not as the interactive block itself.

---

## 4. Seed Data Inventory

File: `src/data/seed.ts`

### 4.1 Concepts (15 total)

| ID | Title | Domain | Prerequisites |
|----|-------|--------|---------------|
| `c-numbers` | Numbers | math | none |
| `c-counting` | Counting | math | c-numbers |
| `c-addition` | Addition | math | c-counting |
| `c-subtraction` | Subtraction | math | c-addition |
| `c-multiplication` | Multiplication | math | c-addition |
| `c-division` | Division | math | c-multiplication |
| `c-fractions` | Fractions | math | c-division |
| `c-geometry-basic` | Basic Geometry | math | c-numbers |
| `c-patterns` | Patterns | logic | c-counting |
| `c-rhythm` | Rhythm | music | none |
| `c-notes` | Musical Notes | music | c-rhythm |
| `c-color-theory` | Color Theory | art | none |
| `c-composition` | Composition | art | c-color-theory |
| `c-phonics` | Phonics | language | none |
| `c-reading` | Reading Comprehension | language | c-phonics |

### 4.2 Lessons with content (2 of 15)

| ID | Concept | Slides |
|----|---------|--------|
| `l-addition-1` | c-addition | 3 slides, 5 blocks |
| `l-multiplication-1` | c-multiplication | 3 slides, 5 blocks |

13 concepts have no lesson content yet. Phase 4 Sprint 4.1 and 4.2 address this.

---

## 5. Lesson Validation Function

`validateSeedData()` must be called in development builds only (`process.env.NODE_ENV === 'development'`) to catch schema errors early.

```ts
function validateSeedData(lessons: Lesson[], concepts: Concept[]): void {
  const conceptIds = new Set(concepts.map(c => c.id))

  for (const lesson of lessons) {
    // 1. Every lesson.conceptId must exist
    if (!conceptIds.has(lesson.conceptId)) {
      console.error(`Lesson ${lesson.id}: unknown conceptId "${lesson.conceptId}"`)
    }

    // 2. Every lesson must have at least 1 slide
    if (lesson.slides.length === 0) {
      console.error(`Lesson ${lesson.id}: has no slides`)
    }

    // 3. Slide IDs must be unique within the lesson
    const slideIds = new Set<string>()
    for (const slide of lesson.slides) {
      if (slideIds.has(slide.id)) {
        console.error(`Lesson ${lesson.id}: duplicate slide id "${slide.id}"`)
      }
      slideIds.add(slide.id)

      // 4. Block IDs must be unique within the lesson (not just slide)
      for (const block of slide.blocks) {
        // validates type, required fields per block type
        validateBlock(lesson.id, block)
      }
    }

    // 5. Multiple choice: correctIndex must be in range
    // 6. Slider: correctValue must be within [min, max]
    // 7. FormulaBuilder: correctFormula must be a subset of tokens
    // ... (full implementation in Phase 4 Sprint 4.2)
  }
}
```

---

## 6. Lesson Store Interface

File: `src/store/lesson-store.ts`

```ts
interface LessonStore {
  // State
  activeLesson: Lesson | null
  currentSlideIndex: number
  answers: Record<string, BlockAnswer>   // keyed by block.id

  // Actions
  startLesson(lesson: Lesson): void
  exitLesson(): void
  nextSlide(): void
  prevSlide(): void
  setAnswer(blockId: string, value: unknown): void
  validateBlock(blockId: string): ValidationState
  completeLesson(): void

  // Derived / computed
  canAdvance(): boolean    // returns true if all interactive blocks on current slide are correctly answered
  getProgress(): number    // 0.0–1.0, currentSlideIndex / slides.length
}
```

### `canAdvance()` logic
```ts
canAdvance(): boolean {
  const slide = activeLesson.slides[currentSlideIndex]
  const interactiveBlocks = slide.blocks.filter(b => b.type !== "text" && b.type !== "visual_feedback")
  if (interactiveBlocks.length === 0) return true   // text-only slides always advance
  return interactiveBlocks.every(b => answers[b.id]?.validationState === "correct")
}
```

---

## 7. LLM Content Generation Spec (Phase 4)

Phase 4 Sprint 4.1 introduces an internal tool for generating lesson JSON using
an LLM. This is not a public API — it runs as a Next.js API route accessible
only to admins.

### Route: `POST /api/admin/generate-lesson`

**Request:**
```json
{
  "conceptId": "c-fractions",
  "targetAge": 9,
  "slideCount": 3,
  "includeBlockTypes": ["text", "multiple_choice", "interactive_slider"]
}
```

**System prompt excerpt:**
```
You are an expert curriculum designer for Savant, a minimalist educational app.
Generate a lesson as a JSON object matching this exact TypeScript interface: [LessonSlide[]]
- Each TextBlock content uses only: # heading, ## subheading, **bold**, *italic*, plain text
- No HTML, no image references
- Multiple choice: 3-4 options, correctIndex is 0-based
- Slider: ensure correctValue is within [min, max] and tolerance >= 0
- Return ONLY valid JSON, no markdown fencing, no commentary
```

**Validation:** The response JSON is parsed and run through `validateSeedData()`.
If validation fails, retry once with the error message appended to the prompt.

---

## 8. Phase 4 Sprint 4.4 — Smart Annotation Block Context

When the Smart Annotation engine (Phase 5 Sprint 5.3) is active, it needs to
know which `TextBlock` the user annotated on. The mechanism:

### Spatial indexing on render
After `LessonView.tsx` renders a slide, it runs:
```ts
const index: TextBlockSpatialIndex[] = []
document.querySelectorAll('[data-block-id]').forEach(el => {
  const blockId = el.getAttribute('data-block-id')!
  const rect = el.getBoundingClientRect()
  const containerTop = contentRef.current!.getBoundingClientRect().top
  index.push({
    blockId,
    slideIndex: currentSlideIndex,
    top: rect.top - containerTop + contentRef.current!.scrollTop,
    bottom: rect.bottom - containerTop + contentRef.current!.scrollTop,
    text: el.textContent ?? '',
  })
})
useLessonStore.getState().setSpatialIndex(index)
```

Each block renderer must apply `data-block-id={block.id}` to its root element.

### Lookup by anchor point
When `SelectionTrigger.tsx` fires with an `anchorY` value, the Smart Annotation
engine calls:
```ts
function getBlockAtAnchorY(anchorY: number, index: TextBlockSpatialIndex[]): TextBlockSpatialIndex | null {
  return index.find(entry => anchorY >= entry.top && anchorY <= entry.bottom) ?? null
}
```
