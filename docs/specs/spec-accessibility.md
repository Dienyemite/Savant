# Spec — Accessibility

## Purpose
Defines WCAG 2.1 AA compliance targets for Savant: keyboard navigation,
focus management, screen reader support, colour contrast, reduced-motion
preferences, touch targets, and semantic HTML. This spec governs Phase 7
Sprint 7.3 and all ongoing development.

---

## 1. Current Accessibility Gaps

No formal a11y audit has been performed. Known gaps:

- Canvas tool buttons in `CanvasToolbar.tsx` have no `aria-label`
- `ConceptNode.tsx` states ("locked", "unlocked", "mastered") are not announced to screen readers
- All modals (`LessonView`, lesson modal panel) have no focus trap
- `InfiniteCanvas.tsx` has no `role` or accessible name
- `SocraticChat.tsx` message list is not marked as a live region
- `MarginaliaAnnotations.tsx` new entries do not announce to screen readers
- `DragDropMatchRenderer.tsx` uses click-based interaction with no keyboard equivalent
- `InteractiveSliderRenderer.tsx` wraps a native `<input type="range">` — this is accessible by default but needs `aria-label`
- No `prefers-reduced-motion` handling anywhere in Framer Motion animations

---

## 2. Keyboard Navigation Map

All interactive elements must be reachable via keyboard. Tab order follows
visual reading order (left-to-right, top-to-bottom). Focus must always be
visible.

### Global tab order
```
[1] NotebookCover (while open)
    → "Begin" / path buttons
    → Grade/Major/Subject selectors

[2] CanvasToolbar (z-40, top-left)
    → Select (V)
    → Pen (P)
    → Eraser (E)
    → Text (T)

[3] Knowledge Constellation (React Flow)
    → Each ConceptNode (focusable via Tab)
    → ConceptInfoPanel (if open) → "Close" button

[4] GraphLegend (decorative — not in tab order)

[5] LessonModal panel (when open)
    → Each lesson button
    → "Close" button

[6] LessonView (when open)
    → All lesson block inputs (varies by block type)
    → "Check Answer" / "Continue" / "Back" buttons
    → SocraticChat open button

[7] SocraticChat drawer (when open)
    → Message input
    → Send button
    → "Close" button
```

### Custom keyboard shortcuts
| Key | Action | Active in |
|-----|--------|-----------|
| `V` | Select tool | Canvas (not in text input) |
| `P` | Pen tool | Canvas (not in text input) |
| `E` | Eraser tool | Canvas (not in text input) |
| `T` | Text tool | Canvas (not in text input) |
| `Escape` | Close LessonView / close chat / close cover | Global |
| `Escape` | Exit text note editing | TextNoteLayer |
| `←` `→` | Previous / next lesson slide | LessonView |
| `Enter` | Confirm text note | TextNoteLayer |

All custom shortcuts must be suppressed when a text `<input>` or `<textarea>`
has focus. `CanvasToolbar.tsx` already implements this pattern:
```ts
const onKeyDown = (e: KeyboardEvent) => {
  const tag = (e.target as HTMLElement).tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return
  // ...
}
```

---

## 3. Focus Management

### 3.1 Modal open/close — focus trap
When `LessonView` opens:
1. Save the previously focused element: `previousFocusRef.current = document.activeElement`
2. Move focus to the modal's "close" button or first focusable element
3. Trap Tab/Shift+Tab within the modal boundary

When `LessonView` closes:
1. Restore focus to `previousFocusRef.current`

Implementation using a focus trap library or manual implementation:
```ts
// Manual focus trap in LessonView
useEffect(() => {
  if (!isOpen) return
  const el = modalRef.current
  if (!el) return
  const prev = document.activeElement as HTMLElement | null
  const focusable = el.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  first?.focus()

  const trap = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return
    if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
      e.preventDefault()
      ;(e.shiftKey ? last : first)?.focus()
    }
  }

  document.addEventListener('keydown', trap)
  return () => {
    document.removeEventListener('keydown', trap)
    prev?.focus()
  }
}, [isOpen])
```

### 3.2 ConceptNode focus
React Flow nodes must be keyboard-reachable. Set `tabIndex={0}` on the outer
div of `ConceptNode.tsx` and handle `onKeyDown` for Enter/Space to select the node.

---

## 4. ARIA Labels and Roles

### CanvasToolbar buttons
Each tool button must have a descriptive `aria-label` including the keyboard shortcut:
```tsx
<button
  aria-label="Select tool (V)"
  aria-pressed={activeTool === 'select'}
  onClick={() => setActiveTool('select')}
>
  ...
</button>
```

### ConceptNode states
```tsx
<div
  role="button"
  tabIndex={0}
  aria-label={`${concept.title} — ${status}`}
  aria-pressed={isSelected}
  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick() }}
>
```

Status values must be human-readable: "locked", "unlocked", "mastered".

### InfiniteCanvas
```tsx
<div
  role="application"
  aria-label="Knowledge Constellation canvas"
  aria-description="Use the toolbar to draw, write notes, or navigate concepts."
>
```

### SocraticChat message list
```tsx
<div
  role="log"
  aria-live="polite"
  aria-label="Socratic tutor conversation"
>
  {messages.map(m => (
    <div key={m.id} aria-label={`${m.role === 'user' ? 'You' : 'Tutor'}: ${m.content}`}>
      {m.content}
    </div>
  ))}
</div>
```

### MarginaliaAnnotations
```tsx
<aside aria-live="polite" aria-label="Margin annotations">
  {entries.map(entry => (
    <div key={entry.id} aria-label={`Annotation for "${entry.selectedText}": ${entry.content}`}>
      ...
    </div>
  ))}
</aside>
```

