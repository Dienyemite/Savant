# Phase 9 — Deployment

## Status: 0% Complete

## Overview
Takes the application from local development to a production deployment on Vercel
with a live Supabase project. Covers environment variable management, build
verification, Supabase production configuration, domain setup, and the CI/CD
pipeline that gates every merge to `main`.

---

## Sprint 9.1 — Pre-Deployment Checklist  ❌ NOT STARTED

### Tasks

The following must be complete before any deployment attempt:

- [ ] `npm run build` exits 0 with zero TypeScript errors
- [ ] `npm run lint` exits 0 with zero ESLint errors
- [ ] All Vitest unit tests pass (`npm test`)
- [ ] All Playwright E2E tests pass (`npm run test:e2e`)
- [ ] `.env.example` documents every required variable (Phase 0 Sprint 0.6)
- [ ] No `console.log` statements left in production code paths
  (use `if (process.env.NODE_ENV !== "production") console.log(...)` for dev logs)
- [ ] No hardcoded API keys or secrets in source files
- [ ] `supabase/migrations/` contains all migrations in numbered order

### Acceptance criteria
- Running `npm run build && npm run lint && npm test` on a fresh clone (with
  `.env.local` populated) exits 0 for all three commands

---

## Sprint 9.2 — Supabase Production Project  ❌ NOT STARTED

### Tasks

#### 9.2.1 Create production project
- [ ] Create a new Supabase project in the Supabase dashboard named `savant-production`
- [ ] Note the project URL and anon key for Vercel environment variables

#### 9.2.2 Run migrations
- [ ] Link the local Supabase CLI to the production project:
  ```bash
  supabase link --project-ref <production-project-ref>
  ```
- [ ] Push all migrations to production:
  ```bash
  supabase db push
  ```
- [ ] Verify all 4 migrations applied successfully (check Supabase SQL editor)

#### 9.2.3 Auth configuration
- [ ] Enable Email/Password provider in the production Supabase dashboard
- [ ] Set `Site URL` to `https://savant.yourdomain.com` (or Vercel preview URL)
- [ ] Set `Redirect URLs` to include:
  - `https://savant.yourdomain.com/auth/confirm`
  - `https://*.vercel.app/auth/confirm` (for preview deployments)
- [ ] Configure email templates: welcome email, confirmation email
  (use the Supabase default templates for MVP; customise later)

#### 9.2.4 RLS verification
- [ ] Run a manual smoke test against the production DB:
  - Unauthenticated request to `student_progress` returns 0 rows (not an error)
  - Authenticated request returns only the authenticated user's rows
  - Test via Supabase Table Editor → switch "View as" to a specific user

### Acceptance criteria
- All 4 migrations are applied to production DB
- RLS policies block cross-user data access
- Auth confirmation emails are delivered successfully

---

## Sprint 9.3 — Vercel Deployment  ❌ NOT STARTED

### Tasks

#### 9.3.1 Initial deployment
- [ ] Connect the GitHub repository to a new Vercel project
- [ ] Set framework preset to **Next.js**
- [ ] Set root directory to `.` (the workspace root)
- [ ] Deploy from `main` branch

#### 9.3.2 Environment variables on Vercel
Set the following in Vercel Dashboard → Settings → Environment Variables:

| Variable | Environment | Value source |
|----------|-------------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview | Supabase service role key (**mark as sensitive**) |
| `ANTHROPIC_API_KEY` | Production, Preview | Anthropic console |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Production, Preview | Google AI Studio |
| `NEXTAUTH_SECRET` | Production, Preview | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Production only | `https://savant.yourdomain.com` |

- [ ] Do NOT set `ANTHROPIC_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` for Preview
  environments that run tests (use mock API keys for test environments)

#### 9.3.3 Verify the deployment
- [ ] Visit the Vercel deployment URL
- [ ] Verify the notebook cover renders with grain texture and ruled lines
- [ ] Verify `/api/chat` responds to a POST request (use browser DevTools)
- [ ] Verify `/onboarding` loads and the three learning paths are interactive

