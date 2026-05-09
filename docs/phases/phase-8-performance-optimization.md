# Phase 8 — Performance Optimisation

## Status: 0% Complete

## Overview
Audits and optimises the application against key performance targets: initial
page load, canvas rendering throughput at scale, AI streaming latency, and
bundle size. Savant's infinite canvas nature makes rendering performance
particularly important — a slow canvas destroys the "tactile notebook" feel.

---

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| LCP (Largest Contentful Paint) | < 2.0s | Lighthouse on `/onboarding` |
| FID / INP (Input delay) | < 100ms | Lighthouse on constellation page |
| CLS (Cumulative Layout Shift) | < 0.1 | Lighthouse |
| Ink stroke render latency | < 16ms per frame (60fps) | Chrome Performance panel |
| JS bundle (initial load) | < 200KB gzipped | `next build` output |
| `/api/chat` first token | < 800ms | Manual timing |
| Supabase query (progress load) | < 200ms p95 | Supabase dashboard |

---

## Sprint 8.1 — Bundle Analysis & Code Splitting  ❌ NOT STARTED

### Tasks

#### 8.1.1 Bundle analysis
- [ ] Install `@next/bundle-analyzer`:
  ```bash
  npm install --save-dev @next/bundle-analyzer
  ```
- [ ] Update `next.config.ts`:
  ```ts
  import withBundleAnalyzer from '@next/bundle-analyzer'
  export default withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })(config)
  ```
- [ ] Run `ANALYZE=true npm run build` and identify chunks over 50KB
- [ ] Expected large contributors: `@xyflow/react`, `framer-motion`, `perfect-freehand`

#### 8.1.2 Dynamic imports for heavy components
- [ ] `KnowledgeGraph.tsx` — wrap in `next/dynamic` with `ssr: false`:
  ```ts
  const KnowledgeGraph = dynamic(() => import('@/components/graph/KnowledgeGraph'), {
    ssr: false,
    loading: () => <div className="animate-pulse bg-white/5 w-full h-full" />
  })
  ```
  Rationale: React Flow uses browser APIs (ResizeObserver, getBoundingClientRect);
  SSR is impossible without a mock.

- [ ] `LessonView.tsx` — wrap in `next/dynamic`:
  ```ts
  const LessonView = dynamic(() => import('@/components/lesson/LessonView'), {
    ssr: false
  })
  ```

- [ ] `SocraticChat.tsx` — lazy import; chat is never visible on initial render

#### 8.1.3 Tree-shaking verification
- [ ] Verify `lucide-react` icons are imported individually, not from the barrel
  - `import { Pen } from 'lucide-react'` ✓ (current practice)
  - NOT `import * as Icons from 'lucide-react'` ✗

### Acceptance criteria
- Initial JS bundle < 200KB gzipped on a clean Lighthouse audit
- KnowledgeGraph and LessonView are loaded in separate chunks (visible in bundle analyser)

---

## Sprint 8.2 — Canvas Rendering Performance  ❌ NOT STARTED

### Context
`InkLayer.tsx` re-renders the entire SVG on every `onPointerMove` event while
drawing. With many committed strokes, re-rendering all of them on each move
causes visible lag. React Flow also has re-render concerns if store subscriptions
are broad.

### Tasks

#### 8.2.1 Split in-progress and committed stroke rendering
- [ ] In `InkLayer.tsx`, separate the SVG into two `<g>` layers:
  - `<g id="committed">` — static, only re-renders when `strokes[]` changes
  - `<g id="active">` — dynamic, re-renders on every pointer move
- [ ] Wrap `<g id="committed">` in `React.memo` or use `useMemo` on the path
  calculation to avoid recalculation on active-stroke updates

#### 8.2.2 Reduce store subscription granularity
- [ ] In `InkLayer.tsx`, subscribe to `strokes` and `activePoints` separately
  using Zustand's selector pattern:
  ```ts
  const strokes = useCanvasStore(s => s.strokes)
  const activePoints = useCanvasStore(s => s.activePoints)
  ```
  Not `const { strokes, activePoints, viewport, ...rest } = useCanvasStore(s => s)`
  (full object subscription causes re-renders on any store change)

#### 8.2.3 `getSvgPathFromStroke` memoisation
- [ ] In `InkLayer.tsx`, memoize path strings for committed strokes:
  ```ts
  const committedPaths = useMemo(
    () => strokes.map(s => ({ id: s.id, d: getSvgPathFromStroke(getStroke(s.points, opts)) })),
    [strokes]
  )
  ```
  This avoids recomputing all stroke SVG paths on every active-stroke update.

#### 8.2.4 React Flow node render optimisation
- [ ] In `ConceptNode.tsx`, wrap the export in `React.memo`:
  ```ts
  export default React.memo(ConceptNode)
  ```
  React Flow re-renders all nodes when the viewport changes; memo prevents
  re-renders for nodes whose props have not changed.

#### 8.2.5 Throttle viewport sync
- [ ] In `KnowledgeGraph.tsx`, throttle the `onMove` → `setViewport` call to
  at most once per animation frame using `requestAnimationFrame`:
  ```ts
  const rafRef = useRef<number>()
  // in onMove:
  cancelAnimationFrame(rafRef.current!)
  rafRef.current = requestAnimationFrame(() => setViewport(vp.x, vp.y, vp.zoom))
  ```
  This prevents React state updates at 120fps (browser fires move events faster
  than 60fps on high-refresh displays).

