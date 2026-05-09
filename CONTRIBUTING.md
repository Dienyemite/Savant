# Contributing to Savant

## Local setup

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd Savant
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Open `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` — from your Supabase project Settings > API
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from the same page
   - `ANTHROPIC_API_KEY` — from [console.anthropic.com](https://console.anthropic.com)
   - `GOOGLE_GENERATIVE_AI_API_KEY` — from [aistudio.google.com](https://aistudio.google.com) (fallback model)

4. **Start local Supabase** (requires [Supabase CLI](https://supabase.com/docs/guides/cli))
   ```bash
   supabase start
   supabase db reset   # applies all migrations in supabase/migrations/
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Before opening a PR

```bash
npm run lint   # must return zero errors
npm run build  # must compile without type errors
```

## Project conventions

- Read `CLAUDE.md` for coding principles (think before coding, surgical changes, simplicity first).
- Read `docs/specs/` for the design system and component specs — every visual decision is documented there.
- Read the relevant `docs/phases/` file before touching a feature area; it records what is done vs. what is intended.
- All UI tokens are in `src/app/globals.css` — do not invent local styles in component files.
- TypeScript strict mode is on. No `any`, no `!` assertions on possibly-missing env vars.
