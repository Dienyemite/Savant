# Phase 1 — Canvas Foundation

## Status: ~70% Complete

## Overview
Establishes the infinite canvas architecture that every other feature is built on.
Covers the layer model, pan/zoom mechanics, notebook paper background rendering,
the drawing toolbar, and viewport state synchronisation. The constellation graph
pan/zoom is driven by React Flow; the lesson-page canvas is a separate DOM layer.

---

## Sprint 1.1 — Layer Architecture  ✅ DONE

### What was built
`src/components/canvas/InfiniteCanvas.tsx` — a thin wrapper that stacks four layers
in the correct z-order:

```
InfiniteCanvas (position: relative, full viewport)
  ├── children           z-auto   (KnowledgeGraph / lesson content)
  ├── TextNoteLayer      z-25     (free-form typed annotations)
  ├── InkLayer           z-30     (SVG freehand drawing overlay)
  └── CanvasToolbar      z-40     (floating tool palette)
```

- `InfiniteCanvas` is used in `src/app/page.tsx` wrapping `KnowledgeGraph`
- Each layer is `position: fixed` or `position: absolute` with explicit `zIndex`
- When `activeTool === "select"`, ink and text layers set `pointer-events: none`
  so click events pass through to the graph underneath

### Key files
- `src/components/canvas/InfiniteCanvas.tsx`
- `src/app/page.tsx` — mounts `<InfiniteCanvas>` as the root wrapper

### Verification
- Clicking a graph node while in Select tool opens the lesson modal
- Switching to Pen tool blocks graph interaction
- Layer z-order is confirmed via browser DevTools element inspector

---

## Sprint 1.2 — Constellation Pan & Zoom  ✅ DONE

### What was built
`src/components/graph/KnowledgeGraph.tsx` — React Flow instance providing:
- Pan: click-drag on empty canvas space
- Zoom: scroll wheel / pinch-to-zoom, range `minZoom: 0.3`, `maxZoom: 2`
- `fitView` on init with `padding: 0.3`
- `onInit` callback: reads initial viewport and writes to `useCanvasStore.setViewport()`
- `onMove` callback: keeps `useCanvasStore.viewport` in sync on every pan/zoom event
- `rfContainerOrigin` updated on mount and window resize via `getBoundingClientRect()`

### Key files
- `src/components/graph/KnowledgeGraph.tsx`
- `src/store/canvas-store.ts` — `viewport: { x, y, zoom }`, `rfContainerOrigin: { x, y }`

### Verification
- Pan the constellation; ink strokes drawn afterwards are correctly pinned to canvas
  coordinates (they do not drift relative to nodes)
- Zoom in/out; committed strokes scale correctly with the viewport transform
- `useCanvasStore.getState().viewport` reflects real-time position

---

## Sprint 1.3 — Notebook Paper Background  ✅ DONE

### What was built

**Global grain texture** (`src/app/globals.css` — `body::after`):
- SVG `feTurbulence fractalNoise`, tiled at 256×256px
- Opacity 0.042, `mix-blend-mode: screen`

**Ruled lines** (`.notebook-ruled` CSS class):
- `repeating-linear-gradient` — transparent 0–27px, then 1px at `rgba(255,255,255,0.08)` at 27–28px
- Applied to `<main>` on `src/app/page.tsx` and `src/components/lesson/LessonView.tsx`

**React Flow Background** (inside `KnowledgeGraph.tsx`):
- `<Background variant={BackgroundVariant.Lines} gap={32} color="rgba(255,255,255,0.035)" />`
- These are constellation-space ruled lines that move with pan/zoom (unlike CSS ruled lines which are fixed in screen space)

**Left margin line** (`.notebook-margin`):
- `::before` pseudo-element at `left: 72px`, 1px wide, `rgba(255,255,255,0.14)` with
  `box-shadow: 0 0 4px rgba(255,255,255,0.06)` glow

### Key files
- `src/app/globals.css`
- `src/components/graph/KnowledgeGraph.tsx`

### Verification
- Background lines are visible at all zoom levels (CSS ruled lines visible throughout)
- React Flow grid lines scale/move with the canvas on pan/zoom
- Grain texture visible as subtle noise on a pure black surface

---

## Sprint 1.4 — Canvas Toolbar  ✅ DONE

### What was built
`src/components/canvas/CanvasToolbar.tsx` — floating pill anchored `bottom: 1.5rem,
left: 50%` with 4 tools:

| Tool | ID | Keyboard | Icon |
|------|----|----------|------|
| Select | `select` | `V` | `MousePointer2` |
| Pen | `pen` | `P` | `Pen` |
| Eraser | `eraser` | `E` | `Eraser` |
| Text | `text` | `T` | `Type` |

- Global `keydown` listener; suppressed when focus is on `INPUT` or `TEXTAREA`
- Active tool highlighted with `bg-white/10` + `.text-glow-subtle`
- Tool label displayed at right of pill

