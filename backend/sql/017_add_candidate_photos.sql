-- Migration: Add candidate photo upload support
-- This adds a photo_url column to election_candidates so candidates
-- can have profile photos uploaded by admin or themselves.
-- Run: psql $DATABASE_URL -f backend/sql/017_add_candidate_photos.sql

ALTER TABLE election_candidates
  ADD COLUMN IF NOT EXISTS photo_url TEXT;
