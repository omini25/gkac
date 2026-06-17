-- Migration: Add elections, positions, candidates, declarations, and votes tables
-- Run: psql $DATABASE_URL -f backend/sql/003_add_elections.sql

-- ============================================================
-- ELECTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS elections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'upcoming', 'active', 'closed')),
  eligible_roles TEXT[] NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS elections_updated_at ON elections;
CREATE TRIGGER elections_updated_at
  BEFORE UPDATE ON elections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ELECTION POSITIONS (roles up for election)
-- ============================================================
CREATE TABLE IF NOT EXISTS election_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  max_candidates INT NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS election_positions_updated_at ON election_positions;
CREATE TRIGGER election_positions_updated_at
  BEFORE UPDATE ON election_positions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_election_positions_election_id ON election_positions(election_id);

-- ============================================================
-- ELECTION DECLARATIONS (members declare interest)
-- ============================================================
CREATE TABLE IF NOT EXISTS election_declarations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  position_id UUID NOT NULL REFERENCES election_positions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  statement TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (position_id, user_id)
);

DROP TRIGGER IF EXISTS election_declarations_updated_at ON election_declarations;
CREATE TRIGGER election_declarations_updated_at
  BEFORE UPDATE ON election_declarations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_election_declarations_election_id ON election_declarations(election_id);
CREATE INDEX IF NOT EXISTS idx_election_declarations_position_id ON election_declarations(position_id);
CREATE INDEX IF NOT EXISTS idx_election_declarations_user_id ON election_declarations(user_id);

-- ============================================================
-- ELECTION CANDIDATES (approved declarations become candidates)
-- ============================================================
CREATE TABLE IF NOT EXISTS election_candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  position_id UUID NOT NULL REFERENCES election_positions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  declaration_id UUID REFERENCES election_declarations(id) ON DELETE SET NULL,
  statement TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (position_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_election_candidates_election_id ON election_candidates(election_id);
CREATE INDEX IF NOT EXISTS idx_election_candidates_position_id ON election_candidates(position_id);

-- ============================================================
-- ELECTION VOTES (one vote per position per voter)
-- ============================================================
CREATE TABLE IF NOT EXISTS election_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  position_id UUID NOT NULL REFERENCES election_positions(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES election_candidates(id) ON DELETE CASCADE,
  voted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (position_id, voter_id)
);

CREATE INDEX IF NOT EXISTS idx_election_votes_election_id ON election_votes(election_id);
CREATE INDEX IF NOT EXISTS idx_election_votes_position_id ON election_votes(position_id);
CREATE INDEX IF NOT EXISTS idx_election_votes_voter_id ON election_votes(voter_id);
CREATE INDEX IF NOT EXISTS idx_election_votes_candidate_id ON election_votes(candidate_id);
