# Spec — Data Models

## Purpose
Defines every TypeScript interface, Supabase table, Zustand store shape, and
the relationships between them. This is the authoritative reference for all
data structures used in Savant. When adding a new field anywhere, this spec
must be updated first.

---

## 1. Core TypeScript Types

File: `src/types/index.ts`

### 1.1 Enums and Union Types

```ts
type UserRole = "student" | "teacher" | "admin"

type ConceptDomain =
  | "math"
  | "science"
  | "art"
  | "music"
  | "language"
  | "logic"

type ProgressStatus = "locked" | "unlocked" | "mastered"

type CanvasTool = "select" | "pen" | "eraser" | "text" | "highlight"
// Note: "highlight" added in Phase 3 Sprint 3.3

type LessonBlockType =
  | "text"
  | "multiple_choice"
  | "interactive_slider"
  | "drag_drop_match"
  | "formula_builder"
  | "visual_feedback"
  // Future: "image", "video", "code_editor" (Phase 4 Sprint 4.3)
```

### 1.2 Domain Labels and Colours

```ts
export const DOMAIN_LABELS: Record<ConceptDomain, string> = {
  math: "Mathematics",
  science: "Science",
  art: "Art & Design",
  music: "Music",
  language: "Language",
  logic: "Logic",
}

export const DOMAIN_COLORS: Record<ConceptDomain, string> = {
  math:     "rgba(255,255,255,0.9)",
  science:  "rgba(180,220,255,0.8)",
  art:      "rgba(255,230,200,0.8)",
  music:    "rgba(220,200,255,0.8)",
  language: "rgba(200,255,220,0.8)",
  logic:    "rgba(255,255,180,0.8)",
}
```

### 1.3 User

```ts
interface User {
  id: string               // UUID, from Supabase auth.users
  email: string
  role: UserRole
  gradeLevel?: number      // 1–12, only for role="student"
  major?: string           // for role="student" university path
  createdAt: string        // ISO 8601
}
```

Mapped from Supabase `users` table. `gradeLevel` and `major` come from the
onboarding flow and are stored in the `users` table `metadata JSONB` column.

### 1.4 Concept

```ts
interface Concept {
  id: string               // e.g., "c-addition"
  title: string            // e.g., "Addition"
  domain: ConceptDomain
  description: string
  position: { x: number; y: number }  // canvas-space position for constellation
  masteryThreshold: number             // number of lessons to complete to master
}
```

Mapped from Supabase `concepts` table. `position` is stored as a JSONB column.
`masteryThreshold` defaults to 1 for most concepts in the seed data.

### 1.5 ConceptPrerequisite

```ts
interface ConceptPrerequisite {
  conceptId: string        // the concept that requires the prerequisite
  prerequisiteId: string   // the concept that must be mastered first
}
```

Mapped from Supabase `concept_prerequisites` table.
Used to build the directed acyclic graph of the constellation.

### 1.6 Lesson

```ts
interface Lesson {
  id: string               // e.g., "l-addition-1"
  conceptId: string        // foreign key to Concept.id
  title: string            // displayed in LessonModal list
  slides: LessonSlide[]
  estimatedMinutes: number // for UI display only
}

interface LessonSlide {
  id: string               // e.g., "slide-1"
  blocks: LessonBlock[]    // ordered array of content blocks
}
```

Lessons are loaded from `src/data/seed.ts` in the current implementation.
Phase 4 Sprint 4.1 migrates them to Supabase `lessons` table.

### 1.7 StudentProgress

```ts
interface StudentProgress {
  id: string               // UUID
  userId: string           // foreign key to User.id
  conceptId: string        // foreign key to Concept.id
  status: ProgressStatus
  lessonsCompleted: number
  lastUpdated: string      // ISO 8601
}
```

Mapped from Supabase `student_progress` table.
`lessonsCompleted` tracks how many of the concept's lessons have been completed.
When `lessonsCompleted >= concept.masteryThreshold`, `status` becomes `"mastered"`.

---

## 2. Lesson Block Interfaces

All defined in `src/types/index.ts`. Each block has a discriminated `type` field.

### Base block interface
```ts
interface BaseBlock {
  id: string
  type: LessonBlockType
}
```

