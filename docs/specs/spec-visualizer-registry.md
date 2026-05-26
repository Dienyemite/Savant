# Spec — Visualizer & Diagram Registry

## Purpose

Defines the visualizer registry (`src/lib/visualizer-registry.ts`), the diagram registry
(`src/lib/diagram-registry.ts`), all SVG component specs, and the updated
`PlaygroundRenderer` and `SketchRenderer` implementations.

---

## 1. Architecture

### Key principles

- **Pure SVG only.** No canvas, no WebGL, no charting library. Every visualization is a
  React component that renders an `<svg viewBox="0 0 600 300">`.
- **Responsive.** Every visualizer is wrapped in `<div style={{width:"100%",
  aspectRatio:"2/1"}}>` so it scales to the container.
- **Lazy loading.** Every visualizer component is loaded via `React.lazy()` to avoid
  adding bundle weight to the initial paint.
- **Stable props.** Every visualizer receives `VisualizerProps = { params:
  Record<string, number>; outputLabel?: string }`. The registry maps string keys to
  `ComponentType<VisualizerProps>`.
- **Diagram props.** Every diagram receives `DiagramProps = { params?: Record<string,
  number>; labels?: Record<string, string> }`.

---

## 2. Visualizer Registry

### File: `src/lib/visualizer-registry.ts`

```ts
import React from "react";
import type { VisualizerProps } from "@/types";

type VisualizerEntry = React.LazyExoticComponent<React.ComponentType<VisualizerProps>>;

const registry: Record<string, VisualizerEntry> = {
  projectile_motion: React.lazy(() => import("@/components/visualizers/ProjectileMotion")),
  simple_harmonic_motion: React.lazy(() => import("@/components/visualizers/SimpleHarmonicMotion")),
  wave_superposition: React.lazy(() => import("@/components/visualizers/WaveSuperposition")),
  free_fall: React.lazy(() => import("@/components/visualizers/FreeFallMotion")),
  function_plot: React.lazy(() => import("@/components/visualizers/FunctionPlot")),
  circular_motion: React.lazy(() => import("@/components/visualizers/CircularMotion")),
};

export function getVisualizer(key: string): VisualizerEntry | null {
  return registry[key] ?? null;
}
```

---

## 3. Diagram Registry

### File: `src/lib/diagram-registry.ts`

```ts
import React from "react";
import type { DiagramProps } from "@/types";

type DiagramEntry = React.LazyExoticComponent<React.ComponentType<DiagramProps>>;

const registry: Record<string, DiagramEntry> = {
  parabola: React.lazy(() => import("@/components/diagrams/ParabolaArc")),
  free_body: React.lazy(() => import("@/components/diagrams/FreeBodyDiagram")),
  waveform: React.lazy(() => import("@/components/diagrams/WaveformSketch")),
  circle_angle: React.lazy(() => import("@/components/diagrams/CircleWithAngle")),
  inclined_plane: React.lazy(() => import("@/components/diagrams/InclinedPlane")),
};

export function getDiagram(key: string): DiagramEntry | null {
  return registry[key] ?? null;
}
```

---

## 4. Visualizer Component Specs

### 4.1 ProjectileMotion

**File:** `src/components/visualizers/ProjectileMotion.tsx`

**Params:**
| Key | Default | Range | Unit |
|-----|---------|-------|------|
| `velocity` | 20 | 5–50 | m/s |
| `angle` | 45 | 5–85 | degrees |

**Physics:** $R = \frac{v_0^2 \sin 2\theta}{g}$, $H = \frac{v_0^2 \sin^2\theta}{2g}$,
$T = \frac{2 v_0 \sin\theta}{g}$

**SVG layout (600×300):**
- Origin at (40, 260). Ground = horizontal line y=260.
- Scale: x-axis covers full range R → 560px; y-axis covers height H → 240px.
- Parabolic arc: 60 SVG points via `x = v·cos(θ)·t, y = v·sin(θ)·t - ½g·t²`.
- Arrow at origin (angle θ from ground) indicating launch direction.
- Labels: "R = {R.toFixed(1)} m", "H = {H.toFixed(1)} m", "T = {T.toFixed(2)} s".
- Output to `outputLabel` div: "Range: {R.toFixed(1)} m".

### 4.2 WaveSuperposition

**File:** `src/components/visualizers/WaveSuperposition.tsx`

**Params:**
| Key | Default | Range |
|-----|---------|-------|
| `amplitude1` | 1 | 0.1–3 |
| `frequency1` | 1 | 0.5–4 |
| `amplitude2` | 0.5 | 0.1–3 |
| `frequency2` | 2 | 0.5–4 |

**SVG layout (600×300):**
- Three wave curves: wave1 (blue, opacity 0.4), wave2 (green, opacity 0.4), sum (white).
- x from 0 to 2π across 600px; y-axis centered at 150.
- Amplitude scale: max 3 → 100px vertical.
- 200 points per wave.
- Label: "Superposition" in top-left corner.

### 4.3 FunctionPlot

**File:** `src/components/visualizers/FunctionPlot.tsx`

**Params:**
| Key | Default | Range |
|-----|---------|-------|
| `a` | 1 | -5–5 |
| `b` | 0 | -5–5 |
| `c` | 0 | -5–5 |

