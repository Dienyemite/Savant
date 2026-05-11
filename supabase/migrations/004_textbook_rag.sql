-- Migration 004: OpenStax RAG — textbook chunks with pgvector

-- ============================================
-- Enable pgvector extension
-- ============================================

CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- TEXTBOOK_CHUNKS
-- Chunked passages from OpenStax textbooks,
-- embedded with text-embedding-3-small (1536 dims).
-- ============================================

CREATE TABLE IF NOT EXISTS textbook_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject TEXT NOT NULL,          -- normalized: "physics", "calculus", etc.
  book_title TEXT NOT NULL,       -- "University Physics Vol 1"
  chapter TEXT,                   -- "Chapter 4: Motion in Two and Three Dimensions"
  section TEXT,                   -- "4.3 Projectile Motion"
  content TEXT NOT NULL,          -- raw text, ~400 tokens
  embedding vector(1536),         -- from text-embedding-3-small
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- HNSW INDEX for fast approximate nearest-neighbor
-- ============================================

CREATE INDEX IF NOT EXISTS textbook_chunks_embedding_hnsw
  ON textbook_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS textbook_chunks_subject_idx
  ON textbook_chunks(subject);

-- ============================================
-- SIMILARITY SEARCH RPC
-- Called by src/lib/textbook-retrieval.ts
-- ============================================

CREATE OR REPLACE FUNCTION match_textbook_chunks(
  query_embedding vector(1536),
  subject_filter TEXT,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  chapter TEXT,
  section TEXT,
  book_title TEXT,
  similarity FLOAT
)
LANGUAGE sql STABLE AS $$
  SELECT
    id,
    content,
    chapter,
    section,
    book_title,
    1 - (embedding <=> query_embedding) AS similarity
  FROM textbook_chunks
  WHERE subject = subject_filter
    AND embedding IS NOT NULL
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ============================================
-- No RLS needed — textbook content is public/read-only
-- All reads go through server-side API routes (service role key)
-- ============================================
