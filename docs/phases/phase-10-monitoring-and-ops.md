# Phase 10 — Monitoring & Operations

## Status: 0% Complete

## Overview
Establishes observability for the production application: error tracking,
performance monitoring, API usage tracking (especially LLM costs), user
behaviour analytics, alerting, and ongoing maintenance procedures. Without
this phase, production issues are invisible until a user reports them.

---

## Sprint 10.1 — Error Tracking  ❌ NOT STARTED

### Tasks

#### 10.1.1 Sentry integration
- [ ] `npm install @sentry/nextjs`
- [ ] Run `npx @sentry/wizard@latest -i nextjs` to generate:
  - `sentry.client.config.ts`
  - `sentry.server.config.ts`
  - `sentry.edge.config.ts`
  - Instrumentation hooks in `src/instrumentation.ts`
- [ ] Set Sentry DSN in environment variables:
  ```
  NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
  SENTRY_ORG=<org-slug>
  SENTRY_PROJECT=savant
  SENTRY_AUTH_TOKEN=<token>   # for source map upload
  ```
- [ ] Configure source map upload in `next.config.ts`:
  ```ts
  import { withSentryConfig } from '@sentry/nextjs'
  export default withSentryConfig(nextConfig, {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    silent: true,
    widenClientFileUpload: true,
  })
  ```
- [ ] Set `tracesSampleRate: 0.1` in production (10% of transactions), `1.0` in development

#### 10.1.2 Custom error context
- [ ] When a lesson fails to load, capture extra context:
  ```ts
  Sentry.captureException(error, {
    tags: { feature: 'lesson', conceptId: activeLessonConceptId },
    extra: { slideIndex: currentSlideIndex, lessonId: activeLesson?.id }
  })
  ```
- [ ] When `/api/chat` fails or times out, log a Sentry event with:
  ```ts
  Sentry.captureMessage('Chat API failure', {
    level: 'warning',
    extra: { contextType, systemPromptLength, messageCount }
  })
  ```

#### 10.1.3 Error boundary integration
- [ ] In the `ErrorBoundary` component (Phase 7 Sprint 7.7), call
  `Sentry.captureException(error)` inside `componentDidCatch`

### Acceptance criteria
- Throwing a test error in any component produces a Sentry event with correct
  file and line number (source maps working)
- 10% of production page loads produce Sentry performance traces
- Error alerts are sent to the team email/Slack on new issue creation

---

## Sprint 10.2 — Performance Monitoring  ❌ NOT STARTED

### Tasks

#### 10.2.1 Vercel Speed Insights
- [ ] `npm install @vercel/speed-insights`
- [ ] Add `<SpeedInsights />` to `src/app/layout.tsx` inside the body
  - This collects Core Web Vitals (LCP, CLS, INP) from real user sessions
  - Data visible in Vercel Dashboard → Speed Insights tab

#### 10.2.2 Vercel Web Analytics
- [ ] `npm install @vercel/analytics`
- [ ] Add `<Analytics />` to `src/app/layout.tsx`
  - Tracks page views, unique visitors, referrers
  - GDPR-compliant (no cookies, no personal data)

#### 10.2.3 Canvas performance instrumentation
- [ ] Add a development-only performance mark around `commitStroke()`:
  ```ts
  if (process.env.NODE_ENV !== 'production') {
    performance.mark('stroke-start')
    commitStroke()
    performance.mark('stroke-end')
    performance.measure('stroke-commit', 'stroke-start', 'stroke-end')
    const entry = performance.getEntriesByName('stroke-commit').at(-1)
    if (entry && entry.duration > 16) {
      console.warn(`Slow stroke commit: ${entry.duration.toFixed(1)}ms`)
    }
  } else {
    commitStroke()
  }
  ```
- [ ] Aim: zero warnings in normal usage (development test with 100 strokes)

### Acceptance criteria
- Vercel Speed Insights shows real LCP/CLS/INP data within 24 hours of going live
- Analytics shows page view data in the Vercel dashboard

---

## Sprint 10.3 — LLM Cost Tracking  ❌ NOT STARTED

### Context
The Anthropic and Google AI APIs charge per token. Without usage tracking,
a viral spike could incur unexpected costs. The MVP uses `claude-sonnet-4-20250514`
which is priced at ~$3/MTok input and ~$15/MTok output.

### Tasks

#### 10.3.1 Token usage logging
- [ ] In `src/app/api/chat/route.ts`, after the streaming response is initiated,
  log token usage to the console (Edge runtime):
  ```ts
  // After streamText() call:
  void result.usage.then(usage => {
    console.log(JSON.stringify({
      type: 'llm_usage',
      model: 'claude-sonnet-4-20250514',
      inputTokens: usage.promptTokens,
      outputTokens: usage.completionTokens,
      contextType,
      ts: new Date().toISOString()
    }))
  })
  ```
  These logs are captured by Vercel Log Drains.

#### 10.3.2 Budget alert
- [ ] Set a monthly spend alert in the Anthropic console:
  - Warning at $10/month
  - Hard limit at $50/month (this prevents runaway charges during development)
- [ ] Same for Google AI Studio (Gemini) — set quota limits in Google Cloud Console

