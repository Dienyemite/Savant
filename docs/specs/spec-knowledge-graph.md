# Spec — Knowledge Graph (Constellation)

## Purpose
Defines the Knowledge Constellation: the React Flow configuration, node types and
states, edge rendering, the graph-store state machine, mastery animations, and
the panel interactions (ConceptInfoPanel, LessonModal). This spec governs
`KnowledgeGraph.tsx`, `ConceptNode.tsx`, `ConceptInfoPanel.tsx`, `LessonModal.tsx`,
`GraphLegend.tsx`, and `graph-store.ts`.

---

## 1. Graph Overview

The Knowledge Constellation is a directed acyclic graph (DAG) where:
- **Nodes** represent learning concepts (e.g., "Addition", "Fractions")
- **Edges** represent prerequisite relationships (unlocks dependencies)
- **State** transitions: locked → unlocked → mastered

The graph is rendered using `@xyflow/react v12` inside `KnowledgeGraph.tsx`.

Node positions are fixed (defined in `src/data/seed.ts`). Students cannot move
nodes. The graph grows over time as the student masters concepts and unlocks new ones.

---

## 2. Graph Store State Machine

File: `src/store/graph-store.ts`

```ts
interface GraphStore {
  // Data (loaded from src/data/seed.ts)
  concepts: Concept[]
  prerequisites: ConceptPrerequisite[]
  lessons: Lesson[]

  // Progress state
  progressMap: Map<string, ProgressStatus>

  // UI state
  selectedConceptId: string | null
  isLessonModalOpen: boolean

  // Mastery animation signals
  recentlyMasteredId: string | null
  recentlyUnlockedIds: string[]

  // Actions
  selectConcept(id: string | null): void
  openLessonModal(): void
  closeLessonModal(): void
  updateProgress(conceptId: string, status: ProgressStatus): void
  clearMasteryAnimation(): void
}
```

### `updateProgress()` — auto-unlock algorithm

```ts
updateProgress(conceptId: string, status: ProgressStatus) {
  set(state => {
    const newProgressMap = new Map(state.progressMap)
    newProgressMap.set(conceptId, status)

    // If mastered: check if any locked concepts now have all prerequisites mastered
    const newlyUnlocked: string[] = []
    if (status === "mastered") {
      for (const concept of state.concepts) {
        if (newProgressMap.get(concept.id) !== "locked") continue
        const prereqs = state.prerequisites.filter(p => p.conceptId === concept.id)
        const allMastered = prereqs.every(p => newProgressMap.get(p.prerequisiteId) === "mastered")
        if (allMastered) {
          newProgressMap.set(concept.id, "unlocked")
          newlyUnlocked.push(concept.id)
        }
      }
    }

    return {
      progressMap: newProgressMap,
      recentlyMasteredId: status === "mastered" ? conceptId : state.recentlyMasteredId,
      recentlyUnlockedIds: [...state.recentlyUnlockedIds, ...newlyUnlocked],
    }
  })
}
```

### `clearMasteryAnimation()`
Called by `ConceptNode.tsx` after the burst animation completes:
```ts
clearMasteryAnimation() {
  set({ recentlyMasteredId: null, recentlyUnlockedIds: [] })
}
```

### Initial state
On mount, `graph-store` is hydrated from `DEFAULT_PROGRESS` (from `seed.ts`).
After Phase 6 auth, it is hydrated from `student_progress` rows from Supabase.

---

## 3. KnowledgeGraph.tsx — React Flow Configuration

File: `src/components/graph/KnowledgeGraph.tsx`

### Node construction
```ts
const nodes: Node[] = concepts.map(concept => ({
  id: concept.id,
  type: "concept",                             // maps to ConceptNode component
  position: concept.position,
  data: {
    concept,
    status: progressMap.get(concept.id) ?? "locked",
    isSelected: selectedConceptId === concept.id,
    isRecentlyMastered: recentlyMasteredId === concept.id,
    isRecentlyUnlocked: recentlyUnlockedIds.includes(concept.id),
  },
  draggable: false,
}))
```

### Edge construction
```ts
const edges: Edge[] = prerequisites.map(prereq => ({
  id: `${prereq.prerequisiteId}->${prereq.conceptId}`,
  source: prereq.prerequisiteId,
  target: prereq.conceptId,
  type: "default",
  style: {
    stroke: "rgba(255,255,255,0.15)",
    strokeWidth: 1,
    strokeDasharray: progressMap.get(prereq.conceptId) === "locked" ? "4 4" : "none",
  },
  animated: false,
}))
```

Edge rendering:
- Locked target concept: dashed stroke `rgba(255,255,255,0.15)`
- Unlocked target concept: solid stroke `rgba(255,255,255,0.25)`
- Mastered target concept: solid stroke `rgba(255,255,255,0.4)`

### Background
```tsx
<Background
  variant={BackgroundVariant.Lines}
  gap={32}
  color="rgba(255,255,255,0.035)"
/>
```
This creates a faint grid matching the `.notebook-grid` CSS class.

### Event handlers
```ts
function handleNodeClick(_event: React.MouseEvent, node: Node) {
  graphStore.selectConcept(node.id)
  if (progressMap.get(node.id) !== "locked") {
    graphStore.openLessonModal()
  }
}
```
Clicking a locked node opens `ConceptInfoPanel` (shows prerequisites).
Clicking an unlocked/mastered node opens `LessonModal` (shows lesson list).

---

## 4. ConceptNode.tsx — Three Visual States

File: `src/components/graph/ConceptNode.tsx`

Each concept is rendered as a `React.memo`-wrapped functional component.
Data flows from the React Flow `data` prop.