### TextBlock
```ts
interface TextBlock extends BaseBlock {
  type: "text"
  content: string    // Markdown: # h1, ## h2, **bold**, *italic*, plain text
  spatialIndex?: {   // Added in Phase 4 Sprint 4.4 — optional for now
    top: number
    bottom: number
    blockIndex: number
  }
}
```

### MultipleChoiceBlock
```ts
interface MultipleChoiceBlock extends BaseBlock {
  type: "multiple_choice"
  question: string
  options: string[]           // e.g., ["3", "4", "5", "6"]
  correctIndex: number        // 0-based index into options[]
  explanation?: string        // shown after correct answer
}
```

### InteractiveSliderBlock
```ts
interface InteractiveSliderBlock extends BaseBlock {
  type: "interactive_slider"
  question: string
  min: number
  max: number
  step: number
  correctValue: number
  tolerance: number           // ±tolerance is acceptable
  unit?: string               // e.g., "km", "kg"
}
```

### DragDropMatchBlock
```ts
interface DragDropMatchBlock extends BaseBlock {
  type: "drag_drop_match"
  question: string
  pairs: Array<{
    left: string
    right: string
  }>
}
```
Each pair must be matched by the student. The right-side items are shuffled on render.

### FormulaBuilderBlock
```ts
interface FormulaBuilderBlock extends BaseBlock {
  type: "formula_builder"
  question: string
  tokens: string[]            // available tokens, e.g., ["a", "+", "b", "=", "c"]
  correctFormula: string[]    // correct ordered sequence
}
```

### VisualFeedbackBlock
```ts
interface VisualFeedbackBlock extends BaseBlock {
  type: "visual_feedback"
  subType: "number_line" | "scale" | "bar_chart" | "pie_chart"
  data: Record<string, unknown>   // structure varies by subType — see spec-content-schema.md
}
```

### Discriminated union
```ts
type LessonBlock =
  | TextBlock
  | MultipleChoiceBlock
  | InteractiveSliderBlock
  | DragDropMatchBlock
  | FormulaBuilderBlock
  | VisualFeedbackBlock
```

---

## 3. Canvas-Layer Types

Defined in `src/store/canvas-store.ts` and exported for use in `InkLayer.tsx`.

```ts
type InkStroke = {
  id: string
  points: [number, number, number][]   // [canvasX, canvasY, pressure]
  tool: "pen"
}

type HighlightStroke = {
  id: string
  points: [number, number, number][]
  tool: "highlight"
  opacity: number
}

type GlobalTextNote = {
  id: string
  x: number         // screen-space X
  y: number         // screen-space Y
  content: string
  isEditing: boolean
}

type LocalTextNote = {
  id: string
  x: number         // lesson-column-relative X
  y: number         // lesson-column-relative Y (includes scrollTop)
  content: string
}
```

---

## 4. Chat & Marginalia Types

Defined in `src/store/chat-store.ts`.

```ts
type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string      // ISO 8601
}

type MarginaliaEntry = {
  id: string
  anchorY: number        // vertical position relative to lesson content container
  selectedText: string   // the text the user highlighted to trigger the annotation
  content: string        // the AI-generated annotation text
  isStreaming: boolean   // true while the AI is still generating
  type: "selection" | "annotation"  // Phase 5 Sprint 5.3: "annotation" for Smart Annotations
}
```

---

## 5. Lesson Store Types

Defined in `src/store/lesson-store.ts`.

```ts
type ValidationState = "idle" | "correct" | "incorrect"

type BlockAnswer = {
  value: unknown          // string | number | string[] | null depending on block type
  validationState: ValidationState
  attempts: number        // number of times the student has attempted this block
}
```

---

## 6. Telemetry Types

Defined in `src/store/telemetry-store.ts`.

```ts
type TelemetryEntry = {
  conceptId: string
  lessonId: string
  blockId: string
  timestamp: string
  event: "attempt" | "correct" | "incorrect" | "hint_requested" | "chat_triggered"
  metadata?: Record<string, unknown>
}

type StruggleScore = {
  conceptId: string
  score: number           // 0.0–1.0
  components: {
    timeScore: number
    attemptScore: number
    interactionScore: number
    successBonus: number
  }
}
```

