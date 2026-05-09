# Spec — Canvas Engine

## Purpose
Defines the architecture of the infinite canvas: the layer stacking model,
coordinate systems, viewport state, pan/zoom mechanics, and the rules for
how all canvas layers interact. This spec governs `InfiniteCanvas.tsx`,
`canvas-store.ts`, `KnowledgeGraph.tsx`, and `InkLayer.tsx`.

---

## 1. Canvas Architecture Overview

Savant has two distinct canvas contexts:

### 1.1 Constellation Canvas
The primary infinite canvas at `src/app/page.tsx`. It is an infinite,
pannable, zoomable surface showing the Knowledge Constellation graph.

**Managed by:** React Flow (`@xyflow/react v12`) inside `KnowledgeGraph.tsx`

**Coordinate system:**
- **Canvas-space**: the infinite coordinate system where nodes have fixed positions
  (e.g., `x: 100, y: 200`). These never change regardless of pan or zoom.
- **Screen-space**: pixel coordinates relative to the browser viewport
  (e.g., `clientX, clientY` from mouse events).
- **Conversion formula:**
  ```ts
  canvasX = (screenX - rfContainerOrigin.x - viewport.x) / viewport.zoom
  canvasY = (screenY - rfContainerOrigin.y - viewport.y) / viewport.zoom
  ```
  Where `rfContainerOrigin` is the screen-space top-left corner of the
  React Flow `<div>` container (measured via `getBoundingClientRect()`).

### 1.2 Lesson Canvas
A per-lesson drawing overlay inside `LessonView.tsx`. It does not pan or zoom —
it is a fixed overlay that covers the visible lesson content area.

**Managed by:** `NotebookCanvas.tsx` with its own internal stroke state.

**Coordinate system:** Screen-space relative to the lesson content column
(`contentRef.current.getBoundingClientRect()`). Strokes must be stored relative
to the content column, not the viewport, so they remain pinned when the user scrolls.

---

## 2. Layer Model

The constellation canvas is composed of exactly four layers rendered inside
`InfiniteCanvas.tsx`, stacked in this order (bottom to top):

```
┌─────────────────────────────────────────────────────────┐
│ z-40  CanvasToolbar   (floating pill, pointer-events: auto)│
├─────────────────────────────────────────────────────────┤
│ z-30  InkLayer        (SVG overlay, pointer-events: pen/eraser/highlight only) │
├─────────────────────────────────────────────────────────┤
│ z-25  TextNoteLayer   (DOM overlay, pointer-events: text only) │
├─────────────────────────────────────────────────────────┤
│ z-auto children       (KnowledgeGraph, pointer-events: select only) │
└─────────────────────────────────────────────────────────┘
```

**Pointer event routing:**
Each layer sets `pointer-events: none` when its tool is not active, so events
fall through to the layer below:

| Active tool | InkLayer p-e | TextNoteLayer p-e | Graph p-e |
|-------------|--------------|-------------------|-----------|
| `select`    | none         | none              | auto      |
| `pen`       | auto         | none              | none      |
| `eraser`    | auto         | none              | none      |
| `highlight` | auto         | none              | none      |
| `text`      | none         | auto              | none      |

`CanvasToolbar` always receives pointer events (it is the topmost element and
positioned outside the drawing area at the bottom edge).

---

## 3. Viewport State

Viewport state is the single source of truth for the current pan and zoom of
the constellation canvas. It lives in `useCanvasStore`.

### State shape
```ts
viewport: {
  x: number;    // horizontal pan offset in pixels
  y: number;    // vertical pan offset in pixels
  zoom: number; // zoom level, range [0.3, 2.0]
}
rfContainerOrigin: {
  x: number;    // screen-space X of the React Flow container top-left
  y: number;    // screen-space Y of the React Flow container top-left
}
```

### Synchronisation
React Flow is the authoritative source. The store is a read-only mirror:

1. `KnowledgeGraph.tsx` passes `onInit` to the React Flow `<ReactFlow>` component.
   On init, it reads the initial viewport via `rfInstance.getViewport()` and
   calls `useCanvasStore.setViewport(x, y, zoom)`.
