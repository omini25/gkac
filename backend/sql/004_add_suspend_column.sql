-- Migration: Add is_suspended column to users table
-- Run: psql $DATABASE_URL -f backend/sql/004_add_suspend_column.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT FALSE;