Struggle score formula:
```
score = timeScore * 0.3 + attemptScore * 0.3 + interactionScore * 0.2 + successBonus
```
Where `successBonus` is negative (reduces the score when the student answers correctly quickly).

---

## 7. Supabase Schema Summary

All tables are defined in the SQL migrations. This is a quick-reference summary.

### `users`
| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK, from `auth.users` |
| `email` | `text` | unique |
| `role` | `user_role` ENUM | student/teacher/admin |
| `metadata` | `jsonb` | gradeLevel, major, path (onboarding data) |
| `created_at` | `timestamptz` | |

### `concepts`
| Column | Type | Notes |
|--------|------|-------|
| `id` | `text` | PK, e.g., "c-addition" |
| `title` | `text` | |
| `domain` | `concept_domain` ENUM | |
| `description` | `text` | |
| `position` | `jsonb` | `{x, y}` canvas-space |
| `mastery_threshold` | `integer` | default 1 |

### `concept_prerequisites`
| Column | Type | Notes |
|--------|------|-------|
| `concept_id` | `text` | FK → concepts.id |
| `prerequisite_id` | `text` | FK → concepts.id |
| PK: `(concept_id, prerequisite_id)` | | |

### `lessons`
| Column | Type | Notes |
|--------|------|-------|
| `id` | `text` | PK, e.g., "l-addition-1" |
| `concept_id` | `text` | FK → concepts.id |
| `title` | `text` | |
| `slides` | `jsonb` | Array of `LessonSlide` objects |
| `estimated_minutes` | `integer` | |
| `created_at` | `timestamptz` | |

### `student_progress`
| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → users.id |
| `concept_id` | `text` | FK → concepts.id |
| `status` | `progress_status` ENUM | locked/unlocked/mastered |
| `lessons_completed` | `integer` | default 0 |
| `last_updated` | `timestamptz` | auto-updated by trigger |
| Unique: `(user_id, concept_id)` | | |

### `canvas_states`
| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → users.id |
| `concept_id` | `text` | FK → concepts.id, nullable |
| `strokes` | `jsonb` | Array of InkStroke or HighlightStroke |
| `text_notes` | `jsonb` | Array of GlobalTextNote or LocalTextNote |
| `viewport` | `jsonb` | `{x, y, zoom}` |
| `updated_at` | `timestamptz` | auto-updated by trigger |
| Unique: `(user_id, concept_id)` | | (NULLS NOT DISTINCT for constellation canvas) |

---

## 8. Seed Data Structure

File: `src/data/seed.ts`

The seed file exports:
```ts
export const concepts: Concept[]
export const prerequisites: ConceptPrerequisite[]
export const lessons: Lesson[]
export const DEFAULT_PROGRESS: Map<string, ProgressStatus>
```

### DEFAULT_PROGRESS logic
On first load (before any auth or DB), `graph-store.ts` populates `progressMap`
from `DEFAULT_PROGRESS`. The algorithm:

1. Start all concepts as `"locked"`
2. Find all concepts that have **no prerequisites** — set them to `"unlocked"`
3. This results in the "root" concepts being immediately available

From `src/data/seed.ts`:
```ts
export const DEFAULT_PROGRESS = new Map<string, ProgressStatus>(
  concepts.map(c => {
    const hasPrereqs = prerequisites.some(p => p.conceptId === c.id)
    return [c.id, hasPrereqs ? "locked" : "unlocked"]
  })
)
```

Currently in `src/data/seed.ts`: 15 concepts, 17 prerequisites, 2 lessons.
See `spec-content-schema.md` for the full list and lesson content structure.

---

## 9. Store Interface Summaries

Full interfaces are documented in their respective spec files. This section
provides the cross-reference.

| Store | File | Spec |
|-------|------|------|
| `useCanvasStore` | `src/store/canvas-store.ts` | `spec-canvas-engine.md §8` |
| `useGraphStore` | `src/store/graph-store.ts` | `spec-knowledge-graph.md §5` |
| `useLessonStore` | `src/store/lesson-store.ts` | `spec-content-schema.md §6` |
| `useChatStore` | `src/store/chat-store.ts` | `spec-socratic-tutor.md §3` |
| `useTelemetryStore` | `src/store/telemetry-store.ts` | `spec-telemetry.md` (Chunk 3) |