2. `KnowledgeGraph.tsx` passes `onMove` to `<ReactFlow>`. On every pan/zoom event,
   it calls `setViewport(vp.x, vp.y, vp.zoom)`. This must be throttled to one
   update per animation frame via `requestAnimationFrame` to avoid 120fps state
   updates on high-refresh displays.
3. `rfContainerOrigin` is set on mount via `containerRef.current.getBoundingClientRect()`
   and updated on `window.resize` events.

### Reading the viewport
Components that need to convert screen ↔ canvas coordinates should read from
`useCanvasStore`:
```ts
const { viewport, rfContainerOrigin } = useCanvasStore(s => ({
  viewport: s.viewport,
  rfContainerOrigin: s.rfContainerOrigin,
}))
```
Use granular selectors — never destructure the full store object in a
single `useCanvasStore(s => s)` call.

---

## 4. Pan & Zoom Mechanics

### Constellation canvas (React Flow)
- Pan: left-click drag on empty canvas space
- Zoom: scroll wheel / pinch-to-zoom
- Zoom range: `minZoom: 0.3`, `maxZoom: 2.0`
- Initial fit: `fitView` on mount with `padding: 0.3`
- Pan on drag: `panOnDrag: [0, 2]` (left mouse = 0, middle mouse = 2; right mouse reserved)

### Zoom threshold (Phase 1 Sprint 1.7 — not yet built)
When the user zooms past `LESSON_ZOOM_THRESHOLD = 1.8` while a concept node is
centred in the viewport, the system should transition into the lesson view
spatially rather than opening an overlay. This requires:
1. Detecting the centred node in `onMove`
2. Triggering the transition when `zoom > 1.8`
3. A 400ms crossfade from the graph to the lesson content

### Lesson canvas
No pan or zoom. It is a fixed overlay. If the user needs to see a different
part of the lesson, they scroll the lesson content column — the canvas overlay
scrolls with it (because strokes are relative to the content column, not the
viewport).

---

## 5. Tool State Machine

The active tool is stored in `useCanvasStore.activeTool: CanvasTool`.

```ts
type CanvasTool = "select" | "pen" | "eraser" | "text" | "highlight"
```

### Tool transitions
Tools can switch at any time. If a stroke is in progress (`activePoints.length > 0`)
when the tool switches, the partial stroke is committed immediately before switching.

### Keyboard shortcuts
Handled by a global `keydown` listener in `CanvasToolbar.tsx`.
The listener must check `e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement`
and return early if the focus is in a text input (so typing text notes doesn't
accidentally switch tools).

| Key | Tool |
|-----|------|
| `V` | select |
| `P` | pen |
| `E` | eraser |
| `H` | highlight |
| `T` | text |

---

## 6. Notebook Cover State

The notebook cover (`NotebookCover.tsx`) is managed by a boolean in canvas-store:
```ts
isCoverOpen: boolean    // true on first load
closeCover(): void      // sets isCoverOpen: false
```

`src/app/page.tsx` renders `{isCoverOpen && <NotebookCover />}` inside
`<AnimatePresence>`. The cover is at `z-50` — above all canvas layers.

When `closeCover()` is called from `NotebookCover.tsx`:
1. The Framer Motion `exit` animation runs (850ms)
2. After 900ms, `isCoverOpen` becomes `false` and the element unmounts
3. The constellation is now fully interactive

---

## 7. React Flow Configuration

The canonical `<ReactFlow>` configuration used in `KnowledgeGraph.tsx`:

```tsx
<ReactFlow
  nodes={nodes}
  edges={edges}
  nodeTypes={nodeTypes}          // { concept: ConceptNode }
  fitView
  fitViewOptions={{ padding: 0.3 }}
  minZoom={0.3}
  maxZoom={2}
  panOnDrag={[0, 2]}
  zoomOnScroll
  zoomOnPinch
  panOnScroll={false}
  selectionOnDrag={false}
  nodesDraggable={false}         // nodes are fixed in canvas-space
  nodesConnectable={false}       // no user-created edges
  elementsSelectable={false}     // selection is managed via store, not RF
  onInit={handleInit}
  onMove={handleMove}
  onNodeClick={handleNodeClick}
  proOptions={{ hideAttribution: true }}
>
  <Background variant={BackgroundVariant.Lines} gap={32} color="rgba(255,255,255,0.035)" />
</ReactFlow>
```

