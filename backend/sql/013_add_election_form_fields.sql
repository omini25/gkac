-- Migration: Add form upload fields to election_declarations
-- This supports:
--   - Declaration of Interest forms (self-nomination with uploaded PDF)
--   - Nomination forms (member nominates another member with uploaded PDF)
-- Run: psql $DATABASE_URL -f backend/sql/013_add_election_form_fields.sql

-- Add form_type to distinguish declaration vs nomination
ALTER TABLE election_declarations
  ADD COLUMN IF NOT EXISTS form_type TEXT NOT NULL DEFAULT 'declaration'
  CHECK (form_type IN ('declaration', 'nomination'));

-- Path to the uploaded form file (PDF, DOC, etc.)
ALTER TABLE election_declarations
  ADD COLUMN IF NOT EXISTS form_file_path TEXT;

-- For nominations: the member being nominated (nullable, only for nomination type)
ALTER TABLE election_declarations
  ADD COLUMN IF NOT EXISTS nominee_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
