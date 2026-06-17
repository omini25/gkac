-- 007_add_payment_proof.sql
-- Add proof_of_payment_url to payments table for bank transfer uploads

ALTER TABLE payments ADD COLUMN IF NOT EXISTS proof_of_payment_url TEXT;

-- Update status check to include 'awaiting_verification'
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending', 'success', 'failed', 'abandoned', 'awaiting_verification'));
