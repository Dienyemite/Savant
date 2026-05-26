# Phase 13 — Rich Interactive Lessons

## Status: IN PROGRESS

## Overview

Lesson quality today is shallow: generated lessons feel like brief summaries rather than
guided, interactive learning experiences. This phase transforms every generated lesson into a
Cartesian-style interactive lesson — rich in worked examples pulled verbatim from the
textbook, deep visualizations that respond to user input, step-by-step derivations with
rendered math, and subject-specific blocks that adapt to physics, literature, history, CS,
and more. Inspiration: Cartesian (https://cartesian.app) for interactive visualizations +
code playback; NotebookLM for deep textbook source grounding.

---

## Goals

1. Every generated lesson has **10–14 blocks minimum**, covering analogy → theory → worked
   example → interactive exploration → review.
2. Every factual claim cites its textbook source passage (NotebookLM-style grounding).
3. Physics/math lessons render **real interactive visualizations** driven by slider params.
4. Step-by-step derivations render **LaTeX math expressions** using KaTeX.
5. Non-STEM subjects use **subject-specific block types** (timeline, quote analysis, key
   terms, code execution).
6. AI is given an 8 192-token budget to produce genuinely detailed lessons.

---

## Dependencies

- Phase 12 complete — physics chunks already in Supabase.
- `katex` npm package (Track B only).
- No backend infrastructure changes required.

---

## Track A — Teacher Prompt & RAG Depth ✅

**Highest-leverage change. Rewrites the AI system prompt for depth, subject-awareness, and
textbook grounding. No new UI required. Deploy first.**

### Files modified

| File | Change |
|------|--------|
| `src/lib/teacher-prompt.ts` | Full rewrite with subject routing + depth rules |
| `src/lib/textbook-retrieval.ts` | Default `matchCount` 5 → 10 |
| `src/app/api/pages/[id]/generate-lesson/route.ts` | `maxOutputTokens` 4 096 → 8 192 |

### Subject routing

`getSubjectRules(subject)` returns required block types:
- `physics` / `chemistry` → `playground` + `step_trace` + `worked_example` + `sketch`
- `math` → `step_trace` (LaTeX) + `formula_builder` + `playground`
- `literature` / `english` → `quote_analysis` + `key_terms`
- `history` / `social_studies` → `timeline` + `key_terms`
- `cs` / `programming` → `step_trace` (code) + `worked_example`
- default → `analogy` + `key_terms` + `multiple_choice`

### Depth rules

- Minimum 10 blocks per lesson.
- Each `text` block ≥ 150 words.
- Each `step_trace` ≥ 5 steps.
- Every factual claim includes `"source_quote": "..."` from textbook.
- At least one `worked_example` with a full numeric or textual solution.

---

## Track B — LaTeX Math Rendering ✅

**Adds KaTeX so step traces and text blocks display typeset mathematics.**

### Files

| File | Action |
|------|--------|
| `src/lib/render-math.ts` | Created — `isLatex()` + `MathBlock` component |
| `src/app/layout.tsx` | KaTeX CSS CDN `<link>` added |
| `src/components/lesson/blocks/StepTraceRenderer.tsx` | Uses `MathBlock` |
| `src/components/lesson/blocks/TextBlockRenderer.tsx` | Inline + display LaTeX support |

---

## Track C — Visualizer Registry ✅

**Replaces "varies with parameters" placeholder with live SVG visualizations and replaces
the 📐 emoji sketch with real parameterized diagrams.**

### Visualizer registry (`src/lib/visualizer-registry.ts`)

| Key | Component | Subject |
|-----|-----------|---------|
| `projectile_motion` | `ProjectileMotion.tsx` | Physics |
| `simple_harmonic_motion` | `SimpleHarmonicMotion.tsx` | Physics |
| `wave_superposition` | `WaveSuperposition.tsx` | Physics |
| `free_fall` | `FreeFallMotion.tsx` | Physics |
| `function_plot` | `FunctionPlot.tsx` | Math |
| `circular_motion` | `CircularMotion.tsx` | Physics |

### Diagram registry (`src/lib/diagram-registry.ts`)

| Key | Component | Use |
|-----|-----------|-----|
| `parabola` | `ParabolaArc.tsx` | Projectile trajectory |
| `free_body` | `FreeBodyDiagram.tsx` | Force vectors |
| `waveform` | `WaveformSketch.tsx` | Waves |
| `circle_angle` | `CircleWithAngle.tsx` | Trigonometry |
| `inclined_plane` | `InclinedPlane.tsx` | Mechanics |

All visualizers: pure SVG (`viewBox="0 0 600 300"`), no canvas/WebGL.

---

## Track D — Subject-Specific Block Types ✅

**Adds 4 block types for non-STEM subjects.**

| Block | Subject | Renderer |
|-------|---------|----------|
| `TimelineBlock` | History, social studies | Scrollable SVG timeline |
| `QuoteAnalysisBlock` | Literature, philosophy | Blockquote + annotation prompts |
| `KeyTermsBlock` | Any subject | 2-col flip-card grid |
| `WorkedExampleBlock` | STEM | Progressive reveal + LaTeX |

---

## Verification Checklist

- [ ] Physics lesson → ≥ 10 blocks; text blocks are multi-sentence paragraphs.
- [ ] `step_trace` with LaTeX expression renders typeset math (not raw string).
- [ ] Playground `"projectile_motion"` shows live SVG arc updating on slider move.
- [ ] Sketch `"free_body"` shows SVG force vectors (not 📐 emoji).
- [ ] Literature lesson on "Hamlet" → `quote_analysis` + `key_terms` blocks present.
- [ ] History lesson on "French Revolution" → `timeline` block present.
- [ ] Server log shows AI response ≈ 5 000–8 000 tokens.
