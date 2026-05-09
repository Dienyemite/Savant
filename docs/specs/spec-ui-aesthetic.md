# Spec — UI Aesthetic & Design System

## Purpose
Defines the complete visual language of Savant: the "Endless Monochrome Notebook."
Every UI element must conform to this spec. If a new component needs a token,
colour, or treatment not defined here, this spec must be updated first — do not
invent local styles in component files.

---

## 1. Philosophy

The aesthetic is a physical academic notebook rendered digitally:
- **Pure monochrome**: black background, white elements, no colour except domain badges
- **Paper grain**: constant low-opacity noise texture that simulates paper
- **Ruled lines**: horizontal guidelines like notebook paper throughout
- **Luminous white**: all text has a soft glow, not a harsh white-on-black contrast
- **Minimal chrome**: no shadows, borders, rounded corners, or skeuomorphic decoration
  unless it serves the notebook metaphor directly

---

## 2. Colour System

All colours are defined as CSS custom properties in `src/app/globals.css`.

### Base tokens (shadcn-compatible)
```css
:root {
  --background: oklch(0 0 0);         /* pure black  #000000 */
  --foreground: oklch(1 0 0);         /* pure white  #FFFFFF */
  --card: oklch(0 0 0);
  --card-foreground: oklch(1 0 0);
  --popover: oklch(0 0 0);
  --popover-foreground: oklch(1 0 0);
  --primary: oklch(1 0 0);
  --primary-foreground: oklch(0 0 0);
  --secondary: oklch(0.12 0 0);       /* very dark grey */
  --secondary-foreground: oklch(1 0 0);
  --muted: oklch(0.15 0 0);
  --muted-foreground: oklch(0.65 0 0);
  --accent: oklch(0.15 0 0);
  --accent-foreground: oklch(1 0 0);
  --destructive: oklch(0.5 0.2 27);   /* muted red only for errors */
  --border: oklch(0.2 0 0);
  --input: oklch(0.15 0 0);
  --ring: oklch(0.8 0 0);
  --radius: 0rem;                     /* NO rounded corners anywhere */
}
```

### Named semantic values (for direct use in components)
| Name | Value | Usage |
|------|-------|-------|
| `#000000` | Background | All page backgrounds |
| `#FFFFFF` | Foreground | All text and line elements |
| `rgba(255,255,255,0.08)` | Rule line | Notebook ruled line colour |
| `rgba(255,255,255,0.14)` | Margin line | Left margin line colour |
| `rgba(255,255,255,0.82)` | Body text | Normal body copy |
| `rgba(255,255,255,0.45)` | Muted text | Secondary labels, footnotes |
| `rgba(255,255,255,0.22)` | Disabled | Locked nodes, inactive items |
| `rgba(255,255,255,0.10)` | Hover | Hover state overlay |
| `rgba(255,255,255,0.05)` | Subtle | Very light dividers, card backgrounds |

### Domain colours (the only non-white colours in the app)
Defined in `src/types/index.ts` as `DOMAIN_COLORS`:
```ts
export const DOMAIN_COLORS: Record<ConceptDomain, string> = {
  math:     "rgba(255,255,255,0.9)",
  science:  "rgba(180,220,255,0.8)",   // very faint blue-white
  art:      "rgba(255,230,200,0.8)",   // very faint warm white
  music:    "rgba(220,200,255,0.8)",   // very faint lavender-white
  language: "rgba(200,255,220,0.8)",   // very faint green-white
  logic:    "rgba(255,255,180,0.8)",   // very faint yellow-white
}
```
These are intentionally desaturated to maintain the monochrome aesthetic.
They are used only on `ConceptNode` domain badges and `GraphLegend`.

---

## 3. Typography

### Typefaces
| Face | Usage | Load method |
|------|-------|-------------|
| `ivy-presto` (serif) | All lesson body copy, headings, cover title | Adobe Typekit CDN via `src/app/layout.tsx` |
| `Courier New` (monospace) | UI labels, nav, annotations, metadata | System font stack, no loading required |

### Typekit integration
```html
<!-- In src/app/layout.tsx <head> -->
<link rel="preconnect" href="https://use.typekit.net" crossOrigin="anonymous" />
<link rel="stylesheet" href="https://use.typekit.net/lmm5jjk.css" />
```

