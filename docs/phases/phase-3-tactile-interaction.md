# Phase 3 — Tactile Interaction & Stylus Layer

## Status: ~75% Complete

## Overview
Delivers the three primary tactile interactions that define Savant's notebook
metaphor: pressure-sensitive freehand ink, click-to-place typed annotations, and
(new in Sprint 3.3) the highlight/annotation tool that seeds the Smart Annotation
engine. All drawing tools share a coordinate system that is pinned to the
constellation canvas (not the screen), so they remain accurate through pan/zoom.

---

## Sprint 3.1 — Pressure-Sensitive Ink  ✅ DONE

### What was built
`src/components/canvas/InkLayer.tsx` — full-screen SVG overlay at z-30:

**Drawing mechanics:**
- `onPointerDown` → `beginStroke(cx, cy, pressure)` — first point
- `onPointerMove` (when `activePoints` is non-empty) → `extendStroke(cx, cy, pressure)`
- `onPointerUp/Leave` → `commitStroke()` — final SVG path rendered and persisted in store
- Touch events prevented via `touch-action: none` on the SVG

**Coordinate conversion:**
```ts
// screen-space pointer position → canvas-space
const cx = (e.clientX - rfContainerOrigin.x - viewport.x) / viewport.zoom;
const cy = (e.clientY - rfContainerOrigin.y - viewport.y) / viewport.zoom;
```

**perfect-freehand config:**
```ts
{
  size: 3,
  thinning: 0.5,
  smoothing: 0.6,
  streamline: 0.5,
  simulatePressure: false  // uses real pointer pressure where available
}
```

**Rendering:**
- In-progress stroke: `getSvgPathFromStroke(getStroke(activePoints, opts))`
- Committed strokes: transform back to screen-space via `viewport.zoom`, `viewport.x`, `viewport.y`
- SVG path filter on committed strokes: `drop-shadow(0 0 2px rgba(255,255,255,0.45)) drop-shadow(0 0 6px rgba(255,255,255,0.15))`

**Eraser mode:**
- When `activeTool === "eraser"`, pointer events call `eraseNear(cx, cy, 20/viewport.zoom)`
- Erase radius scales inversely with zoom so the eraser covers the same visual area
  regardless of zoom level

**Store interface** (`src/store/canvas-store.ts`):
```ts
strokes: InkStroke[]                          // committed strokes
activePoints: [number, number, number][]      // in-progress point buffer
beginStroke(x, y, pressure): void
extendStroke(x, y, pressure): void
commitStroke(): void
eraseNear(x, y, radius): void
clearStrokes(): void
```

**Type:**
```ts
type InkStroke = { id: string; points: [number, number, number][] }
```

### Key files
- `src/components/canvas/InkLayer.tsx`
- `src/store/canvas-store.ts`

### Verification
- Draw a stroke, pan away, pan back — stroke stays pinned to canvas coordinates
- Draw at different zoom levels — stroke weight appears consistent in canvas-space
- Eraser removes strokes it passes over; radius appears constant at all zoom levels
- Switching from Pen to Select while mid-stroke commits the partial stroke cleanly

---

## Sprint 3.2 — Typed Text Annotations  ✅ DONE

### What was built
`src/components/canvas/TextNoteLayer.tsx` — screen-space overlay at z-25 for
click-to-place text notes:

**Interaction flow:**
1. When `activeTool === "text"`, clicking anywhere on the canvas calls `addNote(x, y)`,
   which creates a `GlobalTextNote { id, x, y, content: "", isEditing: true }`
2. A `<textarea>` is absolutely positioned at `(x, y)` — the position is in
   screen-space (relative to the viewport, not canvas-space)
3. Auto-grow: textarea height is driven by `scrollHeight` on input
4. `onBlur`: if `content.trim() === ""` the note is deleted; otherwise `finishNote(id)`
5. `onKeyDown (Escape)`: deletes the note if empty
6. Double-clicking an existing `GlobalTextNote` calls `editNote(id)` to re-enter edit mode

**Typography:**
- Font: `Courier New`, 13px
- Color: `rgba(255,255,255,0.82)`
- No border, no background, transparent textarea
- Cursor blink: `cursor-blink` CSS animation

**Store interface** (`src/store/canvas-store.ts`):
```ts
textNotes: GlobalTextNote[]
addNote(x, y): string          // returns new note id
updateNote(id, content): void
finishNote(id): void
editNote(id): void
deleteNote(id): void
```

**Type:**
```ts
type GlobalTextNote = { id: string; x: number; y: number; content: string; isEditing: boolean }
```

### Known limitation
Text notes are stored in screen-space. If the user places a note and then pans the
canvas, the note stays at the original screen position rather than moving with the
canvas. This is acceptable for a "margin note" metaphor (notes are fixed to the
viewport margin), but inconsistent with ink strokes which are canvas-space.

Whether to convert text notes to canvas-space is a design decision to be made
before Phase 6 (persistence). If canvas-space: use the same coordinate conversion
formula as InkLayer. If screen-space: document this explicitly as intentional.

