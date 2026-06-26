-- Migration: Add election_posters table for campaign poster management
-- Run: psql $DATABASE_URL -f backend/sql/015_add_election_posters.sql

-- ============================================================
-- ELECTION POSTERS (admin-uploaded campaign posters)
-- ============================================================
CREATE TABLE IF NOT EXISTS election_posters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  election_id UUID REFERENCES elections(id) ON DELETE CASCADE,
  title TEXT,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_election_posters_election_id ON election_posters(election_id);
