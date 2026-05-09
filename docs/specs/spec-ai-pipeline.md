# Spec — AI Pipeline

## Purpose
Defines the full AI pipeline for Savant: the `/api/chat` edge route, the
Socratic system prompt construction, the Smart Annotation prompt path, model
selection and fallback logic, streaming patterns, rate limiting, and token
budget targets. This spec governs `src/app/api/chat/route.ts`,
`src/lib/socratic-prompt.ts`, and any future `src/lib/annotation-prompt.ts`.

---

## 1. Current Implementation Status

**Exists:**
- `src/app/api/chat/route.ts` — complete edge route with streaming, fallback, both context types
- `src/lib/socratic-prompt.ts` — `SOCRATIC_BASE_PROMPT`, `buildSocraticSystemPrompt`, `formatBlockType`
- `SelectionTrigger.tsx` → calls `/api/chat` with `contextType: "selection"` — complete
- `SocraticChat.tsx` → calls `/api/chat` with `contextType: "lesson"` — complete
- `MarginaliaAnnotations.tsx` — renders streamed annotation in right margin — complete

**Does NOT exist:**
- `contextType: "annotation"` (Smart Annotation) dispatch path
- `src/lib/annotation-prompt.ts` — Smart Annotation system prompt builder
- Rate limiting on `/api/chat`
- Request validation / input sanitisation
- Retry logic for model failures
- `streamToMarginalia` helper abstraction

---

## 2. Edge Route Architecture

File: `src/app/api/chat/route.ts`

```ts
export const runtime = "edge"

export async function POST(request: Request) {
  const body = await request.json()
  // body shape: ChatRequestBody (see §3)

  const systemPrompt = buildSystemPrompt(body)
  const model = selectModel()  // see §4

  try {
    const result = await streamText({
      model,
      system: systemPrompt,
      messages: body.messages,
      maxTokens: getTokenBudget(body.contextType),
      temperature: body.contextType === "annotation" ? 0.4 : 0.7,
    })
    return result.toTextStreamResponse()
  } catch (err) {
    // Fallback: if Anthropic fails, retry with Gemini
    return handleWithFallback(body, err)
  }
}
```

### `export const runtime = "edge"`
Critical: this must remain. The edge runtime:
- Eliminates cold starts (critical for chat responsiveness)
- Limits available Node.js APIs (no `fs`, no `crypto.randomBytes`)
- Supports streaming via Web Streams API (`result.toTextStreamResponse()`)

---

## 3. Request Schema

```ts
interface ChatRequestBody {
  contextType: "lesson" | "selection" | "annotation"
  messages: Array<{ role: "user" | "assistant"; content: string }>

  // Required for contextType: "lesson"
  lessonContext?: {
    lessonTitle: string
    conceptTitle: string
    blockType: LessonBlockType
    blockContent: string
    studentAnswer: string
    attempts: number
  }

  // Required for contextType: "selection"
  selectionContext?: {
    selectedText: string
    lessonTitle: string
    conceptTitle: string
    slideIndex: number
  }

  // Required for contextType: "annotation"  — Phase 5 Sprint 5.3
  annotationContext?: {
    selectedText: string
    blockId: string
    blockContent: string       // full text of the block containing the selection
    strokePath?: string        // SVG path d= string of the ink stroke that crossed the text
    highlightBoundingBox?: { top: number; left: number; width: number; height: number }
    lessonTitle: string
    conceptTitle: string
  }
}
```

### Input validation (to add in Phase 7 Sprint 7.1)
Before any LLM call:
- `messages.length <= 20` (refuse if too many)
- `messages.every(m => m.content.length <= 2000)` (per-message limit)
- `selectedText.length <= 500` (selection text limit)
- `annotationContext.strokePath.length <= 5000` (SVG path length limit)
- Validate that `contextType` is one of the three allowed values
- Strip any HTML tags from all string fields (`DOMPurify` or a simple regex on edge)

---

## 4. Model Selection and Fallback

```ts
import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogleGenerativeAI } from "@ai-sdk/google"

function selectModel() {
  const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  return anthropic("claude-sonnet-4-20250514")
}

async function handleWithFallback(body: ChatRequestBody, originalError: unknown) {
  console.error("Anthropic failed, falling back to Gemini:", originalError)
  const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_API_KEY! })
  const model = google("gemini-2.0-flash")
  const systemPrompt = buildSystemPrompt(body)
  const result = await streamText({
    model,
    system: systemPrompt,
    messages: body.messages,
    maxTokens: getTokenBudget(body.contextType),
    temperature: body.contextType === "annotation" ? 0.4 : 0.7,
  })
  return result.toTextStreamResponse()
}
```

