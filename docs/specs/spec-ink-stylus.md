# Spec — Ink & Stylus Layer

## Purpose
Defines the complete specification for pressure-sensitive freehand ink drawing,
the eraser, the highlight tool, and the stroke completion hook. This spec governs
`InkLayer.tsx`, `NotebookCanvas.tsx`, the stroke-related actions in `canvas-store.ts`,
and the `HighlightStroke` rendering path.

---

## 1. Stroke Types

There are two distinct stroke types in the system:

### 1.1 Ink Stroke
A freehand pen stroke using the `"pen"` tool. Rendered as a thin, calligraphic
SVG path with pressure taper. Stored in canvas-space coordinates.

```ts
type InkStroke = {
  id: string;                          // nanoid or crypto.randomUUID()
  points: [number, number, number][];  // [canvasX, canvasY, pressure]
  tool: "pen";                         // added in Phase 3 Sprint 3.3
}
```

### 1.2 Highlight Stroke
A wide, flat stroke using the `"highlight"` tool. Rendered as a semi-transparent
band at `opacity: 0.22` using `mix-blend-mode: screen`. Stored in canvas-space.

```ts
type HighlightStroke = {
  id: string;
  points: [number, number, number][];  // [canvasX, canvasY, pressure]
  tool: "highlight";
  opacity: number;                     // default: 0.22
}
```

Both types use the same coordinate format and storage in `canvas-store.ts`,
but are rendered in separate SVG layers and validated separately.

---

## 2. perfect-freehand Configuration

Library: `perfect-freehand` v1.2.3

### Pen tool options
```ts
const penOpts = {
  size: 3,
  thinning: 0.5,          // pressure-driven width variation
  smoothing: 0.6,         // path smoothing (higher = smoother)
  streamline: 0.5,        // lookahead smoothing (reduces jitter)
  simulatePressure: false, // use real pointer pressure when available
  last: true,             // snap the end of the stroke
}
```

### Highlight tool options
```ts
const highlightOpts = {
  size: 18,               // wide flat band
  thinning: 0.0,          // no pressure taper — constant width
  smoothing: 0.8,
  streamline: 0.4,
  simulatePressure: false,
  last: true,
}
```

### Usage
```ts
import { getStroke } from 'perfect-freehand'
import { getSvgPathFromStroke } from '@/lib/utils'  // (utility to be extracted)

const penPath = getSvgPathFromStroke(getStroke(stroke.points, penOpts))
```

`getSvgPathFromStroke` converts the array of outline points from `getStroke()`
into an SVG path `d` string. The implementation is a standard reduction into
`M`, `L`, and `Q` (quadratic bezier) commands. It must be exported from
`src/lib/utils.ts`.

---

## 3. InkLayer Architecture

File: `src/components/canvas/InkLayer.tsx`

### Rendering layers
The SVG is split into two `<g>` elements to enable memoization:

```tsx
<svg style={{ position: 'fixed', inset: 0, zIndex: 30, pointerEvents: ... }}>
  {/* Layer 1: committed strokes — memoized, only updates when strokes[] changes */}
  <g id="committed-ink">
    {committedPaths.map(({ id, d }) => (
      <path key={id} d={d} fill="white" filter="url(#stroke-glow)" />
    ))}
  </g>

  {/* Layer 2: committed highlight strokes */}
  <g id="committed-highlights" style={{ mixBlendMode: 'screen', opacity: 0.22 }}>
    {committedHighlightPaths.map(({ id, d }) => (
      <path key={id} d={d} fill="white" />
    ))}
  </g>

  {/* Layer 3: active in-progress stroke — updates on every pointer move */}
  <g id="active-stroke">
    {activePoints.length > 0 && (
      <path d={activePath} fill="white" opacity={activeTool === 'highlight' ? 0.22 : 1} />
    )}
  </g>
</svg>
```

