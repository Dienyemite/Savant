# Spec — Performance

## Purpose
Defines performance targets, measurement methodology, and the precise
optimisation techniques for every critical path in Savant. This spec
governs Phase 8 (Sprints 8.1–8.3) and sets the baseline that must not
regress after Phase 8 is complete.

---

## 1. Performance Targets

| Metric | Target | Measurement tool |
|--------|--------|-----------------|
| First Contentful Paint (FCP) | < 1.5 s | Lighthouse, Vercel Speed Insights |
| Time to Interactive (TTI) | < 3.0 s | Lighthouse |
| Canvas frame time | < 16 ms (60 fps) | Chrome DevTools Performance tab |
| Ink stroke latency (pen down → visible) | < 50 ms | Manual measurement on dev device |
| Store selector re-render | 0 extra renders for unrelated state | React DevTools Profiler |
| LessonView open animation | < 100 ms to first frame | Framer Motion timeline |
| API `/api/chat` first byte | < 800 ms | Vercel Function logs |

All targets must be met on a mid-range Android device (simulated CPU 4x
slowdown in Chrome DevTools) on a 4G connection (10 Mbps, 50 ms RTT).

---

## 2. Bundle Size Targets

| Entry point | JS bundle target |
|------------|-----------------|
| `/` (constellation) | < 200 kB gzipped |
| `/onboarding` | < 150 kB gzipped |
| `/dashboard` | < 150 kB gzipped |

Measure with `next build && npx @next/bundle-analyzer`.

---

## 3. Code Splitting with `dynamic()`

Heavy components that are not needed on initial load must use `dynamic()`:

### In `src/app/page.tsx`:
```ts
import dynamic from 'next/dynamic'

const LessonView = dynamic(
  () => import('@/components/lesson/LessonView'),
  { ssr: false, loading: () => null }
)

const KnowledgeGraph = dynamic(
  () => import('@/components/graph/KnowledgeGraph'),
  { ssr: false, loading: () => null }
)
```

Both components depend on browser APIs (React Flow's DOM measurements,
Canvas APIs) and must be SSR-disabled. The `loading: () => null` prevents
a layout shift during hydration — the canvas background is already rendered.

### In `src/components/lesson/LessonBlockRenderer.tsx`:
```ts
const FormulaBuilderRenderer = dynamic(
  () => import('./blocks/FormulaBuilderRenderer'),
  { ssr: false }
)
const VisualFeedbackRenderer = dynamic(
  () => import('./blocks/VisualFeedbackRenderer'),
  { ssr: false }
)
```

These are loaded only when a slide with that block type is active.

---

## 4. React.memo on ConceptNode

`ConceptNode.tsx` is rendered for every concept in the graph (currently 15,
will grow to hundreds). Without memoisation, every graph store update causes
all nodes to re-render.

```ts
// In src/components/graph/ConceptNode.tsx
import { memo } from 'react'

function ConceptNodeInner({ data }: NodeProps<ConceptNodeData>) {
  // ...
}

export const ConceptNode = memo(ConceptNodeInner)
```

**Granular selector in KnowledgeGraph.tsx — per node:**
The parent component must not pass the full `progressMap` to each node.
Instead, each `ConceptNode` reads only its own status:
```ts
// Inside ConceptNode
const status = useGraphStore(s => s.progressMap.get(data.conceptId) ?? "locked")
```

This way, mastering one concept causes only that node + its dependents to
re-render (due to progressMap replacement), not all 15+ nodes.

---

## 5. Committed Stroke SVG Memoisation

Each committed `InkStroke` in `canvas-store.strokes[]` is converted to an
SVG `<path>` string for rendering. This conversion (perfect-freehand's
`getSvgPathFromStroke`) is O(n) in the stroke point count.

Memoize the SVG path per stroke in `InkLayer.tsx`:
```ts
// In InkLayer.tsx — inside the component
const strokePaths = useMemo(() => {
  return strokes.map(stroke => ({
    id: stroke.id,
    d: getSvgPathFromStroke(getStroke(stroke.points, PEN_OPTIONS)),
  }))
}, [strokes])
```

On commit of a new stroke, `strokes` reference changes (new array), but
React only re-generates the path for the newly added stroke — existing
entries in the `useMemo` dependency array remain referentially equal.

**Important:** This only works if existing strokes are never mutated.
The `commitStroke()` action must produce `[...state.strokes, newStroke]`
and `eraseNear()` must produce `state.strokes.filter(...)` — both create
new arrays with unchanged existing stroke references.

