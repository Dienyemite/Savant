-- Savant: Initial Database Schema
-- Tables: concepts, lessons, users, student_progress

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM TYPES
-- ============================================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE concept_domain AS ENUM ('math', 'science', 'art', 'music', 'language', 'logic');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE progress_status AS ENUM ('locked', 'unlocked', 'mastered');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- USERS
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  focus_score INTEGER NOT NULL DEFAULT 0,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- CONCEPTS (Knowledge Graph Nodes)
-- ============================================

CREATE TABLE IF NOT EXISTS concepts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  domain concept_domain NOT NULL,
  icon TEXT, -- Lucide icon name
  difficulty INTEGER NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  -- Position in the constellation graph
  position_x FLOAT NOT NULL DEFAULT 0,
  position_y FLOAT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- CONCEPT PREREQUISITES (Graph Edges)
-- ============================================

CREATE TABLE IF NOT EXISTS concept_prerequisites (
  concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  prerequisite_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  PRIMARY KEY (concept_id, prerequisite_id),
  -- Prevent self-referencing
  CHECK (concept_id != prerequisite_id)
);

-- ============================================
-- LESSONS
-- ============================================

CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  -- JSON schema defining interactive widgets, text blocks, correct states
  content_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- USER PROGRESS
-- ============================================

CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- String concept ID matching the seed data (e.g. 'c-addition').
  -- Not a FK to concepts because the app uses local seed IDs, not DB UUIDs.
  concept_id TEXT NOT NULL,
  status progress_status NOT NULL DEFAULT 'locked',
  productive_struggle_metric FLOAT NOT NULL DEFAULT 0.0,
  total_time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, concept_id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_concepts_domain ON concepts(domain);
CREATE INDEX IF NOT EXISTS idx_lessons_concept ON lessons(concept_id);
CREATE INDEX IF NOT EXISTS idx_progress_user ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_concept ON user_progress(concept_id);
CREATE INDEX IF NOT EXISTS idx_progress_status ON user_progress(status);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Public read access to concepts and lessons
DROP POLICY IF EXISTS "Concepts are viewable by everyone" ON concepts;
CREATE POLICY "Concepts are viewable by everyone"
  ON concepts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Concept prerequisites are viewable by everyone" ON concept_prerequisites;
CREATE POLICY "Concept prerequisites are viewable by everyone"
  ON concept_prerequisites FOR SELECT USING (true);

DROP POLICY IF EXISTS "Lessons are viewable by everyone" ON lessons;
CREATE POLICY "Lessons are viewable by everyone"
  ON lessons FOR SELECT USING (true);

-- Students can read/update their own progress
DROP POLICY IF EXISTS "Users can view own progress" ON user_progress;
CREATE POLICY "Users can view own progress"
  ON user_progress FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own progress" ON user_progress;
CREATE POLICY "Users can insert own progress"
  ON user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own progress" ON user_progress;
CREATE POLICY "Users can update own progress"
  ON user_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can read own profile
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);
