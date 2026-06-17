-- Initial schema for GKAC
-- Run: psql $DATABASE_URL -f backend/sql/001_init.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS items_updated_at ON items;
CREATE TRIGGER items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- AUTH — Membership categories (admin-configurable)
-- ============================================================
CREATE TABLE IF NOT EXISTS membership_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  fee_kobo BIGINT NOT NULL, -- amount in kobo (NGN)
  min_experience_years INT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS membership_categories_updated_at ON membership_categories;
CREATE TRIGGER membership_categories_updated_at
  BEFORE UPDATE ON membership_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Seed default categories
INSERT INTO membership_categories (name, description, fee_kobo, min_experience_years, sort_order) VALUES
  ('Fellow', '15+ years distinguished practice', 5000000, 15, 1),
  ('Full Member', '5+ years certified', 3000000, 5, 2),
  ('Associate', '2+ years post-qualification', 2000000, 2, 3),
  ('Graduate', 'Recent graduate (within 3 years)', 1000000, 0, 4),
  ('Student', 'Currently enrolled', 500000, 0, 5)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- AUTH — Users table
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  state_of_origin TEXT,
  lga TEXT,
  residential_address TEXT,
  passport_photo_url TEXT,
  password_hash TEXT NOT NULL,
  membership_category_id UUID REFERENCES membership_categories(id),
  membership_category_name TEXT,
  nin TEXT,
  alt_id_type TEXT,
  alt_id_num TEXT,
  referral_name TEXT,
  membership_code TEXT UNIQUE,
  application_status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (application_status IN ('pending_payment', 'pending_approval', 'approved', 'rejected')),
  rejection_reason TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  membership_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- AUTH — Password reset tokens
-- ============================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PAYMENTS — Transaction log
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_kobo BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  reference TEXT NOT NULL UNIQUE,
  paystack_access_code TEXT,
  paystack_authorization_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'abandoned')),
  payment_type TEXT NOT NULL DEFAULT 'registration' CHECK (payment_type IN ('registration', 'renewal')),
  paid_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS payments_updated_at ON payments;
CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RESOURCES — Document library
-- ============================================================
CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT,
  file_size BIGINT,
  visibility TEXT NOT NULL DEFAULT 'members' CHECK (visibility IN ('public', 'members', 'admin')),
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  download_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS resources_updated_at ON resources;
CREATE TRIGGER resources_updated_at
  BEFORE UPDATE ON resources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- CONTENT — News & Announcements
-- ============================================================
CREATE TABLE IF NOT EXISTS content_news (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS content_news_updated_at ON content_news;
CREATE TRIGGER content_news_updated_at
  BEFORE UPDATE ON content_news
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- CONTENT — Events
-- ============================================================
CREATE TABLE IF NOT EXISTS content_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  event_date DATE NOT NULL,
  event_time TEXT,
  badge_label TEXT,
  badge_class TEXT,
  max_attendees INTEGER,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'invitation', 'cancelled', 'completed')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS content_events_updated_at ON content_events;
CREATE TRIGGER content_events_updated_at
  BEFORE UPDATE ON content_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- CONTENT — Leadership / Officials
-- ============================================================
CREATE TABLE IF NOT EXISTS content_leadership (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  bio TEXT,
  photo_url TEXT,
  term_label TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS content_leadership_updated_at ON content_leadership;
CREATE TRIGGER content_leadership_updated_at
  BEFORE UPDATE ON content_leadership
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- CONTENT — FAQ
-- ============================================================
CREATE TABLE IF NOT EXISTS content_faq (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS content_faq_updated_at ON content_faq;
CREATE TRIGGER content_faq_updated_at
  BEFORE UPDATE ON content_faq
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
