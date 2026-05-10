-- ============================================
-- Migration 003: Per-lesson canvas + Annotations
-- ============================================

-- ── lesson_canvas_states ──────────────────────
-- Per-lesson canvas persisted separately from the global constellation canvas.
-- concept_id is a TEXT seed ID (e.g. 'c-addition'), not a UUID FK, because the
-- app uses local seed data rather than rows in the concepts table.

CREATE TABLE lesson_canvas_states (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  concept_id  TEXT        NOT NULL,
  -- Serialised ink strokes: [{ id, points: [[x,y,p],...] }]
  strokes     JSONB       NOT NULL DEFAULT '[]'::jsonb,
  -- Serialised free-form text notes: [{ id, x, y, content }]
  text_nodes  JSONB       NOT NULL DEFAULT '[]'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, concept_id)
);

CREATE INDEX idx_lesson_canvas_user    ON lesson_canvas_states(user_id);
CREATE INDEX idx_lesson_canvas_concept ON lesson_canvas_states(concept_id);

ALTER TABLE lesson_canvas_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own lesson canvas states"
  ON lesson_canvas_states FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lesson canvas states"
  ON lesson_canvas_states FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lesson canvas states"
  ON lesson_canvas_states FOR UPDATE
  USING (auth.uid() = user_id);

-- ── annotations ───────────────────────────────
-- Marginalia and highlight annotations attached to lesson slides.
-- concept_id is TEXT (seed ID) for the same reason as lesson_canvas_states.

CREATE TABLE annotations (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  concept_id      TEXT        NOT NULL,
  slide_index     INTEGER     NOT NULL DEFAULT 0,
  anchor_y        FLOAT       NOT NULL,
  selected_text   TEXT        NOT NULL DEFAULT '',
  content         TEXT        NOT NULL,
  annotation_type TEXT        NOT NULL CHECK (annotation_type IN ('marginalia', 'highlight')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_annotations_user    ON annotations(user_id);
CREATE INDEX idx_annotations_concept ON annotations(concept_id);

ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own annotations"
  ON annotations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own annotations"
  ON annotations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own annotations"
  ON annotations FOR DELETE
  USING (auth.uid() = user_id);