### State → visual mapping

| Status | Shape | Fill | Border | Glow |
|--------|-------|------|--------|------|
| `locked` | Circle | transparent | 1px dashed `rgba(255,255,255,0.22)` | none |
| `unlocked` | Circle | transparent | 1px solid `rgba(255,255,255,0.6)` | none |
| `mastered` | Disc | `rgba(255,255,255,0.95)` | none | `.glow-box` |

Node size: 48px × 48px for the outer ring.
Inner dot (mastered state disc): 36px × 36px, centred.

### Label
Below the node: concept title in Courier New 11px, `text-white/60`, centered.
Selected state: `text-white/90`, `.text-glow-subtle`.

### Domain badge
A 6px × 6px square in the `DOMAIN_COLORS[concept.domain]` colour, positioned
at top-right of the node. No label — colour only.

### Hover state
All states: `cursor-pointer` on hover. Background overlay `bg-white/5` on the
outer circle element.

### Mastery burst animation
Triggered when `isRecentlyMastered === true`. Uses Framer Motion:

```tsx
{isRecentlyMastered && (
  <>
    <motion.div
      className="absolute inset-0 rounded-full border border-white"
      initial={{ scale: 1, opacity: 1 }}
      animate={{ scale: 2.5, opacity: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      onAnimationComplete={() => graphStore.clearMasteryAnimation()}
    />
    <motion.div
      className="absolute inset-0 rounded-full border border-white/60"
      initial={{ scale: 1, opacity: 0.6 }}
      animate={{ scale: 1.8, opacity: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
    />
  </>
)}
```

### Unlock animation
Triggered when `isRecentlyUnlocked === true`. Nodes that newly unlock animate:
```tsx
initial={{ scale: 0.8, opacity: 0.3 }}
animate={{ scale: 1.0, opacity: 1.0 }}
transition={{ duration: 0.5, type: "spring", stiffness: 200, damping: 20 }}
```

---

## 5. ConceptInfoPanel.tsx — Locked Node Info

File: `src/components/graph/ConceptInfoPanel.tsx`

### Trigger condition
Renders when `selectedConceptId` is set AND `progressMap.get(selectedConceptId) === "locked"`.

### Content
- Concept title
- "Requires:" heading
- List of prerequisite concept titles, each with its current status icon:
  - ✓ if mastered
  - · if unlocked (accessible but not yet completed)
  - ○ if still locked (nested dependency)

### Position
Fixed panel, bottom-left corner of the viewport.
```
position: fixed
bottom: 24px
left: 24px
width: 280px
```
Uses `.notebook-panel` class.

### Close
Clicking anywhere outside the panel calls `graphStore.selectConcept(null)`.
This is handled by a `onPaneClick` handler on the React Flow component.

---

## 6. LessonModal.tsx — Lesson Selector

File: `src/components/graph/LessonModal.tsx`

### Trigger condition
Renders when `isLessonModalOpen === true` AND the selected concept is
`unlocked` or `mastered`.

### Content
- Concept title + domain badge
- Short description from `concept.description`
- Ordered list of lessons for this concept (from `lessons.filter(l => l.conceptId === selectedConceptId)`)
- Each lesson row:
  - Lesson title
  - Estimated time (e.g., "~8 min")
  - Completion indicator (if the lesson's corresponding progress is mastered)
  - "Begin" button → calls `lessonStore.startLesson(lesson)`

### Position
Fixed panel, right side of the viewport.
```
position: fixed
top: 24px
right: 24px
bottom: 24px
width: 280px
overflow-y: auto
```
Uses `.notebook-panel` class with `.notebook-ruled` background.

### Close
`×` button top-right calls `graphStore.closeLessonModal()`.

---

## 7. GraphLegend.tsx

File: `src/components/graph/GraphLegend.tsx`

### Content
Displayed in the bottom-right corner. Shows:
- Three node states with their visual representation (small circles)
- Domain colour swatches for all 6 domains with their labels

### Position
```
position: fixed
bottom: 80px
right: 24px
```
Uses `.notebook-panel` class. Font: Courier New 11px.

### Toggle
Hidden by default on mobile. Toggle via a `?` key shortcut or a small icon button.

---

## 8. Data Loading

Currently all data (concepts, prerequisites, lessons) is loaded from
`src/data/seed.ts` into `graph-store` via the initial Zustand state:

```ts
// In graph-store.ts initial state
{
  concepts: concepts,           // from src/data/seed.ts
  prerequisites: prerequisites,
  lessons: lessons,
  progressMap: DEFAULT_PROGRESS,
}
```

Phase 4 Sprint 4.1 migrates lesson data to Supabase. The loading sequence becomes:
1. On app init: load `concepts` and `prerequisites` from Supabase `concepts` and
   `concept_prerequisites` tables
2. Load `student_progress` for the current user
3. Load `lessons` for the initially unlocked concepts only (lazy loading)
4. Load remaining lessons when their concept becomes unlocked

This deferred loading prevents loading all lesson content (potentially megabytes)
on app startup.

---

## 9. Graph Performance Constraints

- `ConceptNode` must be wrapped in `React.memo` with `areEqual` comparing only
  `status`, `isSelected`, `isRecentlyMastered`, `isRecentlyUnlocked`
- Edges must be memoized: `useMemo(() => buildEdges(prerequisites, progressMap), [prerequisites, progressMap])`
- Nodes must be memoized: `useMemo(() => buildNodes(concepts, progressMap, selectedConceptId, ...), [...])`
- See Phase 8 Sprint 8.2 for full performance audit targets
