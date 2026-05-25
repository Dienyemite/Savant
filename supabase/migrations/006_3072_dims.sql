-- Migration 006: Superseded — do NOT run.
-- The DB is already at vector(768) from migration 005.
-- gemini-embedding-001 returns 3072 dims; the ingestion script truncates
-- to 768 dims with MRL re-normalization before storing.
-- HNSW max is 2000 dims, so vector(3072) would fail anyway.
SELECT 1; -- no-op
