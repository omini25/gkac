-- 012_add_payment_types.sql
-- Expand payment_type check constraint to include annual_due and annual_developmental_fee

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_type_check;
ALTER TABLE payments ADD CONSTRAINT payments_payment_type_check
  CHECK (payment_type IN ('registration', 'renewal', 'annual_due', 'annual_developmental_fee'));