### Acceptance criteria
- Drawing a stroke at 60fps with 100 committed strokes — no dropped frames (measured
  in Chrome Performance panel by looking for frames over 16ms)
- Store subscription granularity confirmed: changing `activeTool` does not
  trigger a re-render of the committed strokes layer

---

## Sprint 8.3 — API & Streaming Latency  ❌ NOT STARTED

### Tasks

#### 8.3.1 Cold start mitigation
- [ ] The `/api/chat` route uses Edge runtime which avoids Node.js cold starts.
  Verify the route is still annotated `export const runtime = "edge"` after any
  future modifications.
- [ ] Ensure the Anthropic API key is not read at module load time (it currently
  uses `process.env.ANTHROPIC_API_KEY` at request time — this is correct).

#### 8.3.2 System prompt length audit
- [ ] Measure the character count of `buildSocraticSystemPrompt` output for a
  typical lesson context. Every token in the system prompt adds latency.
- [ ] Target: system prompt ≤ 500 tokens (~375 words)
- [ ] If `buildAnnotationPrompt` (Sprint 5.3.1) is longer, trim it

#### 8.3.3 Streaming timeout handling
- [ ] In `SocraticChat.tsx` and `SelectionTrigger.tsx`, add a 15-second timeout
  to the fetch call:
  ```ts
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)
  const res = await fetch("/api/chat", { signal: controller.signal, ... })
  clearTimeout(timeout)
  ```
- [ ] On `AbortError`, show a degraded state: "Savant is thinking slowly — try again"
  (not a crash; lesson remains fully interactive)

#### 8.3.4 Supabase query optimisation
- [ ] Verify all Supabase queries in API routes use indexed columns
  - Progress lookup: `WHERE user_id = $1` — covered by `idx_progress_user`
  - Canvas state lookup: `WHERE user_id = $1 AND concept_id = $2` — covered
    by `idx_canvas_states_user`
- [ ] Add `select` column projection to all Supabase queries — never `select *`
  in production routes

---

## Sprint 8.4 — Image & Font Optimisation  ❌ NOT STARTED

### Tasks

#### 8.4.1 Font loading strategy
- [ ] Current implementation loads `ivy-presto` via Typekit CDN on every page
  (`<link href="https://use.typekit.net/lmm5jjk.css" rel="stylesheet">` in layout)
- [ ] Add `rel="preload"` for the font CSS file or convert to a `<link rel="preconnect">`
  to reduce render-blocking:
  ```html
  <link rel="preconnect" href="https://use.typekit.net" crossOrigin="anonymous" />
  <link rel="preload" href="https://use.typekit.net/lmm5jjk.css" as="style" />
  ```
- [ ] Alternatively, self-host the `ivy-presto` WOFF2 files in `public/fonts/` and
  use Next.js `next/font/local` — eliminates the external DNS lookup

#### 8.4.2 Public assets
- [ ] Convert any raster images in `public/` to WebP with `<picture>` elements
  (currently no images; this is a preventive measure for any assets added later)
- [ ] SVG illustrations should remain SVG (no conversion to raster)

### Acceptance criteria
- Lighthouse Performance score ≥ 90 on `/onboarding` (mobile, Lighthouse 11)
- Font loads without FOIT (Flash of Invisible Text)

---

## Sprint 8.5 — Memory Leak Audit  ❌ NOT STARTED

### Tasks
- [ ] Verify all `addEventListener` calls have matching `removeEventListener` in
  cleanup functions:
  - `CanvasToolbar.tsx` — global `keydown` listener
  - `SelectionTrigger.tsx` — `selectionchange` listener
  - `KnowledgeGraph.tsx` — `resize` listener for `rfContainerOrigin`
- [ ] Verify all `IntersectionObserver` / `ResizeObserver` instances are
  disconnected on component unmount
- [ ] After Sprint 4.4, verify `ResizeObserver` in `TextBlockRenderer` is
  disconnected on unmount
- [ ] Check for Zustand store subscriptions that are never unsubscribed (use
  `useEffect` return cleanup for any `store.subscribe()` calls)

### Acceptance criteria
- Open and close the lesson view 10 times in the browser; the Chrome Memory panel
  heap size does not grow monotonically (no leak)

---

## Completion Criteria for Phase 8

- [ ] Bundle analyser shows all major chunks under 50KB gzipped (except legitimate
  large dependencies like React Flow which is ~150KB)
- [ ] Ink drawing maintains 60fps with 100+ committed strokes
- [ ] Socratic chat first token arrives within 800ms on a stable connection
- [ ] Lighthouse Performance ≥ 90 on `/onboarding`
- [ ] Zero memory leaks detected in 10 open/close cycles of LessonView
- [ ] All event listeners cleaned up on component unmount
- [ ] `npm run build` with no type errors

---

## Dependencies
- Requires: Phases 1–6 (all features built before measuring and optimising)
- Blocks: Phase 9 (optimised build is deployed)