**Primary model:** `claude-sonnet-4-20250514` via `@ai-sdk/anthropic`
**Fallback model:** `gemini-2.0-flash` via `@ai-sdk/google`

The fallback runs only if the primary `streamText()` call throws. The error
is logged to console. No user-facing indication that a fallback occurred.

---

## 5. Token Budget Targets

```ts
function getTokenBudget(contextType: ChatRequestBody["contextType"]): number {
  switch (contextType) {
    case "lesson":      return 300    // Socratic: one guiding question + hint
    case "selection":   return 200    // Marginalia: brief explanation of selected text
    case "annotation":  return 250    // Smart Annotation: contextual note about the stroke
    default:            return 300
  }
}
```

These are `maxTokens` ceilings. Actual usage will be lower (typically 100–200).
Keep them tight — the aesthetic calls for brief, targeted responses.

**Temperature:**
- `lesson`: `0.7` — some variation keeps the Socratic voice natural
- `selection`: `0.7` — same as lesson, exploratory
- `annotation`: `0.4` — lower temperature for more precise, accurate annotations

---

## 6. System Prompt Construction

### 6.1 Socratic system prompt

File: `src/lib/socratic-prompt.ts`

```ts
export const SOCRATIC_BASE_PROMPT = `
You are a Socratic tutor embedded in a minimalist educational notebook called Savant.
Your role is to guide students to discover answers themselves — never give the answer directly.
Keep all responses to 2–3 sentences maximum, ending with a single guiding question.
Use simple, clear language appropriate for the student's level.
Never be discouraging. If a student is struggling, acknowledge the difficulty and redirect.
`

interface LessonContext {
  lessonTitle: string
  conceptTitle: string
  blockType: LessonBlockType
  blockContent: string
  studentAnswer: string
  attempts: number
}

export function buildSocraticSystemPrompt(ctx: LessonContext): string {
  return `
${SOCRATIC_BASE_PROMPT}

Current context:
- Lesson: "${ctx.lessonTitle}" (concept: ${ctx.conceptTitle})
- Exercise type: ${formatBlockType(ctx.blockType)}
- The exercise: ${ctx.blockContent}
- Student's answer: ${ctx.studentAnswer}
- Number of attempts: ${ctx.attempts}

${ctx.attempts >= 3
  ? "The student has tried multiple times. Be especially supportive and offer a stronger hint, but still do not give the answer."
  : "Guide the student with a gentle question."}
`
}

export function formatBlockType(type: LessonBlockType): string {
  switch (type) {
    case "multiple_choice":   return "multiple choice question"
    case "interactive_slider": return "slider exercise"
    case "drag_drop_match":   return "matching exercise"
    case "formula_builder":   return "formula building exercise"
    case "visual_feedback":   return "visual interpretation"
    default:                  return "reading exercise"
  }
}
```

### 6.2 Selection annotation prompt

For `contextType: "selection"`, used by `SelectionTrigger.tsx`:

```ts
// inline in route.ts for now; extract to src/lib/annotation-prompt.ts in Phase 5
function buildSelectionSystemPrompt(ctx: NonNullable<ChatRequestBody["selectionContext"]>): string {
  return `
You are a concise academic annotator in Savant, a notebook-style educational app.
The student has selected some text while studying and wants a brief clarification.
Provide a 1–3 sentence explanation of the selected passage in context.
Be precise, factual, and direct. Do not ask a question unless it genuinely clarifies.
Lesson: "${ctx.lessonTitle}" (concept: ${ctx.conceptTitle}).
Selected text: "${ctx.selectedText}"
`
}
```

### 6.3 Smart Annotation prompt (Phase 5 Sprint 5.3)

File: `src/lib/annotation-prompt.ts` (to create in Phase 5)

The Smart Annotation system is triggered when the user draws a freehand ink
stroke across printed lesson text. The engine detects which `TextBlock` the
stroke intersects and generates a contextual annotation for that passage.

