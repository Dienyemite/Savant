/**
 * src/lib/teacher-prompt.ts
 *
 * Builds the Teacher AI system prompt for lesson generation.
 * Phase 13: Subject-aware routing, depth enforcement, 4 new block types,
 * LaTeX/source_quote requirements, 8 192-token budget.
 */

import type { DiagnosticResult, LearningMode } from "@/types";

export interface TeacherContext {
  topic: string;
  subject: string;
  learning_mode: LearningMode;
  textbook_context: string;   // formatted chunks from formatChunksAsContext()
  diagnostic_result?: DiagnosticResult | null;
}

// ─── Subject-specific required block rules ───────────────────────────────────

function getSubjectRules(subject: string): string {
  const s = subject.toLowerCase().replace(/_/g, " ");

  if (s === "physics" || s === "chemistry") return `
REQUIRED BLOCKS FOR ${s.toUpperCase()} (must appear at least once each):
- "playground" with visualization key set to the most relevant option (e.g. "projectile_motion", "wave_superposition", "simple_harmonic_motion", "free_fall", "circular_motion")
- "step_trace" with ≥ 5 steps — use LaTeX for all mathematical expressions (e.g. "F = \\\\frac{mv^2}{r}")
- "worked_example" with a complete numeric solution from first principles
- "sketch" with diagram_type set (e.g. "free_body", "parabola", "waveform", "inclined_plane")
- 2–3 "multiple_choice" blocks testing both conceptual and quantitative understanding`;

  if (s === "math" || s === "mathematics") return `
REQUIRED BLOCKS FOR MATHEMATICS:
- "step_trace" with ≥ 5 LaTeX steps showing full derivation
- "formula_builder" with available tokens listing the key symbols
- "playground" with visualization "function_plot"
- 2–3 "multiple_choice" blocks`;

  if (s === "literature" || s === "english" || s === "english literature") return `
REQUIRED BLOCKS FOR LITERATURE:
- "quote_analysis" with at least 2 detailed prompts and full model_analysis for each
- "key_terms" with at least 5 literary terms (e.g. motif, theme, dramatic irony)
- 2–3 "multiple_choice" blocks testing close reading
Do NOT include "playground" or "step_trace" blocks.`;

  if (s === "history" || s === "social studies") return `
REQUIRED BLOCKS FOR HISTORY:
- "timeline" with at least 5 historical events in chronological order
- "key_terms" with at least 4 key historical terms and their significance
- 2–3 "multiple_choice" blocks
Do NOT include "playground" blocks.`;

  if (s === "cs" || s === "computer science" || s === "programming") return `
REQUIRED BLOCKS FOR COMPUTER SCIENCE:
- "step_trace" with code expressions (not LaTeX) showing algorithm steps
- "worked_example" showing a full algorithm trace with input/output
- 2–3 "multiple_choice" blocks`;

  return `REQUIRED BLOCKS: "analogy", "key_terms" (with at least 4 terms), 2–3 "multiple_choice" blocks.`;
}

// ─── Level guidance ───────────────────────────────────────────────────────────

function getLevelGuidance(result: DiagnosticResult): string {
  switch (result.level) {
    case "beginner":
      return `Student is a BEGINNER. Use more analogy blocks, simpler vocabulary, and extra step traces. Gaps identified: ${result.gaps.join(", ") || "none"}.`;
    case "intermediate":
      return `Student has INTERMEDIATE exposure. Assume basic familiarity with fundamentals; focus on nuance and connecting concepts. Gaps: ${result.gaps.join(", ") || "none"}.`;
    case "advanced":
      return `Student is ADVANCED. Skip basic explanations; focus on complex applications, edge cases, and derivations. Gaps: ${result.gaps.join(", ") || "none"}.`;
  }
}

// ─── Main prompt builder ─────────────────────────────────────────────────────

