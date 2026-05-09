# Spec — Smart Annotation

## Purpose
Defines the Smart Annotation feature end-to-end: the complete pipeline from an
ink stroke drawn over lesson text, through spatial intersection detection, to a
streamed AI response rendered in the margin. This spec governs Phase 5 Sprint 5.3
and all components in `src/components/lesson/`.

---

## 1. Feature Summary

Smart Annotation lets a student draw a highlight stroke over text in a lesson
block. If the stroke crosses a text block's bounding rectangle, Savant:
1. Detects which `TextBlock` was annotated
2. Extracts the block's full text content
3. Sends a targeted AI query (distinct from the Socratic chat prompt)
4. Streams the response into a margin note adjacent to the annotated block

This is the only AI interaction that is triggered by a drawing gesture rather
than a text selection or failure event.

---

## 2. Activation Conditions

Smart Annotation activates ONLY when ALL of the following are true:
1. The active page is a lesson (i.e., `useLessonStore.getState().activeLesson !== null`)
2. The active tool is `"pen"` (not select, eraser, or text)
3. The committed stroke's bounding box intersects a `TextBlock`'s bounding rect
4. The `TextBlock` has not had an annotation triggered within the last 10 seconds
   (cooldown per block — prevents rapid duplicate queries from slow strokes)
5. The stroke has at least 3 points (prevents false trigger from accidental tap)

If any condition fails, the stroke is committed as a normal ink stroke with no
annotation side effect.

---

## 3. Spatial Index — `TextBlockSpatialIndex`

Each `TextBlock` in the current slide must have a screen-space bounding rect
registered in `lesson-store.spatialIndex`. This index is built when a lesson
slide renders and its text blocks are laid out by the browser.

```ts
// src/types/index.ts — to be added
interface TextBlockSpatialIndex {
  blockId: string
  rect: DOMRect   // screen-space bounding rect of the rendered text block
  text: string    // full text content of the block (for AI context)
  lastAnnotatedAt: number   // Date.now() when last annotation was triggered; 0 if never
}
```

### Building the index in `TextBlockRenderer.tsx`
Each `TextBlock` must expose its DOM bounding rect to the lesson store after render:

```tsx
// In TextBlockRenderer.tsx
import { useRef, useEffect } from 'react'
import { useLessonStore } from '@/store/lesson-store'

function TextBlockRenderer({ block }: { block: TextBlock }) {
  const ref = useRef<HTMLDivElement>(null)
  const setSpatialIndex = useLessonStore(s => s.setSpatialIndex)

  useEffect(() => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    setSpatialIndex(prev => {
      const next = prev.filter(e => e.blockId !== block.id)
      return [...next, {
        blockId: block.id,
        rect,
        text: block.content,
        lastAnnotatedAt: 0,
      }]
    })
  }, [block.id, block.content, setSpatialIndex])

  return (
    <div ref={ref}>
      {/* ... existing text rendering ... */}
    </div>
  )
}
```

**Note:** `setSpatialIndex` must accept either a replacement array or an updater
function — update `lesson-store.ts` accordingly:
```ts
setSpatialIndex(updater: TextBlockSpatialIndex[] | ((prev: TextBlockSpatialIndex[]) => TextBlockSpatialIndex[])): void
```

---

## 4. Stroke Commit Handler

When the canvas is in a lesson context, `LessonView.tsx` registers a stroke
commit handler on the canvas store. The handler is cleared when the lesson exits.

```ts
// In LessonView.tsx — after lesson starts
useEffect(() => {
  useCanvasStore.getState().setStrokeCommitHandler(onStrokeCommit)
  return () => useCanvasStore.getState().clearStrokeCommitHandler()
}, [])  // register once per lesson
```

The `onStrokeCommit` callback receives the newly committed `InkStroke`:

```ts
const onStrokeCommit = useCallback((stroke: InkStroke) => {
  const activeTool = useCanvasStore.getState().activeTool
  if (activeTool !== 'pen') return
  if (stroke.points.length < 3) return

  const intersected = findIntersectedBlock(stroke)
  if (!intersected) return

  triggerSmartAnnotation(intersected, stroke)
}, [])
```

---

## 5. `findIntersectedBlock()` Algorithm

Checks whether the stroke's bounding box intersects any registered spatial
index entry. Returns the first intersecting entry, or `null`.

