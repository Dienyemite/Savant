-- 008_curriculum_tour.sql
-- Adds curriculum tour support:
--   1. notebooks.curriculum_tour — marks a notebook as created via the guided tour
--   2. pages.completed_at        — tracks when a lesson was completed (unlocks next page)

ALTER TABLE public.notebooks
  ADD COLUMN IF NOT EXISTS curriculum_tour boolean NOT NULL DEFAULT false;

ALTER TABLE public.pages
  ADD COLUMN IF NOT EXISTS completed_at timestamptz DEFAULT NULL;