### Stroke SVG filter
Committed ink strokes use an SVG `filter` for the glow effect:
```html
<defs>
  <filter id="stroke-glow">
    <feDropShadow dx="0" dy="0" stdDeviation="1" flood-color="rgba(255,255,255,0.45)" />
    <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="rgba(255,255,255,0.15)" />
  </filter>
</defs>
```
This is equivalent to CSS `drop-shadow(0 0 2px rgba(255,255,255,0.45)) drop-shadow(0 0 6px rgba(255,255,255,0.15))`.

Highlight strokes do NOT use the glow filter — they render flat at `opacity: 0.22`.

### Pointer events
- `touch-action: none` on the SVG element (prevents browser scroll/zoom on touch)
- `onPointerDown`: always calls `setPointerCapture(e.pointerId)` to ensure
  `onPointerUp` fires even if the pointer leaves the element
- `onPointerUp` / `onPointerCancel` / `onPointerLeave`: both call the commit action

---

## 4. Stroke Lifecycle

### Drawing a stroke
```
onPointerDown  → beginStroke(cx, cy, pressure) OR beginHighlight(cx, cy, pressure)
onPointerMove  → extendStroke / extendHighlight   [only when activePoints.length > 0]
onPointerUp    → commitStroke() / commitHighlight()
```

### Store actions
```ts
// --- Ink strokes ---
beginStroke(x, y, pressure): void
  // Creates new activePoints array with first point [x, y, pressure]

extendStroke(x, y, pressure): void
  // Appends [x, y, pressure] to activePoints
  // Guard: if activePoints.length === 0, no-op (prevents orphaned extends)

commitStroke(): void
  // Creates InkStroke { id: nanoid(), points: [...activePoints], tool: "pen" }
  // Appends to strokes[]
  // Clears activePoints to []
  // Calls onStrokeCommit(stroke) if handler is registered

// --- Highlight strokes ---
beginHighlight(x, y, pressure): void
extendHighlight(x, y, pressure): void
commitHighlight(): void
  // Same pattern as ink, creates HighlightStroke { ..., tool: "highlight" }
  // Does NOT call onStrokeCommit — highlights use a separate pipeline
```

---

## 5. Eraser

The eraser operates on ink strokes only (highlight strokes are not erasable via
the eraser tool — use Ctrl+Z / undo, which is out of scope for the current spec).

### Hit testing
```ts
eraseNear(cx: number, cy: number, radius: number): void
```
- Iterates over `strokes[]`
- For each stroke, checks if any point `[px, py, _]` satisfies:
  `Math.hypot(px - cx, py - cy) <= radius`
- If any point is within radius, removes the entire stroke (no partial erasing)
- Radius is passed in canvas-space units

### Eraser radius scaling
In `InkLayer.tsx`, when computing the eraser radius from a pointer event:
```ts
const eraserRadius = 20 / viewport.zoom
eraseNear(cx, cy, eraserRadius)
```
`20 / viewport.zoom` ensures the eraser covers a consistent **screen-space** area
(20px radius) regardless of zoom level. At zoom 0.5, this erases a 40px canvas
radius; at zoom 2.0, it erases a 10px canvas radius.

---

## 6. Stroke Completion Hook

The completion hook enables the Smart Annotation engine (Phase 5 Sprint 5.3)
to inspect completed ink strokes without coupling InkLayer to the annotation system.

### Registration
```ts
// In LessonView.tsx on mount:
useCanvasStore.getState().setStrokeCommitHandler((stroke: InkStroke) => {
  if (stroke.tool !== 'pen') return  // only handle pen strokes here; highlights use separate path
  // ... forward to Smart Annotation engine
})

// On unmount:
useCanvasStore.getState().clearStrokeCommitHandler()
```

### Store contract
```ts
onStrokeCommit?: (stroke: InkStroke) => void
setStrokeCommitHandler(fn: (stroke: InkStroke) => void): void
clearStrokeCommitHandler(): void
```

The handler is called synchronously inside `commitStroke()`, after the stroke
has been appended to `strokes[]`. The handler must not mutate the stroke object.

---

## 7. Highlight Bounding Box

Utility function required for Smart Annotation (Phase 5 Sprint 5.3):

