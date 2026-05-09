# Spec — Security

## Purpose
Defines OWASP Top 10 mitigations, input validation conventions, secret
management, RLS policy completeness, rate limiting, prompt injection
prevention, and dependency governance for Savant. This spec governs
Phase 7 Sprint 7.4 and all ongoing development.

---

## 1. Current Security Status

**Implemented:**
- Supabase RLS policies enabled on all tables (`001_initial_schema.sql`)
- `canvas_states` RLS enforced via `002_canvas_states.sql`
- No API keys in the client bundle (Anthropic/Google keys are server-side only)
- `export const runtime = "edge"` on `/api/chat` — no Node.js process exposure

**Not implemented:**
- No input validation in `/api/chat` (message length unbounded)
- No rate limiting on any API route
- No CSRF protection analysis documented
- No `.env.example` file
- `SUPABASE_SERVICE_ROLE_KEY` is not yet used — but must never be exposed to clients when added
- No Content Security Policy headers
- No dependency audit policy

---

## 2. OWASP A01 — Broken Access Control

### Mitigation: Supabase RLS
Every table in Supabase has RLS enabled. No row can be read or written by a
user unless an explicit policy permits it.

Current policy pattern (all tables follow this structure):
```sql
-- Users can only read/write their own rows
CREATE POLICY "Users can view own data" ON table_name
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data" ON table_name
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data" ON table_name
  FOR UPDATE USING (auth.uid() = user_id);
```

**Server routes that must NOT use the anon client for admin operations:**
- `POST /api/admin/generate-lesson` must use `createServiceRoleClient()` if it
  needs to write to the `lessons` table

**Validation:** Never trust `userId` from the request body. Always derive
`userId` from `supabase.auth.getUser()` on the server side.
```ts
// ❌ Wrong — trusts client input
const { userId } = await request.json()

// ✓ Correct — derives from session
const supabase = await createServerClient()
const { data: { user }, error } = await supabase.auth.getUser()
if (error || !user) return Response.json({ error: "Unauthorized" }, { status: 401 })
const userId = user.id
```

---

## 3. OWASP A02 — Cryptographic Failures

- All communication is over HTTPS (enforced by Vercel)
- Supabase connection uses the project URL with TLS
- No passwords stored (Magic Link only — no password hashing needed)
- Session tokens managed by Supabase Auth (rotated on each sign-in)
- No custom crypto code

---

## 4. OWASP A03 — Injection

### 4.1 SQL Injection
Savant uses the Supabase JavaScript client which uses parameterised queries
exclusively. No raw SQL is constructed from user input in application code.

**Allowed:**
```ts
.from("canvas_states").select("*").eq("user_id", userId)   // parameterised
```

**Never do:**
```ts
// ❌ Never construct SQL strings with user input
supabase.rpc(`SELECT * FROM concepts WHERE name = '${userInput}'`)
```

### 4.2 Prompt Injection
User content reaches the Anthropic and Google APIs. Prompt injection is
possible if user content is placed in the system prompt.

**Rule:** User content MUST always appear in the `messages` array as a
`"user"` role message — never in the `system` prompt.

```ts
// ✓ Correct — user-supplied selectedText is in user message
const messages = [
  { role: "user", content: `Context: "${selectedText}"\n\nExplain this.` }
]
const result = await streamText({ system: BUILT_SYSTEM_PROMPT, messages })

// ❌ Wrong — user content injected into system prompt
const system = `You are a tutor. The student selected: "${selectedText}". Explain it.`
```

**Additional mitigations:**
- Truncate user-supplied content before sending to LLM:
  - `selectedText`: max 500 characters
  - Chat `message`: max 1000 characters
  - `blockContext` for lesson blocks: max 2000 characters
- Strip leading/trailing whitespace and null bytes from all user text fields:
  ```ts
  const sanitize = (s: string, max: number) => s.trim().replace(/\0/g, '').slice(0, max)
  ```

---

## 5. OWASP A04 — Insecure Design

### API Design
- Canvas `PUT /api/canvas` limits: `strokes.length <= 2000`, `textNotes.length <= 200`
- Lesson validation uses server-side logic — never trust client-reported `isCorrect`
- Admin routes (`/api/admin/*`) require a static `ADMIN_TOKEN` header

### No user-controlled redirects
No route accepts a `redirect` parameter from the user. The middleware redirect
target is always a hardcoded path (`/onboarding`), not user-supplied.

---

## 6. OWASP A05 — Security Misconfiguration

### Content Security Policy
Add CSP headers in `next.config.ts`:
```ts
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline' https://use.typekit.net;
  font-src 'self' https://use.typekit.net https://p.typekit.net;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co;
  img-src 'self' data: blob:;
  frame-src 'none';
`.replace(/\s{2,}/g, ' ').trim()

