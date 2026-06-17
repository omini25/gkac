-- Migration: Add email_templates table
-- Run: psql $DATABASE_URL -f backend/sql/005_add_email_templates.sql

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  variables TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS email_templates_updated_at ON email_templates;
CREATE TRIGGER email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Seed default templates
INSERT INTO email_templates (name, subject, body, variables) VALUES
  ('Welcome Email', 'Welcome to GKAC', 'Dear {{name}},\n\nWelcome to the Guild of Kwande and Allied Crafts (GKAC). Your membership application has been received and is being processed.\n\nBest regards,\nGKAC Secretariat', ARRAY['name']),
  ('Renewal Reminder', 'Your membership is due for renewal', 'Dear {{name}},\n\nYour GKAC membership ({{membership_code}}) is due for renewal. Please log in to renew your membership.\n\nBest regards,\nGKAC Secretariat', ARRAY['name', 'membership_code']),
  ('Application Approved', 'Your membership application has been approved', 'Dear {{name}},\n\nCongratulations! Your GKAC membership application has been approved. Your membership number is {{membership_code}}.\n\nBest regards,\nGKAC Secretariat', ARRAY['name', 'membership_code']),
  ('Password Reset', 'Reset your password', 'Dear {{name}},\n\nClick the link below to reset your password:\n{{reset_link}}\n\nThis link expires in 1 hour.\n\nBest regards,\nGKAC Secretariat', ARRAY['name', 'reset_link']),
  ('Application Rejected', 'Update on your membership application', 'Dear {{name}},\n\nAfter careful review, we regret to inform you that your membership application has not been approved at this time.\n\nReason: {{reason}}\n\nBest regards,\nGKAC Secretariat', ARRAY['name', 'reason'])
ON CONFLICT (name) DO NOTHING;