**Key decisions:**
- `nodesDraggable: false` — concept positions are fixed by the content designers
- `elementsSelectable: false` — we manage selection state in `graph-store`,
  not React Flow's internal selection system
- `proOptions.hideAttribution` — requires React Flow Pro license or must be removed

---

## 8. Canvas Store Interface

Full interface of `src/store/canvas-store.ts`:

```ts
interface CanvasStore {
  // Tool
  activeTool: CanvasTool
  setActiveTool(tool: CanvasTool): void

  // Ink strokes (canvas-space)
  strokes: InkStroke[]
  activePoints: [number, number, number][]   // [x, y, pressure]
  beginStroke(x: number, y: number, pressure: number): void
  extendStroke(x: number, y: number, pressure: number): void
  commitStroke(): void
  eraseNear(x: number, y: number, radius: number): void
  clearStrokes(): void
  onStrokeCommit?: (stroke: InkStroke) => void        // Phase 3 Sprint 3.3
  setStrokeCommitHandler(fn: (s: InkStroke) => void): void
  clearStrokeCommitHandler(): void

  // Highlight strokes (canvas-space, separate layer)  — Phase 3 Sprint 3.3
  highlightStrokes: HighlightStroke[]
  beginHighlight(x: number, y: number, pressure: number): void
  extendHighlight(x: number, y: number, pressure: number): void
  commitHighlight(): void

  // Text notes (screen-space)
  textNotes: GlobalTextNote[]
  addNote(x: number, y: number): string
  updateNote(id: string, content: string): void
  finishNote(id: string): void
  editNote(id: string): void
  deleteNote(id: string): void

  // Viewport (mirror of React Flow state)
  viewport: { x: number; y: number; zoom: number }
  setViewport(x: number, y: number, zoom: number): void
  rfContainerOrigin: { x: number; y: number }
  setRfContainerOrigin(x: number, y: number): void

  // Cover
  isCoverOpen: boolean
  closeCover(): void

  // Hydration (Phase 6)
  hydrateStrokes(strokes: InkStroke[]): void
  hydrateTextNotes(notes: GlobalTextNote[]): void
}
```

---

## 9. Coordinate Conversion Reference

This conversion is used in `InkLayer.tsx` and must be used identically anywhere
else that needs to convert pointer events to canvas coordinates.

```ts
// screen-space → canvas-space
function toCanvasCoords(
  screenX: number,
  screenY: number,
  viewport: { x: number; y: number; zoom: number },
  rfContainerOrigin: { x: number; y: number }
): [number, number] {
  return [
    (screenX - rfContainerOrigin.x - viewport.x) / viewport.zoom,
    (screenY - rfContainerOrigin.y - viewport.y) / viewport.zoom,
  ]
}

// canvas-space → screen-space
function toScreenCoords(
  canvasX: number,
  canvasY: number,
  viewport: { x: number; y: number; zoom: number },
  rfContainerOrigin: { x: number; y: number }
): [number, number] {
  return [
    canvasX * viewport.zoom + viewport.x + rfContainerOrigin.x,
    canvasY * viewport.zoom + viewport.y + rfContainerOrigin.y,
  ]
}
```

These helpers should be exported from `src/lib/utils.ts` to avoid duplication.

---

## 10. Performance Constraints

- The `onMove` handler in `KnowledgeGraph.tsx` must be throttled to one React
  state update per animation frame. See Phase 8 Sprint 8.2.5.
- Committed stroke SVG paths must be memoized (Phase 8 Sprint 8.2.3).
- Each canvas layer subscribes only to the store slices it needs — not the
  full store object — to avoid unnecessary re-renders (Phase 8 Sprint 8.2.2).
- `ConceptNode` must be wrapped in `React.memo` (Phase 8 Sprint 8.2.4).