### Type scale
| Token | Size | Line height | Font | Usage |
|-------|------|-------------|------|-------|
| Display | 48px | 1.1 | ivy-presto | Cover title "Savant" |
| Tagline | 20px | 1.3 | ivy-presto italic | Cover tagline beneath the display title |
| H1 | 28px | 1.2 | ivy-presto | Lesson primary heading (`# `) |
| H2 | 20px | 1.3 | ivy-presto | Lesson section heading (`## `) |
| Body | 16px | 1.75 | ivy-presto | Lesson paragraph text |
| Label | 13px | 1.4 | Courier New | Nav items, toolbar labels, metadata |
| Caption | 11px | 1.4 | Courier New | Page numbers, footnotes |

### Text glow
All text rendered on the black background must have the luminescence glow.
Do NOT use plain `color: white` without the shadow.

```css
/* Standard glow — for body text and headings */
text-shadow:
  0 0 6px rgba(255, 255, 255, 0.22),
  0 0 14px rgba(255, 255, 255, 0.08);

/* Subtle glow — for UI labels and secondary text */
text-shadow:
  0 0 4px rgba(255, 255, 255, 0.15),
  0 0 10px rgba(255, 255, 255, 0.05);

/* Strong glow — for highlighted/active states */
text-shadow:
  0 0 8px rgba(255, 255, 255, 0.40),
  0 0 20px rgba(255, 255, 255, 0.15);
```

This is set globally on `body` in `globals.css` (standard glow) and overridden
per context via utility classes.

---

## 4. Paper Grain Texture

The grain is a constant `body::after` pseudo-element in `globals.css`. It must
never be removed from any page.

```css
body::after {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  background-image: url("data:image/svg+xml,...");  /* SVG feTurbulence fractalNoise */
  /* feTurbulence: type="fractalNoise" baseFrequency="0.85" numOctaves="4" */
  background-size: 256px 256px;
  opacity: 0.042;
  mix-blend-mode: screen;
}
```

**Critical values:**
- `baseFrequency: 0.85` — fine grain (not coarse)
- `numOctaves: 4` — sufficient detail without performance cost
- `opacity: 0.042` — barely perceptible; increases on OLED at design intent
- `mix-blend-mode: screen` — grain adds luminance, does not darken text

The grain is also injected as a named SVG filter in `src/app/layout.tsx`:
```html
<svg id="paper-noise-filter" style="position:absolute;width:0;height:0">
  <defs>
    <filter id="paper-noise">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4"
                    stitchTiles="stitch" result="noise"/>
      <feBlend in="SourceGraphic" in2="noise" mode="screen"/>
    </filter>
  </defs>
</svg>
```
This filter ID `paper-noise` can be applied to SVG elements (e.g., the InkLayer
canvas) via `filter: url(#paper-noise)`.

---

## 5. Notebook Layout Classes

All defined in `src/app/globals.css`. Must be used from these classes — do not
replicate the implementation inline.

### `.notebook-ruled`
Applies horizontal ruled lines (like lined notebook paper) to any element.
```css
.notebook-ruled {
  background-image: repeating-linear-gradient(
    to bottom,
    transparent 0px,
    transparent 27px,
    rgba(255, 255, 255, 0.08) 27px,
    rgba(255, 255, 255, 0.08) 28px
  );
}
```
Line pitch: 28px. Used on: main page, lesson view, onboarding page.

### `.notebook-grid`
Alternate variant with a grid pattern (32px pitch).
```css
.notebook-grid {
  background-image:
    repeating-linear-gradient(to bottom,  transparent 31px, rgba(255,255,255,0.06) 32px),
    repeating-linear-gradient(to right,   transparent 31px, rgba(255,255,255,0.06) 32px);
}
```
Used on: dashboard, diagnostic pages.

### `.notebook-margin`
Adds a left margin line (the "red line" of a notebook) via `::before`.
```css
.notebook-margin::before {
  content: '';
  position: absolute;
  left: 72px;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(255, 255, 255, 0.14);
  box-shadow: 0 0 4px rgba(255, 255, 255, 0.06);
}
```
Margin width: **72px**. This is a project-wide constant.

### `.notebook-content`
Offsets content to the right of the margin line.
```css
.notebook-content { margin-left: 72px; }
```

### `.notebook-nav-margin`
72px left column used for navigation labels in the binding spine area.
```css
.notebook-nav-margin { width: 72px; }
```

#### Domain section labels
Domain names are rendered as vertical text within this margin, one label per
active domain positioned adjacent to that domain cluster's approximate midpoint
on the constellation. Font: Courier New 9px, `rgba(255,255,255,0.22)`, all-caps,
`letter-spacing: 0.2em`, `writing-mode: vertical-rl`, `transform: rotate(180deg)`.
These are purely decorative — no click target. They do not scroll with the
React Flow viewport.

