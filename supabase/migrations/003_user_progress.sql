-- Migration 003: Phase 6 persistence tables

-- ─── user_progress ───────────────────────────────────────────────────────────
-- Progress keyed to seed-data string concept IDs (e.g. "c-addition").
-- Separate from the student_progress table which uses UUID FK to concepts.

CREATE TABLE IF NOT EXISTS user_progress (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  concept_id   TEXT NOT NULL,           -- seed data ID e.g. "c-addition"
  status       TEXT NOT NULL
               CHECK (status IN ('locked', 'unlocked', 'mastered')),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, concept_id)
);

CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_progress(user_id);

ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_progress_own" ON user_progress;
CREATE POLICY "user_progress_own" ON user_progress
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── lesson_canvas_states ────────────────────────────────────────────────────
-- Per-lesson drawing canvas state, keyed to seed-data string concept IDs.
-- The global constellation canvas uses the existing canvas_states table
-- with concept_id = NULL.

CREATE TABLE IF NOT EXISTS lesson_canvas_states (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  concept_id   TEXT NOT NULL,           -- seed data ID e.g. "c-addition"
  strokes      JSONB NOT NULL DEFAULT '[]',
  text_nodes   JSONB NOT NULL DEFAULT '[]',
  updated_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, concept_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_canvas_user ON lesson_canvas_states(user_id);

ALTER TABLE lesson_canvas_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lesson_canvas_own" ON lesson_canvas_states;
CREATE POLICY "lesson_canvas_own" ON lesson_canvas_states
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
