-- Migration 003: Add is_pinned and is_favorited to pages
ALTER TABLE pages
  ADD COLUMN IF NOT EXISTS is_pinned    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_favorited BOOLEAN NOT NULL DEFAULT false;