```ts
interface AnnotationContext {
  selectedText: string           // the text the stroke crossed over
  blockContent: string           // full paragraph/block for surrounding context
  lessonTitle: string
  conceptTitle: string
}

export function buildAnnotationSystemPrompt(ctx: AnnotationContext): string {
  return `
You are a smart annotation engine for Savant, a notebook-style educational app.
A student has drawn an ink stroke over printed lesson text — treat this as
a request for a margin annotation, similar to writing a note in the margin of a book.

Write a concise, insightful margin note (1–2 sentences) about the annotated passage.
The note should:
- Add context, an example, or a real-world connection
- Be written in the style of a pencilled margin note — conversational but accurate
- Never repeat the passage verbatim
- Never say "the text says" or "this passage"

Lesson: "${ctx.lessonTitle}" (concept: ${ctx.conceptTitle})
Annotated passage: "${ctx.selectedText}"
Full paragraph: "${ctx.blockContent}"
`
}
```

---

## 7. System Prompt Dispatch

The route builds the correct system prompt based on `contextType`:

```ts
function buildSystemPrompt(body: ChatRequestBody): string {
  switch (body.contextType) {
    case "lesson":
      if (!body.lessonContext) throw new Error("lessonContext required")
      return buildSocraticSystemPrompt(body.lessonContext)
    case "selection":
      if (!body.selectionContext) throw new Error("selectionContext required")
      return buildSelectionSystemPrompt(body.selectionContext)
    case "annotation":
      if (!body.annotationContext) throw new Error("annotationContext required")
      return buildAnnotationSystemPrompt(body.annotationContext)
    default:
      throw new Error(`Unknown contextType: ${(body as any).contextType}`)
  }
}
```

The route must return a `400 Bad Request` instead of throwing, because
unhandled throws in edge routes become `500` with no message.

---

## 8. Streaming Pattern

The route returns a `TextStreamResponse` using Vercel AI SDK's
`result.toTextStreamResponse()`. The client consumes this as a streaming
fetch response.

### Client-side consumption (streamToMarginalia helper)

This helper is used by both `SelectionTrigger.tsx` and the Smart Annotation
engine. Currently the logic is inlined in `SelectionTrigger.tsx` — it must be
extracted to `src/lib/stream-to-marginalia.ts` in Phase 5 Sprint 5.3.

```ts
// src/lib/stream-to-marginalia.ts
export async function streamToMarginalia(
  response: Response,
  entryId: string,
  chatStore: ChatStore,
): Promise<void> {
  if (!response.ok) {
    chatStore.finishMarginalia(entryId)
    return
  }
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    chatStore.updateMarginalia(entryId, chunk)
  }
  chatStore.finishMarginalia(entryId)
}
```

---

## 9. Rate Limiting (Phase 7 Sprint 7.1)

The `/api/chat` route must be rate-limited to prevent abuse. Implementation
using `@vercel/kv` or `upstash/ratelimit`:

```ts
// Target limits:
// - 20 requests per minute per IP address
// - 100 requests per hour per user_id (once auth exists)
// - Hard limit: 50 concurrent streaming responses (Vercel edge function constraint)
```

Until rate limiting is implemented, the route is publicly callable with no limits.
Do not expose the route URL in any public documentation.

---

## 10. Environment Variables

```
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...
```

Both must be present in `.env.local` and in the Vercel "Savant" project environment
variables (Settings → Environment Variables → Production + Preview + Development).

The `ANTHROPIC_API_KEY` is the primary key; `GOOGLE_API_KEY` is the fallback.
If either is missing, `createAnthropic()` / `createGoogleGenerativeAI()` will
throw at request time with a clear error message.

---

## 11. Security Considerations

- **Prompt injection**: user-supplied text (`selectedText`, `studentAnswer`) is
  interpolated into the system prompt. Mitigate by enforcing length limits (§3)
  and placing user content after all system instructions (not interleaved).
- **API key exposure**: `ANTHROPIC_API_KEY` and `GOOGLE_API_KEY` are server-only
  environment variables. They must never appear in `NEXT_PUBLIC_*` names or
  be returned in any API response.
- **No authentication on `/api/chat`**: before Phase 6, any caller can use this
  endpoint. Rate limiting (§9) is the primary mitigation.
- **No logging of message content**: do not log `body.messages` or `selectedText`
  at any level — these may contain student learning data protected by FERPA/COPPA.