```ts
// In src/lib/smart-annotation.ts
function findIntersectedBlock(stroke: InkStroke): TextBlockSpatialIndex | null {
  const spatialIndex = useLessonStore.getState().spatialIndex

  // Compute stroke bounding box in screen space
  // Note: stroke.points are canvas-space — must convert to screen space first
  const { viewport, rfContainerOrigin } = useCanvasStore.getState()
  const screenPoints = stroke.points.map(([cx, cy]) => ({
    x: cx * viewport.zoom + viewport.x + rfContainerOrigin.x,
    y: cy * viewport.zoom + viewport.y + rfContainerOrigin.y,
  }))

  const strokeMinX = Math.min(...screenPoints.map(p => p.x))
  const strokeMaxX = Math.max(...screenPoints.map(p => p.x))
  const strokeMinY = Math.min(...screenPoints.map(p => p.y))
  const strokeMaxY = Math.max(...screenPoints.map(p => p.y))

  const now = Date.now()
  const COOLDOWN_MS = 10_000

  for (const entry of spatialIndex) {
    // Skip if on cooldown
    if (now - entry.lastAnnotatedAt < COOLDOWN_MS) continue

    // AABB intersection test
    const { rect } = entry
    const intersects = !(
      strokeMaxX < rect.left ||
      strokeMinX > rect.right ||
      strokeMaxY < rect.top ||
      strokeMinY > rect.bottom
    )

    if (intersects) return entry
  }

  return null
}
```

---

## 6. `getHighlightBoundingBox()` Utility

After intersection is detected, compute the sub-region of the text block that
the stroke covered. This is used to position the margin note's anchor.

```ts
// In src/lib/smart-annotation.ts
function getHighlightBoundingBox(
  stroke: InkStroke,
  blockRect: DOMRect,
  viewport: { x: number; y: number; zoom: number },
  rfContainerOrigin: { x: number; y: number }
): { anchorY: number } {
  // Convert stroke y-extent to screen space
  const screenYs = stroke.points.map(
    ([, cy]) => cy * viewport.zoom + viewport.y + rfContainerOrigin.y
  )
  const minY = Math.min(...screenYs)
  const maxY = Math.max(...screenYs)
  const midY = (minY + maxY) / 2

  // Clamp anchor to the block rect bounds
  const anchorY = Math.max(blockRect.top, Math.min(blockRect.bottom, midY))

  return { anchorY }
}
```

The `anchorY` is a screen-space Y coordinate passed to `chat-store.addMarginaliaEntry()`
to position the margin note vertically.

---

## 7. `triggerSmartAnnotation()` — End-to-End Trigger

```ts
// In LessonView.tsx (or a helper imported by it)
async function triggerSmartAnnotation(
  entry: TextBlockSpatialIndex,
  stroke: InkStroke
): Promise<void> {
  const { viewport, rfContainerOrigin } = useCanvasStore.getState()
  const { anchorY } = getHighlightBoundingBox(stroke, entry.rect, viewport, rfContainerOrigin)

  // Update cooldown timestamp
  useLessonStore.getState().setSpatialIndex(prev =>
    prev.map(e => e.blockId === entry.blockId ? { ...e, lastAnnotatedAt: Date.now() } : e)
  )

  // Log telemetry
  const activeLesson = useLessonStore.getState().activeLesson
  useTelemetryStore.getState().logEvent({
    conceptId: activeLesson!.conceptId,
    lessonId: activeLesson!.id,
    blockId: entry.blockId,
    event: 'annotation_triggered',
  })

  // Create the marginalia entry
  const entryId = useChatStore.getState().addMarginaliaEntry(
    anchorY,
    entry.text,
    'annotation'   // distinguishes from 'selection' type
  )

  // Stream the AI response
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contextType: 'annotation',
        annotationContext: {
          blockText: entry.text,
          conceptId: activeLesson!.conceptId,
          conceptTitle: /* look up from graph store */,
        },
      }),
    })

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      useChatStore.getState().updateMarginalia(entryId, chunk)
    }

    useChatStore.getState().finishMarginalia(entryId)
  } catch (err) {
    console.error('[SmartAnnotation] fetch failed:', err)
    useChatStore.getState().removeMarginalia(entryId)
  }
}
```

---

## 8. AI Prompt — Annotation Context

The `/api/chat` route must handle `contextType: "annotation"` in addition to
its existing context types.

### `buildAnnotationSystemPrompt()` in `src/lib/socratic-prompt.ts`:
```ts
export function buildAnnotationSystemPrompt(ctx: AnnotationContext): string {
  return `${SOCRATIC_BASE_PROMPT}

