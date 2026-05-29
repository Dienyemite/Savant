# Anthropic Claude as primary LLM, Google Gemini as fallback

All AI generation in Savant uses `claude-sonnet-4-20250514` (via `@ai-sdk/anthropic`) as the primary model. `gemini-2.0-flash` (via `@ai-sdk/google`) is wired as a fallback.

We chose Claude Sonnet as primary because it produces high-quality Socratic responses, handles the structured lesson JSON schema reliably, and its context window accommodates full lesson content. Gemini Flash was added as a fallback for cost and availability resilience — it is fast and cheap but less consistent on structured output.

The Vercel AI SDK (`ai`) is used as the integration layer rather than calling provider SDKs directly. This keeps provider-specific code behind a shared `streamText` / `generateText` interface.

Environment variable names:
- `ANTHROPIC_API_KEY` — primary model key
- `GOOGLE_GENERATIVE_AI_API_KEY` — fallback model key

Do not introduce OpenAI models without an ADR — the structured lesson schema has been tuned against Claude and Gemini.
