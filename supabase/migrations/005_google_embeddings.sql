-- Migration 005: Switch embedding model to Google text-embedding-004 (768 dims)
-- Previously: OpenAI text-embedding-3-small (1536 dims)

-- Drop the HNSW index (required before changing column type)
DROP INDEX IF EXISTS textbook_chunks_embedding_hnsw;

-- Truncate any existing rows (incompatible embeddings from old model)
TRUNCATE TABLE textbook_chunks;

-- Change the embedding column from vector(1536) to vector(768)
ALTER TABLE textbook_chunks
  ALTER COLUMN embedding TYPE vector(768);

-- Recreate the HNSW index for the new dimensions
CREATE INDEX IF NOT EXISTS textbook_chunks_embedding_hnsw
  ON textbook_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Update the similarity search RPC to accept vector(768)
CREATE OR REPLACE FUNCTION match_textbook_chunks(
  query_embedding vector(768),
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