The student has underlined a passage in their lesson notes on "${ctx.conceptTitle}".
The passage reads:

"${ctx.blockText.slice(0, 500)}"

Write a margin note — one illuminating insight, connection, or expansion of this idea.
Do not re-state what the passage says. Do not ask a question. Be concise: 1–2 sentences.
Use the same voice as a thoughtful teacher writing in the margin of a textbook.`
}
```

### `AnnotationContext` type:
```ts
interface AnnotationContext {
  blockText: string        // text content of the annotated block
  conceptId: string
  conceptTitle: string
}
```

### API route change in `/api/chat/route.ts`:
```ts
if (body.contextType === 'annotation') {
  if (!body.annotationContext?.blockText) {
    return Response.json({ error: 'annotationContext.blockText is required' }, { status: 400 })
  }
  systemPrompt = buildAnnotationSystemPrompt(body.annotationContext)
}
```

### Token budget for annotations:
```ts
maxOutputTokens: 120   // short margin note — less than Socratic chat budget (300)
temperature: 0.6       // slightly less creative, more informative
```

---

## 9. Marginalia Styling — Annotation vs. Selection

`MarginaliaAnnotations.tsx` must visually distinguish annotation entries
(triggered by ink stroke) from selection entries (triggered by text selection).

```tsx
// In MarginaliaAnnotations.tsx
const isAnnotation = entry.type === 'annotation'

<div
  className={cn(
    'absolute right-0 text-xs max-w-[160px]',
    isAnnotation
      ? 'italic opacity-70 font-serif border-l border-white/20 pl-2'   // ink feel
      : 'opacity-90 font-mono'                                            // Socratic feel
  )}
  style={{ top: entry.anchorY }}
>
```

Annotation entries are rendered in `ivy-presto` italic — they feel like a
teacher's handwritten margin note. Selection entries remain in Courier New
monospace, consistent with the Socratic chat style.

---

## 10. End-to-End Flow Diagram

```
Student draws a stroke over text
    │
    ▼
InkLayer: commitStroke()
    │
    ▼
canvas-store.onStrokeCommit(stroke) → LessonView.onStrokeCommit callback
    │
    ├── activeTool !== 'pen'? → do nothing
    ├── stroke.points.length < 3? → do nothing
    │
    ▼
findIntersectedBlock(stroke)
    │
    ├── no intersection? → do nothing
    ├── block on cooldown? → do nothing
    │
    ▼
getHighlightBoundingBox(stroke, blockRect, viewport) → anchorY
    │
    ▼
Update cooldown timestamp in spatialIndex
    │
    ▼
useTelemetryStore.logEvent('annotation_triggered')
    │
    ▼
useChatStore.addMarginaliaEntry(anchorY, blockText, 'annotation') → entryId
    │
    ▼
fetch('/api/chat', { contextType: 'annotation', annotationContext })
    │
    ▼
buildAnnotationSystemPrompt(ctx) → streamText() (120 tokens, 0.6 temp)
    │
    ▼ (streaming)
useChatStore.updateMarginalia(entryId, chunk) [per chunk]
    │
    ▼
useChatStore.finishMarginalia(entryId)
    │
    ▼
MarginaliaAnnotations renders italic annotation at anchorY
```

---

## 11. Implementation Checklist

Phase 5 Sprint 5.3 tasks in order:

1. Add `TextBlockSpatialIndex` to `src/types/index.ts`
2. Add `setSpatialIndex`, `spatialIndex` to `lesson-store.ts`
3. Add `setStrokeCommitHandler`, `clearStrokeCommitHandler`, `onStrokeCommit` to `canvas-store.ts`
4. Update `TextBlockRenderer.tsx` to register bounding rects
5. Create `src/lib/smart-annotation.ts` with `findIntersectedBlock()` and `getHighlightBoundingBox()`
6. Create `buildAnnotationSystemPrompt()` in `src/lib/socratic-prompt.ts`
7. Update `/api/chat/route.ts` to handle `contextType: 'annotation'`
8. Add `type: 'annotation' | 'selection'` to `MarginaliaEntry` in `src/types/index.ts`
9. Update `chat-store.ts` `addMarginaliaEntry` signature to accept optional `type`
10. Update `MarginaliaAnnotations.tsx` to render annotation vs. selection styles
11. Wire `triggerSmartAnnotation` in `LessonView.tsx` via `setStrokeCommitHandler`
