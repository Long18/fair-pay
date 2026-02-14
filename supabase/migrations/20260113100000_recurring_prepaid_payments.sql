-- Migration: Recurring Prepaid Payments
-- Description: Add prepaid tracking to recurring_expenses and create recurring_prepaid_payments table
-- Requirements: 2.1, 6.1, 6.3

-- ========================================
-- SECTION 1: ALTER recurring_expenses TABLE
-- Add prepaid tracking columns
-- ========================================

-- Add prepaid_until column to track the date until which the recurring expense is prepaid
ALTER TABLE recurring_expenses 
ADD COLUMN IF NOT EXISTS prepaid_until DATE;

-- Add last_prepaid_at column to track when the last prepaid payment was made
ALTER TABLE recurring_expenses 
ADD COLUMN IF NOT EXISTS last_prepaid_at TIMESTAMPTZ;

-- Add index for efficient queries on prepaid_until
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_prepaid_until 
ON recurring_expenses(prepaid_until) 
WHERE prepaid_until IS NOT NULL;

COMMENT ON COLUMN recurring_expenses.prepaid_until IS 'Date until which the recurring expense has been prepaid';
COMMENT ON COLUMN recurring_expenses.last_prepaid_at IS 'Timestamp of the last prepaid payment';

-- ========================================
-- SECTION 2: CREATE recurring_prepaid_payments TABLE
-- Store history of prepaid payments
-- ========================================

CREATE TABLE IF NOT EXISTS recurring_prepaid_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_expense_id UUID NOT NULL REFERENCES recurring_expenses(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  periods_covered INTEGER NOT NULL CHECK (periods_covered > 0),
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  coverage_from DATE NOT NULL,
  coverage_to DATE NOT NULL,
  expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT valid_coverage CHECK (coverage_to >= coverage_from)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_recurring_prepaid_payments_recurring 
ON recurring_prepaid_payments(recurring_expense_id);

CREATE INDEX IF NOT EXISTS idx_recurring_prepaid_payments_date 
ON recurring_prepaid_payments(payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_recurring_prepaid_payments_created_by 
ON recurring_prepaid_payments(created_by);

-- Add table comment
COMMENT ON TABLE recurring_prepaid_payments IS 'History of prepaid payments for recurring expenses';
COMMENT ON COLUMN recurring_prepaid_payments.periods_covered IS 'Number of recurring periods covered by this payment';
COMMENT ON COLUMN recurring_prepaid_payments.coverage_from IS 'Start date of the coverage period';
COMMENT ON COLUMN recurring_prepaid_payments.coverage_to IS 'End date of the coverage period (equals prepaid_until after this payment)';
COMMENT ON COLUMN recurring_prepaid_payments.expense_id IS 'Reference to the expense record created for this prepaid payment';

-- ========================================
-- SECTION 3: RLS POLICIES for recurring_prepaid_payments
-- ========================================

ALTER TABLE recurring_prepaid_payments ENABLE ROW LEVEL SECURITY;

-- Users can view prepaid payments for their recurring expenses
DROP POLICY IF EXISTS "Users can view prepaid payments for their recurring expenses" ON recurring_prepaid_payments;
CREATE POLICY "Users can view prepaid payments for their recurring expenses"
  ON recurring_prepaid_payments FOR SELECT
  TO authenticated
  USING (
    recurring_expense_id IN (
      SELECT re.id FROM recurring_expenses re
      JOIN expenses e ON re.template_expense_id = e.id
      WHERE e.created_by = auth.uid()
    )
  );

-- Users can create prepaid payments for their recurring expenses
DROP POLICY IF EXISTS "Users can create prepaid payments for their recurring expenses" ON recurring_prepaid_payments;
CREATE POLICY "Users can create prepaid payments for their recurring expenses"
  ON recurring_prepaid_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND recurring_expense_id IN (
      SELECT re.id FROM recurring_expenses re
      JOIN expenses e ON re.template_expense_id = e.id
      WHERE e.created_by = auth.uid()
    )
  );

-- Users can delete their own prepaid payments
DROP POLICY IF EXISTS "Users can delete their own prepaid payments" ON recurring_prepaid_payments;
CREATE POLICY "Users can delete their own prepaid payments"
  ON recurring_prepaid_payments FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR recurring_expense_id IN (
      SELECT re.id FROM recurring_expenses re
      JOIN expenses e ON re.template_expense_id = e.id
      WHERE e.created_by = auth.uid()
    )
  );

-- ========================================
-- SECTION 4: GRANTS
-- ========================================

-- Grant permissions for the new table (if needed for RPC functions later)
-- Note: RLS policies handle access control, but explicit grants may be needed for functions
