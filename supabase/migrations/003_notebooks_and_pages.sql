-- Migration 003: Notebooks, Pages, and user learning profile

-- ============================================
-- Add learning profile columns to users
-- ============================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS learning_mode TEXT CHECK (learning_mode IN ('self_taught', 'k12', 'college')),
  ADD COLUMN IF NOT EXISTS declared_subject TEXT,
  ADD COLUMN IF NOT EXISTS grade_level INTEGER CHECK (grade_level BETWEEN 1 AND 12);

-- ============================================
-- NOTEBOOKS
-- One notebook = one subject (e.g. "Physics 201")
-- ============================================

CREATE TABLE IF NOT EXISTS notebooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  learning_mode TEXT NOT NULL DEFAULT 'self_taught'
    CHECK (learning_mode IN ('self_taught', 'k12', 'college')),
  emoji TEXT DEFAULT '📓',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- PAGES
-- One page = one topic/lesson cluster on the canvas
-- ============================================

CREATE TABLE IF NOT EXISTS pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  -- Canvas state: ink strokes + text notes + annotation lines
  canvas_state JSONB NOT NULL DEFAULT '{
    "strokes": [],
    "textNotes": [],
    "annotations": []
  }'::jsonb,
  -- AI-generated lesson content: PositionedLessonBlock[]
  lesson_content JSONB NOT NULL DEFAULT '[]'::jsonb,
  lesson_generated_at TIMESTAMPTZ,
  -- Diagnostic placement test result
  diagnostic_result JSONB,
  -- Quick thumbnail for page grid in dashboard
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS notebooks_user_id_idx ON notebooks(user_id);
CREATE INDEX IF NOT EXISTS pages_notebook_id_idx ON pages(notebook_id);
CREATE INDEX IF NOT EXISTS pages_user_id_idx ON pages(user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

-- Users can only CRUD their own notebooks
DROP POLICY IF EXISTS "users_own_notebooks" ON notebooks;
CREATE POLICY "users_own_notebooks" ON notebooks
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_own_pages" ON pages;
CREATE POLICY "users_own_pages" ON pages
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- UPDATED_AT trigger (reuse pattern from spec)
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER notebooks_updated_at
  BEFORE UPDATE ON notebooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER pages_updated_at
  BEFORE UPDATE ON pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
