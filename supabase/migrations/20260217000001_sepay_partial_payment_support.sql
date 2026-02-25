-- Migration: Add PARTIAL_PAID status to sepay_payment_orders
-- Purpose: Support partial payments via SePay when user transfers less than order amount
-- The webhook will mark order as PARTIAL_PAID and settle splits proportionally

-- Update the status CHECK constraint to include PARTIAL_PAID
ALTER TABLE sepay_payment_orders
  DROP CONSTRAINT IF EXISTS sepay_payment_orders_status_check;

ALTER TABLE sepay_payment_orders
  ADD CONSTRAINT sepay_payment_orders_status_check
  CHECK (status IN ('PENDING', 'PAID', 'PARTIAL_PAID', 'FAILED', 'CANCELLED', 'EXPIRED'));

-- Add paid_amount column to track actual amount received (may differ from order amount)
ALTER TABLE sepay_payment_orders
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12,2) DEFAULT 0;

COMMENT ON COLUMN sepay_payment_orders.paid_amount IS 'Actual amount received via bank transfer. May be less than order amount for partial payments.';
