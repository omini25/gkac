-- Backfill membership_expires_at for approved members missing an expiry date
-- This sets a 1-year expiry from "now" for all approved members who don't have one.

UPDATE users
SET membership_expires_at = NOW() + INTERVAL '1 year'
WHERE application_status = 'approved'
  AND membership_expires_at IS NULL;
