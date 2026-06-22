-- 011_add_election_timeline.sql
-- Add timeline fields to elections table for the full election process

ALTER TABLE elections ADD COLUMN IF NOT EXISTS declaration_start TIMESTAMPTZ;
ALTER TABLE elections ADD COLUMN IF NOT EXISTS declaration_end TIMESTAMPTZ;
ALTER TABLE elections ADD COLUMN IF NOT EXISTS nomination_start TIMESTAMPTZ;
ALTER TABLE elections ADD COLUMN IF NOT EXISTS nomination_end TIMESTAMPTZ;
ALTER TABLE elections ADD COLUMN IF NOT EXISTS eligible_voters_release_date TIMESTAMPTZ;
ALTER TABLE elections ADD COLUMN IF NOT EXISTS screening_date TIMESTAMPTZ;
ALTER TABLE elections ADD COLUMN IF NOT EXISTS qualified_candidates_release_date TIMESTAMPTZ;
ALTER TABLE elections ADD COLUMN IF NOT EXISTS manifesto_date TIMESTAMPTZ;
ALTER TABLE elections ADD COLUMN IF NOT EXISTS election_date TIMESTAMPTZ;
ALTER TABLE elections ADD COLUMN IF NOT EXISTS swearing_in_date TIMESTAMPTZ;