export default {
  async headers() {
    return [{ source: '/(.*)', headers: [{ key: 'Content-Security-Policy', value: cspHeader }] }]
  }
}
```

**Note:** `'unsafe-inline'` is required for Framer Motion and Tailwind inline
styles. This is a known limitation; CSP nonces would improve this but require
significant refactoring.

### Vercel headers
Also set in Vercel "Savant" project environment settings or in `vercel.json`:
```json
{
  "headers": [
    { "source": "/(.*)", "headers": [
      { "key": "X-Frame-Options", "value": "DENY" },
      { "key": "X-Content-Type-Options", "value": "nosniff" },
      { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
    ]}
  ]
}
```

---

## 7. OWASP A06 — Vulnerable and Outdated Components

### Dependency audit policy
Run `npm audit` before every production deployment:
```sh
npm audit --audit-level=high
```

Fail the CI build if any `high` or `critical` vulnerabilities are found in
production dependencies (not dev dependencies).

Phase 7 Sprint 7.4 adds this check to the GitHub Actions CI pipeline.

### Dependency update schedule
- Monthly: `npm outdated` check, update non-breaking patch versions
- On CVE disclosure: immediate update for affected packages

---

## 8. OWASP A07 — Identification and Authentication Failures

### OTP security
- Supabase Magic Link OTPs expire after 1 hour
- Supabase enforces a maximum of 3 OTP sends per email per hour
- No custom OTP logic — rely on Supabase Auth's built-in implementation

### Session management
- Session tokens stored in `localStorage` by Supabase (acceptable for SPA)
- Server components verify session via `supabase.auth.getUser()` on every request
  (handled by `middleware.ts`)
- No session data stored in URL parameters or custom cookies

---

## 9. OWASP A09 — Security Logging and Monitoring Failures

### What to log
All API routes should log:
- Request method and path (no query params — may contain sensitive data)
- Response status code
- For errors: the error message (not the full stack in production)

```ts
console.log(`[${request.method}] ${new URL(request.url).pathname} → ${status}`)
```

Never log:
- Request bodies (may contain student content)
- OTP tokens
- API keys
- User PII (email, name)

### Vercel runtime logs
All `console.log` / `console.error` calls in Edge and Node.js API routes appear
in Vercel's runtime logs tab for the "Savant" project.

Phase 10 Sprint 10.3 adds structured logging (JSON format) for log aggregation.

---

## 10. Rate Limiting

No rate limiting is currently implemented. Add per-IP rate limiting on all
API routes in Phase 8 Sprint 8.3.

### Target limits
| Route | Limit |
|-------|-------|
| `POST /api/chat` | 20 req/min per IP |
| `PUT /api/canvas` | 30 req/min per IP |
| `POST /api/auth/send-otp` | 3 req/hour per email (Supabase-native) |

### Implementation (Vercel Edge middleware)
Use the `@upstash/ratelimit` package with Upstash Redis:
```ts
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, "1 m"),
  analytics: true,
})

export async function middleware(request: NextRequest) {
  const ip = request.ip ?? "127.0.0.1"
  const { success } = await ratelimit.limit(ip)
  if (!success) {
    return new Response("Too many requests", { status: 429 })
  }
  // ... continue
}
```

**Environment variables needed:** `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

---

## 11. Secret Management

### `.env.example` (required, not yet created)
The file `c:\Users\Mazsa\OneDrive\Desktop\Savant\Savant\.env.example` must be
created with all required variable names but empty values:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI Models
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=

# Admin
ADMIN_TOKEN=

# Rate Limiting (Phase 8)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

### Rules
- `SUPABASE_SERVICE_ROLE_KEY` must NEVER be prefixed with `NEXT_PUBLIC_`
- `ANTHROPIC_API_KEY` and `GOOGLE_API_KEY` must NEVER be prefixed with `NEXT_PUBLIC_`
- `ADMIN_TOKEN` must be a randomly generated 32-byte hex string, not a human-readable password
- `.env.local` must be in `.gitignore` (it is, by Next.js default)

---

## 12. CSRF Considerations

All state-mutating API routes (`POST`, `PUT`) require either:
1. An `Authorization: Bearer <token>` header (for authenticated routes), or
2. A valid Supabase session cookie (enforced by middleware)

Since all routes use `application/json` bodies (not form submissions), the
browser's same-origin policy prevents cross-site form POST attacks without
additional CSRF tokens. This is sufficient for a JSON-based API.

No `SameSite=Strict` cookie attributes are needed beyond what Supabase Auth sets.
