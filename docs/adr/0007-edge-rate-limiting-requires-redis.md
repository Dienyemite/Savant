# Edge runtime rate limiting requires Redis-backed storage

The in-memory `Map` used in the `/api/chat` route for rate limiting was removed. Edge runtime isolates (Vercel Edge Functions) are stateless and ephemeral — the module-level `Map` reset on every cold start and provided zero production protection. The code appeared to rate-limit requests but silently did nothing in a distributed deployment.

Production rate limiting for `/api/chat` must use a Redis-backed, edge-compatible solution such as `@upstash/ratelimit` with Vercel KV (Upstash Redis). This requires provisioning a Vercel KV store and adding `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` environment variables before re-implementing the limit. Until then, DDoS protection is delegated to Vercel's network-level throttling.

**Considered options:**

- In-memory Map on edge runtime — rejected: resets per cold start, zero distributed protection.
- `@upstash/ratelimit` (sliding window, Redis-backed) — the correct solution when KV is provisioned.
- Vercel firewall / WAF rules — valid at the infrastructure level but coarser than per-user limits.