### Key files
- `src/components/canvas/CanvasToolbar.tsx`
- `src/store/canvas-store.ts` — `activeTool: CanvasTool`, `setActiveTool()`

### Verification
- Press V/P/E/T on keyboard; active tool updates immediately
- Pressing P inside a text input does not change the tool
- Toolbar renders at bottom-center above all canvas content (z-40)

---

## Sprint 1.5 — Viewport State Store  ✅ DONE

### What was built
`src/store/canvas-store.ts` — Zustand store managing:
- `activeTool: CanvasTool` — current drawing mode
- `isCoverOpen: boolean` — controls `NotebookCover` visibility
- `viewport: { x, y, zoom }` — synced from React Flow on every move event
- `rfContainerOrigin: { x, y }` — screen-space top-left of the React Flow container;
  used for screen ↔ canvas coordinate conversion in InkLayer and TextNoteLayer
- `setViewport(x, y, zoom)`, `setRfContainerOrigin(x, y)`, `closeCover()`

### Key files
- `src/store/canvas-store.ts`

---

## Sprint 1.6 — Lesson-Page Canvas  ⚠️ PARTIAL

### What was built
`src/components/lesson/NotebookCanvas.tsx` — a per-lesson ink overlay:
- Imperative handle via `forwardRef`: `getState()`, `loadState()`, `clear()`
- In-component stroke and text node state (not in global canvas-store)
- Renders on top of lesson content via `position: absolute, inset: 0`
- Uses perfect-freehand with the same stroke config as the global InkLayer

### What is missing
- **No independent pan/zoom in the lesson view.** `LessonView.tsx` is a fixed
  scrolling `div` (`overflow-y: auto`). The lesson canvas is a fixed overlay that
  covers the visible area only. There is no infinite pan within a lesson page —
  the vision of the spec (panning freely within a lesson "page" at arbitrary zoom)
  is not yet implemented.
- **Coordinate system for lesson canvas is screen-space only.** Unlike the global
  InkLayer which converts strokes to canvas-space via viewport transform, the
  lesson `NotebookCanvas` stores strokes in screen-space. This means strokes do
  not persist correctly if the user scrolls the lesson content.
- **Canvas is cleared on page turn** (called from `LessonView.tsx` `handleNext()`).
  There is no option to keep annotations across slides.

### Remaining tasks
- [ ] Convert `NotebookCanvas` stroke coordinates to be relative to the lesson
      content column (`contentRef`) rather than the screen, so annotations stay
      pinned to the text when the user scrolls
- [ ] Add zoom-in/zoom-out controls inside the lesson view for the canvas layer
- [ ] Decide and document whether lesson annotations persist across slide turns or
      are per-slide (current default: cleared on turn)

### Key files
- `src/components/lesson/NotebookCanvas.tsx`
- `src/components/lesson/LessonView.tsx`

---

## Sprint 1.7 — Zoom Threshold Transition  ❌ NOT STARTED

### Context
The SavantOverview specification requires that zooming out past a defined threshold
on the constellation automatically transitions into the detail lesson view, and
zooming in on a node enters that lesson spatially. Currently, lessons open as a
`position: fixed, z-50` overlay — a traditional modal, not a zoom-driven transition.

### Tasks
- [ ] Define zoom threshold constants in `src/store/canvas-store.ts`:
  ```ts
  CONSTELLATION_ZOOM_MIN = 0.3   // fully zoomed out — pure constellation
  LESSON_ZOOM_THRESHOLD  = 1.8   // zoom past this on a node → enter lesson
  ```
- [ ] In `KnowledgeGraph.tsx` `onMove` handler, detect when zoom crosses
  `LESSON_ZOOM_THRESHOLD` while a concept node is centred in viewport
- [ ] Implement crossfade transition: fade out constellation edges/labels, fade in
  lesson content at the same spatial position
- [ ] Replace the current `isLessonModalOpen` overlay pattern with this spatial approach
  (the modal panels `LessonModal.tsx` can remain for the lesson *selection* step,
  but the actual `LessonView` should enter spatially)

### Acceptance criteria
- Zoom threshold is a named constant, not a magic number
- Transition takes 400ms with `ease-in-out` easing
- Back-navigation (zooming out from lesson) returns to exact prior viewport

---

## Completion Criteria for Phase 1

- [ ] All four canvas tools respond to keyboard shortcuts and pointer events
- [ ] Pan/zoom works on constellation (React Flow)
- [ ] Ruled lines and grain texture are visible at all zoom levels
- [ ] Ink strokes stay pinned to canvas coordinates through pan/zoom
- [ ] Lesson canvas annotations stay pinned to content through scroll
- [ ] Zoom threshold transition replaces overlay-based lesson entry (Sprint 1.7)
- [ ] `npm run build` with no type errors

---

## Dependencies
- Requires: Phase 0 complete
- Blocks: Phase 3 (ink/text build on this), Phase 5 (constellation transition)