#### 10.3.3 Rate limiting on `/api/chat`
- [ ] Add per-user rate limiting using a simple edge-compatible counter:
  - Limit: 60 requests per user per hour
  - Implementation: use Vercel KV (Redis) or a simple in-memory Map (less reliable
    but requires no additional infra for MVP)
  - On limit exceeded: return 429 with `{ error: "Rate limit exceeded. Try again soon." }`
- [ ] In `SocraticChat.tsx`, handle 429 responses gracefully:
  ```ts
  if (response.status === 429) {
    addMessage("assistant", "I need a moment to think. Try again in a minute.")
    return
  }
  ```

### Acceptance criteria
- Every `/api/chat` request logs token counts in Vercel logs
- Anthropic spend alert fires at $10 and hard-limits at $50 per month
- A user who sends 61 requests in an hour receives a 429 response

---

## Sprint 10.4 — User Behaviour Analytics  ❌ NOT STARTED

### Tasks

#### 10.4.1 Lesson funnel events
- [ ] Emit custom events via Vercel Analytics `track()` for key funnel steps:
  ```ts
  import { track } from '@vercel/analytics'
  // On lesson start:
  track('lesson_started', { conceptId, lessonId })
  // On lesson complete:
  track('lesson_completed', { conceptId, lessonId, slideCount, durationMs })
  // On chat opened (manual or auto-trigger):
  track('chat_opened', { trigger: 'manual' | 'failure', conceptId })
  // On highlight annotation triggered:
  track('annotation_created', { type: 'highlight' | 'selection', conceptId })
  ```
- [ ] Do NOT include PII (email, user ID) in event properties

#### 10.4.2 Productive Struggle funnel
- [ ] Emit a `struggle_session_complete` event when `completeSession()` is called
  in `telemetry-store.ts`:
  ```ts
  track('struggle_session', { conceptId, struggleScore: session.overallScore })
  ```
- [ ] View events in Vercel Analytics → Custom Events

### Acceptance criteria
- After 10 manual test sessions, the Vercel Analytics custom events dashboard shows
  `lesson_started`, `lesson_completed`, and `chat_opened` event counts

---

## Sprint 10.5 — Alerting & On-Call Procedures  ❌ NOT STARTED

### Tasks

#### 10.5.1 Sentry alerts
- [ ] Create a Sentry alert rule: if more than 5 new errors occur in 5 minutes,
  send a notification to the team Slack or email
- [ ] Create a separate alert for `Chat API failure` messages: if more than 10
  occur in 1 hour (possible AI provider outage)

#### 10.5.2 Uptime monitoring
- [ ] Set up Vercel uptime checks on:
  - `/` (main constellation page)
  - `/api/chat` (POST health check endpoint — add a minimal health route)
- [ ] Alternative: BetterUptime free tier or UptimeRobot for external monitoring

#### 10.5.3 Add a health check endpoint
- [ ] Create `src/app/api/health/route.ts`:
  ```ts
  export async function GET() {
    const supabaseOk = await supabaseBrowser.from('concepts').select('id').limit(1)
      .then(() => true).catch(() => false)
    return Response.json({
      status: supabaseOk ? 'ok' : 'degraded',
      supabase: supabaseOk,
      ts: new Date().toISOString()
    })
  }
  ```
- [ ] This endpoint does NOT check AI API connectivity (would incur cost per check)
- [ ] Return `200` if all systems are OK; `503` if Supabase is unreachable

### Acceptance criteria
- Health check endpoint returns `{ status: "ok" }` in production
- Sentry fires an alert if 5 new errors occur in 5 minutes
- Uptime monitor checks the health endpoint every 5 minutes

---

## Sprint 10.6 — Ongoing Maintenance Procedures  ❌ NOT STARTED

### Documentation to write (add to `CONTRIBUTING.md`)

- [ ] **Dependency updates**: run `npm outdated` monthly; update minor/patch versions
  immediately; major versions require a test pass before merging
- [ ] **Supabase migrations**: every schema change requires a new numbered migration
  file in `supabase/migrations/`; NEVER edit an existing applied migration
- [ ] **AI model version pinning**: the model ID `claude-sonnet-4-20250514` is
  pinned explicitly in `src/app/api/chat/route.ts`. Update deliberately — test
  output quality before changing
- [ ] **Seed data**: `src/data/seed.ts` is development/demo data; in production,
  lesson content should be served from Supabase `lessons` table (Phase 4 goal)
- [ ] **Logs retention**: Vercel retains logs for 1 day on the free tier; use
  a log drain to Axiom or Logtail if longer retention is needed

---

## Completion Criteria for Phase 10

- [ ] Sentry is installed and capturing errors with source maps in production
- [ ] Vercel Speed Insights is collecting Core Web Vitals data
- [ ] LLM token usage is logged per request
- [ ] Anthropic spend alerts are configured at $10 and $50 limits
- [ ] Rate limiting on `/api/chat` returns 429 after 60 requests/hour
- [ ] Health check endpoint returns `200` and is being monitored externally
- [ ] Custom funnel events are visible in Vercel Analytics
- [ ] On-call alert rules are active in Sentry
- [ ] Maintenance procedures are documented in `CONTRIBUTING.md`

---

## Dependencies
- Requires: Phase 9 (application must be deployed to monitor)
- Blocks: nothing (this is the final phase)
