// ============================================
// Smart Annotation Engine (Sprint 5.3)
//
// When a student draws a highlight stroke over
// lesson text, this module:
//   1. Builds a margin-note system prompt
//   2. Streams the AI response to a MarginaliaEntry
//
// The annotation style is "like a professor's
// margin note — insightful, not a summary".
// ============================================

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface AnnotationContext {
  /** All text blocks covered by the highlight stroke, joined with a space. */
  coveredText: string;
  /** Human-readable concept title from graph-store. */
  conceptTitle: string;
  /** Current slide index (0-based) for context. */
  slideIndex: number;
}

// ─────────────────────────────────────────────
// System prompt builder
// ─────────────────────────────────────────────

export function buildAnnotationPrompt(ctx: AnnotationContext): string {
  return `You are a professor leaving a margin note in a student's textbook.

## RULES — ABSOLUTE:

1. Write 1–2 sentences maximum. No more.
2. Do NOT summarise the passage — add genuine insight the student cannot see from the text alone.
3. Do NOT use first-person "I". Start directly with the key insight.
4. Do NOT hedge with phrases like "It's worth noting..." or "Interestingly...".
5. Connect the highlighted idea to something bigger — a real-world application, a surprising implication, or a conceptual link to another domain.
6. Tone: precise, warm, intellectually alive. Like a great professor's handwriting in the margin.

## CONTEXT:

Concept: ${ctx.conceptTitle}
Slide: ${ctx.slideIndex + 1}
Highlighted passage: "${ctx.coveredText}"

Write your margin note now:`.trim();
}

// ─────────────────────────────────────────────
// Streaming helper
// ─────────────────────────────────────────────

/**
 * POSTs to `/api/chat` with a highlight annotation context type,
 * streams the response chunk by chunk into the marginalia entry
 * identified by `id`, then marks it finished.
 *
 * `callbacks` is injected by the caller (LessonView) so this module
 * stays free of direct store access.
 */
export async function streamToMarginalia(
  id: string,
  annotationPrompt: string,
  callbacks: {
    updateMarginalia: (id: string, content: string) => void;
    finishMarginalia: (id: string) => void;
  }
): Promise<void> {
  const { updateMarginalia, finishMarginalia } = callbacks;

  let accumulated = "";

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contextType: "highlight_annotation",
        systemPrompt: annotationPrompt,
        messages: [
          {
            role: "user",
            content: "Please write the margin note for the highlighted passage above.",
          },
        ],
      }),
    });

    if (!res.ok || !res.body) {
      finishMarginalia(id);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      accumulated += chunk;
      updateMarginalia(id, accumulated);
    }
  } finally {
    finishMarginalia(id);
  }
}