### `.notebook-panel`
Used for floating panels (InfoPanel, LessonModal, Toolbar).
```css
.notebook-panel {
  background: rgba(0, 0, 0, 0.92);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.12);
}
```

### `.dashed-border`
Dashed white border for secondary panels and locked states.
```css
.dashed-border {
  border: 1px dashed rgba(255, 255, 255, 0.22);
}
```

---

## 6. Glow Utility Classes

All defined in `src/app/globals.css`.

| Class | Effect | Usage |
|-------|--------|-------|
| `.text-glow` | Standard text luminescence | Body copy, lesson headings |
| `.text-glow-subtle` | Faint text luminescence | UI labels, nav items |
| `.glow-white` | White element glow (box shadow) | Active buttons, active tool indicator |
| `.glow-border` | Glowing 1px border | Focus states, active panels |
| `.glow-box` | Outer box glow | Mastered node disc, primary actions |

```css
.text-glow {
  text-shadow: 0 0 6px rgba(255,255,255,0.22), 0 0 14px rgba(255,255,255,0.08);
}
.text-glow-subtle {
  text-shadow: 0 0 4px rgba(255,255,255,0.15), 0 0 10px rgba(255,255,255,0.05);
}
.glow-white {
  box-shadow: 0 0 6px rgba(255,255,255,0.3), 0 0 12px rgba(255,255,255,0.1);
}
.glow-border {
  border: 1px solid rgba(255,255,255,0.4);
  box-shadow: 0 0 4px rgba(255,255,255,0.15);
}
.glow-box {
  box-shadow: 0 0 12px rgba(255,255,255,0.25), 0 0 30px rgba(255,255,255,0.08);
}
```

---

## 7. Interactive State Styles

### Hover
Background overlay: `bg-white/10` (Tailwind) = `rgba(255,255,255,0.10)`
Do NOT change text colour or add a border on hover — only the background overlay.

### Active / selected
Background: `bg-white/15`, text glow increases to `.text-glow` (from `.text-glow-subtle`)

### Disabled / locked
Opacity: `opacity-30` or colour at `rgba(255,255,255,0.22)`
Cursor: `cursor-not-allowed` for interactive, `cursor-default` for display-only

### Focus (keyboard)
```css
:focus-visible {
  outline: 1px solid rgba(255,255,255,0.5);
  outline-offset: 2px;
}
```
Never `outline: none` without a `:focus-visible` replacement.

---

## 8. Animation Standards

All animations use **Framer Motion** or CSS. Do not use JavaScript `setTimeout`
for visual transitions (only use it for deferred React state changes after
Framer Motion animations complete).

### Timing tokens
| Token | Duration | Easing | Usage |
|-------|----------|--------|-------|
| Instant | 0ms | — | State-only changes with no visual |
| Fast | 150ms | `easeOut` | Hover effects, tooltips |
| Standard | 300ms | `easeInOut` | Panel slide-ins, tab transitions |
| Slow | 500ms | `easeInOut` | Page-level transitions, modals |
| PageTurn | 850ms | `[0.4, 0, 0.2, 1]` | Notebook cover opening |

### Standard entrance (panels, cards)
```ts
initial: { opacity: 0, y: 8 }
animate: { opacity: 1, y: 0 }
transition: { duration: 0.3, ease: "easeOut" }
```

### Node entrance (ConceptNode)
```ts
initial: { scale: 0, opacity: 0 }
animate: { scale: 1, opacity: 1 }
transition: { type: "spring", stiffness: 300, damping: 25, delay: index * 0.04 }
```

### Mastery burst (ConceptNode — mastered state)
```ts
// Outer ring: scale 1 → 2.5, opacity 1 → 0, duration 600ms
// Inner ring: scale 1 → 1.8, opacity 0.6 → 0, duration 400ms, delay 100ms
// Disc fill: scale 0 → 1, duration 300ms, spring
```

### Cover exit (NotebookCover)
```ts
exit: { opacity: 0, y: -60, scale: 0.97, rotateX: -6 }
transition: { duration: 0.85, ease: [0.4, 0, 0.2, 1] }
```

### ⌘K search overlay entrance
```ts
initial: { opacity: 0, y: -8 }
animate: { opacity: 1, y: 0 }
transition: { duration: 0.15, ease: "easeOut" }
```

---

## 9. Layout Constants