```ts
// In src/lib/utils.ts
function getHighlightBoundingBox(
  stroke: HighlightStroke,
  viewport: { x: number; y: number; zoom: number },
  rfContainerOrigin: { x: number; y: number }
): DOMRect
```

**Algorithm:**
1. Find the min/max of canvas-space X and Y across all stroke points
2. Convert corners to screen-space using `toScreenCoords`
3. Add a padding of `highlightOpts.size / 2 * viewport.zoom` pixels (half the brush width in screen-space)
4. Return as `new DOMRect(left, top, width, height)`

---

## 8. Lesson Canvas (NotebookCanvas)

File: `src/components/lesson/NotebookCanvas.tsx`

The lesson canvas is a separate, simpler ink system for per-lesson annotations.
It does not use the global `canvas-store` — it manages its own internal state.

### Imperative handle
```ts
interface NotebookCanvasHandle {
  getState(): { strokes: InkStroke[]; textNotes: LocalTextNote[] }
  loadState(state: { strokes: InkStroke[]; textNotes: LocalTextNote[] }): void
  clear(): void
}
```
Exposed via `forwardRef` so `LessonView.tsx` can call
`notebookCanvasRef.current.getState()` to serialise the canvas for persistence.

### Coordinate system
Unlike the global `InkLayer` (which uses canvas-space), the lesson canvas stores
strokes relative to the **lesson content column** (`contentRef`):

```ts
const rect = contentRef.current.getBoundingClientRect()
const relX = e.clientX - rect.left
const relY = e.clientY - rect.top + contentRef.current.scrollTop
```

Adding `scrollTop` ensures that strokes placed on a scrolled page stay
visually pinned to the content when the user scrolls back.

### Configuration
Uses the same `penOpts` as the global InkLayer. Does not support the highlight
tool or the stroke completion hook (those are only needed on the constellation canvas).

---

## 9. Text Tool (Typed Annotations)

File: `src/components/canvas/TextNoteLayer.tsx`

Text notes are typed annotations placed anywhere on the screen. They are
**screen-space** elements — they do not pan/zoom with the canvas.

```ts
type GlobalTextNote = {
  id: string
  x: number        // screen-space X (clientX at click)
  y: number        // screen-space Y (clientY at click)
  content: string
  isEditing: boolean
}
```

### Interaction rules
1. Only active when `activeTool === "text"`
2. Click creates a new note at click position with `isEditing: true`
3. `<textarea>` is absolutely positioned at `(x, y)`, transparent background,
   no border, `font-family: 'Courier New'`, `font-size: 13px`
4. Auto-grows: height driven by `textarea.scrollHeight` on `input` event
5. `onBlur`: if `content.trim() === ""`, delete the note; else `finishNote(id)`
6. `Escape` key: same as blur
7. Double-clicking an existing note calls `editNote(id)`

### Design decision on coordinate space
Text notes use screen-space intentionally — they behave like sticky notes on
the viewport margin, not on the infinite canvas. This is acceptable for the
current metaphor (students annotate in the margins) but means notes do not
move when the student pans the graph. If canvas-space behaviour is desired
in a future iteration, use `toCanvasCoords` on placement and `toScreenCoords`
on render (identical pattern to InkLayer).

---

## 10. Persistence Contract

All stroke and text note data that needs to persist to Supabase uses the
canonical JSON serialisation format defined here. See `spec-canvas-persistence.md`
for the API routes and storage schema.

### InkStroke serialisation
```json
{
  "id": "abc123",
  "points": [[100.5, 200.3, 0.8], [102.1, 205.0, 0.7]],
  "tool": "pen"
}
```

### HighlightStroke serialisation
```json
{
  "id": "def456",
  "points": [[150.0, 300.0, 0.5], [200.0, 300.0, 0.5]],
  "tool": "highlight",
  "opacity": 0.22
}
```

### GlobalTextNote serialisation
```json
{
  "id": "ghi789",
  "x": 450,
  "y": 320,
  "content": "This connects to the distributive property",
  "isEditing": false
}
```

These formats are stored verbatim in the `strokes JSONB`, `text_notes JSONB`
columns of the `canvas_states` table.
