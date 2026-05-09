# Spec — Telemetry

## Purpose
Defines the telemetry system: event types, the `TelemetryEntry` and
`StruggleScore` types, the struggle score formula, the dashboard
visualisation in `src/app/dashboard/page.tsx`, future Supabase persistence,
and privacy constraints. This spec governs `src/store/telemetry-store.ts`
and Phase 10 Sprint 10.2.

---

## 1. Current Implementation Status

**Exists:**
- `src/store/telemetry-store.ts` — `useTelemetryStore` with in-memory events and
  struggle score computation
- `src/app/dashboard/page.tsx` — reads live telemetry data and renders struggle
  indicators per concept

**Does NOT exist:**
- No Supabase `telemetry_events` table
- No API route to persist events
- No export or aggregation of events
- No privacy consent flow

---

## 2. Data Types

### `TelemetryEntry`
```ts
// src/types/index.ts — to be added in Phase 5 Sprint 5.4
interface TelemetryEntry {
  id: string                     // uuid v4
  timestamp: number              // Date.now()
  conceptId: string              // concept being studied
  lessonId: string | null        // null if on constellation canvas
  blockId: string | null         // null if not block-specific
  event: TelemetryEventType
  durationMs?: number            // time spent since last event on same block
  attemptNumber?: number         // 1-indexed attempt count for the current block
  metadata?: Record<string, unknown>   // event-specific additional data
}

type TelemetryEventType =
  | "session_start"
  | "lesson_start"
  | "lesson_complete"
  | "lesson_exit"
  | "slide_advance"
  | "block_attempt"
  | "block_correct"
  | "block_incorrect"
  | "hint_requested"
  | "chat_triggered"
  | "annotation_triggered"   // Smart Annotation — Phase 5 Sprint 5.3
  | "concept_selected"
```

### `StruggleScore`
```ts
interface StruggleScore {
  conceptId: string
  score: number          // 0.0 – 1.0 (1.0 = maximum struggle)
  timeScore: number      // 0.0 – 1.0
  attemptScore: number   // 0.0 – 1.0
  interactionScore: number   // 0.0 – 1.0
  successBonus: number       // 0.0 or negative (reward for correct answers)
  computedAt: number         // Date.now()
}
```

---

## 3. Struggle Score Formula

$$\text{struggle} = (t_s \times 0.3) + (a_s \times 0.3) + (i_s \times 0.2) + b_s$$

Where:

**Time score** $t_s$ — proportion of time spent vs. expected time:
$$t_s = \min\left(\frac{t_{\text{actual}}}{t_{\text{expected}} \times 2}, 1.0\right)$$
- $t_{\text{actual}}$: seconds spent on concept in this session
- $t_{\text{expected}}$: `concept.estimatedMinutes * 60` (default: 300 s / 5 min)
- Capped at 1.0 — spending 10x expected time does not score > 1.0

**Attempt score** $a_s$ — ratio of incorrect to total attempts:
$$a_s = \frac{n_{\text{incorrect}}}{n_{\text{total}}} \quad \text{(0 if no attempts)}$$

**Interaction score** $i_s$ — hint/chat usage rate relative to blocks:
$$i_s = \min\left(\frac{n_{\text{hints}} + n_{\text{chats}}}{n_{\text{blocks}}}, 1.0\right)$$

**Success bonus** $b_s$ — reward for rapid correct answers:
$$b_s = \begin{cases} -0.2 & \text{if all blocks correct on first attempt} \\ 0.0 & \text{otherwise} \end{cases}$$

The minimum possible score is `max(0.0, score)` — success bonus cannot
make the total negative.

### TypeScript implementation in `telemetry-store.ts`:
```ts
computeStruggleScore(conceptId: string): StruggleScore {
  const { events, conceptStartTimes } = get()
  const conceptEvents = events.filter(e => e.conceptId === conceptId)

  const timeScore = Math.min(
    (Date.now() - (conceptStartTimes[conceptId] ?? Date.now())) / (300_000 * 2),
    1.0
  )

  const attempts = conceptEvents.filter(e => e.event === 'block_attempt')
  const incorrect = conceptEvents.filter(e => e.event === 'block_incorrect')
  const attemptScore = attempts.length === 0 ? 0 : incorrect.length / attempts.length

  const hints = conceptEvents.filter(e => e.event === 'hint_requested' || e.event === 'chat_triggered').length
  const blocks = new Set(attempts.map(e => e.blockId)).size
  const interactionScore = blocks === 0 ? 0 : Math.min(hints / blocks, 1.0)

  const allFirstAttemptCorrect =
    attempts.length > 0
    && incorrect.length === 0
    && conceptEvents.filter(e => e.event === 'block_correct').length === attempts.length
  const successBonus = allFirstAttemptCorrect ? -0.2 : 0

  const score = Math.max(
    0,
    timeScore * 0.3 + attemptScore * 0.3 + interactionScore * 0.2 + successBonus
  )

  return {
    conceptId,
    score,
    timeScore,
    attemptScore,
    interactionScore,
    successBonus,
    computedAt: Date.now(),
  }
}
```

