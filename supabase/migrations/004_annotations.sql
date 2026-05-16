-- Migration 004: Annotation persistence (Phase 6 Sprint 6.4)
-- Stores completed AI marginalia and highlight annotations per lesson

CREATE TABLE IF NOT EXISTS annotations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  concept_id       TEXT NOT NULL,          -- matches Concept.id from seed e.g. "c-addition"
  slide_index      INTEGER NOT NULL DEFAULT 0,
  anchor_y         FLOAT NOT NULL,
  selected_text    TEXT NOT NULL,
  content          TEXT NOT NULL,
  annotation_type  TEXT NOT NULL
    CHECK (annotation_type IN ('marginalia', 'highlight')),
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_annotations_user_concept ON annotations(user_id, concept_id);

ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "annotations_own" ON annotations;
CREATE POLICY "annotations_own" ON annotations
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