---

## 6. `requestAnimationFrame` Throttle for Canvas `onMove`

`InfiniteCanvas.tsx` passes `onMouseMove` / `onTouchMove` events directly to
ink stroke handlers. At 120 fps on high-refresh displays, this can fire
every 8 ms — too frequently for the store to keep up.

Throttle with `requestAnimationFrame`:
```ts
// In InkLayer.tsx
const pendingMove = useRef<{ cx: number; cy: number; p: number } | null>(null)
const rafRef = useRef<number>(0)

const handlePointerMove = useCallback((e: PointerEvent) => {
  const { cx, cy, p } = screenToCanvas(e)
  pendingMove.current = { cx, cy, p }

  if (!rafRef.current) {
    rafRef.current = requestAnimationFrame(() => {
      const move = pendingMove.current
      if (move) extendStroke(move.cx, move.cy, move.p)
      pendingMove.current = null
      rafRef.current = 0
    })
  }
}, [extendStroke, screenToCanvas])
```

This ensures at most one store update per frame regardless of device refresh rate.

---

## 7. Zustand Selector Granularity (Phase 8 Sprint 8.2.2)

Audit all components for `useStore(s => s)` patterns (full store destructuring).
Replace with granular selectors.

Components most likely to have this issue based on current codebase:

| Component | Suspect pattern | Fix |
|-----------|-----------------|-----|
| `InkLayer.tsx` | `s => s` | `s => ({ strokes: s.strokes, activeTool: s.activeTool })` |
| `TextNoteLayer.tsx` | full store | `s => s.textNotes` |
| `KnowledgeGraph.tsx` | `s => s` | `s => s.viewport`, `s => s.rfContainerOrigin` separate |
| `ConceptInfoPanel.tsx` | `s => s` | `s => s.selectedConceptId` + `s => s.concepts` |

When selecting multiple values that update independently, use `useShallow`:
```ts
import { useShallow } from 'zustand/shallow'

const { concepts, prerequisites } = useGraphStore(
  useShallow(s => ({ concepts: s.concepts, prerequisites: s.prerequisites }))
)
```

`useShallow` performs a shallow equality check on the returned object,
preventing re-renders when neither `concepts` nor `prerequisites` changed.

---

## 8. Edge Runtime Benefits

`POST /api/chat` uses `export const runtime = "edge"`. This gives:
- No cold start delay (< 10 ms vs ~300 ms for Node.js)
- Direct streaming without buffering in Next.js middleware
- Lower time-to-first-byte for streamed AI responses

**Do not** add `runtime = "edge"` to Supabase routes — the Supabase JS client
requires Node.js `crypto` APIs that are not available in the Edge runtime.

---

## 9. React Flow Performance

React Flow renders nodes as absolutely positioned DOM elements, not canvas.
As the concept graph grows, DOM node count grows linearly.

### Limits
- Maximum recommended nodes without virtualisation: ~500 nodes
- Savant's planned maximum: ~200 concepts across all domains
- No virtualisation needed within this scope

### Minimap disabled in production
The React Flow `<MiniMap>` component re-renders on every viewport change.
Do not enable it in production. `KnowledgeGraph.tsx` must not include `<MiniMap>`.

---

## 10. Image and Font Optimisation

### Adobe Typekit
`ivy-presto` is loaded via `<link rel="preload">` in `layout.tsx` using
`as="style"`. Ensure the Typekit URL uses the production kit ID (`lmm5jjk`).

To prevent FOUT (Flash of Unstyled Text):
```tsx
// In layout.tsx — existing preload link
<link rel="preconnect" href="https://use.typekit.net" crossOrigin="" />
<link rel="preload" href="https://use.typekit.net/lmm5jjk.css" as="style" />
<link rel="stylesheet" href="https://use.typekit.net/lmm5jjk.css" />
```

### No external images
Savant has no `<img>` tags with external sources. All visuals are SVG,
CSS-generated, or canvas-rendered. No `next/image` optimisation needed
currently.

---

## 11. Performance Monitoring in Production

Phase 10 Sprint 10.1 enables Vercel Speed Insights and Analytics:
```tsx
// In layout.tsx
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Analytics } from '@vercel/analytics/react'

// In the body
<SpeedInsights />
<Analytics />
```

Real User Monitoring (RUM) metrics — FCP, TTFB, CLS, FID — reported to
Vercel dashboard under the "Savant" project. Alert threshold: FCP > 2 s for
5% of sessions triggers a Slack notification (Phase 10 Sprint 10.3).