---

## 4. Store Actions

```ts
interface TelemetryState {
  events: TelemetryEntry[]
  struggleScores: Record<string, StruggleScore>
  sessionStartTime: number
  conceptStartTimes: Record<string, number>

  logEvent(event: Omit<TelemetryEntry, "id" | "timestamp">): void
  computeStruggleScore(conceptId: string): StruggleScore
  getStruggleScore(conceptId: string): number   // 0.0–1.0, computes if stale
  markConceptStart(conceptId: string): void
  clearSession(): void
}
```

### `logEvent()` — accumulates in memory
```ts
logEvent(event) {
  const entry: TelemetryEntry = {
    ...event,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  }
  set(state => ({ events: [...state.events, entry] }))

  // Recompute struggle score for this concept if it's a scoring event
  const scoringEvents: TelemetryEventType[] = [
    'block_attempt', 'block_correct', 'block_incorrect',
    'hint_requested', 'chat_triggered'
  ]
  if (scoringEvents.includes(event.event)) {
    const score = get().computeStruggleScore(event.conceptId)
    set(state => ({
      struggleScores: { ...state.struggleScores, [event.conceptId]: score }
    }))
  }
}
```

### `clearSession()` — called on sign-out or session reset
```ts
clearSession() {
  set({
    events: [],
    struggleScores: {},
    conceptStartTimes: {},
    sessionStartTime: Date.now(),
  })
}
```

---

## 5. Dashboard Visualisation — `src/app/dashboard/page.tsx`

The dashboard reads live struggle scores and renders a visual indicator for
each concept the student has interacted with this session.

### Score visualisation
| Score range | Visual representation | Colour |
|-------------|----------------------|--------|
| 0.0 – 0.2 | Thin white bar (no label) | `#FFFFFF` at 30% opacity |
| 0.2 – 0.5 | Medium bar | `#FFFFFF` at 60% opacity |
| 0.5 – 0.75 | Thick bar with dot | `#FFFFFF` at 90% opacity |
| 0.75 – 1.0 | Full bar with "Revisit" label | `#FFFFFF` full |

All score bars use monochrome styling consistent with the Endless Notebook
design system. No colour-coded traffic lights (red/amber/green).

### Data sourcing
```ts
// In dashboard/page.tsx
const struggleScores = useTelemetryStore(s => s.struggleScores)
const concepts = useGraphStore(s => s.concepts)

// Only show concepts with at least one event
const activeConcepts = concepts.filter(c => struggleScores[c.id])
  .sort((a, b) => (struggleScores[b.id]?.score ?? 0) - (struggleScores[a.id]?.score ?? 0))
```

---

## 6. Supabase Persistence (Phase 10 Sprint 10.2)

### Schema
```sql
CREATE TABLE telemetry_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  concept_id  TEXT NOT NULL,
  lesson_id   TEXT,
  block_id    TEXT,
  event       TEXT NOT NULL,
  duration_ms INTEGER,
  attempt_num SMALLINT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX telemetry_user_idx ON telemetry_events (user_id, concept_id);

ALTER TABLE telemetry_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own events" ON telemetry_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own events" ON telemetry_events
  FOR SELECT USING (auth.uid() = user_id);
```

### Batch persistence API
Events are batched and sent on lesson exit or session end — not per-event.
This limits API calls to ≤ 1 per lesson session.

```ts
// POST /api/telemetry — to be built in Phase 10 Sprint 10.2
// Body: { events: TelemetryEntry[] }
// Max: 100 events per batch
```

### Data retention
Telemetry events older than 90 days are deleted via a Supabase cron function.
This is important for COPPA compliance (student data minimisation).

---

## 7. Privacy Constraints

### What is logged
- Block interaction events (attempt, correct, incorrect) — no answer content
- Time spent — duration only, no timestamps sent to third parties
- Concept IDs — opaque identifiers, no student-readable content

### What is NEVER logged
- Student message content to the Socratic chat
- Selected text content (SelectionTrigger selections)
- Canvas ink strokes or text notes
- Student name or contact information
- Device identifiers or IP addresses

### LLM data
Student text sent to Anthropic and Google APIs is subject to their privacy
policies. For FERPA compliance in a school context, these providers must be
designated as "School Officials" or sign a FERPA-compliant data processing
agreement.

Until a DPA is in place with both providers, the production environment must
either:
1. Not process student data under age 18 (adults-only mode), or
2. Display a clear disclosure that AI processing is used

This is enforced at the COPPA/FERPA boundary in Phase 6 Sprint 6.4.