### Key files
- `src/components/canvas/TextNoteLayer.tsx`
- `src/store/canvas-store.ts`

### Verification
- Click in Text mode; textarea appears at click position
- Type, click elsewhere; note is committed and visible as static text
- Double-click note; textarea re-opens with existing content
- Click in Text mode and immediately blur with empty content; note disappears

---

## Sprint 3.3 — Highlight Tool & Stroke Completion Hook  ✅ DONE

### Context
This sprint is the first half of the **Smart Annotation** pipeline. It adds a
fifth canvas tool — the Highlighter — and exposes a `onStrokeCommit` callback
system so the Smart Annotation engine (Phase 5, Sprint 5.3) can inspect completed
strokes and decide whether to trigger an AI annotation.

### Tasks

#### 3.3.1 Highlighter tool
- [ ] Add `"highlight"` to the `CanvasTool` union type in `src/types/index.ts`:
  ```ts
  type CanvasTool = "select" | "pen" | "eraser" | "text" | "highlight"
  ```
- [ ] Add Highlight button to `CanvasToolbar.tsx`:
  - Icon: `Highlighter` (from `lucide-react`)
  - Keyboard shortcut: `H`
  - Visual: `bg-white/5` at rest, `bg-white/10` when active
  - Position: between Eraser and Text in the toolbar
- [ ] In `InkLayer.tsx`, detect `activeTool === "highlight"` and use a different
  perfect-freehand config:
  ```ts
  const highlightOpts = {
    size: 18,           // wide brush
    thinning: 0.0,      // flat width (no pressure taper)
    smoothing: 0.8,
    streamline: 0.4,
    simulatePressure: false,
  }
  ```
- [ ] Render highlight strokes as a separate SVG layer at opacity 0.22, using
  `mix-blend-mode: screen` so the underlying text remains legible
- [ ] Store highlight strokes separately in canvas-store:
  ```ts
  type HighlightStroke = { id: string; points: [number, number, number][]; opacity: number }
  highlightStrokes: HighlightStroke[]
  beginHighlight(x, y, pressure): void
  extendHighlight(x, y, pressure): void
  commitHighlight(): void
  ```

#### 3.3.2 Stroke completion hook
- [ ] Add `onStrokeCommit` callback field to canvas-store:
  ```ts
  onStrokeCommit?: (stroke: InkStroke) => void
  setStrokeCommitHandler(fn: (stroke: InkStroke) => void): void
  clearStrokeCommitHandler(): void
  ```
- [ ] Call `onStrokeCommit(stroke)` inside `commitStroke()` in the store, after
  the stroke is appended to `strokes[]`
- [ ] In `LessonView.tsx`, on mount call `setStrokeCommitHandler` with a handler
  that passes the stroke to the Smart Annotation engine (stub this as a
  `console.log` until Sprint 5.3 is built)
- [ ] On `LessonView` unmount, call `clearStrokeCommitHandler()`

#### 3.3.3 Highlight-to-text region hit-testing (stub)
- [ ] Add a `getHighlightBoundingBox(stroke: HighlightStroke): DOMRect` utility
  to `src/lib/utils.ts`
  - Converts canvas-space stroke bounding box to screen-space DOMRect using
    current viewport transform
  - This bounding box will be used in Sprint 5.3 to find which text blocks
    are covered by the highlight

### Acceptance criteria
- Pressing `H` or clicking the Highlighter button switches to highlight mode
- Drawing a highlight stroke in a lesson renders as a wide, semi-transparent band
- Normal ink strokes are unaffected by the new tool
- `onStrokeCommit` fires after every completed pen stroke (not highlight) and
  receives the full `InkStroke` object with canvas-space coordinates
- `getHighlightBoundingBox` returns a valid DOMRect when given a stroke with
  at least 2 points

### Key files (to modify)
- `src/types/index.ts` — add `"highlight"` to `CanvasTool`
- `src/store/canvas-store.ts` — `highlightStrokes`, commit hook
- `src/components/canvas/CanvasToolbar.tsx` — Highlighter button
- `src/components/canvas/InkLayer.tsx` — highlight rendering path
- `src/components/lesson/LessonView.tsx` — register commit handler
- `src/lib/utils.ts` — `getHighlightBoundingBox`

---

## Completion Criteria for Phase 3

- [ ] Pen tool draws pressure-sensitive strokes that stay pinned to canvas coordinates
- [ ] Eraser removes strokes with radius that scales correctly with zoom
- [ ] Text tool allows placing, editing, and deleting typed annotations
- [ ] Highlighter tool draws wide semi-transparent bands on lesson content
- [ ] Stroke completion hook fires after every committed ink stroke
- [ ] `getHighlightBoundingBox` utility returns correct DOMRect in canvas-space
- [ ] All tools respond to keyboard shortcuts V/P/E/H/T
- [ ] `npm run build` with no type errors

---

## Dependencies
- Requires: Phase 1 (canvas layer model, viewport store)
- Blocks: Phase 5 Sprint 5.3 (Smart Annotation engine needs the stroke hook)
