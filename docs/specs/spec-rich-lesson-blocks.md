# Spec — Rich Lesson Block System

## Purpose

Defines the complete lesson block type system for Phase 13: the enhanced existing block
schemas, 4 new subject-specific block types, the rewritten teacher-prompt.ts, and
per-renderer implementation requirements. Governs `src/types/index.ts`,
`src/lib/teacher-prompt.ts`, and all files in `src/components/lesson/blocks/`.

---

## 1. Enhanced Existing Blocks

### 1.1 StepTraceBlock — LaTeX expressions

Add `is_latex?: boolean` to each step to hint the renderer (renderer also auto-detects).

```ts
steps: {
  id: string;
  description: string;
  expression: string;    // may be LaTeX, e.g. "\\frac{mv^2}{r} = F_{net}"
  highlight?: string;    // sub-expression that changed, e.g. "F_{net}"
  is_latex?: boolean;    // optional hint; renderer auto-detects if omitted
}[]
```

**Renderer** (`StepTraceRenderer.tsx`): replace the `<span className="font-mono">` with
`<MathBlock tex={step.expression} display={true} />` from `src/lib/render-math.ts`.
If `step.highlight` is set, show it in an amber-tinted secondary box beneath the main
expression. See Track B in phase-13 for full implementation details.

### 1.2 PlaygroundBlock — registry hook

No schema change. The `visualization` string field is now a key into the visualizer
registry defined in `src/lib/visualizer-registry.ts`. See `spec-visualizer-registry.md`
for the full registry and per-visualizer specs.

### 1.3 SketchBlock — diagram registry hook

No schema change. The `diagram_type` string is now a key into the diagram registry
defined in `src/lib/diagram-registry.ts`. See `spec-visualizer-registry.md §3`.

---

## 2. New Block Type: WorkedExampleBlock

For STEM subjects. Presents a full solved problem with steps revealed progressively,
mirroring Cartesian's code playback UX.

### JSON Schema

```json
{
  "id": "block-n",
  "type": "worked_example",
  "order": 4,
  "title": "Calculating the Range of a Projectile",
  "source_quote": "The range R of a projectile launched at angle θ... [University Physics §4.3]",
  "given": [
    "Initial velocity: v₀ = 20 m/s",
    "Launch angle: θ = 30°",
    "g = 9.8 m/s²"
  ],
  "find": "The horizontal range R",
  "steps": [
    {
      "id": "we-s1",
      "label": "Write the range formula",
      "expression": "R = \\frac{v_0^2 \\sin 2\\theta}{g}",
      "explanation": "Derived by eliminating time from the kinematic equations for x and y."
    },
    {
      "id": "we-s2",
      "label": "Substitute values",
      "expression": "R = \\frac{(20)^2 \\sin 60°}{9.8}",
      "explanation": "sin(2×30°) = sin(60°) ≈ 0.866"
    },
    {
      "id": "we-s3",
      "label": "Compute",
      "expression": "R \\approx 35.4 \\text{ m}",
      "explanation": "400 × 0.866 / 9.8 ≈ 35.4"
    }
  ],
  "check": "Dimensionally correct (m). Answer is physically reasonable for v₀ = 20 m/s."
}
```

### TypeScript Interface

```ts
export interface WorkedExampleBlock extends LessonBlockBase {
  type: "worked_example";
  title: string;
  source_quote?: string;
  given: string[];
  find: string;
  steps: {
    id: string;
    label: string;
    expression: string;    // LaTeX or plain text
    explanation: string;
  }[];
  check?: string;
}
```

### Renderer (`WorkedExampleRenderer.tsx`)

Layout: "Given" and "Find" shown immediately. Steps hidden behind "Show Next Step" button
(one revealed per click). Each step shows `label` as small caps, `expression` via
`<MathBlock display>`, then `explanation` in muted text. After all steps revealed, show
"Check" summary. Uses `useState` to track current revealed count.

---

## 3. New Block Type: TimelineBlock

For history, social studies, geography.

### JSON Schema

```json
{
  "id": "block-n",
  "type": "timeline",
  "order": 3,
  "title": "Key Events of the French Revolution",
  "source_quote": "The storming of the Bastille on July 14, 1789... [textbook passage]",
  "events": [
    {
      "id": "ev-1",
      "year": 1789,
      "title": "Storming of the Bastille",
      "description": "Parisian crowds stormed the Bastille fortress, marking the symbolic start of the Revolution.",
      "category": "political"
    },
    {
      "id": "ev-2",
      "year": 1793,
      "title": "Reign of Terror",
      "description": "The Committee of Public Safety, led by Robespierre, ordered mass executions of perceived enemies.",
      "category": "violence"
    }
  ]
}
```

### TypeScript Interface

```ts
export interface TimelineBlock extends LessonBlockBase {
  type: "timeline";
  title: string;
  source_quote?: string;
  events: {
    id: string;
    year: number;
    title: string;
    description: string;
    category?: string;
  }[];
}
```

### Renderer (`TimelineRenderer.tsx`)

Horizontal scrollable container. SVG line from leftmost to rightmost year. Each event = a
circle on the line; above/below alternates to avoid overlap. Click a circle to expand a
detail card below the timeline showing `title`, `year`, and `description`. Color-code by
`category` using a small legend. Sort events by `year` ascending before rendering.

---

## 4. New Block Type: QuoteAnalysisBlock

For literature, philosophy, primary-source history.

### JSON Schema

