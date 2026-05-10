# Phase 5 — Socratic Tutor & Knowledge Constellation

## Status: ~65% Complete

## Overview
Delivers the AI layer of Savant: the Socratic chat interface, streaming marginalia
annotations, text-selection-to-question flow, the graph engine that gates concept
progression, and (new in Sprint 5.3) the Smart Stylus Annotation Engine which uses
highlight strokes to generate contextual marginalia automatically.

---

## Sprint 5.1 — Socratic Chat Interface  ✅ DONE

### What was built

#### `/api/chat` edge route (`src/app/api/chat/route.ts`)
```ts
export const runtime = "edge";
// Primary: Anthropic claude-sonnet-4-20250514
// Fallback: Google gemini-2.0-flash
// maxOutputTokens: 300, temperature: 0.7
// Returns: result.toTextStreamResponse()
```

#### `src/lib/socratic-prompt.ts`
- `SOCRATIC_BASE_PROMPT` — system persona: never gives the answer directly,
  asks 1 guiding question, 2–3 sentences max, Socratic dialogue style
- `buildSocraticSystemPrompt(ctx: LessonContext): string`
  — injects `conceptTitle`, `blockType`, `blockPrompt`, `slideIndex`, `totalSlides`
  into the base prompt for context-aware responses
- `formatBlockType(type: LessonBlockType): string` — human-readable type names

#### `src/store/chat-store.ts`
```ts
isOpen: boolean
isMinimized: boolean
messages: ChatMessage[]             // { role, content, id }
isStreaming: boolean
marginaliaEntries: MarginaliaEntry[]

openChat(), closeChat(), toggleChat(), minimizeChat()
addMessage(role, content): void
updateLastAssistant(delta: string): void    // appends streaming chunk
setStreaming(v: boolean): void
triggerFromFailure(blockId: string): void   // auto-opens chat after 2 wrong answers
resetChat(): void
addMarginaliaEntry(anchorY: number, selectedText: string): string  // returns id
updateMarginalia(id: string, delta: string): void
finishMarginalia(id: string): void
removeMarginalia(id: string): void
```

**`MarginaliaEntry` type:**
```ts
type MarginaliaEntry = {
  id: string;
  anchorY: number;       // screen-space Y for connector line position
  selectedText: string;  // the text that was selected
  content: string;       // streaming AI response
  isStreaming: boolean;
}
```

#### `src/components/lesson/SocraticChat.tsx`
- Floating overlay, bottom-right, collapsible
- Manual trigger: user types a question and submits
- Auto-trigger: `triggerFromFailure()` is called by `LessonView` after 2+ failed
  attempts on any interactive block
- Context sent with every request: `buildSocraticSystemPrompt` output +
  `buildLessonContext()` (constructs a string summary of current lesson state)
- Streaming: `fetch("/api/chat", { body: ... })` then `response.body.getReader()`,
  calling `updateLastAssistant(chunk)` per chunk

### Key files
- `src/app/api/chat/route.ts`
- `src/lib/socratic-prompt.ts`
- `src/store/chat-store.ts`
- `src/components/lesson/SocraticChat.tsx`

### Verification
- Open a lesson, fail an interactive block twice → chat opens automatically
- Type a question → response streams in with visible word-by-word appearance
- Response never gives the answer — always guides with a question
- Close and reopen chat; conversation history is preserved for the session

---

## Sprint 5.2 — Marginalia & Selection Trigger  ✅ DONE

### What was built

#### `src/components/lesson/SelectionTrigger.tsx`
- Listens to `document.selectionchange` events
- On valid selection (not empty, within `containerRef`):
  - Calls `window.getSelection().getRangeAt(0).getBoundingClientRect()` for position
  - Computes `anchorY` relative to `containerRef`
  - Shows a small "Ask Savant" tooltip pill floating above the selection
- On tooltip click:
  - Calls `addMarginaliaEntry(anchorY, selectedText)` → creates entry, gets `id`
  - POSTs to `/api/chat` with the selected text as context
  - Streams the response via `updateMarginalia(id, delta)` / `finishMarginalia(id)`

#### `src/components/lesson/MarginaliaAnnotations.tsx`
- Absolutely positioned overlay in the right margin (`right: 0, width: 240px`)
- Renders each `MarginaliaEntry` as a small card:
  - Dotted horizontal connector line from `anchorY` to the card
  - Selected text quoted at top in italic Courier New
  - Streaming AI response below; "thinking…" placeholder when `isStreaming && content === ""`
- Entries sorted by `anchorY`
- Entry persists until the user dismisses it (X button calls `removeMarginalia(id)`)

### Key files
- `src/components/lesson/SelectionTrigger.tsx`
- `src/components/lesson/MarginaliaAnnotations.tsx`

