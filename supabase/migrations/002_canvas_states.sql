-- ============================================
-- Migration 002: Canvas State Persistence
-- Phase 3: "Serialization — Write the functions
-- to serialize the entire canvas state (ink,
-- text, positions) into JSON and save it to the
-- CanvasState database table."
-- ============================================

-- ── canvas_states ────────────────────────────
-- Persists the user's drawing strokes and free-
-- form text notes for any page of the notebook.
-- concept_id is NULL for the global constellation
-- canvas; set to a concept UUID for a lesson page.

CREATE TABLE canvas_states (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- NULL = global constellation canvas
  concept_id   UUID        REFERENCES concepts(id) ON DELETE SET NULL,
  -- Serialised ink strokes: [{ id, points: [[x,y,p],...] }]
  strokes      JSONB       NOT NULL DEFAULT '[]'::jsonb,
  -- Serialised text notes: [{ id, x, y, content }]
  text_notes   JSONB       NOT NULL DEFAULT '[]'::jsonb,
  -- Last known viewport: { x, y, scale }
  viewport     JSONB       NOT NULL DEFAULT '{"x":0,"y":0,"scale":1}'::jsonb,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, concept_id)
);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_canvas_state_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_canvas_states_updated_at
BEFORE UPDATE ON canvas_states
FOR EACH ROW EXECUTE FUNCTION update_canvas_state_timestamp();

-- Indexes
CREATE INDEX idx_canvas_states_user    ON canvas_states(user_id);
CREATE INDEX idx_canvas_states_concept ON canvas_states(concept_id);

-- RLS
ALTER TABLE canvas_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own canvas states"
  ON canvas_states FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own canvas states"
  ON canvas_states FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own canvas states"
  ON canvas_states FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own canvas states"
  ON canvas_states FOR DELETE
  USING (auth.uid() = user_id);