```json
{
  "id": "block-n",
  "type": "quote_analysis",
  "order": 5,
  "source_quote": "To be, or not to be, that is the question",
  "attribution": "William Shakespeare, Hamlet, Act III Scene I",
  "prompts": [
    {
      "id": "qa-p1",
      "question": "What existential tension does this line express?",
      "model_analysis": "Hamlet weighs existence against oblivion, framing the human condition as a choice between suffering and non-being..."
    },
    {
      "id": "qa-p2",
      "question": "What does the word 'question' imply about resolution?",
      "model_analysis": "Framing it as a 'question' — not a statement — suggests irresolution, paralysis, and the burden of consciousness..."
    }
  ]
}
```

### TypeScript Interface

```ts
export interface QuoteAnalysisBlock extends LessonBlockBase {
  type: "quote_analysis";
  source_quote: string;
  attribution: string;
  prompts: {
    id: string;
    question: string;
    model_analysis: string;
  }[];
}
```

### Renderer (`QuoteAnalysisRenderer.tsx`)

Large serif (font-serif or fallback Georgia) blockquote with attribution beneath.
Below: each prompt as an `<details>` accordion. The `<summary>` shows the `question`.
Inside: a `<textarea>` for user response (stored in `useLessonStore` keyed by `promptId`),
and a "Reveal Analysis" button that toggles display of `model_analysis` in muted italic.

---

## 5. New Block Type: KeyTermsBlock

For any subject — vocabulary, glossary, key concepts.

### JSON Schema

```json
{
  "id": "block-n",
  "type": "key_terms",
  "order": 7,
  "title": "Key Terms",
  "terms": [
    {
      "id": "kt-1",
      "term": "Newton's Second Law",
      "definition": "The net force on an object equals the product of its mass and acceleration: F = ma.",
      "example_sentence": "A 2 kg box accelerating at 5 m/s² requires a net force of 10 N."
    },
    {
      "id": "kt-2",
      "term": "Inertia",
      "definition": "The tendency of an object to resist changes in its state of motion.",
      "example_sentence": "A soccer ball rolling on a frictionless surface would continue forever due to inertia."
    }
  ]
}
```

### TypeScript Interface

```ts
export interface KeyTermsBlock extends LessonBlockBase {
  type: "key_terms";
  title?: string;
  terms: {
    id: string;
    term: string;
    definition: string;
    example_sentence?: string;
  }[];
}
```

### Renderer (`KeyTermsRenderer.tsx`)

2-column CSS grid (1 column on mobile). Each term = a flip card with CSS 3D transform
(`rotateY(180deg)` on click). Front: `term` in large bold text on dark card. Back:
`definition` + `example_sentence` in smaller text. Card height fixed at ~120px.
Uses `useState<Set<string>>` to track which cards are flipped.

---

## 6. Rewritten teacher-prompt.ts

The `buildTeacherSystemPrompt` function must be completely rewritten. Below is the
authoritative spec for what the new implementation must do.

### 6.1 Subject rules function

```ts
function getSubjectRules(subject: string): string {
  const s = subject.toLowerCase();
  if (s === "physics" || s === "chemistry") return `
Required blocks (must appear at least once each):
- "playground" with a named visualization key (e.g. "projectile_motion")
- "step_trace" with ≥ 5 steps using LaTeX expressions
- "worked_example" with a full numeric solution
- "sketch" with a named diagram_type
- "multiple_choice" (2–3 blocks)`;

  if (s === "math" || s === "mathematics") return `
Required blocks:
- "step_trace" with ≥ 5 LaTeX steps showing the derivation
- "formula_builder" with available tokens
- "playground" with visualization "function_plot"
- "multiple_choice" (2–3 blocks)`;

  if (s === "literature" || s === "english" || s === "english literature") return `
Required blocks:
- "quote_analysis" with at least 2 prompts
- "key_terms" with at least 5 literary terms
- "multiple_choice" (2–3 blocks)
Do NOT include "playground" or "step_trace" blocks.`;

  if (s === "history" || s === "social studies" || s === "social_studies") return `
Required blocks:
- "timeline" with at least 5 historical events
- "key_terms" with at least 4 key terms
- "multiple_choice" (2–3 blocks)
Do NOT include "playground" blocks.`;

  if (s === "cs" || s === "computer science" || s === "programming") return `
Required blocks:
- "step_trace" with code expressions (not LaTeX) showing algorithm steps
- "worked_example" showing a full algorithm trace
- "multiple_choice" (2–3 blocks)`;

  return `Required blocks: "analogy", "key_terms", "multiple_choice" (2–3 blocks).`;
}
```

### 6.2 Depth enforcement rules (verbatim in prompt)

Include this text verbatim in every system prompt:

```
DEPTH AND ACCURACY RULES — MANDATORY:
1. Generate a MINIMUM of 10 blocks. Fewer is a failure.
2. Every "text" block must contain at least 150 words. One-liners are not acceptable.
3. Every "step_trace" must have at least 5 steps. Each step must advance the logic.
4. For every factual claim in a "text" block, add "source_quote": "<exact sentence from the textbook context above>". If the textbook does not cover a claim, do not make it.
5. At least one "worked_example" block must show a complete solution from first principles.
6. Every "analogy" block must connect explicitly to the formal definition in the next block.
```

### 6.3 All block schemas in prompt

The prompt must include inline JSON examples for every block type including the 4 new ones
(timeline, quote_analysis, key_terms, worked_example). Without these, Claude will not know
their schema.

### 6.4 Token budget note

The prompt must end with:
```
You have a generous token budget. Use it fully. A superficial lesson is worse than no lesson.
```