### Verification
- Select text in a lesson slide → "Ask Savant" tooltip appears above selection
- Click tooltip → marginalia entry appears in right margin at correct vertical position
- AI response streams in word by word
- Multiple selections create multiple marginalia entries at different Y positions
- Clicking X on a card removes it

---

## Sprint 5.3 — Smart Stylus Annotation Engine  ✅ DONE

### Context
This is the central feature of the Smart Annotation system. When a student
draws a highlight stroke (Phase 3, Sprint 3.3) over lesson text, the engine:
1. Converts the stroke bounding box to screen space
2. Queries `lesson-store.queryByRect()` to find covered text blocks (Phase 4, Sprint 4.4)
3. Sends the covered text to `/api/chat` with a special `highlight` context type
4. Streams the response into a `MarginaliaEntry` at the vertical midpoint of the highlight

This creates the experience: *"underline a sentence → a margin annotation appears"*.

### Prerequisites
- Phase 3 Sprint 3.3 complete (Highlighter tool + `onStrokeCommit` hook)
- Phase 4 Sprint 4.4 complete (`spatialIndex`, `queryByRect` in lesson-store)

### Tasks

#### 5.3.1 Annotation engine module
- [ ] Create `src/lib/smart-annotation.ts`:
  ```ts
  interface AnnotationContext {
    coveredText: string;         // all text blocks covered by the stroke, joined
    conceptTitle: string;        // from graph-store
    slideIndex: number;          // from lesson-store
  }

  function buildAnnotationPrompt(ctx: AnnotationContext): string
  // Returns a system prompt that instructs the AI to generate a concise
  // 1–2 sentence marginalia comment on the highlighted passage.
  // Style: "like a professor's margin note — insightful, not a summary"
  // Constraints: no hedging, no "I", start with the key insight
  ```

#### 5.3.2 Stroke-to-text pipeline in LessonView
- [ ] In `LessonView.tsx`, replace the stub `console.log` in the `onStrokeCommit`
  handler with actual logic:
  ```ts
  // 1. Convert stroke to DOMRect via getHighlightBoundingBox() from utils
  const rect = getHighlightBoundingBox(stroke);
  // 2. Find covered text blocks
  const coveredBlocks = queryByRect(rect);
  if (coveredBlocks.length === 0) return;  // stroke not over any text
  // 3. Create marginalia entry
  const coveredText = coveredBlocks.map(b => b.text).join(" ");
  const anchorY = rect.top + rect.height / 2;
  const marginaliaId = addMarginaliaEntry(anchorY, coveredText);
  // 4. Stream annotation
  const prompt = buildAnnotationPrompt({ coveredText, conceptTitle, slideIndex });
  await streamToMarginalia(marginaliaId, prompt);
  ```
- [ ] Create `streamToMarginalia(id: string, prompt: string): Promise<void>` helper
  in `src/lib/smart-annotation.ts`:
  - POSTs to `/api/chat` with `{ messages: [...], systemPrompt: prompt }`
  - Reads stream chunks, calls `updateMarginalia(id, delta)` per chunk
  - Calls `finishMarginalia(id)` when done

#### 5.3.3 Differentiated highlight vs. ink behaviour
- [ ] Only the `"highlight"` tool triggers smart annotation; regular pen strokes
  committed via `onStrokeCommit` should NOT trigger annotation
- [ ] Add a `tool: CanvasTool` field to `InkStroke`:
  ```ts
  type InkStroke = { id: string; points: [number, number, number][]; tool: CanvasTool }
  ```
- [ ] In `LessonView.tsx` commit handler:
  ```ts
  if (stroke.tool !== "highlight") return;
  ```

#### 5.3.4 API route extension for highlight context
- [ ] Extend `src/app/api/chat/route.ts` to accept an optional `contextType` field
  in the request body:
  - `contextType: "socratic"` — uses `buildSocraticSystemPrompt` (default, existing)
  - `contextType: "highlight_annotation"` — uses `buildAnnotationPrompt`
  - This avoids a second API endpoint while keeping system prompts distinct

#### 5.3.5 Visual polish
- [ ] When a highlight triggers an annotation, pulse the highlight stroke briefly
  (Framer Motion `scale: [1, 1.02, 1]` on the SVG path) to confirm receipt
- [ ] Marginalia entry triggered by a highlight should include a small `Highlighter`
  icon in the header instead of quotation marks (to distinguish from text-selection
  marginalia)

### Acceptance criteria
- Drawing a highlight stroke over lesson text produces a marginalia annotation
  at the midpoint of the stroke's Y range
- The annotation content is relevant to the highlighted passage
- Highlighting empty space (not over any text) produces no annotation
- Regular pen strokes (tool: `"pen"`) never trigger annotations
- Text-selection marginalia still works independently (no regression)
- Pulse animation appears on the SVG highlight path for 600ms after annotation starts

