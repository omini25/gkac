-- 010_add_confirmed_payment_status.sql
-- Add 'confirmed' to the payments status check constraint
-- The codebase uses 'confirmed' as the success status throughout

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending', 'success', 'failed', 'abandoned', 'awaiting_verification', 'confirmed'));
