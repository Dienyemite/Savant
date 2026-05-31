## Summary

Sliders in `playground` blocks have no effect on the `circular_motion` visualizer. The SVG stays fixed regardless of slider position.

## Root Cause

`CircularMotion.tsx` reads `params.radius` and `params.speed`. The AI lesson generator (`teacher-prompt.ts`) produces playground blocks using context-derived param IDs (e.g. `mass`, `r`, `omega` for an Angular Momentum lesson). These never match the visualizer's expected keys, so it always falls back to hardcoded defaults (`radius ?? 50`, `speed ?? 10`).

## Affected Files

- `src/lib/teacher-prompt.ts` — playground example must enforce canonical param IDs per visualizer
- `src/components/visualizers/CircularMotion.tsx` — reads `params.radius`, `params.speed`

## Fix

Add a param-ID constraint table to the playground section of `teacher-prompt.ts` so the AI generates conforming blocks.

| visualization key | required param ids |
|---|---|
| `circular_motion` | `radius`, `speed` |
| `projectile_motion` | `velocity`, `angle` |
| `wave_superposition` | `amplitude`, `frequency` |
| `simple_harmonic_motion` | `amplitude`, `frequency` |
| `free_fall` | `height` |
| `function_plot` | `a`, `b` |

## Acceptance Criteria

- [ ] `teacher-prompt.ts` playground section lists required IDs for all 6 visualizers
- [ ] `circular_motion` example block in the prompt uses `radius` and `speed`
- [ ] Moving a slider in a `circular_motion` playground visually updates the SVG
