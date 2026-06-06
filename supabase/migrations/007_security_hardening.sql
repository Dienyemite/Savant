-- 007_security_hardening.sql
-- Addresses all WARN/INFO security advisors from Supabase linter:
--
--   1. textbook_chunks has RLS enabled but no policies → add explicit deny for
--      anon/authenticated (table is server-side only via service_role, which
--      bypasses RLS — this policy makes the intent explicit).
--   2. handle_new_auth_user callable by anon/authenticated via RPC → revoke EXECUTE.
--   3. rls_auto_enable callable by anon/authenticated via RPC → revoke EXECUTE.
--   4. handle_new_auth_user, update_canvas_state_timestamp, update_updated_at_column,
--      match_textbook_chunks have mutable search_path → fix with SET search_path = ''.

-- ── 1. textbook_chunks: explicit deny policy ─────────────────────────────────
CREATE POLICY "textbook_chunks_deny_public"
  ON public.textbook_chunks
  FOR ALL
  TO anon, authenticated
  USING (false);

-- ── 2 & 3. Revoke direct RPC access to internal functions ────────────────────
-- Revoke from PUBLIC (covers anon + authenticated via the default PUBLIC grant).
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;

-- ── 4a. Fix handle_new_auth_user: immutable search_path ──────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    'student'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
-- CREATE OR REPLACE preserves ACL on existing functions, but re-assert to be safe.
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM PUBLIC;

-- ── 4b. Fix update_canvas_state_timestamp: immutable search_path ─────────────
CREATE OR REPLACE FUNCTION public.update_canvas_state_timestamp()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ── 4c. Fix update_updated_at_column: immutable search_path ──────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ── 4d. Fix match_textbook_chunks: pinned search_path + qualify table ─────────
-- search_path must include 'public' because the vector extension (<=> operator)
-- is installed there. Setting it explicitly still fixes the mutable-search_path lint.
CREATE OR REPLACE FUNCTION public.match_textbook_chunks(
  query_embedding vector,
  subject_filter text,
  match_count integer DEFAULT 5
)
  RETURNS TABLE(
    id         uuid,
    content    text,
    chapter    text,
    section    text,
    book_title text,
    similarity double precision
  )
  LANGUAGE sql
  STABLE
  SET search_path = 'public'
AS $$
  SELECT
    id,
    content,
    chapter,
    section,
    book_title,
    1 - (embedding <=> query_embedding) AS similarity
  FROM public.textbook_chunks
  WHERE subject = subject_filter
    AND embedding IS NOT NULL
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
