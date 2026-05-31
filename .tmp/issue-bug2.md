## Summary

Clicking "Check" on a multiple choice question appears to do nothing. The button is present and clickable, but feedback is imperceptible.

## Root Cause

The store logic (`validateBlock` in `lesson-store.ts`) is correct — it calls `set()` with the updated `validationState`. The bug is visual: incorrect answers receive only `text-white/40 line-through` (opacity 40%, struck through), and the "Not quite" message is `text-white/30 italic` — effectively invisible against the dark background. Users don't perceive any state change.

## Affected File

- `src/components/lesson/blocks/MultipleChoiceRenderer.tsx`

## Fix

Strengthen incorrect-answer feedback:
- Wrong selected option: add a left border accent (e.g. `border-l-2 border-red-500/40`) and a subtle background tint
- "Not quite — reflect and try again." message: increase to at least `text-white/55`, possibly add a color (e.g. `text-amber-400/60`)

## Acceptance Criteria

- [ ] Selecting a wrong answer and clicking Check produces an immediately visible color/border change
- [ ] The "Not quite" message is legible against the dark notebook background
- [ ] Correct answer feedback (green check, "Correct. Continue reading.") remains unchanged