**SVG layout (600×300):**
- Renders y = ax² + bx + c.
- x from -10 to 10, mapped to 600px. y auto-scaled to fit in 300px.
- Draw x-axis and y-axis (dashed, muted). Mark origin.
- 100 points. Clip to SVG bounds.

### 4.4 SimpleHarmonicMotion

**File:** `src/components/visualizers/SimpleHarmonicMotion.tsx`

**Params:**
| Key | Default | Range |
|-----|---------|-------|
| `amplitude` | 1 | 0.1–3 |
| `frequency` | 1 | 0.1–5 |
| `phase` | 0 | 0–360 (degrees) |

**SVG layout (600×300):**
- x(t) = A cos(2πft + φ) plotted over t = 0 to 4s.
- Vertical midline and x = ±A guidelines (dashed).
- 200 points.

### 4.5 FreeFallMotion

**File:** `src/components/visualizers/FreeFallMotion.tsx`

**Params:**
| Key | Default | Range |
|-----|---------|-------|
| `height` | 20 | 1–100 | (m) |

**SVG layout (600×300):**
- Shows position-vs-time parabola (downward): h(t) = H - ½g·t².
- Stop at t = √(2H/g).
- x-axis: time (0 to t_final), y-axis: height (0 to H).

### 4.6 CircularMotion

**File:** `src/components/visualizers/CircularMotion.tsx`

**Params:**
| Key | Default | Range |
|-----|---------|-------|
| `radius` | 50 | 10–100 |
| `speed` | 10 | 1–30 | (m/s) |

**SVG layout (600×300):**
- Static diagram: circle centered at (300, 150) with radius scaled to ~120px max.
- Point on circle at angle=0 (topmost or rightmost).
- Velocity arrow (tangent) and centripetal force arrow (toward center) drawn in different
  colors.
- Labels: "v = {speed} m/s", "r = {radius} m", "a_c = v²/r = {(speed**2/radius).toFixed(1)} m/s²".

---

## 5. Diagram Component Specs

### 5.1 FreeBodyDiagram

**File:** `src/components/diagrams/FreeBodyDiagram.tsx`

**Params:** `{ labels?: { weight?: string; normal?: string; friction?: string; applied?: string } }`

SVG (600×300): Box at center (255,120)–(345,180). Arrows:
- Weight: down from box center, label "W" (or `labels.weight`).
- Normal: up from top of box, label "N".
- Friction: left from box center (if present), label "f".
- Applied: right from box center (if present), label "F".

### 5.2 ParabolaArc

**File:** `src/components/diagrams/ParabolaArc.tsx`

Same parabola as ProjectileMotion but static (no sliders). Default θ=45°, v=20m/s.
Labels for R and H. Used by the `sketch` block for conceptual reference.

### 5.3 WaveformSketch

**File:** `src/components/diagrams/WaveformSketch.tsx`

Static sine wave. Labels: "λ", "A", "node". Simple schematic style.

### 5.4 CircleWithAngle

**File:** `src/components/diagrams/CircleWithAngle.tsx`

Circle with a radius line and arc showing angle θ. Labels r, θ, s (arc length).

### 5.5 InclinedPlane

**File:** `src/components/diagrams/InclinedPlane.tsx`

Triangle (inclined plane) with block on slope. Arrows for gravity component parallel and
perpendicular to slope. Label angle θ.

---

## 6. PlaygroundRenderer Update

### File: `src/components/lesson/blocks/PlaygroundRenderer.tsx`

Replace the `<div className="...">varies with parameters</div>` output section with:

```tsx
import React from "react";
import { getVisualizer } from "@/lib/visualizer-registry";

// inside render:
const Viz = block.visualization ? getVisualizer(block.visualization) : null;

{Viz ? (
  <React.Suspense fallback={<div className="h-32 flex items-center justify-center text-white/30 text-sm">Loading visualization…</div>}>
    <div style={{ width: "100%", aspectRatio: "2/1" }}>
      <Viz params={currentParams} outputLabel={block.output_label} />
    </div>
  </React.Suspense>
) : (
  <div className="text-white/30 text-sm italic">
    {block.visualization ? `No visualizer registered for "${block.visualization}"` : "No visualization configured"}
  </div>
)}
```

Where `currentParams` is the `Record<string, number>` built from the current slider values
(already computed by the existing PlaygroundRenderer).

---

## 7. SketchRenderer Update

### File: `src/components/lesson/blocks/SketchRenderer.tsx`

Replace the 📐 emoji placeholder with:

```tsx
import React from "react";
import { getDiagram } from "@/lib/diagram-registry";

const Diagram = block.diagram_type ? getDiagram(block.diagram_type) : null;

{Diagram ? (
  <React.Suspense fallback={<div className="h-32 flex items-center justify-center text-white/30 text-sm">Loading diagram…</div>}>
    <div style={{ width: "100%", aspectRatio: "2/1" }}>
      <Diagram params={block.params} labels={block.labels} />
    </div>
  </React.Suspense>
) : (
  <div className="text-white/30 text-sm italic text-center py-8">
    {block.diagram_type ? `Diagram: "${block.diagram_type}"` : "Diagram placeholder"}
  </div>
)}
```
