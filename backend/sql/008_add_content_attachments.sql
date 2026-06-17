-- Add image_url column to content_events for event banners/posters
ALTER TABLE content_events ADD COLUMN IF NOT EXISTS image_url TEXT;