#### 9.3.4 Edge runtime verification
- [ ] Confirm `/api/chat` is deployed on Vercel Edge (check Vercel Functions tab —
  edge functions show a different icon from serverless functions)
- [ ] Cold-start test: invoke `/api/chat` after 10 minutes of inactivity and
  verify first-token latency < 800ms (edge functions have no cold start, this
  should always pass)

---

## Sprint 9.4 — CI/CD Pipeline  ❌ NOT STARTED

### Tasks

#### 9.4.1 GitHub Actions CI workflow
- [ ] Create `.github/workflows/ci.yml`:
  ```yaml
  name: CI
  on:
    push:
      branches: [main]
    pull_request:
      branches: [main]
  jobs:
    test:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with: { node-version: '20', cache: 'npm' }
        - run: npm ci
        - run: npm run lint
        - run: npm run build
          env:
            NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
            NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
            ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
            GOOGLE_GENERATIVE_AI_API_KEY: ${{ secrets.GOOGLE_GENERATIVE_AI_API_KEY }}
        - run: npm test
  ```
- [ ] Add repository secrets in GitHub Settings → Secrets for all required variables

#### 9.4.2 Branch protection
- [ ] Enable branch protection on `main`:
  - Require CI to pass before merging
  - Require at least 1 review (optional for solo project)
  - Disallow force pushes to `main`

#### 9.4.3 Vercel auto-deploy integration
- [ ] Vercel automatically deploys `main` on push (default behaviour)
- [ ] Configure Vercel to cancel in-progress deployments when a new push arrives
  (Settings → Git → Cancel In-Progress Deployments)
- [ ] Preview deployments on pull requests should not use real API keys —
  the Vercel CI check is sufficient; E2E tests with live APIs are not run on PRs

### Acceptance criteria
- CI workflow passes on every push to `main`
- PRs are blocked from merging if CI fails
- Production deployment triggers automatically on merge to `main`
- Reverting a deployment (Vercel instant rollback) works in under 30 seconds

---

## Sprint 9.5 — Custom Domain & SSL  ❌ NOT STARTED

### Tasks
- [ ] Purchase or transfer domain (e.g., `trysavant.app` or `savant.study`)
- [ ] Add domain to Vercel project: Settings → Domains → Add
- [ ] Verify DNS propagation (Vercel provides CNAME or A record to set)
- [ ] Update Supabase `Site URL` to the custom domain
- [ ] Update Vercel `NEXTAUTH_URL` environment variable to the custom domain
- [ ] Verify SSL certificate is auto-provisioned by Vercel (Let's Encrypt)

### Acceptance criteria
- `https://savant.yourdomain.com` loads the application with a valid SSL certificate
- HTTP → HTTPS redirect is active (no plain HTTP access)

---

## Sprint 9.6 — Rollback & Recovery Plan  ❌ NOT STARTED

### Tasks
- [ ] Document the rollback procedure in `CONTRIBUTING.md`:
  1. Vercel Dashboard → Deployments → click previous deployment → Promote to Production
  2. If DB migration needs reverting: `supabase db reset` (destructive — only on staging)
  3. For production DB issues: restore from Supabase automatic daily backup (free tier
     has 7-day PITR)
- [ ] Create a `staging` Supabase project for testing migrations before production push
- [ ] Add a `staging` deployment environment in Vercel pointing to the `staging` branch

---

## Completion Criteria for Phase 9

- [ ] Application is live at `https://savant.yourdomain.com`
- [ ] SSL certificate is valid; no HTTP access
- [ ] All 4 DB migrations are applied to the production database
- [ ] `/api/chat` edge function returns streamed responses in production
- [ ] CI passes on `main` and blocks failing PRs
- [ ] Vercel auto-deploys on push to `main`
- [ ] Rollback procedure is documented and tested on staging

---

## Dependencies
- Requires: Phases 0–8 (all features complete and tested)
- Blocks: Phase 10 (can't monitor what isn't deployed)
