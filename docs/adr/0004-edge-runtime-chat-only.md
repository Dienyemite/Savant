# Edge runtime for /api/chat only

The `/api/chat` route uses `export const runtime = "edge"` to run on Vercel's Edge Runtime. All other API routes use the default Node.js runtime.

We chose the Edge Runtime for `/api/chat` because it minimises cold-start latency for streaming AI responses, and the route has no Node.js-only dependencies (no `fs`, no native modules). The Vercel AI SDK's `streamText` works natively on the Edge.

All other routes (`/api/canvas`, `/api/progress`, `/api/concepts`, `/api/lessons`, `/api/auth/*`, etc.) use the Node.js runtime because they depend on `@supabase/ssr`'s cookie handling, which requires the full `next/headers` API. The Edge Runtime's restricted API surface would require significant workarounds for no latency benefit on non-streaming routes.

Do not add `export const runtime = "edge"` to non-chat routes without revisiting this decision.
