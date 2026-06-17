-- Migration: Add is_admin role column to users table
-- Run: psql $DATABASE_URL -f backend/sql/002_add_admin_column.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;
