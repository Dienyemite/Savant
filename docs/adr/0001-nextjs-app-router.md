# Next.js App Router over Pages Router

We chose the Next.js App Router (introduced in Next.js 13) as the routing layer for Savant. All routes live under `src/app/` and use React Server Components, route handlers (`route.ts`), and the `layout.tsx` / `page.tsx` file conventions.

The Pages Router (`pages/`) was the alternative. We chose App Router because it enables server-side rendering without extra data-fetching boilerplate, co-locates API route handlers with their pages, and integrates naturally with `@supabase/ssr`'s cookie-based session pattern. The streaming and `Suspense` primitives also align with our progressive lesson-loading model.

Switching back to Pages Router would require rewriting all route handlers, layout nesting, and the Supabase middleware pattern.
