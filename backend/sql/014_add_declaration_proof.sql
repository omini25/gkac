-- Migration: Add proof of payment column to election_declarations
-- Run: psql $DATABASE_URL -f backend/sql/014_add_declaration_proof.sql

ALTER TABLE election_declarations
  ADD COLUMN IF NOT EXISTS proof_file_path TEXT;