### Key files (to create/modify)
- `src/lib/smart-annotation.ts` — new module
- `src/components/lesson/LessonView.tsx` — wire `onStrokeCommit` handler
- `src/app/api/chat/route.ts` — `contextType` dispatch
- `src/types/index.ts` — `InkStroke.tool` field
- `src/store/canvas-store.ts` — propagate `tool` field on stroke commit

---

## Sprint 5.4 — Knowledge Graph Engine  ✅ DONE

### What was built

#### `src/components/graph/KnowledgeGraph.tsx`
- 15 custom `ConceptNode` nodes from seed data, positioned in canvas-space
- Prerequisite edges rendered as React Flow edges with dashed style
- Custom `ConceptNode.tsx` with three visual states:
  - **locked**: dashed circle, `rgba(255,255,255,0.3)`, no pointer cursor
  - **unlocked**: solid ring, white, hover glow
  - **mastered**: filled disc with pulse ring + glow + mastery-burst animation
- Click on locked node → `selectConcept(id)` → `ConceptInfoPanel` shows prerequisites
- Click on unlocked/mastered node → `openLessonModal(id)` → `LessonModal` shows available lessons

#### `src/store/graph-store.ts`
```ts
concepts: ConceptNode[]
prerequisites: ConceptPrerequisite[]
lessons: Lesson[]
progressMap: Map<string, ProgressStatus>    // "locked" | "unlocked" | "mastered"
selectedConceptId: string | null
isLessonModalOpen: boolean
recentlyMasteredId: string | null           // triggers burst animation
recentlyUnlockedIds: Set<string>            // triggers pulse animation on newly-unlocked nodes

updateProgress(conceptId: string, status: ProgressStatus): void
// — Sets progressMap entry
// — If status === "mastered": checks all concepts that depend on conceptId;
//     for each, if ALL its prerequisites are now mastered, sets that concept to "unlocked"
//     and adds its ID to recentlyUnlockedIds
// — Sets recentlyMasteredId = conceptId

clearMasteryAnimation(): void     // called by ConceptNode after animation completes
```

### Verification
- Complete Addition lesson → Addition node turns to filled disc
- Multiplication node unlocks (assuming Addition is prerequisite)
- `recentlyUnlockedIds` contains the unlocked concept IDs
- Those nodes display a pulse ring animation

---

## Sprint 5.5 — Telemetry & Productive Struggle Dashboard  ✅ DONE

### What was built

#### `src/store/telemetry-store.ts`
Tracks per-lesson session metrics:
```ts
completedSessions: LessonTelemetry[]
currentSession: PartialSession | null
currentSlideEvent: SlideEvent | null

startSession(lessonId, conceptId): void
enterSlide(slideIndex, blockId): void
recordInteraction(): void      // increments interaction counter
recordAttempt(correct: boolean): void
exitSlide(): void              // computes slide event metrics
completeSession(): void        // finalises session, pushes to completedSessions
```

**Struggle score formula (per interactive slide):**
```
timeScore       = clamp(timeOnSlide / 120_000, 0, 1) * 0.3
attemptScore    = clamp((attempts - 1) / 4, 0, 1) * 0.3
interactionScore = clamp(interactions / 20, 0, 1) * 0.2
successBonus    = correct ? 0.2 : 0
struggleScore   = timeScore + attemptScore + interactionScore + successBonus
```

#### `src/app/dashboard/page.tsx`
- "Productive Struggle Report" — reads `getAllMetrics()` from telemetry-store
- Displays: sessions completed, average struggle score, concept breakdown table
- Works with live data from the current browser session

### Key files
- `src/store/telemetry-store.ts`
- `src/app/dashboard/page.tsx`

---

## Completion Criteria for Phase 5

- [ ] Socratic chat streams responses from `/api/chat` with correct system prompt
- [ ] Auto-trigger works after 2 failed attempts on any interactive block
- [ ] Text selection in a lesson produces a marginalia annotation in the right margin
- [ ] Highlight strokes trigger Smart Annotation engine (Sprint 5.3)
- [ ] Smart annotations only fire for highlight tool strokes, not pen strokes
- [ ] Knowledge graph auto-unlocks dependents when a concept is mastered
- [ ] Mastery burst and unlock pulse animations play correctly
- [ ] Telemetry records sessions and computes struggle scores
- [ ] Dashboard displays current session metrics
- [ ] `npm run build` with no type errors

---

## Dependencies
- Requires: Phase 3 Sprint 3.3 (highlight tool + stroke hook) for Sprint 5.3
- Requires: Phase 4 Sprint 4.4 (spatial index) for Sprint 5.3
- Blocks: Phase 6 (auth needed to persist chat history and annotations)