export function buildTeacherSystemPrompt(ctx: TeacherContext): string {
  const levelGuidance = ctx.diagnostic_result
    ? getLevelGuidance(ctx.diagnostic_result)
    : "Assume the student is starting fresh. Begin with fundamentals and build up.";

  const modeGuidance =
    ctx.learning_mode === "k12"
      ? "The student is in K-12. Use clear, friendly language, vivid analogies, and concrete examples. Avoid jargon without explanation."
      : ctx.learning_mode === "college"
      ? "The student is a college undergraduate. Use precise academic language. Include full derivations with correct notation."
      : "The student is self-taught. Be engaging and conversational. Assume high curiosity but variable formal background.";

  const subjectRules = getSubjectRules(ctx.subject);

  return `You are an expert, enthusiastic teacher creating a rich interactive lesson for Savant, an AI-powered learning platform.

SUBJECT: ${ctx.subject}
TOPIC: ${ctx.topic}

${modeGuidance}
${levelGuidance}

${subjectRules}

---

TEXTBOOK SOURCE (your PRIMARY factual reference):

${ctx.textbook_context || "No textbook context available. Use only well-established, widely agreed-upon facts."}

---

DEPTH AND ACCURACY RULES — MANDATORY:
1. Generate a MINIMUM of 10 blocks. Fewer than 10 blocks is a failure.
2. Every "text" block must contain at least 150 words. One-sentence entries are not acceptable.
3. Every "step_trace" must have at least 5 steps. Each step must meaningfully advance the logic.
4. For every factual claim in a "text" block, add "source_quote": "<exact sentence from the textbook context above>". If the textbook does not cover a claim, do not make it.
5. At least one "worked_example" block must show a complete solution from first principles.
6. Every "analogy" block must connect explicitly to the formal concept in the following text block.
7. Worked examples must use realistic numbers (e.g. v₀ = 20 m/s, not v₀ = 1 m/s).

---

LESSON STRUCTURE (use this as a template, adapting for the subject):
1. "analogy" — a real-world hook that builds intuition before formal definitions
2. "text" — fundamental concept explanation (≥150 words, cite source_quote)
3. "text" — deeper theory / mathematical foundation (≥150 words, cite source_quote)
4. "step_trace" — step-by-step derivation with ≥5 steps (use LaTeX for math)
5. "worked_example" — complete numeric worked example
6. "playground" — interactive parameter explorer with a named visualization
7. "sketch" — labeled diagram
8. "text" — discussion of implications / real-world applications (≥150 words)
9. "multiple_choice" — comprehension check (2–3 of these)
10. (add "timeline", "quote_analysis", "key_terms" as required by subject rules above)

---

COMPLETE JSON SCHEMAS — return ONLY valid JSON, no prose, no markdown fences:

[
  {
    "id": "block-1",
    "type": "analogy",
    "order": 1,
    "analogy_text": "Imagine a soccer ball kicked at an angle...",
    "real_world_example": "Every thrown object follows this same curved path."
  },
  {
    "id": "block-2",
    "type": "text",
    "order": 2,
    "content": "## Projectile Motion\\n\\nProjectile motion describes...",
    "style": "body",
    "source_quote": "An object is a projectile if it is thrown near Earth's surface and air resistance is negligible."
  },
  {
    "id": "block-3",
    "type": "step_trace",
    "order": 3,
    "title": "Deriving the Range Formula",
    "steps": [
      { "id": "s1", "description": "Write kinematic equations for x and y", "expression": "x = v_0 \\\\cos\\\\theta \\\\cdot t, \\\\quad y = v_0 \\\\sin\\\\theta \\\\cdot t - \\\\tfrac{1}{2}gt^2" },
      { "id": "s2", "description": "Find time of flight (set y = 0)", "expression": "0 = t\\\\left(v_0 \\\\sin\\\\theta - \\\\tfrac{1}{2}gt\\\\right) \\\\Rightarrow t = \\\\frac{2v_0 \\\\sin\\\\theta}{g}" },
      { "id": "s3", "description": "Substitute into x equation", "expression": "R = v_0 \\\\cos\\\\theta \\\\cdot \\\\frac{2v_0 \\\\sin\\\\theta}{g}" },
      { "id": "s4", "description": "Apply double-angle identity", "expression": "R = \\\\frac{v_0^2 \\\\cdot 2\\\\sin\\\\theta\\\\cos\\\\theta}{g} = \\\\frac{v_0^2 \\\\sin 2\\\\theta}{g}" },
      { "id": "s5", "description": "Maximum range occurs at θ = 45°", "expression": "R_{\\\\max} = \\\\frac{v_0^2}{g}", "highlight": "\\\\theta = 45°" }
    ]
  },
  {
    "id": "block-4",
    "type": "worked_example",
    "order": 4,
    "title": "Calculating the Range of a Projectile",
    "source_quote": "The range of a projectile depends on both the initial speed and the launch angle.",
    "given": ["Initial velocity: v₀ = 20 m/s", "Launch angle: θ = 30°", "g = 9.8 m/s²"],
    "find": "The horizontal range R",
    "steps": [
      { "id": "we-s1", "label": "Write the range formula", "expression": "R = \\\\frac{v_0^2 \\\\sin 2\\\\theta}{g}", "explanation": "Derived from the kinematic equations above." },
      { "id": "we-s2", "label": "Substitute values", "expression": "R = \\\\frac{(20)^2 \\\\sin 60°}{9.8}", "explanation": "sin(2×30°) = sin(60°) ≈ 0.866" },
      { "id": "we-s3", "label": "Compute", "expression": "R \\\\approx 35.4 \\\\text{ m}", "explanation": "400 × 0.866 / 9.8 ≈ 35.4" }
    ],
    "check": "Dimensionally correct (m). Physically reasonable for v₀ = 20 m/s."
  },
  {
    "id": "block-5",
    "type": "playground",
    "order": 5,
    "title": "Explore Projectile Range",
    "parameters": [
      { "id": "velocity", "label": "Initial Speed", "min": 5, "max": 50, "step": 1, "default": 20, "unit": "m/s" },
      { "id": "angle", "label": "Launch Angle", "min": 5, "max": 85, "step": 1, "default": 45, "unit": "°" }
    ],
    "visualization": "projectile_motion",
    "output_label": "Range (m)"
  },
  {
    "id": "block-6",
    "type": "sketch",
    "order": 6,
    "diagram_type": "parabola",
    "parameters": { "angle": 45 },
    "caption": "Projectile trajectory showing range R and maximum height H."
  },
  {
    "id": "block-7",
    "type": "multiple_choice",
    "order": 7,
    "question": "A projectile is launched at 20 m/s at 45°. What happens to the range if the launch angle is changed to 30°?",
    "options": [
      { "id": "a", "text": "The range increases because a lower angle means more horizontal velocity." },
      { "id": "b", "text": "The range decreases because sin(60°) < sin(90°) = 1." },
      { "id": "c", "text": "The range stays the same because the speed is unchanged." },
      { "id": "d", "text": "The range doubles because the angle is halved." }
    ],
    "correct_option_id": "b",
    "explanation": "Range = v₀² sin(2θ)/g. At 45°, sin(90°)=1 (max). At 30°, sin(60°)≈0.866 < 1, so range decreases."
  },
  {
    "id": "block-8",
    "type": "timeline",
    "order": 8,
    "title": "Key Events: Example History Timeline",
    "events": [
      { "id": "ev-1", "year": 1687, "title": "Newton's Principia", "description": "Newton published the laws of motion and universal gravitation.", "category": "science" },
      { "id": "ev-2", "year": 1905, "title": "Einstein's Special Relativity", "description": "Einstein reformulated mechanics for objects moving near light speed.", "category": "science" }
    ]
  },
  {
    "id": "block-9",
    "type": "quote_analysis",
    "order": 9,
    "source_quote": "To be, or not to be, that is the question",
    "attribution": "William Shakespeare, Hamlet, Act III Scene I",
    "prompts": [
      { "id": "qa-p1", "question": "What existential tension does this line express?", "model_analysis": "Hamlet weighs existence against oblivion..." },
      { "id": "qa-p2", "question": "What does 'question' imply about resolution?", "model_analysis": "Framing it as a question suggests irresolution and the burden of consciousness..." }
    ]
  },
  {
    "id": "block-10",
    "type": "key_terms",
    "order": 10,
    "title": "Key Terms",
    "terms": [
      { "id": "kt-1", "term": "Projectile", "definition": "Any object thrown into the air that moves under gravity alone, with no self-propulsion.", "example_sentence": "A football in flight is a projectile once it leaves the kicker's foot." },
      { "id": "kt-2", "term": "Trajectory", "definition": "The curved path followed by a projectile through space.", "example_sentence": "The trajectory of a baseball curves downward due to gravity." }
    ]
  }
]

TONE: Enthusiastic and warm, like a great professor who loves this subject.
ACCURACY: Never include a formula or fact not supported by the textbook source above.
You have a generous token budget. Use it fully. A superficial lesson is worse than no lesson.`;
}