### Progress indicators
```tsx
// In LessonView slide progress
<div role="progressbar"
  aria-valuenow={currentSlideIndex + 1}
  aria-valuemin={1}
  aria-valuemax={lesson.slides.length}
  aria-label={`Lesson progress: slide ${currentSlideIndex + 1} of ${lesson.slides.length}`}
>
```

---

## 5. Colour Contrast Audit

Savant's monochrome design (`#000000` bg, `#FFFFFF` elements) inherently provides
21:1 contrast — exceeding WCAG AA (4.5:1 for text, 3:1 for non-text). However,
several opacity-based values must be checked:

| Element | CSS value | Estimated hex | Contrast on black | Meets AA? |
|---------|-----------|---------------|-------------------|-----------|
| Primary text | `#FFFFFF` | `#FFFFFF` | 21:1 | ✅ |
| `.notebook-ruled` lines | `rgba(255,255,255,0.08)` | ~`#141414` | ~1.2:1 | ⚠️ Decorative only |
| `.notebook-margin` line | `rgba(255,255,255,0.14)` | ~`#242424` | ~1.5:1 | ⚠️ Decorative only |
| `ConceptNode` unlocked circle | stroke `rgba(255,255,255,0.6)` | ~`#999999` | ~6.1:1 | ✅ |
| `ConceptNode` locked circle (dashed) | stroke `rgba(255,255,255,0.25)` | ~`#404040` | ~2.5:1 | ❌ Needs fix |
| Keyboard focus ring | must be added | use `#FFFFFF` outline | 21:1 | ✅ if added |
| Disabled state text | not defined | n/a | TBD | — |

**Required fix:** Locked node dashed stroke must increase to at minimum
`rgba(255,255,255,0.45)` to meet the 3:1 non-text contrast requirement.

### Focus ring style
All focusable elements must display a visible focus ring that meets 3:1 contrast.
Add to `globals.css`:
```css
:focus-visible {
  outline: 2px solid #FFFFFF;
  outline-offset: 2px;
}
```

---

## 6. Reduced Motion

All Framer Motion animations must respect `prefers-reduced-motion`.

### Implementation
Add a hook:
```ts
// src/lib/hooks/use-reduced-motion.ts
import { useReducedMotion } from 'framer-motion'
export { useReducedMotion }
```

Usage in animated components:
```tsx
// In NotebookCover.tsx
const shouldReduceMotion = useReducedMotion()

<motion.div
  animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
  exit={shouldReduceMotion
    ? { opacity: 0 }
    : { opacity: 0, y: -60, scale: 0.97, rotateX: -6 }
  }
  transition={shouldReduceMotion
    ? { duration: 0.15 }
    : { duration: 0.85, ease: [0.4, 0, 0.2, 1] }
  }
>
```

For CSS-based animations (`@keyframes pulse` on mastered nodes), add:
```css
@media (prefers-reduced-motion: reduce) {
  .mastery-pulse { animation: none; }
  .mastery-ring { animation: none; }
}
```

---

## 7. Touch Targets

Minimum touch target size: 44×44px (WCAG 2.5.5 AAA, best practice).

| Element | Current size | Compliant? |
|---------|--------------|------------|
| CanvasToolbar buttons | ~40×40px (estimated) | ⚠️ Borderline |
| ConceptNode circles | varies (20–40px radius) | ⚠️ Small nodes may fail |
| "Continue" lesson button | ~48×36px | ⚠️ Height may be too small |
| MultipleChoiceRenderer option | full width, ~44px height | ✅ |
| Chat send button | ~36×36px | ❌ Needs fix |

Fix all failing elements by ensuring minimum `min-h-[44px] min-w-[44px]`
using Tailwind classes, or by adding padding to increase hit area without
changing visual size:
```tsx
// Larger invisible hit area via padding
<button className="p-3" style={{ minWidth: 44, minHeight: 44 }}>
  <svg width="18" height="18" />
</button>
```

---

## 8. Semantic HTML Requirements

| Component | Required semantic element |
|-----------|--------------------------|
| LessonView | `<main>` wrapper |
| LessonModal panel | `<aside aria-label="Lessons">` |
| SocraticChat | `<section aria-label="Tutor chat">` |
| MarginaliaAnnotations | `<aside aria-label="Annotations">` |
| NotebookCover | `<dialog>` or `role="dialog"` with `aria-modal="true"` |
| GraphLegend | `<figure aria-label="Graph legend">` |
| ConceptInfoPanel | `<section aria-label="Concept details">` |
| DragDropMatchRenderer | `<ul role="list">` for draggable items |
| Navigation buttons | `<nav aria-label="Lesson navigation">` |

---

## 9. Screen Reader Testing Targets

Screen readers to test against:
- **macOS / iOS**: VoiceOver
- **Windows**: NVDA + Firefox (primary), JAWS + Chrome (secondary)

Priority flows to test:
1. Landing page → NotebookCover → `begin` button → dismiss
2. Knowledge Constellation → tab to a concept node → read state → activate
3. Open a lesson → navigate all slides with keyboard → complete lesson
4. Trigger Socratic chat → receive streaming response → read it

---

## 10. Accessibility Testing in CI

Phase 7 Sprint 7.3 adds `axe-core` automated accessibility checks to the test
suite via `@axe-core/playwright`. All critical violations (severity: "critical"
or "serious") must produce test failures.

See `spec-testing.md §8` for the full CI integration spec.
