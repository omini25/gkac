-- Migration: Add virtual meetings table for hosting online meetings
-- Run: psql $DATABASE_URL -f backend/sql/016_add_virtual_meetings.sql

-- ============================================================
-- VIRTUAL MEETINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  meeting_date DATE,
  meeting_time TIME,
  timezone TEXT DEFAULT 'UTC',
  platform TEXT NOT NULL DEFAULT 'zoom'
    CHECK (platform IN ('zoom', 'google_meet', 'microsoft_teams', 'other')),
  meeting_link TEXT,
  meeting_id TEXT,
  passcode TEXT,
  dial_in_numbers TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'upcoming', 'active', 'completed', 'cancelled')),
  access_type TEXT NOT NULL DEFAULT 'members_only'
    CHECK (access_type IN ('members_only', 'anyone_with_link')),
  max_attendees INT,
  recording_link TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS meetings_updated_at ON meetings;
CREATE TRIGGER meetings_updated_at
  BEFORE UPDATE ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(meeting_date);

-- ============================================================
-- MEETING ATTENDEES (track who joined)
-- ============================================================
CREATE TABLE IF NOT EXISTS meeting_attendees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT,
  email TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (meeting_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_meeting_attendees_meeting_id ON meeting_attendees(meeting_id);