| Constant | Value | Usage |
|----------|-------|-------|
| Margin width | 72px | Left margin line position |
| Toolbar height | 48px | Canvas toolbar pill |
| Toolbar bottom offset | 24px | Distance from viewport bottom |
| Panel width (info) | 280px | ConceptInfoPanel, LessonModal |
| Marginalia width | 240px | MarginaliaAnnotations right panel |
| Lesson content max-width | 680px | LessonView content column |
| Slide thumbnail strip width | 40px | Lesson navigation strip in the binding margin |
| Search overlay max-width | 480px | ⌘K concept search overlay |
| Grid view card size | 180×120px | Compact constellation grid mode cards |

---

## 10. Component Conventions

- **No rounded corners**: `--radius: 0rem`. Every element is sharp-cornered.
- **No shadows** (only glows): `box-shadow` with rgba only — no `drop-shadow(black)`.
- **Secondary CTA ghost buttons**: Courier New 11px, `text-white/40`,
  `hover:text-white/70`, no border, no background. Used for supplementary actions
  (e.g., "▶ What is Savant?" on the cover) that must not compete visually with
  primary CTAs.
- **Checkboxes (MultipleChoice)**: 14×14px square, no `border-radius`.
  Unchecked: `border: 1px solid rgba(255,255,255,0.3)`. Correct selection: `✓` in
  `text-white/80` + `.glow-border`. Incorrect selection: `✗` in `text-white/30`,
  dimmed background `rgba(255,255,255,0.03)`.
- **No coloured backgrounds**: only black or near-black (`rgba(0,0,0,0.x)`).
- **Borders are always `1px`**: never 2px or thicker.
- **Icons**: `lucide-react`, size 16px for UI labels, 20px for toolbar buttons.
  Always `strokeWidth={1.5}` (default Lucide) — not `strokeWidth={2}`.
- **No card shadows**: panels use `backdrop-filter: blur(4px)` + border, not shadow.
- **Cursor**: `cursor-crosshair` in drawing modes (pen, eraser, highlight).
  `cursor-text` in text mode. `cursor-default` in select mode over empty canvas.

---

## 11. Accessibility Constraints

- All text must meet WCAG AA contrast (4.5:1). White on black = 21:1 — always passes.
- Glow effects are additive; they do not reduce contrast.
- `color: rgba(255,255,255,0.45)` on `#000000` background = 8.6:1 — passes AA.
- `color: rgba(255,255,255,0.22)` on `#000000` background = 4.1:1 — fails AA.
  Use only for decorative/non-text elements (locked node dashes, rule lines).
- Every interactive element must have a visible `:focus-visible` ring.
- Never rely on colour alone to communicate state (use shape + label + colour).

---

## 12. UX Patterns (Derived from Design Research)

Recurring patterns established through UX research and visual reference analysis.
All must conform to §2–§10 above. Implementation details are in the component
spec files referenced.

### Cover feature section
A 4-item row on `NotebookCover` beneath the CTA buttons. Each item has:
- No card background or border-radius
- A left `1px solid rgba(255,255,255,0.12)` border
- `padding-left: 12px`, narrow equal-width columns
- Heading in Courier New 11px, `text-white/50`
- Body in ivy-presto 13px, `text-white/40`

No icons, no colour. Serves as inline "What Savant Does" copy.
See `spec-onboarding-ux.md §3` for implementation.

### Slide thumbnail strip
A 40px-wide vertical strip rendered in the 72px binding margin during lesson
view. Each thumbnail slot contains only the slide number (Courier New 9px,
centred). The active slide has a `1px solid rgba(255,255,255,0.5)` left border —
the sole active-state affordance. No content previews.
See `spec-canvas-engine.md` for lesson layout implementation.

### Concept grid card
Used in the compact grid view mode of the Knowledge Constellation.
Each card: `.notebook-panel` border, 180×120px, sharp corners.
- Line 1: domain label, Courier New 9px, `text-white/30`, all-caps
- Line 2: concept title, ivy-presto 14px, `text-white/85`, `.text-glow-subtle`
- Bottom row: `StatusDot` + lesson count, Courier New 9px, `text-white/30`

See `spec-knowledge-graph.md §10` for full spec.

### ⌘K concept search overlay
A keyboard-triggered concept jump overlay rendered at z-50 in `page.tsx`.
Visual shell: `.notebook-panel` container, max-width 480px, centred at `pt-[20vh]`.
- Input: Courier New 13px, `placeholder:text-white/30`, `border-b border-white/12`,
  no outer border
- Result rows: Courier New 13px, `hover:bg-white/5`; domain label Courier New 9px
  `text-white/30` right-aligned; `StatusDot` left-aligned

See `spec-knowledge-graph.md §11` for full spec.
