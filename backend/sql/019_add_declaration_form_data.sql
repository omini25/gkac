-- Migration: Add form_data_json column to election_declarations
-- This stores the online declaration form fields as JSON when users
-- fill the form online instead of uploading a PDF.
-- Run: psql $DATABASE_URL -f backend/sql/019_add_declaration_form_data.sql

ALTER TABLE election_declarations
  ADD COLUMN IF NOT EXISTS form_data_json TEXT;
