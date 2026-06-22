-- Migration: Add force_password_change, annual_developmental_fee_paid, annual_due_paid columns
-- Run: psql $DATABASE_URL -f backend/sql/009_add_member_dues_columns.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS annual_developmental_fee_paid BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS annual_due_paid BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS annual_developmental_fee_year INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS annual_due_year INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS developmental_levy_amount BIGINT;
