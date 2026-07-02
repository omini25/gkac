-- Migration: Add voter exceptions table
-- This allows admins to exempt specific members from voting in an election,
-- even if they have paid their dues. Multiple members can be added per election.
-- Run: psql $DATABASE_URL -f backend/sql/020_add_voter_exceptions.sql

CREATE TABLE IF NOT EXISTS election_voter_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (election_id, user_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_voter_exceptions_election_id ON election_voter_exceptions(election_id);
CREATE INDEX IF NOT EXISTS idx_voter_exceptions_user_id ON election_voter_exceptions(user_id);
